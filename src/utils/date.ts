import { format, formatDistanceToNow, parseISO, differenceInMonths, differenceInYears } from 'date-fns';

export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDate(iso?: string, pattern = 'MMM yyyy'): string {
  // An absent date means "ongoing" — that is how an open-ended end date is
  // stored. An *empty* one means the date is genuinely unknown, which is what
  // a resume import writes when the document never stated it. Showing those
  // as "Present" would put a wrong date on the screen.
  if (iso === '') return 'Not set';
  if (!iso) return 'Present';
  try {
    return format(parseISO(iso), pattern);
  } catch {
    return iso;
  }
}

export function formatFullDate(iso?: string): string {
  return formatDate(iso, 'MMM d, yyyy');
}

export function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
  } catch {
    return '';
  }
}

/** Human duration between two ISO dates, e.g. "2 yrs 3 mos" */
export function durationBetween(start: string, end?: string): string {
  try {
    const startDate = parseISO(start);
    const endDate = end ? parseISO(end) : new Date();
    // An entry imported from a resume that stated no date has no duration to
    // show. Without this guard the arithmetic below renders "NaN mos".
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return '';
    const years = differenceInYears(endDate, startDate);
    const totalMonths = differenceInMonths(endDate, startDate);
    const months = totalMonths - years * 12;

    const parts: string[] = [];
    if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
    if (months > 0 || parts.length === 0) parts.push(`${months} mo${months !== 1 ? 's' : ''}`);
    return parts.join(' ');
  } catch {
    return '';
  }
}

export function sortByDateDesc<T>(items: T[], getDate: (item: T) => string | undefined): T[] {
  return [...items].sort((a, b) => {
    const da = getDate(a) ?? '';
    const db = getDate(b) ?? '';
    return db.localeCompare(da);
  });
}
