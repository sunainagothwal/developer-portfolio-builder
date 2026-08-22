/**
 * Builds structurally valid PDFs for tests.
 *
 * The old fixtures were a single stream with no page tree and no fonts, which
 * is why extraction looked healthy in CI while real files failed: every hard
 * part of the format — page trees, font resources, Identity-H encoding,
 * `Tm` positioning, `TJ` kerning — was absent from the tests. These builders
 * reproduce the shapes real writers emit.
 */

import { deflate } from 'pako';

export interface Placed {
  x: number;
  y: number;
  text: string;
  size?: number;
}

const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Reverse of the WinAnsi 0x80-0x9F block, so bullets and dashes round-trip. */
const WIN_ANSI_CODES: Record<string, number> = {
  '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87,
  'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91,
  '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98,
  '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f,
};

/**
 * Encodes a literal string operand. Characters outside ASCII become octal
 * escapes of their WinAnsi byte — writing them as raw UTF-16 code units, as a
 * naive builder would, silently turns a bullet into a quotation mark.
 */
const escapeLiteral = (s: string) =>
  Array.from(s)
    .map((ch) => {
      if (ch === '(' || ch === ')' || ch === '\\') return `\\${ch}`;
      const code = WIN_ANSI_CODES[ch] ?? ch.charCodeAt(0);
      if (code < 0x20 || code > 0x7e) return `\\${code.toString(8).padStart(3, '0')}`;
      return ch;
    })
    .join('');

export type TextEncodingStyle =
  /** `(Text) Tj` with a WinAnsi simple font — LaTeX, older writers. */
  | 'literal'
  /** `[(word) -250 (word)] TJ` — the usual justified/kerned output. */
  | 'kerned'
  /** `<00480065…> Tj` against an Identity-H subset font — Word, Chrome. */
  | 'identity-h';

export interface BuildOptions {
  style: TextEncodingStyle;
  /** One `BT…ET` for the whole page (the common real case) or one per line. */
  singleBlock?: boolean;
  /** Use `Td` deltas instead of absolute `Tm`. */
  relative?: boolean;
  /** Emit page content through a Form XObject, as Word does for headers. */
  viaForm?: boolean;
}

/** Widths for the synthetic font: every glyph is 0.5 em. */
const GLYPH_WIDTH = 500;

function showOperator(text: string, style: TextEncodingStyle): string {
  if (style === 'identity-h') {
    const hex = Array.from(text)
      .map((c) => c.charCodeAt(0).toString(16).padStart(4, '0'))
      .join('');
    return `<${hex}> Tj`;
  }
  if (style === 'kerned') {
    const parts = text
      .split(' ')
      .map((w) => `(${escapeLiteral(w)})`)
      // -250/1000 em is a normal inter-word offset at this width.
      .join(' -250 ');
    return `[${parts}] TJ`;
  }
  return `[(${escapeLiteral(text)})] TJ`;
}

function contentFor(lines: Placed[], options: BuildOptions): string {
  const ops: string[] = [];
  let cursor = { x: 0, y: 0 };

  const body = lines.map((line) => {
    const size = line.size ?? 11;
    const move = options.relative
      ? `${line.x - cursor.x} ${line.y - cursor.y} Td`
      : `1 0 0 1 ${line.x} ${line.y} Tm`;
    cursor = { x: line.x, y: line.y };
    return `/F1 ${size} Tf\n${move}\n${showOperator(line.text, options.style)}`;
  });

  if (options.singleBlock === false) {
    for (const piece of body) ops.push(`BT\n${piece}\nET`);
  } else {
    ops.push(`BT\n${body.join('\n')}\nET`);
  }
  return ops.join('\n');
}

/** A ToUnicode CMap covering every character used on the page. */
function toUnicodeCMap(lines: Placed[]): string {
  const chars = [...new Set(lines.flatMap((l) => Array.from(l.text)))];
  const entries = chars
    .map((c) => {
      const code = c.charCodeAt(0).toString(16).padStart(4, '0');
      return `<${code}> <${code}>`;
    })
    .join('\n');
  return [
    '/CIDInit /ProcSet findresource begin',
    '12 dict begin begincmap',
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    `${chars.length} beginbfchar`,
    entries,
    'endbfchar',
    'endcmap end end',
  ].join('\n');
}

/** Assembles numbered objects into a file with a valid trailer. */
function assemble(objects: string[], streams: (Uint8Array | undefined)[]): Uint8Array {
  const parts: Uint8Array[] = [enc('%PDF-1.7\n')];
  objects.forEach((dict, i) => {
    const num = i + 1;
    const stream = streams[i];
    parts.push(enc(`${num} 0 obj\n${dict}\n`));
    if (stream) {
      parts.push(enc('stream\n'), stream, enc('\nendstream\n'));
    }
    parts.push(enc('endobj\n'));
  });
  parts.push(enc('trailer\n<< /Root 1 0 R >>\n%%EOF'));
  return concat(parts);
}

/** Builds a one-page PDF laying `lines` out at the given coordinates. */
export function buildPdf(lines: Placed[], options: BuildOptions): Uint8Array {
  return buildPdfPages([lines], options);
}

/** Builds a PDF with one page per entry in `pages`. */
export function buildPdfPages(pages: Placed[][], options: BuildOptions): Uint8Array {
  const identity = options.style === 'identity-h';
  const allLines = pages.flat();
  const contentBytes = pages.map((lines) => deflate(enc(contentFor(lines, options))));

  const dicts: string[] = [];
  const streams: (Uint8Array | undefined)[] = [];
  const push = (dict: string, stream?: Uint8Array) => {
    dicts.push(dict);
    streams.push(stream);
    return dicts.length; // object number
  };

  push('<< /Type /Catalog /Pages 2 0 R >>'); // 1
  push('placeholder'); // 2, the page tree, patched below

  const pageIndexes = pages.map(() => push('placeholder'));
  const contentIndexes = pages.map((_, i) =>
    options.viaForm
      ? push('<< /Length 0 /Filter /FlateDecode >>', deflate(enc('q 1 0 0 1 0 0 cm /X1 Do Q')))
      : push('<< /Length 0 /Filter /FlateDecode >>', contentBytes[i]),
  );

  let fontNum: number;
  let toUnicodeNum: number | undefined;

  if (identity) {
    toUnicodeNum = push('<< /Length 0 /Filter /FlateDecode >>', deflate(enc(toUnicodeCMap(allLines))));
    const descendant = push(
      `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AAAAAA+Calibri /DW ${GLYPH_WIDTH} ` +
        '/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> >>',
    );
    fontNum = push(
      `<< /Type /Font /Subtype /Type0 /BaseFont /AAAAAA+Calibri /Encoding /Identity-H ` +
        `/DescendantFonts [${descendant} 0 R] /ToUnicode ${toUnicodeNum} 0 R >>`,
    );
  } else {
    const widths = `[${new Array(224).fill(GLYPH_WIDTH).join(' ')}]`;
    fontNum = push(
      `<< /Type /Font /Subtype /TrueType /BaseFont /Helvetica /FirstChar 32 /LastChar 255 ` +
        `/Widths ${widths} /Encoding /WinAnsiEncoding >>`,
    );
  }

  const formNums = options.viaForm
    ? pages.map((_, i) =>
        push(
          `<< /Type /XObject /Subtype /Form /BBox [0 0 612 792] /Matrix [1 0 0 1 0 0] ` +
            `/Resources << /Font << /F1 ${fontNum} 0 R >> >> /Length 0 /Filter /FlateDecode >>`,
          contentBytes[i],
        ),
      )
    : [];

  pageIndexes.forEach((pageIndex, i) => {
    const resources =
      `<< /Font << /F1 ${fontNum} 0 R >>` +
      (formNums.length ? ` /XObject << /X1 ${formNums[i]} 0 R >>` : '') +
      ' >>';
    dicts[pageIndex - 1] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] ` +
      `/Resources ${resources} /Contents ${contentIndexes[i]} 0 R >>`;
  });

  dicts[1] =
    `<< /Type /Pages /Kids [${pageIndexes.map((n) => `${n} 0 R`).join(' ')}] /Count ${pages.length} >>`;

  return assemble(dicts, streams);
}

/** Lays plain lines out top-down at a fixed leading, like a normal resume. */
export function placeLines(lines: string[], startY = 740, leading = 16, x = 72): Placed[] {
  return lines.map((text, i) => ({ x, y: startY - i * leading, text }));
}
