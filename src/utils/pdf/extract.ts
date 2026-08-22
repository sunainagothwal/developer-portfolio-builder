/**
 * PDF -> plain text.
 *
 * Walks the page tree, resolves each page's font resources, runs its content
 * streams through the interpreter, and lays the resulting glyph positions back
 * out as lines. Falls back to scanning every stream in the file when the
 * structure is too damaged to walk, so a malformed PDF degrades to partial
 * text rather than to nothing.
 */

import { bytesToBinaryString } from './binary';
import { extractRuns, type ContentContext, type Matrix, type TextRun } from './content';
import { readFont, type PdfFont } from './fonts';
import { runsToText } from './layout';
import { tidyExtractedText as tidy } from './tidy';
import {
  arrayNumbers,
  arrayRefs,
  asName,
  asRef,
  dictLookup,
  dictValue,
  parsePdfObjects,
  type PdfObject,
  type PdfObjects,
} from './objects';

/** Concatenated, decoded content streams for one page. */
function pageContent(objects: PdfObjects, pageDict: string): string {
  const raw = dictValue(pageDict, 'Contents');
  if (!raw) return '';

  const refs = asRef(raw) !== undefined ? [asRef(raw) as number] : arrayRefs(raw);
  const parts: string[] = [];
  for (const ref of refs) {
    const stream = objects.get(ref)?.stream;
    if (stream) parts.push(bytesToBinaryString(stream));
  }
  // A newline keeps the last operator of one stream from fusing with the first
  // of the next; the spec allows a stream to end mid-token but writers do not.
  return parts.join('\n');
}

/** Walks up `/Parent` for an inheritable attribute (`/Resources`). */
function inherited(objects: PdfObjects, pageDict: string, key: string): string | undefined {
  let dict: string | undefined = pageDict;
  for (let depth = 0; dict && depth < 32; depth++) {
    const value = dictLookup(objects, dict, key);
    if (value) return value;
    const parent = asRef(dictValue(dict, 'Parent'));
    dict = parent !== undefined ? objects.get(parent)?.dict : undefined;
  }
  return undefined;
}

/** Builds the font and form-XObject lookups a page's content stream needs. */
function buildContext(
  objects: PdfObjects,
  resources: string | undefined,
  fontCache: Map<number, PdfFont>,
  depth = 0,
): ContentContext {
  const fonts = new Map<string, PdfFont>();
  const forms = new Map<string, { content: string; context: ContentContext; matrix?: Matrix }>();
  if (!resources || depth > 4) return { fonts, forms };

  const fontDict = dictLookup(objects, resources, 'Font');
  if (fontDict) {
    for (const entry of fontDict.matchAll(/\/([^\s/<>[\]()]+)\s*(\d+)\s+\d+\s+R/g)) {
      const ref = Number(entry[2]);
      let font = fontCache.get(ref);
      if (!font) {
        const target = objects.get(ref)?.dict;
        if (!target) continue;
        font = readFont(objects, target);
        fontCache.set(ref, font);
      }
      fonts.set(entry[1], font);
    }
  }

  const xobjects = dictLookup(objects, resources, 'XObject');
  if (xobjects) {
    for (const entry of xobjects.matchAll(/\/([^\s/<>[\]()]+)\s*(\d+)\s+\d+\s+R/g)) {
      const obj = objects.get(Number(entry[2]));
      if (!obj?.stream || asName(dictValue(obj.dict, 'Subtype')) !== 'Form') continue;
      const matrixValues = arrayNumbers(dictValue(obj.dict, 'Matrix'));
      forms.set(entry[1], {
        content: bytesToBinaryString(obj.stream),
        context: buildContext(objects, dictLookup(objects, obj.dict, 'Resources'), fontCache, depth + 1),
        matrix: matrixValues.length === 6 ? (matrixValues as Matrix) : undefined,
      });
    }
  }

  return { fonts, forms };
}

/** Page objects in reading order, following `/Kids` where possible. */
function orderedPages(objects: PdfObjects): PdfObject[] {
  const isPage = (obj: PdfObject) => /\/Type\s*\/Page(?![a-zA-Z])/.test(obj.dict);
  const all = [...objects.values()].filter(isPage);
  if (!all.length) return [];

  // Find the page tree root: a /Pages node without a /Parent.
  const root = [...objects.values()].find(
    (obj) => /\/Type\s*\/Pages\b/.test(obj.dict) && !dictValue(obj.dict, 'Parent'),
  );
  if (!root) return all.sort((a, b) => a.num - b.num);

  const ordered: PdfObject[] = [];
  const seen = new Set<number>();
  const walk = (node: PdfObject, depth: number): void => {
    if (depth > 32 || seen.has(node.num)) return;
    seen.add(node.num);
    if (isPage(node)) {
      ordered.push(node);
      return;
    }
    for (const kid of arrayRefs(dictValue(node.dict, 'Kids'))) {
      const child = objects.get(kid);
      if (child) walk(child, depth + 1);
    }
  };
  walk(root, 0);

  // Anything the tree missed still belongs in the output.
  for (const page of all) {
    if (!seen.has(page.num)) ordered.push(page);
  }
  return ordered;
}

/**
 * Last resort: interpret every stream that looks like page content, with no
 * font information. Recovers the text of files whose object structure we could
 * not follow, which is better than returning nothing.
 */
function scanAllStreams(objects: PdfObjects): string {
  const pages: string[] = [];

  // Fonts are named per resource dictionary, but in a file we could not walk
  // the names are almost always still unique, so a merged map is a reasonable
  // approximation — and far better than losing every encoding.
  const fonts = new Map<string, PdfFont>();
  for (const obj of objects.values()) {
    for (const entry of obj.dict.matchAll(/\/([^\s/<>[\]()]+)\s*(\d+)\s+\d+\s+R/g)) {
      const name = entry[1];
      if (fonts.has(name)) continue;
      const target = objects.get(Number(entry[2]));
      if (!target || !/\/Type\s*\/Font\b/.test(target.dict)) continue;
      fonts.set(name, readFont(objects, target.dict));
    }
  }

  for (const obj of objects.values()) {
    if (!obj.stream) continue;
    if (/\/Type\s*\/(ObjStm|XRef|Metadata)\b/.test(obj.dict)) continue;
    const content = bytesToBinaryString(obj.stream);
    if (!/\b(Tj|TJ|BT)\b/.test(content)) continue;
    const text = runsToText(extractRuns(content, { fonts }));
    if (text.trim()) pages.push(text);
  }

  return pages.join('\n');
}

/** Extracts text from PDF bytes. Returns '' when the file carries none. */
export function extractPdfText(bytes: Uint8Array): string {
  let objects: PdfObjects;
  try {
    objects = parsePdfObjects(bytes);
  } catch {
    return '';
  }
  if (!objects.size) return '';

  const fontCache = new Map<number, PdfFont>();
  const pages: string[] = [];

  for (const page of orderedPages(objects)) {
    const content = pageContent(objects, page.dict);
    if (!content) continue;
    const context = buildContext(objects, inherited(objects, page.dict, 'Resources'), fontCache);
    let runs: TextRun[];
    try {
      runs = extractRuns(content, context);
    } catch {
      continue; // one unreadable page must not lose the rest
    }
    const text = runsToText(runs);
    if (text.trim()) pages.push(text);
  }

  const joined = pages.join('\n');
  if (joined.trim()) return tidy(joined);

  try {
    return tidy(scanAllStreams(objects));
  } catch {
    return '';
  }
}
