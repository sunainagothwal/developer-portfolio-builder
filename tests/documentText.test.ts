import { deflate, deflateRaw } from 'pako';
import { extractPdfText, extractDocxText, bytesToBinaryString } from '../src/utils/documentText';

const enc = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

const concat = (...parts: Uint8Array[]) => {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

const u16 = (n: number) => Uint8Array.from([n & 0xff, (n >> 8) & 0xff]);
const u32 = (n: number) => Uint8Array.from([n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, (n >> 24) & 0xff]);

/** Builds a minimal PDF whose content stream is zlib-compressed (the norm). */
function makePdf(lines: string[], compress: boolean): Uint8Array {
  const content = lines.map((l) => `BT /F1 12 Tf (${l}) Tj ET`).join('\n');
  const body = compress ? deflate(enc(content)) : enc(content);
  return concat(
    enc('%PDF-1.4\n1 0 obj\n<< /Length 0 /Filter /FlateDecode >>\nstream\n'),
    body,
    enc('\nendstream\nendobj\n%%EOF'),
  );
}

/** Builds a minimal DOCX (ZIP) containing a deflated word/document.xml. */
function makeDocx(paragraphs: string[]): Uint8Array {
  const xml =
    '<?xml version="1.0"?><w:document><w:body>' +
    paragraphs.map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`).join('') +
    '</w:body></w:document>';
  const name = 'word/document.xml';
  const compressed = deflateRaw(enc(xml));

  const header = concat(
    enc('PK\x03\x04'),
    u16(20), // version
    u16(0), // flags
    u16(8), // method: deflate
    u16(0),
    u16(0), // time/date
    u32(0), // crc (unchecked by our reader)
    u32(compressed.length),
    u32(xml.length),
    u16(name.length),
    u16(0), // extra length
    enc(name),
  );
  return concat(header, compressed, enc('PK\x05\x06'));
}

describe('bytesToBinaryString', () => {
  it('round-trips ASCII without corruption', () => {
    expect(bytesToBinaryString(enc('EDUCATION'))).toBe('EDUCATION');
  });

  it('handles buffers larger than the chunk size', () => {
    const big = enc('x'.repeat(0x8000 * 2 + 5));
    expect(bytesToBinaryString(big)).toHaveLength(0x8000 * 2 + 5);
  });
});

describe('extractPdfText', () => {
  const LINES = ['Jane Doe', 'EDUCATION', 'Stanford University | B.S. Computer Science | 2014 - 2018'];

  it('inflates FlateDecode streams and recovers the text', () => {
    const text = extractPdfText(makePdf(LINES, true));
    expect(text).toContain('Jane Doe');
    expect(text).toContain('EDUCATION');
    expect(text).toContain('Stanford University');
  });

  it('still reads uncompressed streams', () => {
    const text = extractPdfText(makePdf(LINES, false));
    expect(text).toContain('Stanford University');
  });

  it('splits text into separate lines on positioning operators', () => {
    const text = extractPdfText(makePdf(LINES, true));
    expect(text.split('\n').length).toBeGreaterThanOrEqual(3);
  });

  it('decodes escaped octal and parenthesis sequences', () => {
    const pdf = makePdf(['B.Sc \\050Hons\\051'], true);
    expect(extractPdfText(pdf)).toContain('(Hons)');
  });

  it('returns empty string for bytes with no streams', () => {
    expect(extractPdfText(enc('not a pdf at all'))).toBe('');
  });
});

describe('extractDocxText', () => {
  it('inflates word/document.xml and returns paragraph text', () => {
    const text = extractDocxText(makeDocx(['Jane Doe', 'EDUCATION', 'MIT | M.S. AI | 2018 - 2020']));
    expect(text).toContain('Jane Doe');
    expect(text).toContain('EDUCATION');
    expect(text).toContain('MIT');
  });

  it('puts each paragraph on its own line so headings can be detected', () => {
    const text = extractDocxText(makeDocx(['SKILLS', 'TypeScript, Go']));
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    expect(lines).toContain('SKILLS');
    expect(lines).toContain('TypeScript, Go');
  });

  it('unescapes XML entities', () => {
    const text = extractDocxText(makeDocx(['R&amp;D &lt;Team&gt;']));
    expect(text).toContain('R&D <Team>');
  });

  it('returns empty string when the document part is missing', () => {
    expect(extractDocxText(enc('PK\x03\x04 garbage'))).toBe('');
  });
});
