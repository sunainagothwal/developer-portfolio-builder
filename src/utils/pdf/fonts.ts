/**
 * Font resources, reduced to the two things text extraction needs: how many
 * bytes make up a character code, and what Unicode each code stands for.
 *
 * Modern writers (Word, Chrome, most web-to-PDF services) embed subset fonts
 * with `Identity-H` encoding, where a code is an arbitrary glyph id with no
 * relationship to Unicode. The only way back to real text is the font's
 * `/ToUnicode` CMap — without it those documents extract as nothing at all.
 */

import { bytesToBinaryString, hexToUtf16, winAnsiChar } from './binary';
import {
  arrayNumbers,
  asName,
  asNumber,
  asRef,
  dictLookup,
  dictValue,
  resolve,
  type PdfObjects,
} from './objects';

export interface PdfFont {
  /** Identity-H and friends address glyphs with two bytes per code. */
  twoByte: boolean;
  /** Code -> text, from `/ToUnicode`. */
  toUnicode?: Map<number, string>;
  /** Code -> glyph advance in 1/1000 em. */
  widths: Map<number, number>;
  defaultWidth: number;
}

export const FALLBACK_FONT: PdfFont = {
  twoByte: false,
  widths: new Map(),
  // 0.5 em is the usual average for a proportional Latin face and only ever
  // feeds gap detection, never the text itself.
  defaultWidth: 500,
};

/**
 * Parses a ToUnicode CMap: `beginbfchar`/`beginbfrange` sections mapping
 * character codes to UTF-16BE destinations.
 */
export function parseToUnicodeCMap(text: string): { map: Map<number, string>; twoByte: boolean } {
  const map = new Map<number, string>();
  let twoByte = false;

  const codespace = text.match(/begincodespacerange([\s\S]*?)endcodespacerange/);
  if (codespace) {
    const first = codespace[1].match(/<([0-9a-fA-F]+)>/);
    if (first && first[1].length >= 4) twoByte = true;
  }

  for (const section of text.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const pair of section[1].matchAll(/<([0-9a-fA-F]+)>\s*(?:<([0-9a-fA-F]+)>|\/(\w+))/g)) {
      if (pair[1].length >= 4) twoByte = true;
      const code = parseInt(pair[1], 16);
      if (pair[2] !== undefined) map.set(code, hexToUtf16(pair[2]));
    }
  }

  for (const section of text.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    // A bfrange entry is `<lo> <hi>` followed by EITHER a destination array
    // `[<d1> <d2> ...]` OR a single `<dst>` that increments across the range.
    //
    // The two forms must be read in ONE ordered pass. Scanning for them
    // separately lets the single-destination pattern re-match *inside* an
    // array, where any three consecutive destinations look exactly like
    // `<lo> <hi> <dst>`. That silently overwrote correct mappings with
    // nonsense, which is what turned real resumes into a substitution cipher
    // ("HTML" read as "HT=L") while leaving most of the page intact.
    const entryRe = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F]+>)/g;
    let entry: RegExpExecArray | null;

    while ((entry = entryRe.exec(section[1])) !== null) {
      if (entry[1].length >= 4) twoByte = true;
      const lo = parseInt(entry[1], 16);
      const hi = parseInt(entry[2], 16);
      const destination = entry[3];

      if (destination.startsWith('[')) {
        const items = [...destination.matchAll(/<([0-9a-fA-F]+)>/g)];
        items.forEach((item, i) => {
          if (lo + i <= hi) map.set(lo + i, hexToUtf16(item[1]));
        });
        continue;
      }

      // Only the final UTF-16 unit increments across the range; the 10k guard
      // keeps a corrupt range from allocating for ever.
      const base = hexToUtf16(destination.slice(1, -1));
      if (!base) continue;
      const last = base.charCodeAt(base.length - 1);
      const prefix = base.slice(0, -1);
      for (let c = lo; c <= hi && c - lo < 10000; c++) {
        map.set(c, prefix + String.fromCharCode(last + (c - lo)));
      }
    }
  }

  return { map, twoByte };
}

/** `/W [ 3 [500 600] 10 20 750 ]` — CID widths for a Type0 font. */
function parseCidWidths(raw: string | undefined, into: Map<number, number>): void {
  if (!raw) return;
  const tokenRe = /\[|\]|-?\d+(?:\.\d+)?/g;
  const tokens: (string | number)[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(raw)) !== null) {
    tokens.push(m[0] === '[' || m[0] === ']' ? m[0] : Number(m[0]));
  }
  // The outermost brackets belong to /W itself.
  if (tokens[0] === '[') tokens.shift();

  for (let i = 0; i < tokens.length; ) {
    const start = tokens[i];
    if (typeof start !== 'number') {
      i += 1;
      continue;
    }
    if (tokens[i + 1] === '[') {
      let c = start;
      let j = i + 2;
      while (j < tokens.length && typeof tokens[j] === 'number') {
        into.set(c, tokens[j] as number);
        c += 1;
        j += 1;
      }
      i = tokens[j] === ']' ? j + 1 : j;
    } else if (typeof tokens[i + 1] === 'number' && typeof tokens[i + 2] === 'number') {
      const end = tokens[i + 1] as number;
      const width = tokens[i + 2] as number;
      for (let c = start; c <= end && c - start < 65536; c++) into.set(c, width);
      i += 3;
    } else {
      i += 1;
    }
  }
}

/** Builds the extraction-facing view of one font dictionary. */
export function readFont(objects: PdfObjects, fontDict: string): PdfFont {
  const subtype = asName(dictValue(fontDict, 'Subtype'));
  const encoding = dictValue(fontDict, 'Encoding') ?? '';
  const widths = new Map<number, number>();

  let twoByte = subtype === 'Type0' || /Identity-[HV]|UCS2|UTF16/i.test(encoding);
  let defaultWidth = FALLBACK_FONT.defaultWidth;

  let toUnicode: Map<number, string> | undefined;
  const toUnicodeRef = asRef(dictValue(fontDict, 'ToUnicode'));
  const toUnicodeStream = toUnicodeRef !== undefined ? objects.get(toUnicodeRef)?.stream : undefined;
  if (toUnicodeStream) {
    const parsed = parseToUnicodeCMap(bytesToBinaryString(toUnicodeStream));
    if (parsed.map.size) toUnicode = parsed.map;
    // A two-byte codespace in the CMap is authoritative: it describes exactly
    // how the strings in the content stream are chunked.
    if (parsed.twoByte) twoByte = true;
  }

  if (subtype === 'Type0') {
    const descendantRef = arrayRefsFirst(dictValue(fontDict, 'DescendantFonts'));
    const descendant =
      descendantRef !== undefined
        ? objects.get(descendantRef)?.dict
        : resolve(objects, dictValue(fontDict, 'DescendantFonts'));
    if (descendant) {
      defaultWidth = asNumber(dictLookup(objects, descendant, 'DW')) ?? 1000;
      parseCidWidths(dictLookup(objects, descendant, 'W'), widths);
    } else {
      defaultWidth = 1000;
    }
  } else {
    const firstChar = asNumber(dictLookup(objects, fontDict, 'FirstChar')) ?? 0;
    const list = arrayNumbers(dictLookup(objects, fontDict, 'Widths'));
    list.forEach((w, i) => widths.set(firstChar + i, w));

    const descriptor = dictLookup(objects, fontDict, 'FontDescriptor');
    const missing = descriptor ? asNumber(dictLookup(objects, descriptor, 'MissingWidth')) : undefined;
    if (missing !== undefined) defaultWidth = missing;
  }

  return { twoByte, toUnicode, widths, defaultWidth };
}

function arrayRefsFirst(raw: string | undefined): number | undefined {
  const m = raw?.match(/(\d+)\s+\d+\s+R/);
  return m ? Number(m[1]) : undefined;
}

/** Splits a shown string into character codes for this font. */
export function toCodes(bytes: number[], font: PdfFont): number[] {
  if (!font.twoByte) return bytes;
  const codes: number[] = [];
  for (let i = 0; i < bytes.length; i += 2) {
    codes.push((bytes[i] << 8) | (bytes[i + 1] ?? 0));
  }
  return codes;
}

/**
 * Text for one character code.
 *
 * Returns '' for a two-byte code with no ToUnicode entry: the code is a glyph
 * id in an embedded subset, and emitting it as a character would inject
 * mojibake into the resume rather than admit the text is unreadable.
 */
export function codeToText(code: number, font: PdfFont): string {
  const mapped = font.toUnicode?.get(code);
  if (mapped !== undefined) return mapped;
  if (font.twoByte) return '';
  return winAnsiChar(code);
}

export function codeWidth(code: number, font: PdfFont): number {
  return font.widths.get(code) ?? font.defaultWidth;
}
