import { parseDateText, formatDateText } from '../src/utils/dateText';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Convenience: "YYYY-MM" of the parsed result, or null when there's no date. */
const ym = (input: string, allowPresent = true): string | null => {
  const { iso } = parseDateText(input, allowPresent);
  return iso ? new Date(iso).toISOString().slice(0, 7) : null;
};

const isValid = (input: string, allowPresent = true) => parseDateText(input, allowPresent).valid;

describe('parseDateText', () => {
  it('parses abbreviated and full month names, case-insensitively', () => {
    expect(ym('Jan 2022')).toBe('2022-01');
    expect(ym('January 2022')).toBe('2022-01');
    expect(ym('jan 2022')).toBe('2022-01');
    expect(ym('JAN 2022')).toBe('2022-01');
    expect(ym('Sep 1999')).toBe('1999-09');
    expect(ym('December 2020')).toBe('2020-12');
  });

  it('tolerates a comma between month and year', () => {
    expect(ym('Jan, 2022')).toBe('2022-01');
  });

  it('parses numeric month/year in common separators', () => {
    expect(ym('01/2022')).toBe('2022-01');
    expect(ym('1/2022')).toBe('2022-01');
    expect(ym('12-2020')).toBe('2020-12');
    expect(ym('03.2021')).toBe('2021-03');
  });

  it('parses ISO-like year-first input', () => {
    expect(ym('2022-01')).toBe('2022-01');
    expect(ym('2022/7')).toBe('2022-07');
  });

  it('treats a bare year as January', () => {
    expect(ym('2022')).toBe('2022-01');
  });

  it('treats empty input as cleared, not invalid', () => {
    expect(isValid('')).toBe(true);
    expect(ym('')).toBeNull();
    expect(isValid('   ')).toBe(true);
  });

  it('accepts "Present" synonyms when allowed, storing no date', () => {
    for (const word of ['Present', 'present', 'now', 'Current', 'ongoing']) {
      expect(isValid(word)).toBe(true);
      expect(ym(word)).toBeNull();
    }
  });

  it('rejects "Present" when the field does not allow it', () => {
    expect(isValid('Present', false)).toBe(false);
  });

  describe('timezone safety', () => {
    // Regression guard: building the date from local midnight rolls the month
    // backwards once serialised to ISO in any positive UTC offset (IST etc.),
    // so "Dec 2023" would silently persist as Nov 2023.
    it('never shifts the month backwards, for every month of the year', () => {
      const expected = [
        '2023-01', '2023-02', '2023-03', '2023-04', '2023-05', '2023-06',
        '2023-07', '2023-08', '2023-09', '2023-10', '2023-11', '2023-12',
      ];
      MONTH_LABELS.forEach((label, i) => {
        expect(ym(`${label} 2023`)).toBe(expected[i]);
      });
    });

    it('anchors to 12:00 UTC so no offset from -12 to +14 can change the month', () => {
      const { iso } = parseDateText('Dec 2023', false);
      const date = new Date(iso as string);
      expect(date.getUTCHours()).toBe(12);
      expect(date.getUTCDate()).toBe(1);

      for (let offsetHours = -12; offsetHours <= 14; offsetHours++) {
        const shifted = new Date(date.getTime() + offsetHours * 3600_000);
        expect(shifted.getUTCMonth()).toBe(11); // still December
        expect(shifted.getUTCFullYear()).toBe(2023);
      }
    });

    it('round-trips through the display formatter without drifting', () => {
      for (const input of ['Jan 2020', 'Dec 2023', 'Jun 1999']) {
        const { iso } = parseDateText(input, false);
        expect(formatDateText(iso, false)).toBe(input);
      }
    });
  });

  it('rejects unparseable or out-of-range input', () => {
    expect(isValid('banana')).toBe(false);
    expect(isValid('Jan')).toBe(false);
    expect(isValid('13/2022')).toBe(false); // month 13
    expect(isValid('00/2022')).toBe(false); // month 0
    expect(isValid('Jan 1800')).toBe(false); // year out of range
    expect(isValid('Xyz 2022')).toBe(false); // not a month name
  });
});
