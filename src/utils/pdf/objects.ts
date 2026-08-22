/**
 * A deliberately small PDF object reader.
 *
 * Enough of the file structure to answer the three questions text extraction
 * actually needs: which objects exist, what does each dictionary say, and what
 * are the decoded bytes of each stream. Cross-reference tables are ignored
 * entirely — every `N G obj … endobj` span is scanned directly, which also
 * means files with a damaged xref still read fine.
 */

import { inflate, inflateRaw } from 'pako';
import { bytesToBinaryString } from './binary';

export interface PdfObject {
  num: number;
  /** Raw dictionary text including the enclosing `<<`/`>>`, or '' if none. */
  dict: string;
  /** Decoded (inflated) stream bytes, when the object has a stream. */
  stream?: Uint8Array;
}

export type PdfObjects = Map<number, PdfObject>;

const WHITESPACE = ' \t\r\n\f\0';
const DELIMITERS = '()<>[]{}/%';

function isWhitespace(ch: string): boolean {
  return WHITESPACE.includes(ch);
}

function isDelimiter(ch: string): boolean {
  return DELIMITERS.includes(ch);
}

/** Advances past whitespace and `%` comments. */
function skipBlanks(s: string, start: number): number {
  let i = start;
  while (i < s.length) {
    const ch = s[i];
    if (isWhitespace(ch)) {
      i += 1;
    } else if (ch === '%') {
      while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i += 1;
    } else {
      break;
    }
  }
  return i;
}

/** End index of a `(...)` literal string, honouring escapes and nesting. */
function endOfLiteralString(s: string, start: number): number {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '\\') {
      i += 1;
    } else if (ch === '(') {
      depth += 1;
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return s.length;
}

/** End index of a balanced `<< … >>` or `[ … ]` span. */
function endOfBalanced(s: string, start: number, open: string, close: string): number {
  const step = open.length;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '(') {
      i = endOfLiteralString(s, i) - 1;
      continue;
    }
    if (s.startsWith(open, i)) {
      depth += 1;
      i += step - 1;
    } else if (s.startsWith(close, i)) {
      depth -= 1;
      if (depth === 0) return i + close.length;
      i += close.length - 1;
    }
  }
  return s.length;
}

/** Reads one object value starting at `start`. Returns its raw text. */
function readValue(s: string, start: number): { raw: string; end: number } {
  const i = skipBlanks(s, start);
  if (i >= s.length) return { raw: '', end: i };

  if (s.startsWith('<<', i)) {
    const end = endOfBalanced(s, i, '<<', '>>');
    return { raw: s.slice(i, end), end };
  }
  if (s[i] === '[') {
    const end = endOfBalanced(s, i, '[', ']');
    return { raw: s.slice(i, end), end };
  }
  if (s[i] === '(') {
    const end = endOfLiteralString(s, i);
    return { raw: s.slice(i, end), end };
  }
  if (s[i] === '<') {
    const end = s.indexOf('>', i);
    const stop = end === -1 ? s.length : end + 1;
    return { raw: s.slice(i, stop), end: stop };
  }
  if (s[i] === '/') {
    let j = i + 1;
    while (j < s.length && !isWhitespace(s[j]) && !isDelimiter(s[j])) j += 1;
    return { raw: s.slice(i, j), end: j };
  }

  // A bare token: number, keyword, or the head of an `N G R` reference.
  let j = i;
  while (j < s.length && !isWhitespace(s[j]) && !isDelimiter(s[j])) j += 1;
  const token = s.slice(i, j);
  const ref = s.slice(i, Math.min(s.length, i + 40)).match(/^(\d+)\s+(\d+)\s+R\b/);
  if (ref) return { raw: ref[0], end: i + ref[0].length };
  return { raw: token, end: j };
}

/**
 * Nesting depth at `index`, counted in `<<`/`>>` pairs. Used to ignore keys
 * that belong to a nested dictionary — looking up `/Widths` must not find the
 * one inside a nested `/FontDescriptor`.
 */
function depthAt(dict: string, index: number): number {
  let depth = 0;
  for (let i = 0; i < index; i++) {
    if (dict[i] === '(') {
      i = endOfLiteralString(dict, i) - 1;
      continue;
    }
    if (dict.startsWith('<<', i)) {
      depth += 1;
      i += 1;
    } else if (dict.startsWith('>>', i)) {
      depth -= 1;
      i += 1;
    }
  }
  return depth;
}

/** Raw text of `key`'s value in a dictionary, or undefined when absent. */
export function dictValue(dict: string, key: string): string | undefined {
  if (!dict) return undefined;
  const re = new RegExp(`/${key}(?![A-Za-z0-9])`, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(dict)) !== null) {
    // Depth 1 is the dictionary's own level (the text starts with `<<`).
    if (depthAt(dict, m.index) !== 1) continue;
    return readValue(dict, m.index + m[0].length).raw;
  }
  return undefined;
}

/** Object number of an indirect reference value (`12 0 R`). */
export function asRef(raw: string | undefined): number | undefined {
  const m = raw?.match(/^(\d+)\s+\d+\s+R$/);
  return m ? Number(m[1]) : undefined;
}

export function asNumber(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

/** `/Name` -> `Name`. */
export function asName(raw: string | undefined): string | undefined {
  return raw?.startsWith('/') ? raw.slice(1) : undefined;
}

/** Follows indirect references until a direct value is reached. */
export function resolve(objects: PdfObjects, raw: string | undefined, depth = 0): string | undefined {
  if (raw === undefined || depth > 8) return raw;
  const ref = asRef(raw);
  if (ref === undefined) return raw;
  const target = objects.get(ref);
  if (!target) return undefined;
  return resolve(objects, target.dict, depth + 1);
}

/** Reads `key` from `dict`, following an indirect reference if it finds one. */
export function dictLookup(objects: PdfObjects, dict: string, key: string): string | undefined {
  return resolve(objects, dictValue(dict, key));
}

/** Numbers inside an array value, in order. */
export function arrayNumbers(raw: string | undefined): number[] {
  if (!raw) return [];
  return (raw.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
}

/** Indirect references inside an array value, in order. */
export function arrayRefs(raw: string | undefined): number[] {
  if (!raw) return [];
  return [...raw.matchAll(/(\d+)\s+\d+\s+R\b/g)].map((m) => Number(m[1]));
}

/**
 * Whether bytes read as text rather than as a compressed or encrypted payload.
 * Sampled, so the check stays cheap on large streams.
 */
function looksLikeText(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, 2048);
  if (!limit) return false;
  let printable = 0;
  for (let i = 0; i < limit; i++) {
    const b = bytes[i];
    if (b === 9 || b === 10 || b === 13 || (b >= 0x20 && b < 0x7f)) printable += 1;
  }
  return printable / limit > 0.85;
}

/** Inflates a stream according to its `/Filter`, tolerating a broken header. */
function decodeStream(dict: string, raw: Uint8Array): Uint8Array | undefined {
  const filter = dictValue(dict, 'Filter') ?? '';
  if (!/Flate/i.test(filter)) {
    // Unfiltered, or a filter we do not implement (DCT/JPX images and the
    // like). Passing the bytes through is right for the former and harmless
    // for the latter — the content lexer ignores anything unparseable.
    return /(?:DCT|JPX|CCITT|JBIG2|RunLength|LZW)/i.test(filter) ? undefined : raw;
  }
  try {
    return inflate(raw);
  } catch {
    try {
      return inflateRaw(raw);
    } catch {
      // Some writers leave junk before the zlib header; retry from the first
      // plausible start byte rather than dropping the whole stream.
      for (let skip = 1; skip < 4 && skip < raw.length; skip++) {
        try {
          return inflate(raw.subarray(skip));
        } catch {
          /* keep trying */
        }
      }
      // A /Filter that does not actually describe the bytes is common in
      // hand-assembled and repaired files, and the content lexer copes with
      // plain text — but only hand the bytes over if they *are* text. An
      // encrypted PDF also fails to inflate, and feeding its ciphertext to the
      // lexer would emit random glyphs as if they were the resume.
      return looksLikeText(raw) ? raw : undefined;
    }
  }
}

/**
 * Expands an object stream (`/Type /ObjStm`), where PDF 1.5+ writers pack the
 * small dictionaries — fonts, pages, resources — that this reader needs.
 * Without this step those objects are invisible and every font resolves to
 * "unknown", which is exactly when extraction degrades to gibberish.
 */
function expandObjectStream(objects: PdfObjects, obj: PdfObject): void {
  if (!obj.stream) return;
  const count = asNumber(dictValue(obj.dict, 'N'));
  const first = asNumber(dictValue(obj.dict, 'First'));
  if (!count || first === undefined) return;

  const text = bytesToBinaryString(obj.stream);
  const header = text.slice(0, first);
  const nums = (header.match(/\d+/g) ?? []).map(Number);

  for (let i = 0; i < count; i++) {
    const num = nums[i * 2];
    const offset = nums[i * 2 + 1];
    if (num === undefined || offset === undefined) break;
    if (objects.has(num)) continue; // a directly stored object wins
    const value = readValue(text, first + offset);
    if (value.raw.startsWith('<<')) objects.set(num, { num, dict: value.raw });
  }
}

/**
 * Scans every `N G obj … endobj` span in the file.
 *
 * Objects are read in file order and later definitions win, matching how an
 * incrementally-updated PDF is meant to be interpreted.
 */
export function parsePdfObjects(bytes: Uint8Array): PdfObjects {
  const binary = bytesToBinaryString(bytes);
  const objects: PdfObjects = new Map();

  const objRe = /(\d{1,10})\s+(\d{1,5})\s+obj\b/g;
  let m: RegExpExecArray | null;

  while ((m = objRe.exec(binary)) !== null) {
    const num = Number(m[1]);
    const bodyStart = m.index + m[0].length;

    // `stream` must be located before `endobj`, since a binary payload can
    // contain either word by chance.
    const streamMarker = binary.slice(bodyStart).match(/\bstream\r\n|\bstream\n|\bstream\r/);
    const streamAt = streamMarker ? bodyStart + (streamMarker.index ?? 0) : -1;
    const endObjAt = binary.indexOf('endobj', bodyStart);

    let dict = '';
    let stream: Uint8Array | undefined;
    let advanceTo = endObjAt === -1 ? bodyStart : endObjAt + 6;

    if (streamAt !== -1 && (endObjAt === -1 || streamAt < endObjAt)) {
      dict = binary.slice(bodyStart, streamAt).trim();
      const dataStart = streamAt + (streamMarker?.[0].length ?? 0);

      // Prefer the declared /Length; fall back to searching for `endstream`
      // when it is indirect, wrong, or missing.
      const declared = asNumber(dictValue(dict, 'Length'));
      let dataEnd = -1;
      if (declared !== undefined && declared > 0 && dataStart + declared <= binary.length) {
        const after = binary.slice(dataStart + declared, dataStart + declared + 20);
        if (/^\s*endstream/.test(after)) dataEnd = dataStart + declared;
      }
      if (dataEnd === -1) {
        const found = binary.indexOf('endstream', dataStart);
        dataEnd = found === -1 ? binary.length : found;
        // Trim the EOL that writers put before `endstream`.
        while (dataEnd > dataStart && (binary[dataEnd - 1] === '\n' || binary[dataEnd - 1] === '\r')) dataEnd -= 1;
      }

      stream = decodeStream(dict, bytes.subarray(dataStart, dataEnd));
      const endStreamAt = binary.indexOf('endstream', dataEnd);
      const objEnd = binary.indexOf('endobj', endStreamAt === -1 ? dataEnd : endStreamAt);
      advanceTo = objEnd === -1 ? dataEnd : objEnd + 6;
    } else if (endObjAt !== -1) {
      dict = binary.slice(bodyStart, endObjAt).trim();
    }

    if (!dict.startsWith('<<')) {
      // Objects that are a bare array/number/string still matter for /Widths
      // and /Contents arrays, so keep the raw text as the "dict".
      dict = readValue(dict, 0).raw;
    }

    objects.set(num, { num, dict, stream });

    // The scan must always move forward, or a malformed span loops for ever.
    objRe.lastIndex = Math.max(advanceTo, objRe.lastIndex);
  }

  for (const obj of [...objects.values()]) {
    if (/\/Type\s*\/ObjStm/.test(obj.dict)) expandObjectStream(objects, obj);
  }

  return objects;
}
