/**
 * Unit cover for the PDF reader's internals — the parts that decide whether a
 * real-world file yields text at all.
 */

import { deflate } from 'pako';
import { parsePdfObjects, dictValue, dictLookup, arrayNumbers, asRef } from '../src/utils/pdf/objects';
import { parseToUnicodeCMap, readFont, toCodes, codeToText, codeWidth } from '../src/utils/pdf/fonts';
import { extractPdfText } from '../src/utils/documentText';

const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);
const concat = (parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

describe('parsePdfObjects', () => {
  it('reads dictionaries and inflates streams', () => {
    const body = deflate(enc('BT /F1 12 Tf (hello) Tj ET'));
    const pdf = concat([
      enc('%PDF-1.7\n1 0 obj\n<< /Type /Page /Rotate 0 >>\nendobj\n'),
      enc('2 0 obj\n<< /Length 0 /Filter /FlateDecode >>\nstream\n'),
      body,
      enc('\nendstream\nendobj\n%%EOF'),
    ]);

    const objects = parsePdfObjects(pdf);
    expect(objects.get(1)?.dict).toContain('/Type /Page');
    expect(objects.get(2)?.stream).toBeDefined();
    expect(String.fromCharCode(...(objects.get(2)!.stream as Uint8Array))).toContain('(hello) Tj');
  });

  it('ignores a key that belongs to a nested dictionary', () => {
    const dict = '<< /Type /Font /FontDescriptor << /MissingWidth 250 >> /FirstChar 32 >>';
    expect(dictValue(dict, 'FirstChar')).toBe('32');
    expect(dictValue(dict, 'MissingWidth')).toBeUndefined();
  });

  it('reads array, name and reference values', () => {
    const dict = '<< /Widths [500 600 700] /Encoding /WinAnsiEncoding /ToUnicode 9 0 R >>';
    expect(arrayNumbers(dictValue(dict, 'Widths'))).toEqual([500, 600, 700]);
    expect(dictValue(dict, 'Encoding')).toBe('/WinAnsiEncoding');
    expect(asRef(dictValue(dict, 'ToUnicode'))).toBe(9);
  });

  it('expands objects packed into an object stream', () => {
    // PDF 1.5+ writers put page and font dictionaries inside an /ObjStm, where
    // a scanner that only looks for `N 0 obj` cannot see them.
    const inner = ['<< /Type /Font /Subtype /TrueType /FirstChar 65 >>', '<< /Type /Page /Rotate 0 >>'];
    const offsets: number[] = [];
    let payload = '';
    for (const obj of inner) {
      offsets.push(payload.length);
      payload += `${obj} `;
    }
    const header = `7 ${offsets[0]} 8 ${offsets[1]} `;
    const stream = deflate(enc(header + payload));

    const pdf = concat([
      enc(`%PDF-1.7\n1 0 obj\n<< /Type /ObjStm /N 2 /First ${header.length} /Filter /FlateDecode >>\nstream\n`),
      stream,
      enc('\nendstream\nendobj\n%%EOF'),
    ]);

    const objects = parsePdfObjects(pdf);
    expect(objects.get(7)?.dict).toContain('/Subtype /TrueType');
    expect(objects.get(8)?.dict).toContain('/Type /Page');
  });

  it('follows an indirect reference when reading a value', () => {
    const pdf = enc(
      '%PDF-1.7\n1 0 obj\n<< /Font 2 0 R >>\nendobj\n2 0 obj\n<< /F1 3 0 R >>\nendobj\n%%EOF',
    );
    const objects = parsePdfObjects(pdf);
    expect(dictLookup(objects, objects.get(1)!.dict, 'Font')).toContain('/F1');
  });
});

describe('parseToUnicodeCMap', () => {
  it('reads bfchar mappings', () => {
    const { map, twoByte } = parseToUnicodeCMap(
      '1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n2 beginbfchar\n<0003> <0041>\n<0004> <0042>\nendbfchar',
    );
    expect(twoByte).toBe(true);
    expect(map.get(3)).toBe('A');
    expect(map.get(4)).toBe('B');
  });

  it('reads an incrementing bfrange', () => {
    const { map } = parseToUnicodeCMap('1 beginbfrange\n<0010> <0013> <0041>\nendbfrange');
    expect(map.get(0x10)).toBe('A');
    expect(map.get(0x13)).toBe('D');
  });

  it('reads a bfrange with an explicit destination array', () => {
    const { map } = parseToUnicodeCMap('1 beginbfrange\n<0020> <0022> [<0058> <0059> <005A>]\nendbfrange');
    expect(map.get(0x20)).toBe('X');
    expect(map.get(0x22)).toBe('Z');
  });

  it('decodes a surrogate pair destination', () => {
    const { map } = parseToUnicodeCMap('1 beginbfchar\n<0005> <D83DDE00>\nendbfchar');
    expect(map.get(5)).toBe('😀');
  });
});

describe('readFont', () => {
  it('treats a Type0 Identity-H font as two-byte and applies its ToUnicode', () => {
    const cmap = deflate(enc('1 beginbfchar\n<0025> <0048>\nendbfchar'));
    const pdf = concat([
      enc('%PDF-1.7\n5 0 obj\n<< /Length 0 /Filter /FlateDecode >>\nstream\n'),
      cmap,
      enc('\nendstream\nendobj\n'),
      enc(
        '6 0 obj\n<< /Type /Font /Subtype /CIDFontType2 /DW 1000 /W [ 37 [600] ] >>\nendobj\n' +
          '7 0 obj\n<< /Type /Font /Subtype /Type0 /Encoding /Identity-H /DescendantFonts [6 0 R] /ToUnicode 5 0 R >>\nendobj\n%%EOF',
      ),
    ]);

    const objects = parsePdfObjects(pdf);
    const font = readFont(objects, objects.get(7)!.dict);

    expect(font.twoByte).toBe(true);
    expect(toCodes([0x00, 0x25], font)).toEqual([0x25]);
    expect(codeToText(0x25, font)).toBe('H');
    expect(codeWidth(0x25, font)).toBe(600);
    expect(codeWidth(0x99, font)).toBe(1000); // /DW
  });

  it('drops an unmapped two-byte code instead of emitting mojibake', () => {
    const objects = parsePdfObjects(
      enc('%PDF-1.7\n1 0 obj\n<< /Type /Font /Subtype /Type0 /Encoding /Identity-H >>\nendobj\n%%EOF'),
    );
    const font = readFont(objects, objects.get(1)!.dict);
    expect(codeToText(0x1234, font)).toBe('');
  });

  it('maps WinAnsi high bytes for a simple font', () => {
    const objects = parsePdfObjects(
      enc('%PDF-1.7\n1 0 obj\n<< /Type /Font /Subtype /TrueType /FirstChar 65 /Widths [722] >>\nendobj\n%%EOF'),
    );
    const font = readFont(objects, objects.get(1)!.dict);
    expect(font.twoByte).toBe(false);
    expect(codeToText(0x95, font)).toBe('•'); // bullet, not a control character
    expect(codeToText(0x97, font)).toBe('—');
    expect(codeWidth(65, font)).toBe(722);
  });
});

describe('extractPdfText resilience', () => {
  it('recovers text when the page tree cannot be walked', () => {
    // No /Catalog, no /Page — only a content stream. The old reader was the
    // only path here; the new one falls back to it rather than giving up.
    const body = deflate(enc('BT /F1 12 Tf 1 0 0 1 72 700 Tm (Stanford University) Tj ET'));
    const pdf = concat([
      enc('%PDF-1.4\n1 0 obj\n<< /Length 0 /Filter /FlateDecode >>\nstream\n'),
      body,
      enc('\nendstream\nendobj\n%%EOF'),
    ]);
    expect(extractPdfText(pdf)).toContain('Stanford University');
  });

  it('reads a stream whose /Filter claims Flate but whose bytes are not', () => {
    const pdf = concat([
      enc('%PDF-1.4\n1 0 obj\n<< /Length 0 /Filter /FlateDecode >>\nstream\n'),
      enc('BT /F1 12 Tf 1 0 0 1 72 700 Tm (Plain text stream) Tj ET'),
      enc('\nendstream\nendobj\n%%EOF'),
    ]);
    expect(extractPdfText(pdf)).toContain('Plain text stream');
  });

  it('emits nothing for a stream it cannot decrypt rather than random glyphs', () => {
    // An encrypted PDF fails to inflate exactly like a mislabelled one. Its
    // ciphertext must not reach the content lexer.
    const cipher = new Uint8Array(400);
    for (let i = 0; i < cipher.length; i++) cipher[i] = (i * 37 + 11) & 0xff;
    const pdf = concat([
      enc('%PDF-1.4\n1 0 obj\n<< /Length 400 /Filter /FlateDecode >>\nstream\n'),
      cipher,
      enc('\nendstream\nendobj\ntrailer\n<< /Encrypt 9 0 R >>\n%%EOF'),
    ]);
    expect(extractPdfText(pdf)).toBe('');
  });

  it('returns an empty string for bytes that are not a PDF', () => {
    expect(extractPdfText(enc('not a pdf at all'))).toBe('');
  });

  it('does not hang on a truncated stream', () => {
    const pdf = enc('%PDF-1.4\n1 0 obj\n<< /Length 999999 /Filter /FlateDecode >>\nstream\n\x78\x9c');
    expect(() => extractPdfText(pdf)).not.toThrow();
  });
});
