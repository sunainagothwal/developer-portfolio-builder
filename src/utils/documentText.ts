import { inflateRaw } from 'pako';
import { bytesToBinaryString, utf8Decode } from './pdf/binary';

/**
 * Text extraction from PDF and DOCX bytes.
 *
 * Both formats store their content Flate (zlib) compressed, so extraction is
 * only possible by actually inflating those streams — `pako` does that in pure
 * JS with no native module. Pure and dependency-light so it can be unit tested
 * outside React Native.
 *
 * The PDF side lives in `./pdf`: it is a real content-stream interpreter
 * (positions, fonts, encodings) rather than a pattern match, because resumes
 * from Word, Chrome and LaTeX all lay text out in ways a pattern match cannot
 * turn back into lines.
 */

export { bytesToBinaryString } from './pdf/binary';
export { extractPdfText } from './pdf/extract';

/**
 * Reads a little-endian unsigned integer. Returns NaN when the read would run
 * past the end of the buffer so callers can detect a truncated/corrupt file
 * instead of silently computing NaN offsets.
 */
function readUInt(bytes: Uint8Array, offset: number, size: number): number {
  if (offset < 0 || offset + size > bytes.length) return NaN;
  let value = 0;
  for (let i = size - 1; i >= 0; i--) value = value * 256 + bytes[offset + i];
  return value;
}

/**
 * Pulls `word/document.xml` out of a DOCX (a ZIP archive) and converts its
 * paragraph runs into plain text. Handles both stored and deflated entries.
 */
export function extractDocxText(bytes: Uint8Array): string {
  const binary = bytesToBinaryString(bytes);
  const target = 'word/document.xml';

  let xml = '';
  // Scan local file headers (PK\x03\x04) for the document part.
  let offset = binary.indexOf('PK\x03\x04');
  while (offset !== -1) {
    const method = readUInt(bytes, offset + 8, 2);
    const compressedSize = readUInt(bytes, offset + 18, 4);
    const nameLength = readUInt(bytes, offset + 26, 2);
    const extraLength = readUInt(bytes, offset + 28, 2);

    // A truncated or corrupt header yields NaN — stop rather than compute NaN
    // offsets, which would make the search restart from 0 and loop forever.
    if (!Number.isFinite(method + compressedSize + nameLength + extraLength)) break;

    const nameStart = offset + 30;
    const name = binary.slice(nameStart, nameStart + nameLength);
    const dataStart = nameStart + nameLength + extraLength;

    if (name === target && compressedSize > 0) {
      const data = bytes.subarray(dataStart, dataStart + compressedSize);
      try {
        xml = method === 0 ? bytesToBinaryString(data) : utf8Decode(inflateRaw(data));
      } catch {
        xml = '';
      }
      break;
    }

    // The next search must strictly advance, otherwise we rescan the same
    // header indefinitely.
    const nextFrom = Math.max(dataStart + Math.max(compressedSize, 1), offset + 4);
    const next = binary.indexOf('PK\x03\x04', nextFrom);
    offset = next > offset ? next : -1;
  }

  if (!xml) return '';

  // Paragraph and line breaks become newlines; <w:t> runs carry the text.
  // Table cells end with </w:tc>, which is a column break rather than a line
  // break — resumes built on invisible tables put the role and its dates in
  // adjacent cells, and they belong on one line.
  return xml
    .replace(/<w:p\b[^>]*\/?>/g, '\n')
    .replace(/<w:br\b[^>]*\/?>/g, '\n')
    .replace(/<w:tab\b[^>]*\/?>/g, ' ')
    .replace(/<\/w:tc>/g, ' ')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
