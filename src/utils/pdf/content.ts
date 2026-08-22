/**
 * Content stream interpreter.
 *
 * The previous extractor pattern-matched `(…)` literals and treated a handful
 * of operator names as line breaks. That works only for the simplest writers:
 * anything that positions text with `Tm` inside a single `BT … ET` block (Word,
 * Chrome, Google Docs) collapsed into one enormous line, and anything using hex
 * strings produced nothing at all.
 *
 * So this runs the text-showing operators properly, tracking the text and
 * transformation matrices, and emits *positioned runs*. Lines are then a
 * question of geometry rather than guesswork — see `layout.ts`.
 */

import { codeToText, codeWidth, toCodes, FALLBACK_FONT, type PdfFont } from './fonts';

/** [a, b, c, d, e, f] — the standard PDF matrix. */
export type Matrix = [number, number, number, number, number, number];

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[1] * n[2],
    m[0] * n[1] + m[1] * n[3],
    m[2] * n[0] + m[3] * n[2],
    m[2] * n[1] + m[3] * n[3],
    m[4] * n[0] + m[5] * n[2] + n[4],
    m[4] * n[1] + m[5] * n[3] + n[5],
  ];
}

/** A contiguous piece of shown text with its device-space position. */
export interface TextRun {
  x: number;
  /** Baseline y in device space; larger is further up the page. */
  y: number;
  /** x just past the last glyph, used to measure the gap to the next run. */
  endX: number;
  /** Rendered font size after all matrix scaling. */
  size: number;
  text: string;
}

type Token =
  | { t: 'num'; v: number }
  | { t: 'str'; v: number[] }
  | { t: 'name'; v: string }
  | { t: 'arr'; v: Token[] }
  | { t: 'op'; v: string };

const WHITESPACE = ' \t\r\n\f\0';
const DELIMITERS = '()<>[]{}/%';

function isRegular(ch: string): boolean {
  return !WHITESPACE.includes(ch) && !DELIMITERS.includes(ch);
}

const OCTAL: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' };

/** Reads a `(…)` literal string into raw bytes. */
function readLiteralString(s: string, start: number): { bytes: number[]; end: number } {
  const bytes: number[] = [];
  let depth = 1;
  let i = start;

  while (i < s.length) {
    const ch = s[i];
    if (ch === '\\') {
      const next = s[i + 1];
      if (next === undefined) break;
      if (next >= '0' && next <= '7') {
        let oct = '';
        let j = i + 1;
        while (j < s.length && oct.length < 3 && s[j] >= '0' && s[j] <= '7') {
          oct += s[j];
          j += 1;
        }
        bytes.push(parseInt(oct, 8) & 0xff);
        i = j;
        continue;
      }
      if (next === '\n') {
        i += 2; // line continuation
        continue;
      }
      if (next === '\r') {
        i += s[i + 2] === '\n' ? 3 : 2;
        continue;
      }
      const mapped = OCTAL[next];
      bytes.push((mapped ?? next).charCodeAt(0));
      i += 2;
      continue;
    }
    if (ch === '(') {
      depth += 1;
      bytes.push(40);
    } else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return { bytes, end: i + 1 };
      bytes.push(41);
    } else {
      bytes.push(ch.charCodeAt(0) & 0xff);
    }
    i += 1;
  }

  return { bytes, end: i };
}

/** Reads a `<…>` hex string into raw bytes. */
function readHexString(s: string, start: number): { bytes: number[]; end: number } {
  const close = s.indexOf('>', start);
  const stop = close === -1 ? s.length : close;
  const hex = s.slice(start, stop).replace(/[^0-9a-fA-F]/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    bytes.push(parseInt(hex.slice(i, i + 2).padEnd(2, '0'), 16));
  }
  return { bytes, end: stop + 1 };
}

/**
 * Tokenises a content stream. `stopAt` bounds a nested array so the same code
 * serves both the top level and `[ … ] TJ` operands.
 */
function tokenize(s: string, from: number, stopAtArrayEnd: boolean): { tokens: Token[]; end: number } {
  const tokens: Token[] = [];
  let i = from;

  while (i < s.length) {
    const ch = s[i];

    if (WHITESPACE.includes(ch)) {
      i += 1;
      continue;
    }
    if (ch === '%') {
      while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i += 1;
      continue;
    }
    if (ch === '(') {
      const str = readLiteralString(s, i + 1);
      tokens.push({ t: 'str', v: str.bytes });
      i = str.end;
      continue;
    }
    if (s.startsWith('<<', i)) {
      // Inline dictionaries only appear as operands we ignore (BDC/DP).
      let depth = 0;
      while (i < s.length) {
        if (s.startsWith('<<', i)) {
          depth += 1;
          i += 2;
        } else if (s.startsWith('>>', i)) {
          depth -= 1;
          i += 2;
          if (depth === 0) break;
        } else {
          i += 1;
        }
      }
      continue;
    }
    if (ch === '<') {
      const str = readHexString(s, i + 1);
      tokens.push({ t: 'str', v: str.bytes });
      i = str.end;
      continue;
    }
    if (ch === '[') {
      const inner = tokenize(s, i + 1, true);
      tokens.push({ t: 'arr', v: inner.tokens });
      i = inner.end;
      continue;
    }
    if (ch === ']') {
      if (stopAtArrayEnd) return { tokens, end: i + 1 };
      i += 1;
      continue;
    }
    if (ch === '/') {
      let j = i + 1;
      while (j < s.length && isRegular(s[j])) j += 1;
      tokens.push({ t: 'name', v: s.slice(i + 1, j) });
      i = j;
      continue;
    }
    if (ch === '{' || ch === '}' || ch === ')' || ch === '>') {
      i += 1;
      continue;
    }

    let j = i;
    while (j < s.length && isRegular(s[j])) j += 1;
    if (j === i) {
      i += 1;
      continue;
    }
    const word = s.slice(i, j);
    i = j;

    if (/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(word)) {
      tokens.push({ t: 'num', v: Number(word) });
      continue;
    }

    if (word === 'BI') {
      // Inline image: binary sample data follows `ID` and must not be lexed.
      const idAt = s.indexOf('ID', i);
      const eiAt = idAt === -1 ? -1 : s.slice(idAt).search(/[\s>]EI[\s\]/<(]|[\s>]EI$/);
      i = eiAt === -1 ? (idAt === -1 ? i : s.length) : idAt + eiAt + 3;
      continue;
    }

    tokens.push({ t: 'op', v: word });
  }

  return { tokens, end: i };
}

export interface ContentContext {
  /** Font resource name (`/F1`) -> font. */
  fonts: Map<string, PdfFont>;
  /** Form XObject name -> its content and own resources, for `Do`. */
  forms?: Map<string, { content: string; context: ContentContext; matrix?: Matrix }>;
}

interface TextState {
  font: PdfFont;
  size: number;
  charSpacing: number;
  wordSpacing: number;
  hScale: number;
  leading: number;
  rise: number;
}

function freshState(): TextState {
  return { font: FALLBACK_FONT, size: 12, charSpacing: 0, wordSpacing: 0, hScale: 1, leading: 0, rise: 0 };
}

/**
 * Runs a content stream and returns every piece of text it draws, positioned.
 */
export function extractRuns(content: string, context: ContentContext, depth = 0): TextRun[] {
  const runs: TextRun[] = [];
  if (depth > 6) return runs;

  const { tokens } = tokenize(content, 0, false);

  let ctm: Matrix = IDENTITY;
  const ctmStack: Matrix[] = [];
  let state = freshState();
  const stateStack: TextState[] = [];
  let tm: Matrix = IDENTITY;
  let tlm: Matrix = IDENTITY;

  // A `BT` block that shows text without ever positioning it would render every
  // block on top of the last. Real writers always position, but stripped and
  // hand-built files do exist, and stacking those blocks downwards recovers
  // their reading order instead of fusing them into one line.
  let syntheticY = 0;
  let positionedInBlock = false;
  let shownInBlock = false;

  const operands: Token[] = [];
  const num = (i: number): number => {
    const t = operands[operands.length - i];
    return t && t.t === 'num' ? t.v : 0;
  };

  /** Draws one string and advances the text matrix by its measured width. */
  const show = (bytes: number[]): void => {
    const font = state.font;
    const codes = toCodes(bytes, font);
    if (!codes.length) return;

    const placement = multiply(tm, ctm);
    // Rendered size, after both the text and current transformation matrices.
    const size = state.size * Math.hypot(placement[2], placement[3]) || state.size;
    const startX = placement[4];
    const y = placement[5];

    shownInBlock = true;

    let text = '';
    for (const code of codes) {
      text += codeToText(code, font);
      const w = (codeWidth(code, font) / 1000) * state.size;
      const isSpaceByte = !font.twoByte && code === 32;
      const advance = (w + state.charSpacing + (isSpaceByte ? state.wordSpacing : 0)) * state.hScale;
      tm = multiply([1, 0, 0, 1, advance, 0], tm);
    }

    const endX = multiply(tm, ctm)[4];
    if (text.length) runs.push({ x: startX, y, endX, size, text });
  };

  for (const token of tokens) {
    if (token.t !== 'op') {
      operands.push(token);
      if (operands.length > 32) operands.shift();
      continue;
    }

    switch (token.v) {
      case 'q':
        ctmStack.push(ctm);
        stateStack.push({ ...state });
        break;
      case 'Q':
        ctm = ctmStack.pop() ?? ctm;
        state = stateStack.pop() ?? state;
        break;
      case 'cm':
        ctm = multiply([num(6), num(5), num(4), num(3), num(2), num(1)], ctm);
        break;

      case 'BT':
        tm = [1, 0, 0, 1, 0, syntheticY];
        tlm = tm;
        positionedInBlock = false;
        shownInBlock = false;
        break;
      case 'ET':
        if (shownInBlock && !positionedInBlock) syntheticY -= Math.max(state.size, 1) * 1.2;
        break;

      case 'Tf': {
        const name = operands[operands.length - 2];
        state.size = num(1);
        if (name && name.t === 'name') state.font = context.fonts.get(name.v) ?? FALLBACK_FONT;
        break;
      }
      case 'Tc':
        state.charSpacing = num(1);
        break;
      case 'Tw':
        state.wordSpacing = num(1);
        break;
      case 'Tz':
        state.hScale = num(1) / 100;
        break;
      case 'TL':
        state.leading = num(1);
        break;
      case 'Ts':
        state.rise = num(1);
        break;

      case 'Td':
        tlm = multiply([1, 0, 0, 1, num(2), num(1)], tlm);
        tm = tlm;
        positionedInBlock = true;
        break;
      case 'TD':
        state.leading = -num(1);
        tlm = multiply([1, 0, 0, 1, num(2), num(1)], tlm);
        tm = tlm;
        positionedInBlock = true;
        break;
      case 'Tm':
        tlm = [num(6), num(5), num(4), num(3), num(2), num(1)];
        tm = tlm;
        positionedInBlock = true;
        break;
      case 'T*':
        tlm = multiply([1, 0, 0, 1, 0, -state.leading], tlm);
        tm = tlm;
        positionedInBlock = true;
        break;

      case 'Tj': {
        const str = operands[operands.length - 1];
        if (str && str.t === 'str') show(str.v);
        break;
      }
      case "'": {
        tlm = multiply([1, 0, 0, 1, 0, -state.leading], tlm);
        tm = tlm;
        positionedInBlock = true;
        const str = operands[operands.length - 1];
        if (str && str.t === 'str') show(str.v);
        break;
      }
      case '"': {
        state.wordSpacing = num(3);
        state.charSpacing = num(2);
        tlm = multiply([1, 0, 0, 1, 0, -state.leading], tlm);
        tm = tlm;
        positionedInBlock = true;
        const str = operands[operands.length - 1];
        if (str && str.t === 'str') show(str.v);
        break;
      }
      case 'TJ': {
        const arr = operands[operands.length - 1];
        if (arr && arr.t === 'arr') {
          for (const item of arr.v) {
            if (item.t === 'str') {
              show(item.v);
            } else if (item.t === 'num') {
              // Negative adjustments move right-to-left origin forward; this is
              // how most writers encode the space between words.
              const shift = (-item.v / 1000) * state.size * state.hScale;
              tm = multiply([1, 0, 0, 1, shift, 0], tm);
            }
          }
        }
        break;
      }

      case 'Do': {
        const name = operands[operands.length - 1];
        const form = name && name.t === 'name' ? context.forms?.get(name.v) : undefined;
        if (form) {
          const saved = ctm;
          if (form.matrix) ctm = multiply(form.matrix, ctm);
          const inner = extractRuns(form.content, form.context, depth + 1);
          // Form contents are produced in their own space; fold the CTM in.
          for (const run of inner) {
            const p = multiply([1, 0, 0, 1, run.x, run.y], ctm);
            const pe = multiply([1, 0, 0, 1, run.endX, run.y], ctm);
            runs.push({ ...run, x: p[4], y: p[5], endX: pe[4] });
          }
          ctm = saved;
        }
        break;
      }

      default:
        break;
    }

    operands.length = 0;
  }

  return runs;
}
