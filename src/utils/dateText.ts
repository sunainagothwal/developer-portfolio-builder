/**
 * Parsing/formatting for hand-typed month-year dates ("Jan 2022").
 *
 * Kept dependency-free so it can be unit tested without pulling in React
 * Native, and reused anywhere a date is entered as text.
 */

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const PRESENT_WORDS = ['present', 'now', 'current', 'ongoing', 'today'];

export interface ParseResult {
  /** ISO string, or undefined for an empty / "Present" value. */
  iso?: string;
  valid: boolean;
}

/**
 * Accepts the ways people actually write a month/year:
 * "Jan 2022", "January 2022", "01/2022", "1-2022", "2022-01", "2022",
 * plus "Present" and friends.
 */
export function parseDateText(input: string, allowPresent: boolean): ParseResult {
  const text = input.trim();
  if (!text) return { iso: undefined, valid: true };

  if (PRESENT_WORDS.includes(text.toLowerCase())) {
    // "Present" is stored as no date at all.
    return { iso: undefined, valid: allowPresent };
  }

  const build = (year: number, monthIndex: number): ParseResult => {
    if (year < 1900 || year > 2200 || monthIndex < 0 || monthIndex > 11) return { valid: false };
    // Anchored to 12:00 UTC on the 1st, NOT local midnight. Local midnight
    // shifts into the previous month once converted to ISO in any positive
    // UTC offset (e.g. "Jan 2022" would store as 2021-12-31 in IST). Noon UTC
    // keeps the month stable when read back in any timezone from -12 to +14.
    return { iso: new Date(Date.UTC(year, monthIndex, 1, 12)).toISOString(), valid: true };
  };

  // "Jan 2022" / "January 2022" / "Jan, 2022"
  const nameMatch = text.match(/^([A-Za-z]{3,9})[\s,.]+(\d{4})$/);
  if (nameMatch) {
    const idx = MONTH_NAMES.findIndex((m) => m.startsWith(nameMatch[1].toLowerCase()));
    if (idx !== -1) return build(Number(nameMatch[2]), idx);
    return { valid: false };
  }

  // "01/2022" | "1-2022" | "01.2022"
  const numericMatch = text.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (numericMatch) return build(Number(numericMatch[2]), Number(numericMatch[1]) - 1);

  // "2022-01" | "2022/7"
  const isoLike = text.match(/^(\d{4})[/\-.](\d{1,2})$/);
  if (isoLike) return build(Number(isoLike[1]), Number(isoLike[2]) - 1);

  // Bare year -> January of that year.
  const yearOnly = text.match(/^(\d{4})$/);
  if (yearOnly) return build(Number(yearOnly[1]), 0);

  return { valid: false };
}

/** Renders a stored ISO value back into editable text ("Jan 2022"). */
export function formatDateText(iso: string | undefined, allowPresent: boolean): string {
  if (!iso) return allowPresent ? 'Present' : '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  // Read back in UTC to match how the value was written.
  return `${MONTH_ABBR[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}
