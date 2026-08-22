import { durationBetween, formatDate, sortByDateDesc } from '@utils/date';

describe('date utils', () => {
  it('formats an ISO date to "MMM yyyy" by default', () => {
    expect(formatDate('2024-03-15T00:00:00.000Z')).toMatch(/Mar 2024/);
  });

  it('returns "Present" when no date is given', () => {
    expect(formatDate(undefined)).toBe('Present');
  });

  it('distinguishes an unknown date from an open-ended one', () => {
    // A resume import writes '' when the document stated no date. Showing that
    // as "Present" would put a date on screen the resume never carried.
    expect(formatDate('')).toBe('Not set');
  });

  it('shows no duration for an entry whose start date is unknown', () => {
    expect(durationBetween('')).toBe('');
    expect(durationBetween('', '2024-01-01T00:00:00.000Z')).toBe('');
  });

  it('computes a human duration between two dates', () => {
    const result = durationBetween('2022-01-01T00:00:00.000Z', '2024-04-01T00:00:00.000Z');
    expect(result).toContain('yr');
  });

  it('sorts items by date descending', () => {
    const items = [{ date: '2022-01-01' }, { date: '2024-01-01' }, { date: '2023-01-01' }];
    const sorted = sortByDateDesc(items, (i) => i.date);
    expect(sorted.map((i) => i.date)).toEqual(['2024-01-01', '2023-01-01', '2022-01-01']);
  });
});
