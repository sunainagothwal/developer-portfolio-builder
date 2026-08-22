/**
 * Section-aware resume parsing for the "Manage" area: education, experience,
 * projects, certificates, achievements and skills.
 *
 * Pure and dependency-free so it can be unit tested without React Native.
 * Everything here is heuristic — resumes have no standard format — so results
 * are always shown to the user for review before anything is written.
 *
 * Note: Skills intentionally carry NO dates. The Skill model has no date
 * fields, and start/end dates are never inferred for them.
 */
import { parseDateText } from './dateText';

export type SectionName =
  | 'education' | 'projects' | 'certificates' | 'skills' | 'experience' | 'achievements' | 'other';

export interface ParsedExperience {
  company: string;
  role: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  description: string;
  techStack: string[];
}

export interface ParsedAchievement {
  title: string;
  date?: string;
  description?: string;
  category: 'award' | 'publication' | 'talk' | 'open-source' | 'competition' | 'other';
}

export interface ParsedEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
  grade?: string;
}

export interface ParsedCertificate {
  name: string;
  issuingOrg: string;
  issueDate?: string;
  expiryDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export interface ParsedProject {
  title: string;
  summary: string;
  /** Full detail text; the summary is a trimmed version of it. */
  description: string;
  techStack: string[];
  startDate?: string;
  endDate?: string;
  links: { label: string; url: string }[];
}

/** Heading synonyms, longest-first so "work experience" wins over "experience". */
const SECTION_PATTERNS: { name: SectionName; re: RegExp }[] = [
  {
    name: 'education',
    re: /^(education(al)?|academic (background|qualifications?|history)|qualifications?)\b/i,
  },
  {
    // "Portfolio" only counts as a heading when it stands alone — "Portfolio
    // Builder" is a project name, and treating it as a heading deleted the
    // entry and promoted its first bullet to the title.
    name: 'projects',
    re: /^((personal|selected|key|notable|academic|side|major|relevant|technical|featured)\s+)?projects?\b|^portfolio$/i,
  },
  {
    name: 'certificates',
    re: /^((licen[cs]es?\s*(&|and)\s*)?certifications?|certificates?|certified\b|credentials?|licen[cs]es?|courses?(\s*(&|and)\s*certifications?)?|training|professional development)\b/i,
  },
  {
    name: 'skills',
    re: /^((technical|core|key|professional|other|soft|interpersonal|transferable)\s+)?(skills?|competenc(y|ies)|technologies|tech(nical)? stack|proficienc(y|ies)|expertise|areas of expertise)\b/i,
  },
  {
    name: 'experience',
    re: /^((work|professional|industry|relevant|employment|career)\s+)?(experience|history|employment|internships?)\b/i,
  },
  {
    // Headings that are real sections but hold none of the Manage entities.
    // They are recognised purely so they *close* the section above them.
    // Without this, EDUCATION ran to the bottom of the page and turned
    // "LANGUAGES", "English Native Hindi Native" and the template's own footer
    // into degree entries.
    name: 'other',
    re: /^(languages?|interests?|hobbies|references?|declarations?|personal (details|information|profile)|contact( details| information)?|activities|extra[- ]?curricular|volunteer(ing| work)?|strengths?|additional information|about me)\b/i,
  },
  {
    name: 'achievements',
    re: /^((key|notable|major|selected)\s+)?(achievements?|awards?|honou?rs?|accomplishments?|recognitions?|publications?)(\s*(&|and)\s*\w+)?\b/i,
  },
];

/** Words that mark a line as a job title rather than a bullet point. */
const ROLE_RE =
  /\b(engineer|developer|designer|manager|analyst|architect|scientist|consultant|specialist|lead|intern(ship)?|director|administrator|officer|associate|founder|freelance|programmer|technician|researcher|trainee|apprentice|head of|vp of|coordinator|operator|executive|assistant|supervisor|strategist|marketer|writer|editor|teacher|tutor|trainer|accountant|auditor|recruiter|scrum master|product owner)\b/i;

/** Suffixes and words that identify a company rather than a place or a role. */
const COMPANY_RE =
  /\b(inc|llc|ltd|limited|corp|corporation|co|gmbh|plc|pvt|private|technologies|technology|labs?|systems?|solutions?|software|studios?|group|consulting|services|media|networks?|digital|global|industries|holdings|ventures|partners|university|institute)\b\.?/i;

const DEGREE_RE =
  /\b(b\.?\s?tech|m\.?\s?tech|b\.?\s?e\.?|m\.?\s?e\.?|b\.?\s?sc|m\.?\s?sc|b\.?\s?s\.?|m\.?\s?s\.?|b\.?\s?a\.?|m\.?\s?a\.?|b\.?\s?com|m\.?\s?com|b\.?\s?c\.?a\.?|m\.?\s?c\.?a\.?|bachelor'?s?|master'?s?|mba|ph\.?\s?d|doctorate|diploma|associate'?s?|high school|intermediate|secondary)\b/i;

const INSTITUTION_RE =
  /\b(university|college|institute|institution|school|academy|polytechnic|universit(y|é|ät)|iit|nit|iiit|bits)\b/i;

/** "GPA: 6.98 / 10", "Percentage: 92%" — a measurement, not a name. */
const GRADE_RE = /\b(gpa|cgpa|grade|percentage|score|marks?|aggregate|division|class)\b/i;

const PRESENT_RE = /\b(present|current(ly)?|now|ongoing|till date|to date|date)\b/i;

/** Lines that describe the entry above them rather than starting a new one. */
const CONTINUATION_RE =
  /^(built|created|developed|designed|implemented|led|worked|working|used|using|handling|taking|responsible|improved|reduced|increased|managed|integrated|deployed|architected|collaborated|wrote|added|migrated|optimi[sz]ed|delivered|maintained|achieved|owned|drove|shipped|refactored|automated|analy[sz]ed|coordinated|supported|assisted|conducted|researched|participated|got|actively|including|and\b|with\b|for\b|to\b)\b/i;

/** Labels that annotate an entry ("Tech: …", "GPA: …") rather than name one. */
const ANNOTATION_RE =
  /^(tech(nologies)?|tech(nical)? stack|stack|tools?|languages?|role|links?|repo(sitory)?|source|github|gitlab|demo|live|url|website|duration|team|client|status|gpa|cgpa|percentage|grade|marks?|score|coursework|relevant coursework|activities|thesis|dissertation|key\s+\w+|responsibilities|highlights?|outcomes?|results?|impact)\b\s*[:\-–—]/i;

/**
 * A bullet on the *raw* line, before the glyph is stripped. Detecting this
 * after cleaning is why every short bullet used to be promoted to its own
 * project or job.
 */
const BULLET_RE = /^\s*(?:[•▪◦‣∙·*+›»―]|[-–—]\s|\d{1,2}[.)]\s)/;

/**
 * "Jan 2020 - Dec 2022", "2018 – present", "01/2019 to 2021".
 *
 * The month-name branch matches real month names only. Accepting any 3-9
 * letter word before a year made phrases like "Hackathon 2022" parse as a
 * date, truncating the surrounding text.
 */
const MONTH_WORD = String.raw`(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?`;
const DATE_TOKEN = String.raw`(?:${MONTH_WORD}[\s,]+\d{4}|\d{1,2}[/\-.]\d{4}|\d{4}[/\-.]\d{1,2}\b|(?:19|20)\d{2})`;

/**
 * Matches a skill name as a whole token. The trailing guard rejects a
 * following word character, and rejects ".x" so "Next" doesn't match inside
 * "Next.js" — while still allowing a sentence-ending "PostgreSQL."
 */
export function skillMatcher(skill: string): RegExp {
  const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(String.raw`(^|[^\w+#])${escaped}(?![\w+#]|\.\w)`, 'i');
}

const RANGE_RE = new RegExp(
  String.raw`(${DATE_TOKEN})(?:\s*[-–—~]\s*|\s+(?:to|until|through)\s+|\s{1,3})(${DATE_TOKEN}|present|current(?:ly)?|now|ongoing|date)`,
  'i',
);
const SINGLE_DATE_RE = new RegExp(DATE_TOKEN, 'i');
/**
 * URLs as resumes write them: with a protocol, with `www.`, or as a bare host
 * *with a path* ("github.com/janedoe", "credly.com/badges/abc"). Requiring the
 * path on bare hosts is what stops "Scrum.org" or "Node.js" being read as one.
 * Pipes are excluded because they separate fields on a resume line.
 */
const URL_PATTERN =
  String.raw`(https?://[^\s,;)\]|]+|www\.[^\s,;)\]|]+|(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|me|co|ai|app|tech|xyz|in|uk|edu|gov)/[^\s,;)\]|]*)`;
const URL_IN_TEXT_RE = new RegExp(URL_PATTERN, 'gi');
/**
 * The same pattern without /g. A global regex keeps its own lastIndex between
 * calls, so using one with .test() in a loop returns true and false in turn.
 */
const IS_URL_RE = new RegExp(URL_PATTERN, 'i');

/** Normalises a loose date token ("Jan, 2020", "2018") into an ISO string. */
function toIso(token: string | undefined): string | undefined {
  if (!token) return undefined;
  const cleaned = token.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  return parseDateText(cleaned, false).iso;
}

export interface DateRange {
  startDate?: string;
  endDate?: string;
  isCurrent: boolean;
}

/** Pulls a start/end range out of a block of text. */
export function extractDateRange(text: string): DateRange {
  const range = text.match(RANGE_RE);
  if (range) {
    const endRaw = range[2];
    const isCurrent = PRESENT_RE.test(endRaw);
    return {
      startDate: toIso(range[1]),
      endDate: isCurrent ? undefined : toIso(endRaw),
      isCurrent,
    };
  }

  const single = text.match(SINGLE_DATE_RE);
  if (single) {
    return { startDate: toIso(single[0]), endDate: undefined, isCurrent: PRESENT_RE.test(text) };
  }

  return { startDate: undefined, endDate: undefined, isCurrent: PRESENT_RE.test(text) };
}

/** Removes every date token from a fragment, leaving the words behind. */
function stripDates(text: string): string {
  return text
    .replace(new RegExp(RANGE_RE.source, 'gi'), ' ')
    .replace(new RegExp(DATE_TOKEN, 'gi'), ' ')
    .replace(/\b(present|current(ly)?|ongoing|till date|to date)\b/gi, ' ')
    .replace(/\s*[|·•,;–—-]\s*$/, '')
    .replace(/^\s*[|·•,;–—-]\s*/, '')
    .replace(/\(\s*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Collapses a letter-spaced heading ("E D U C A T I O N") back into a word.
 * Designed resumes use wide tracking for headings, and some writers emit each
 * letter as its own positioned run.
 */
function despace(text: string): string {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length < 4 || !tokens.every((t) => t.length === 1)) return text;
  return tokens.join('');
}

interface HeadingMatch {
  name: SectionName;
  /** Content that followed the heading on the same line ("SKILLS: Go, Rust"). */
  rest: string;
}

function headingNameFor(candidate: string): SectionName | null {
  // "Achievements/Tasks" and "Duties/Responsibilities" label a block *inside*
  // an entry. A section heading is never written as a slash pair, and reading
  // one as a heading moved a job's bullets into the Achievements list.
  if (/^[A-Za-z]+\/[A-Za-z]/.test(candidate.trim())) return null;

  const clean = despace(candidate.trim())
    .replace(/^[\s•▪◦*_]+/, '')
    .replace(/[:•\-–—_*.]+$/, '')
    .trim();
  if (!clean || clean.length > 42) return null;
  if (clean.split(/\s+/).length > 4) return null;
  for (const { name, re } of SECTION_PATTERNS) {
    if (re.test(clean)) return name;
  }
  return null;
}

/** True when a line is a section heading, optionally with content after it. */
function matchHeading(line: string): HeadingMatch | null {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // "Tech Stack: React, Node.js" annotates the entry above it; "TECH STACK: …"
  // is a heading. Both are built from the same words, so capitalisation is the
  // discriminator. Reading an annotation as a heading both moved the following
  // entries into the wrong section and threw the annotation's own content away.
  const isShout = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (ANNOTATION_RE.test(trimmed) && !isShout) return null;

  // "SKILLS: TypeScript, Go" — heading and its content share a line.
  const colon = trimmed.match(/^([^:]{2,42}):\s*(\S.*)$/);
  if (colon) {
    const name = headingNameFor(colon[1]);
    if (name) return { name, rest: colon[2] };
  }

  const name = headingNameFor(trimmed);
  return name ? { name, rest: '' } : null;
}

/** Heading words used when scanning text that has no usable line breaks. */
const INLINE_HEADINGS: { name: SectionName; re: RegExp }[] = [
  { name: 'education', re: /\b(education(al)?|academic background|academic qualifications?)\b/gi },
  {
    name: 'experience',
    re: /\b((work|professional|industry|employment|career)\s+experience|work history|employment|experience)\b/gi,
  },
  { name: 'projects', re: /\b((personal|selected|key|notable|academic|side|major)\s+)?projects\b/gi },
  {
    name: 'certificates',
    re: /\b(certifications?|certificates?|credentials?|licen[cs]es|courses)\b/gi,
  },
  {
    name: 'skills',
    re: /\b((technical|core|key)\s+)?(skills|competencies|technologies|tech stack|proficiencies)\b/gi,
  },
  { name: 'achievements', re: /\b(achievements?|awards?|honou?rs?|accomplishments?)\b/gi },
];

/**
 * Breaks a run-on blob into probable lines.
 *
 * Some PDFs emit no positioning operators we can turn into newlines, so the
 * whole document arrives as one string. Bullets, wide gaps, and a capital
 * letter following a year are all reliable entry boundaries in practice.
 */
export function toPseudoLines(text: string): string[] {
  return text
    .replace(/\s*[•▪◦‣]\s*/g, '\n')
    // A four-digit year immediately before a capitalised word ends an entry.
    // The leading guard keeps it from firing inside a longer number.
    .replace(/(^|\D)((?:19|20)\d{2})\s+(?=[A-Z])/g, '$1$2\n')
    .replace(/\s{3,}/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

interface InlineSegment {
  /** The heading that introduces this segment, if any. */
  name: SectionName | null;
  body: string;
}

/**
 * Splits a single line at any heading words embedded in it.
 *
 * Only ALL-CAPS words and words followed by a colon count, so ordinary prose
 * ("led projects", "strong skills") does not create false boundaries.
 */
function splitInlineHeadings(text: string): InlineSegment[] {
  const marks: { name: SectionName; start: number; end: number }[] = [];

  for (const { name, re } of INLINE_HEADINGS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const word = m[0];
      const after = text.slice(m.index + word.length, m.index + word.length + 2);
      const isCaps = word === word.toUpperCase() && /[A-Z]/.test(word);
      if (!isCaps && !after.startsWith(':')) continue;
      // "Tech Stack: React" labels the entry it sits in; only a shouted
      // version of the same words introduces a section.
      if (!isCaps && ANNOTATION_RE.test(text.slice(m.index))) continue;
      marks.push({ name, start: m.index, end: m.index + word.length + (after.startsWith(':') ? 1 : 0) });
    }
  }

  if (!marks.length) return [{ name: null, body: text }];

  marks.sort((a, b) => a.start - b.start || b.end - a.end);
  // Drop marks that overlap an earlier one ("WORK EXPERIENCE" vs "EXPERIENCE").
  const kept: typeof marks = [];
  for (const mark of marks) {
    if (kept.length && mark.start < kept[kept.length - 1].end) continue;
    kept.push(mark);
  }

  const segments: InlineSegment[] = [];
  const head = text.slice(0, kept[0].start).trim();
  if (head) segments.push({ name: null, body: head });

  kept.forEach((mark, i) => {
    const to = i + 1 < kept.length ? kept[i + 1].start : text.length;
    segments.push({ name: mark.name, body: text.slice(mark.end, to).replace(/^[\s:–—-]+/, '').trim() });
  });

  return segments;
}

/**
 * Above this length a "line" is treated as a run-on blob rather than a real
 * line, and is scanned for headings and entry boundaries inside itself.
 */
const RUN_ON_LENGTH = 100;

const emptySections = (): Record<SectionName, string[]> => ({
  education: [], projects: [], certificates: [], skills: [],
  experience: [], achievements: [], other: [],
});

/** Groups the resume's lines under the heading they appear beneath. */
export function splitSections(text: string): Record<SectionName, string[]> {
  const result = emptySections();
  const normalized = text.replace(/\r\n?/g, '\n');

  let current: SectionName = 'other';

  /** A line that is only contact details, wherever it happens to appear. */
  const isContactOnly = (line: string): boolean => {
    const stripped = line
      .replace(/[\w.+-]+@[\w-]+\.[\w.]{2,}/g, ' ')
      .replace(URL_IN_TEXT_RE, ' ')
      .replace(/[+()\d\s.\-|·•]/g, '')
      .trim();
    return stripped.length === 0 && /[@\d]|\w\.\w/.test(line);
  };

  /** Files a piece of content, honouring any heading embedded inside it. */
  const push = (body: string): void => {
    if (!body.trim()) return;
    if (isContactOnly(body)) {
      result.other.push(body);
      return;
    }
    for (const segment of splitInlineHeadings(body)) {
      if (segment.name) current = segment.name;
      if (!segment.body) continue;
      // Only a genuinely run-on chunk gets guessed apart; ordinary lines are
      // kept exactly as the layout produced them.
      const pieces = segment.body.length > RUN_ON_LENGTH ? toPseudoLines(segment.body) : [segment.body];
      result[current].push(...pieces);
    }
  };

  for (const rawLine of normalized.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = matchHeading(line);
    if (heading) {
      current = heading.name;
      if (heading.rest) push(heading.rest);
      continue; // don't keep the heading itself
    }
    push(line);
  }

  return result;
}

/** Strips bullet glyphs and surrounding punctuation from a line. */
function clean(line: string): string {
  return line.replace(/^[\s•▪◦‣∙·*+›»―\-–—]+/, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Splits a section's lines into entries. A new entry starts when the *raw*
 * line matches `isEntryStart`; subsequent lines attach to it as detail.
 *
 * The predicate sees the raw line on purpose: bullet glyphs are the strongest
 * signal that a line is detail, and they are gone once the line is cleaned.
 */
function groupEntries(lines: string[], isEntryStart: (raw: string) => boolean): string[][] {
  const groups: string[][] = [];
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    if (isEntryStart(raw) || groups.length === 0) groups.push([line]);
    else groups[groups.length - 1].push(line);
  }
  return groups;
}

/**
 * Groups lines into entries by detecting when a field would *repeat*.
 *
 * Entries are frequently spread over several lines ("Stanford University" then
 * "B.S. Computer Science"). Starting a new entry on every field match would
 * split those in half, leaving each part missing the other's data — which is
 * what produced "Unknown institution" entries. Instead a new entry begins only
 * once a field the current entry already has shows up again.
 */
function groupByFieldRepeat(lines: string[], detectors: ((line: string) => boolean)[]): string[][] {
  const groups: string[][] = [];
  let seen: boolean[] = [];

  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;

    const hits = detectors.map((test) => test(line));
    const repeats = hits.some((hit, i) => hit && seen[i]);

    if (!groups.length || repeats) {
      groups.push([line]);
      seen = [...hits];
    } else {
      groups[groups.length - 1].push(line);
      seen = seen.map((s, i) => s || hits[i]);
    }
  }

  return groups;
}

/**
 * Whether bullets in this section mark detail lines.
 *
 * When a section mixes bulleted and unbulleted lines, the bullets are detail
 * under the unbulleted headers. When *every* line is bulleted, the bullets are
 * the entries themselves — treating them as detail would collapse the whole
 * section into one entry.
 */
function bulletsAreDetail(lines: string[]): boolean {
  const bulleted = lines.filter((l) => BULLET_RE.test(l)).length;
  return bulleted > 0 && bulleted < lines.length;
}

/** Pulls URLs out of a block and labels them. */
function extractLinks(block: string): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const raw of block.match(URL_IN_TEXT_RE) ?? []) {
    const trimmed = raw.replace(/[.,;)\]]+$/, '');
    const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const key = url.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const host = key.replace(/^https?:\/\//, '').replace(/^www\./, '');
    const label = /github\.com|gitlab\.com|bitbucket/.test(host)
      ? 'Source'
      : /youtu|vimeo/.test(host)
        ? 'Demo video'
        : 'Live Demo';
    out.push({ label, url });
  }
  return out;
}

/** Skills named on an explicit "Tech: …" annotation line. */
function techFromAnnotation(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const m = line.match(
      /^(?:tech(?:nologies)?|tech(?:nical)?\s*stack|stack|tools?|built with|made with)\s*[:\-–—]\s*(.+)$/i,
    );
    if (!m) continue;
    for (const piece of splitSkillList(m[1])) out.push(piece);
  }
  return out;
}

export function parseEducation(lines: string[]): ParsedEducation[] {
  const isAnnotation = (line: string) => ANNOTATION_RE.test(line);

  const isDegree = (line: string) => !isAnnotation(line) && DEGREE_RE.test(line);

  // Acronym institutions ("MIT", "UCLA") carry no keyword, so also accept a
  // short title-case line that is neither a degree, a date, nor an annotation.
  const isInstitution = (line: string) => {
    if (isAnnotation(line)) return false;
    // The degree test comes first on purpose. "High School" satisfies both
    // patterns, and counting it as an institution too marked that slot as
    // already seen — so the real school on the next line started a *new*
    // entry, leaving one record with no institution and one with no degree.
    if (DEGREE_RE.test(line)) return false;
    if (INSTITUTION_RE.test(line)) return true;
    if (CONTINUATION_RE.test(line)) return false;
    // "Sept 2014 - Aug 2018 | GPA: 6.98 / 10" survives date stripping as
    // "GPA: 6.98 / 10", which is capitalised and short — so it used to pass as
    // an institution, marking that slot seen and splitting the entry in two.
    if (GRADE_RE.test(line) || line.includes(':')) return false;
    const withoutDates = stripDates(line);
    if (!withoutDates || withoutDates.length > 60) return false;
    if (withoutDates.split(/\s+/).length > 7) return false;
    if (/[.:;]$/.test(withoutDates)) return false;
    return /^[A-Z]/.test(withoutDates);
  };

  // A new entry begins only when an institution or degree repeats, so
  // multi-line entries stay together.
  const groups = groupByFieldRepeat(lines, [isInstitution, isDegree]);
  const out: ParsedEducation[] = [];

  for (const group of groups) {
    const block = group.join(' | ');
    // Entries pack fields onto one line separated by | , – or · — and commas
    // are just as common as pipes ("B.Tech in CS, VIT University, 2019-2023").
    // Splitting on pipes alone left the degree and the institution in one
    // string, so both fields ended up holding the whole line.
    const parts = block
      .split(/\s*[|·]\s*|\s+[–—]\s+/)
      .flatMap((part) =>
        // Only break on commas when doing so actually separates the degree
        // from the institution; a comma inside one field must not split it.
        DEGREE_RE.test(part) && INSTITUTION_RE.test(part) ? part.split(/\s*,\s*/) : [part],
      )
      .map((p) => p.trim())
      .filter(Boolean);

    const degreePart = parts.find(isDegree);
    // Prefer an explicit "University/College/Institute" match, but fall back to
    // the first part that is neither the degree nor a date — acronyms like
    // "MIT" or "UCLA" carry no keyword to match on.
    // "High School" names a qualification, not a school, so the fragment that
    // supplied the degree can never also supply the institution — otherwise
    // this entry read "High School at High School".
    const institution =
      parts.find((p) => p !== degreePart && INSTITUTION_RE.test(p) && !isAnnotation(p)) ??
      parts.find((p) => {
        if (p === degreePart || DEGREE_RE.test(p) || isAnnotation(p)) return false;
        const withoutDates = stripDates(p);
        // Must contain letters — a bare "2014 - 2018" is not an institution.
        return withoutDates.length > 1 && /[A-Za-z]{2}/.test(withoutDates);
      });
    // Skip fragments that yielded neither field rather than emitting an
    // entry made entirely of "Unknown".
    if (!institution && !degreePart) continue;

    // "B.S. Computer Science" -> degree "B.S.", field "Computer Science"
    let degree = degreePart ?? '';
    let fieldOfStudy: string | undefined;
    if (degreePart) {
      const withoutDates = stripDates(degreePart).replace(/[(),]/g, ' ').replace(/\s{2,}/g, ' ').trim();
      // Greedy, so "Bachelor of Technology in CS" keeps the qualification
      // whole instead of splitting at the first connector.
      const inMatch = withoutDates.match(/^(.*)\b(?:in|of)\b\s+(.+)$/i);
      if (inMatch && inMatch[1].trim()) {
        degree = inMatch[1].trim();
        fieldOfStudy = inMatch[2].trim();
      } else {
        const token = withoutDates.match(DEGREE_RE)?.[0] ?? withoutDates;
        const at = withoutDates.toLowerCase().indexOf(token.toLowerCase());
        if (at > 0) {
          // The qualification word is not the first thing on the line, so the
          // whole fragment names the degree ("Higher Secondary") and there is
          // no separate field of study to take from it.
          degree = withoutDates.trim();
        } else {
          degree = token.trim();
          const rest = withoutDates.slice(token.length).replace(/^[\s,.\-–—]+/, '').trim();
          if (rest && rest.toLowerCase() !== degree.toLowerCase()) fieldOfStudy = rest;
        }
      }
    }

    const gradeMatch = block.match(/\b(?:gpa|cgpa|grade|percentage|score|marks?)\s*[:\-–—]?\s*([\d.]+\s*(?:\/\s*[\d.]+)?%?)/i);

    const { startDate, endDate, isCurrent } = extractDateRange(block);

    out.push({
      institution: institution ? stripDates(institution).replace(/[,;]$/, '').trim() || 'Unknown institution' : 'Unknown institution',
      degree: degree.replace(/[,;]$/, '').trim() || 'Unknown degree',
      fieldOfStudy: fieldOfStudy?.replace(/[,;]$/, '').trim() || undefined,
      startDate,
      endDate,
      isCurrent,
      grade: gradeMatch?.[1].replace(/\s+/g, '') || undefined,
    });
  }

  return out;
}

export function parseCertificates(lines: string[]): ParsedCertificate[] {
  // Wrapped entries continue onto the next line; joining them back keeps the
  // issuer attached to its certificate instead of becoming a phantom entry.
  const merged: string[] = [];
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    const previous = merged[merged.length - 1];
    const isContinuation =
      previous !== undefined &&
      !BULLET_RE.test(raw) &&
      (/^[a-z(]/.test(line) || /[,\-–—|]$/.test(previous));
    if (isContinuation) merged[merged.length - 1] = `${previous.replace(/[,\-–—|]$/, '').trim()} ${line}`;
    else merged.push(line);
  }

  const out: ParsedCertificate[] = [];

  for (const line of merged) {
    if (line.length < 4) continue;

    const links = extractLinks(line);
    const credentialId = line.match(/\b(?:credential|certificate|licen[cs]e)\s*(?:id|no\.?|number)\s*[:#]?\s*([\w-]{3,})/i)?.[1];

    const range = line.match(RANGE_RE);
    const dates = extractDateRange(line);
    // "Issued Mar 2023 - Expires Mar 2026" reads as a range; a single date is
    // the issue date and never an expiry.
    const issueDate = dates.startDate;
    const expiryDate = range && !dates.isCurrent ? dates.endDate : undefined;

    let text = line.replace(URL_IN_TEXT_RE, ' ');
    if (credentialId) text = text.replace(new RegExp(`\\b[^\\s]*${credentialId}`, 'i'), ' ');
    text = stripDates(text.replace(/\b(issued|expires?|valid until|expiry|issue[d]? on)\b/gi, ' '));

    // "Name — Issuer", "Name | Issuer", "Name (Issuer)", then "Name, Issuer".
    const strong = text.split(/\s*[|·]\s*|\s+[–—]\s+|\s+-\s+|\s+\bby\b\s+|\s+\bfrom\b\s+/i);
    const parts = (strong.length > 1 ? strong : text.split(/,\s+/))
      .map((p) => p.replace(/[()]/g, ' ').replace(/\s{2,}/g, ' ').replace(/^[\s,;.\-–—]+|[\s,;.\-–—]+$/g, '').trim())
      .filter(Boolean);

    if (!parts.length) continue;
    const [name, ...rest] = parts;
    if (name.length < 3) continue;

    out.push({
      name,
      issuingOrg: rest.join(', ') || 'Unknown issuer',
      issueDate,
      expiryDate,
      credentialId,
      credentialUrl: links[0]?.url,
    });
  }

  return out;
}

/** True when the line carries nothing but a date or date range. */
function isDateOnly(line: string): boolean {
  return !stripDates(line).replace(/[()[\]{}\s|,-]/g, '');
}

export function parseProjects(rawLines: string[], skillDictionary: string[]): ParsedProject[] {
  // Several templates put a project's dates on the line below its name. Fold
  // those up first, so that "carries a date" identifies a title consistently.
  const lines: string[] = [];
  for (const raw of rawLines) {
    const line = clean(raw);
    if (!line) continue;
    if (lines.length && isDateOnly(line)) lines[lines.length - 1] = `${lines[lines.length - 1]} ${line}`;
    else lines.push(raw);
  }

  const detailBullets = bulletsAreDetail(lines);

  // When a section dates most of its entries, that is a far stronger signal of
  // where one project ends than any wording test: the name carries the date
  // and the description underneath does not.
  const dated = lines.filter((l) => RANGE_RE.test(l)).length;
  const datesMarkEntries = dated >= 2 && dated / lines.length >= 0.35;

  // A title is a short line that doesn't read as prose: no trailing sentence
  // punctuation, not an annotation, and not a continuation of the line above.
  const isTitle = (raw: string): boolean => {
    const line = clean(raw);
    if (!line) return false;
    if (detailBullets && BULLET_RE.test(raw)) return false;
    if (ANNOTATION_RE.test(line)) return false;
    if (datesMarkEntries) return RANGE_RE.test(line);
    if (CONTINUATION_RE.test(line)) return false;
    if (/[.;:]$/.test(line)) return false;
    // A wrapped clause never starts with a lower-case letter.
    if (/^[a-z]/.test(line)) return false;
    // A line holding nothing but a date belongs to the entry above it — these
    // sit under the title in several popular resume templates.
    if (!stripDates(line).replace(/[()\[\]{}\s]/g, '')) return false;
    // Prose runs long; a project name does not.
    return stripDates(line.split(/\s+[–—|]\s+|\s+-\s+/)[0]).length <= 80 && line.split(/\s+/).length <= 14;
  };

  const groups = groupEntries(lines, isTitle);
  const out: ParsedProject[] = [];

  for (const group of groups) {
    const [titleLine, ...detail] = group;
    if (!titleLine) continue;

    // Titles often carry the stack or a tagline after a separator:
    // "Portfolio Builder — React Native app"
    const segments = titleLine.split(/\s+[–—|]\s+|\s+-\s+/);
    const title = stripDates(segments[0])
      // "Portfolio Website: www.example.com" — the address is already stored
      // as a link, so it does not belong in the name too.
      .replace(/\s*:\s*(?:https?:\/\/|www\.)?\S+\.\S+\s*$/i, '')
      // "Website (01/2020 - 05/2020)" loses its dates but keeps the bracket,
      // which then shipped as part of the project name.
      .replace(/[([{]\s*[)\]}]?\s*$/, '')
      .replace(/^\s*[)\]}]\s*/, '')
      .replace(/[,;:]$/, '')
      .trim();
    if (title.length < 2) continue;

    const block = group.join(' ');
    const dictionaryTech = skillDictionary.filter((skill) => skillMatcher(skill).test(block));
    const techStack = [...new Set([...techFromAnnotation(group), ...dictionaryTech])];

    // Detail lines minus the annotations that were already turned into fields.
    const proseDetail = detail.filter((l) => !ANNOTATION_RE.test(l));
    const tagline = stripDates(segments.slice(1).join(' — ')).trim();
    const description = (proseDetail.join('\n').trim() || tagline || title).trim();

    const { startDate, endDate } = extractDateRange(titleLine);

    out.push({
      title,
      summary: description.replace(/\s*\n\s*/g, ' ').slice(0, 300),
      description,
      techStack,
      startDate,
      endDate,
      links: extractLinks(block),
    });
  }

  return out;
}

/**
 * Work history. An entry starts on a line naming a role or carrying a date
 * range; following bullet lines become the description.
 */
export function parseExperience(lines: string[], skillDictionary: string[]): ParsedExperience[] {
  const detailBullets = bulletsAreDetail(lines);

  // A bullet is detail, never a new job, whenever the section mixes the two.
  const headerish = (raw: string) => !(detailBullets && BULLET_RE.test(raw));
  const rawByClean = new Map<string, string>();
  for (const raw of lines) rawByClean.set(clean(raw), raw);

  const isRole = (line: string) => {
    const raw = rawByClean.get(line);
    return (raw === undefined || headerish(raw)) && ROLE_RE.test(line) && !CONTINUATION_RE.test(line);
  };
  const isRange = (line: string) => {
    const raw = rawByClean.get(line);
    return (raw === undefined || headerish(raw)) && RANGE_RE.test(line);
  };

  // A role or a date range repeating marks the next job; bullet detail lines
  // in between stay attached to the entry above them.
  const groups = groupByFieldRepeat(lines, [isRole, isRange]);
  const out: ParsedExperience[] = [];

  for (const group of groups) {
    const [headerLine, ...detail] = group;
    if (!headerLine) continue;

    // A header split over two lines is common, in both orders: "Acme Corp"
    // then "Senior Engineer", or "Senior Engineer" then "Acme Corp". Folding
    // the second line into the header covers both, and is what stops an entry
    // being saved as "Unknown company" while the company sits in its
    // description one line below.
    const secondLine = detail[0];
    const headerNamesRole = ROLE_RE.test(headerLine);
    const secondIsRole =
      !headerNamesRole && secondLine !== undefined && ROLE_RE.test(secondLine) && secondLine.length <= 70;
    const secondIsCompany =
      headerNamesRole &&
      secondLine !== undefined &&
      !ROLE_RE.test(secondLine) &&
      !CONTINUATION_RE.test(secondLine) &&
      !BULLET_RE.test(rawByClean.get(secondLine) ?? secondLine) &&
      secondLine.length <= 70 &&
      // A bare date line is the entry's dates, not its employer.
      stripDates(secondLine).length > 2;

    const foldSecond = secondIsRole || secondIsCompany;
    const header = foldSecond ? `${headerLine} | ${secondLine}` : headerLine;
    const body = foldSecond ? detail.slice(1) : detail;

    const parts = stripDates(header)
      .split(/\s*[|·]\s*|\s+[–—]\s+|\s+-\s+|\s*,\s*|\s+\bat\b\s+/i)
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) continue;

    // "Senior Engineer | Acme Corp" — whichever part names a role is the role.
    const roleIndex = parts.findIndex((p) => ROLE_RE.test(p));
    const role = (roleIndex >= 0 ? parts[roleIndex] : parts[0]).trim();

    const others = parts.filter((_, i) => i !== (roleIndex >= 0 ? roleIndex : 0));
    // Prefer a part that names a company over one that names a place.
    const company =
      others.find((p) => COMPANY_RE.test(p)) ??
      others.find((p) => p.length > 1 && !/^[A-Z]{2}$/.test(p)) ??
      others[0] ??
      'Unknown company';

    const block = group.join(' ');
    const { startDate, endDate, isCurrent } = extractDateRange(block);

    // Bullets are kept as markdown so the description reads the way it did on
    // the resume rather than collapsing into a wall of text.
    const description = body
      .map((line) => {
        const raw = rawByClean.get(line);
        return raw !== undefined && BULLET_RE.test(raw) ? `- ${line}` : line;
      })
      .join('\n')
      .slice(0, 2000);

    out.push({
      company: company.trim(),
      role,
      startDate,
      endDate,
      isCurrent,
      description,
      techStack: skillDictionary.filter((skill) => skillMatcher(skill).test(block)),
    });
  }

  return out;
}

function guessAchievementCategory(text: string): ParsedAchievement['category'] {
  if (/\b(publish|paper|journal|conference proceedings|article|patent)\b/i.test(text)) return 'publication';
  if (/\b(talk|speaker|spoke|presented|keynote|webinar|panel)\b/i.test(text)) return 'talk';
  if (/\b(open[- ]source|contributor|maintainer|pull request|github)\b/i.test(text)) return 'open-source';
  if (/\b(hackathon|competition|contest|olympiad|championship|winner|runner[- ]up|rank(ed)?)\b/i.test(text)) {
    return 'competition';
  }
  if (/\b(award|honou?r|medal|scholarship|dean'?s list|recognition|prize)\b/i.test(text)) return 'award';
  return 'other';
}

/**
 * Awards and accomplishments.
 *
 * An award is usually a short title with its explanation wrapped underneath
 * ("Rectify" / "Participated in Rectify, a debugging contest…"). Emitting one
 * entry per line split every one of those in half and filled the list with
 * fragments, so lines are grouped the same way projects are.
 */
/** A line ending on one of these is mid-sentence and continues below. */
const DANGLING_RE =
  /\b(and|or|the|an?|of|in|on|at|to|for|with|from|by|as|that|which|is|are|was|were|has|have|had|its|their)$/i;

/**
 * Rejoins a line to the one above when the text clearly wraps.
 *
 * Extraction preserves the page's line breaks, so a sentence broken across two
 * visual lines arrives as two entries — which is how "…performance in 10th
 * class from" and "Rajasthan Board in 2009" became separate achievements.
 */
function mergeWrapped(lines: string[]): string[] {
  const out: string[] = [];
  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    const previous = out[out.length - 1];
    const wraps =
      previous !== undefined &&
      !BULLET_RE.test(raw) &&
      (/^[a-z]/.test(line) || DANGLING_RE.test(previous) || /[,;-]$/.test(previous)) &&
      !/[.!?]$/.test(previous);
    if (wraps) out[out.length - 1] = `${previous.replace(/[,-]$/, '').trim()} ${line}`;
    else out.push(line);
  }
  return out;
}

export function parseAchievements(rawLines: string[]): ParsedAchievement[] {
  const lines = mergeWrapped(rawLines);
  const detailBullets = bulletsAreDetail(lines);

  const isTitle = (raw: string): boolean => {
    const line = clean(raw);
    if (!line) return false;
    if (detailBullets && BULLET_RE.test(raw)) return false;
    if (CONTINUATION_RE.test(line)) return false;
    if (ANNOTATION_RE.test(line)) return false;
    // A wrapped clause never starts with a lower-case letter.
    if (/^[a-z]/.test(line)) return false;
    if (/[.;,]$/.test(line)) return false;
    return stripDates(line).length <= 90;
  };

  const out: ParsedAchievement[] = [];

  for (const group of groupEntries(lines, isTitle)) {
    const [titleLine, ...detail] = group;
    if (!titleLine) continue;

    const block = group.join(' ');
    const title = stripDates(titleLine).replace(/[\s,;:–—-]+$/, '').trim();
    if (title.length < 3) continue;

    const description = detail.join(' ').trim();

    out.push({
      title: title.slice(0, 120),
      date: extractDateRange(block).startDate,
      description: description || undefined,
      category: guessAchievementCategory(block),
    });
  }

  return out;
}

/** Composite skill names that must survive splitting on "/". */
const SLASH_SKILLS = /^(ci\/cd|tcp\/ip|a\/b|i\/o|ui\/ux|html\/css|and\/or|24\/7)$/i;

/** Splits a comma/pipe/bullet separated list into individual skill names. */
function splitSkillList(body: string): string[] {
  const out: string[] = [];
  for (const chunk of body.split(/\s*[,;|•·]\s*|\s{2,}/)) {
    const pieces = SLASH_SKILLS.test(chunk.trim()) ? [chunk] : chunk.split(/\s*\/\s*/);
    for (const piece of pieces) {
      const skill = piece
        .replace(/\(.*?\)/g, '')
        .replace(/^[\s.\-–—]+|[\s.\-–—]+$/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (skill.length < 2 || skill.length > 30) continue;
      // "Live: www.example.com" rides along in a tech list; it is a link, and
      // it is already captured as one.
      if (skill.includes(':') || IS_URL_RE.test(skill)) continue;
      if (/^\d+(\.\d+)?$/.test(skill)) continue; // bare numbers aren't skills
      // A clause, not a skill name.
      if (skill.split(/\s+/).length > 4) continue;
      if (CONTINUATION_RE.test(skill)) continue;
      out.push(skill);
    }
  }
  return out;
}

/**
 * Skill names from a skills section. Handles comma/bullet/pipe separated
 * lists and "Languages: TypeScript, Go" style prefixes.
 *
 * Never returns dates — the Skill model has none.
 */
export function parseSkillsSection(lines: string[]): string[] {
  const found = new Map<string, string>();

  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;
    // Drop a leading category label ("Languages:", "Frontend -")
    const body = line.replace(/^[A-Za-z\s/&]{2,30}\s*[:–—]\s*/, '');

    for (const skill of splitSkillList(body)) {
      const key = skill.toLowerCase();
      if (!found.has(key)) found.set(key, skill);
    }
  }

  return [...found.values()];
}
