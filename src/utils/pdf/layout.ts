/**
 * Turns positioned text runs back into lines of text.
 *
 * A PDF has no notion of a line — only glyphs at coordinates. Everything the
 * resume parser depends on (one entry per line, a heading on its own line,
 * words separated by spaces) has to be reconstructed from geometry here.
 */

import type { TextRun } from './content';

/** Runs closer than this fraction of the font size share a baseline. */
const BASELINE_TOLERANCE = 0.45;
/** A horizontal gap wider than this fraction of the font size is a space. */
const SPACE_RATIO = 0.19;
/** Below this, two runs are the same word split by kerning. */
const MIN_SPACE_POINTS = 0.6;

interface Line {
  y: number;
  runs: TextRun[];
}

/** Groups runs that sit on the same baseline. */
function groupIntoLines(runs: TextRun[]): Line[] {
  const sorted = [...runs].sort((a, b) => b.y - a.y);
  const lines: Line[] = [];

  for (const run of sorted) {
    const tolerance = Math.max(1, run.size * BASELINE_TOLERANCE);
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - run.y) <= tolerance) {
      line.runs.push(run);
    } else {
      lines.push({ y: run.y, runs: [run] });
    }
  }

  return lines;
}

/**
 * Joins one baseline's runs, inserting spaces where the geometry implies them.
 *
 * Returns several lines in the one case where a shared baseline is not a
 * shared line: text drawn repeatedly at the same origin. That happens both in
 * files with no positioning at all and, per-run, when a writer overprints to
 * fake a bold weight.
 */
function renderLine(line: Line): string[] {
  const runs = [...line.runs].sort((a, b) => a.x - b.x);
  const lines: string[] = [];
  let out = '';
  let previous: TextRun | undefined;

  for (const run of runs) {
    if (previous) {
      const sameOrigin = Math.abs(run.x - previous.x) < 0.6;
      // Overprinted duplicate: the same word drawn twice to look bold.
      if (sameOrigin && run.text === previous.text) continue;
      if (sameOrigin) {
        // Genuinely stacked text — start a new line rather than fuse them.
        if (out.trim()) lines.push(out.trim());
        out = run.text;
        previous = run;
        continue;
      }

      const gap = run.x - previous.endX;
      const threshold = Math.max(MIN_SPACE_POINTS, run.size * SPACE_RATIO);
      if (gap > threshold && !/\s$/.test(out) && !/^\s/.test(run.text)) out += ' ';
    }

    out += run.text;
    // Overlapping runs must not rewind the cursor, or the next gap measures
    // negative and glues words together.
    previous = previous && previous.endX > run.endX ? previous : run;
  }

  if (out.trim()) lines.push(out.trim());
  return lines.map((l) => l.replace(/[ \t]{2,}/g, ' ').trim()).filter(Boolean);
}

/**
 * Detects a two-column page and returns the x of the gutter.
 *
 * Sidebar resumes (skills and projects down one side, history down the other)
 * interleave into nonsense if read row by row — the reader gets
 * "Senior Programmer Analyst ReactJS JavaScript HTML CSS", which is one line
 * from each column fused together.
 *
 * The signal is a vertical line that almost no text crosses. "Almost" matters:
 * requiring a perfectly empty band missed real two-column resumes, where a
 * single wide heading or rule spans the page. A genuine single-column page has
 * no such line anywhere — its body text crosses every candidate — so the
 * measured gap between the two cases is wide, and the thresholds below sit in
 * the middle of it rather than at either edge.
 */
function findGutter(runs: TextRun[]): number | undefined {
  if (runs.length < 14) return undefined;

  const minX = Math.min(...runs.map((r) => r.x));
  const maxX = Math.max(...runs.map((r) => r.endX));
  const width = maxX - minX;
  if (width < 200) return undefined;

  // A column must hold a real share of the page, and a crossing budget scaled
  // to the page keeps one stray full-width line from hiding a true gutter.
  const minSide = runs.length * 0.25;
  const crossingBudget = Math.max(1, runs.length * 0.005);

  let best: { x: number; crossings: number } | undefined;

  for (let g = minX + width * 0.2; g <= minX + width * 0.8; g += 4) {
    let crossings = 0;
    let left = 0;
    let right = 0;
    for (const run of runs) {
      if (run.endX <= g) left += 1;
      else if (run.x >= g) right += 1;
      else crossings += 1;
    }
    if (left < minSide || right < minSide) continue;
    if (crossings > crossingBudget) continue;
    if (!best || crossings < best.crossings) best = { x: g, crossings };
  }

  if (!best) return undefined;

  // Both sides must read as columns of text rather than a stray label.
  const left = runs.filter((r) => r.endX <= best!.x);
  const right = runs.filter((r) => r.x >= best!.x);
  const leftLines = new Set(left.map((r) => Math.round(r.y))).size;
  const rightLines = new Set(right.map((r) => Math.round(r.y))).size;
  if (leftLines < 6 || rightLines < 6) return undefined;

  return best.x;
}

/** The smallest horizontal gap at the gutter that separates two columns. */
const MIN_GUTTER_GAP = 10;

type Classified =
  | { kind: 'full'; line: Line }
  | { kind: 'left' | 'right'; line: Line }
  | { kind: 'split'; left: Line; right: Line };

/**
 * Decides whether one baseline is a full-width line or one row of two columns.
 *
 * A resume is rarely two columns all the way up: the name, contact details and
 * summary usually run the full width above them. Splitting those at the gutter
 * cuts words in half ("...front en" / "d developer position"), so a line only
 * counts as two columns when there is a real horizontal gap where the gutter
 * falls.
 */
function classifyLine(line: Line, gutter: number): Classified {
  const left = line.runs.filter((r) => r.endX <= gutter);
  const right = line.runs.filter((r) => r.x >= gutter);

  if (!right.length) return { kind: 'left', line };
  if (!left.length) return { kind: 'right', line };

  // Text that physically straddles the gutter is one line, full stop.
  if (left.length + right.length !== line.runs.length) return { kind: 'full', line };

  const leftEnd = Math.max(...left.map((r) => r.endX));
  const rightStart = Math.min(...right.map((r) => r.x));
  if (rightStart - leftEnd < MIN_GUTTER_GAP) return { kind: 'full', line };

  return { kind: 'split', left: { y: line.y, runs: left }, right: { y: line.y, runs: right } };
}

/** Renders one page's runs into text, honouring a column layout if present. */
export function runsToText(runs: TextRun[]): string {
  if (!runs.length) return '';

  const lines = groupIntoLines(runs);
  const gutter = findGutter(runs);
  if (gutter === undefined) return lines.flatMap(renderLine).join('\n');

  // Column rows accumulate into a band; a full-width line closes it. Within a
  // band the left column is read top to bottom, then the right — which is how
  // the page reads, and what keeps a job's bullets with that job instead of
  // interleaving them with the skills list beside it.
  const out: string[] = [];
  let left: Line[] = [];
  let right: Line[] = [];

  const flush = (): void => {
    for (const line of left) out.push(...renderLine(line));
    for (const line of right) out.push(...renderLine(line));
    left = [];
    right = [];
  };

  for (const line of lines) {
    const classified = classifyLine(line, gutter);
    switch (classified.kind) {
      case 'full':
        flush();
        out.push(...renderLine(classified.line));
        break;
      case 'split':
        left.push(classified.left);
        right.push(classified.right);
        break;
      case 'left':
        left.push(classified.line);
        break;
      default:
        right.push(classified.line);
        break;
    }
  }
  flush();

  return out.join('\n');
}
