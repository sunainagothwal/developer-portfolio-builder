/**
 * Byte/string helpers shared by the PDF and DOCX readers.
 *
 * PDF is a byte-oriented format with ASCII structure markers wrapped around
 * arbitrary binary payloads, so everything here works on a Latin-1 ("binary")
 * view where one char === one byte and offsets stay aligned with the source
 * bytes.
 */

/** Latin-1 view of the bytes; keeps ASCII structural markers byte-aligned. */
export function bytesToBinaryString(bytes: Uint8Array): string {
  let out = '';
  const CHUNK = 0x8000; // stays under the spread-argument limit
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return out;
}

export function utf8Decode(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    if (b < 0x80) {
      out += String.fromCharCode(b);
      i += 1;
    } else if (b < 0xe0) {
      out += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f));
      i += 2;
    } else if (b < 0xf0) {
      out += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f));
      i += 3;
    } else {
      const cp =
        ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f);
      out += String.fromCodePoint(cp);
      i += 4;
    }
  }
  return out;
}

/**
 * Decodes a UTF-16BE hex payload, the destination format used by ToUnicode
 * CMaps. Surrogate pairs are kept intact, so astral characters survive.
 */
export function hexToUtf16(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length <= 2) return String.fromCharCode(parseInt(clean.padEnd(2, '0'), 16));
  let out = '';
  for (let i = 0; i + 3 < clean.length + 1; i += 4) {
    const unit = parseInt(clean.slice(i, i + 4).padEnd(4, '0'), 16);
    if (Number.isNaN(unit)) break;
    out += String.fromCharCode(unit);
  }
  return out;
}

/**
 * The 0x80-0x9F block where WinAnsi (the default encoding for text produced by
 * Word and most Windows tooling) diverges from Latin-1. Getting this wrong
 * turns curly quotes and en dashes into control characters, which then break
 * the date-range and separator patterns the resume parser relies on.
 */
const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€', 0x82: '‚', 0x83: 'ƒ', 0x84: '„', 0x85: '…',
  0x86: '†', 0x87: '‡', 0x88: 'ˆ', 0x89: '‰', 0x8a: 'Š',
  0x8b: '‹', 0x8c: 'Œ', 0x8e: 'Ž', 0x91: '‘', 0x92: '’',
  0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—',
  0x98: '˜', 0x99: '™', 0x9a: 'š', 0x9b: '›', 0x9c: 'œ',
  0x9e: 'ž', 0x9f: 'Ÿ',
};

export function winAnsiChar(code: number): string {
  return WIN_ANSI_HIGH[code] ?? String.fromCharCode(code);
}
