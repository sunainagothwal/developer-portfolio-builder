/**
 * Regressions found by running real resume PDFs through the importer.
 *
 * Every case here corresponds to something an actual file broke on. Those
 * documents are personal and are not kept in the repo, so each defect is
 * reproduced from the structure that caused it.
 */

import { parseToUnicodeCMap } from '../src/utils/pdf/fonts';
import {
  splitSections,
  parseEducation,
  parseExperience,
  parseProjects,
  parseAchievements,
  parseSkillsSection,
  extractDateRange,
} from '../src/utils/resumeSections';

const DICT = ['React', 'HTML', 'CSS', 'JavaScript', 'Docker', 'Go'];
const ym = (iso?: string) => iso?.slice(0, 7);

describe('ToUnicode CMap with mixed bfrange forms', () => {
  // The defect that turned a whole resume into a substitution cipher: the
  // single-destination pattern re-matched inside a destination array, so three
  // consecutive destinations were read as "map this range starting here".
  const CMAP = [
    '1 begincodespacerange',
    '<0000> <FFFF>',
    'endcodespacerange',
    '2 beginbfrange',
    '<0000> <0000> <0000>',
    '<0001> <0008> [<0057> <004F> <0052> <004B> <0065> <006E> <0069> <006F>]',
    'endbfrange',
  ].join('\n');

  const { map } = parseToUnicodeCMap(CMAP);

  it('maps each code from the destination array', () => {
    expect(map.get(0x01)).toBe('W');
    expect(map.get(0x02)).toBe('O');
    expect(map.get(0x03)).toBe('R');
    expect(map.get(0x04)).toBe('K');
  });

  it('does not let array destinations overwrite each other as a range', () => {
    // <0065> <006E> <0069> sit next to each other in the array above and look
    // exactly like `<lo> <hi> <dst>`. Read that way they rewrote codes
    // 0x65-0x6E, corrupting a band of characters mid-document.
    expect(map.get(0x05)).toBe('e');
    expect(map.get(0x06)).toBe('n');
    expect(map.get(0x07)).toBe('i');
    expect(map.get(0x08)).toBe('o');
    expect(map.get(0x65)).toBeUndefined();
    expect(map.get(0x6a)).toBeUndefined();
  });
});

describe('date ranges written without a separator', () => {
  it('reads "03/2022 02/2024" as a range', () => {
    const r = extractDateRange('Frontend Developer 03/2022 02/2024');
    expect(ym(r.startDate)).toBe('2022-03');
    expect(ym(r.endDate)).toBe('2024-02');
  });

  it('still reads the usual dashed form', () => {
    const r = extractDateRange('Jan 2021 - Present');
    expect(ym(r.startDate)).toBe('2021-01');
    expect(r.isCurrent).toBe(true);
  });
});

describe('sections that hold none of the Manage entities', () => {
  it('lets LANGUAGES close the education section', () => {
    const s = splitSections(
      [
        'EDUCATION',
        'B.Tech in Computer Science 09/2014 08/2018',
        'Guru Jambheshwar University, Hisar',
        'LANGUAGES',
        'English Native Hindi Native',
        'Marwari Advanced',
        'Powered by www.example.com',
      ].join('\n'),
    );
    expect(s.education).toHaveLength(2);
    expect(parseEducation(s.education)).toHaveLength(1);
    expect(s.education.join(' ')).not.toContain('Marwari');
  });

  it('does not read "Achievements/Tasks" inside a job as a section heading', () => {
    const s = splitSections(
      ['WORK EXPERIENCE', 'Senior Analyst, Acme Corp', 'Achievements/Tasks', 'Developed the billing UI.'].join('\n'),
    );
    expect(s.achievements).toHaveLength(0);
    expect(s.experience.join(' ')).toContain('billing UI');
  });
});

describe('education entries that name a school as the qualification', () => {
  it('keeps "High School" as the degree and the school as the institution', () => {
    const edu = parseEducation([
      'B.Tech in Computer Science Engineering 09/2014 08/2018',
      'Guru Jambheshwar University of S&T Hisar, Haryana',
      'High School 04/2013 04/2014',
      'P.G.S.D. Sr. Sec. School Hisar, Haryana',
    ]);
    expect(edu).toHaveLength(2);
    expect(edu[1].degree).toBe('High School');
    expect(edu[1].institution).toContain('P.G.S.D');
  });

  it('does not read a GPA line as an institution', () => {
    const edu = parseEducation([
      'Bachelor of Technology in Computer Science Engineering',
      'Guru Jambheshwar University of Science & Technology, Hisar',
      'Sept 2014 - Aug 2018 | GPA: 6.98 / 10',
      'Senior Secondary (Science Stream)',
      'P.G.S.D. Sr. Sec. School, Hisar',
      'Apr 2013 - Apr 2014 | GPA: 8 / 10',
    ]);
    expect(edu).toHaveLength(2);
    expect(edu.every((e) => !/unknown/i.test(e.institution) && !/unknown/i.test(e.degree))).toBe(true);
    expect(edu[0].grade).toBe('6.98/10');
  });
});

describe('experience entries split over two lines', () => {
  it('takes the company from the line below the role', () => {
    const exp = parseExperience(
      [
        'Senior Programmer Analyst',
        'IDrive Software India Pvt. Ltd.',
        '07/2017 - Present, Bangalore',
        'Developed the server UI.',
      ],
      DICT,
    );
    expect(exp).toHaveLength(1);
    expect(exp[0].role).toBe('Senior Programmer Analyst');
    expect(exp[0].company).toBe('IDrive Software India Pvt. Ltd.');
    expect(exp[0].company).not.toMatch(/unknown/i);
  });

  it('keeps a job whose title is not a classic engineering role', () => {
    const exp = parseExperience(
      [
        'Frontend Developer 03/2022 02/2024',
        'Somaxso Technologies Pvt. Ltd',
        'Website And Application Coordinator 02/2021 03/2022',
        'Impact Academy',
      ],
      DICT,
    );
    expect(exp.map((e) => e.role)).toEqual(['Frontend Developer', 'Website And Application Coordinator']);
    expect(exp.map((e) => e.company)).toEqual(['Somaxso Technologies Pvt. Ltd', 'Impact Academy']);
    expect(ym(exp[0].endDate)).toBe('2024-02');
  });
});

describe('projects laid out as name, then description', () => {
  it('uses the dated lines as the entries and the rest as detail', () => {
    const projects = parseProjects(
      [
        'Website (01/2020 - 05/2020)',
        'Donating face shields to front line workers',
        'Burger Builder App (Basic react App )',
        '(10/2021 - 11/2021)',
        'To Understand to basic react logics',
        'Tic Toc Toe game (11/2021 - 12/2021)',
        'A Basic react app to learn react state management',
        'TripStory (05/2015 - 06/2015)',
        'Simple websites to learn CSS,HTML',
      ],
      DICT,
    );
    expect(projects.map((p) => p.title)).toEqual([
      'Website',
      'Burger Builder App (Basic react App )',
      'Tic Toc Toe game',
      'TripStory',
    ]);
    expect(projects[0].summary).toContain('face shields');
    // The dates belong on the entry, never in its name.
    expect(projects.every((p) => !/\d{4}/.test(p.title))).toBe(true);
  });

  it('keeps a project URL out of the title', () => {
    const projects = parseProjects(['Portfolio Website: www.example.com'], DICT);
    expect(projects[0].title).toBe('Portfolio Website');
    expect(projects[0].links[0].url).toContain('example.com');
  });
});

describe('achievements written as a title with wrapped detail', () => {
  it('makes one entry per award, not one per visual line', () => {
    const achievements = parseAchievements([
      'Rectify',
      'Participated in Rectify, a debugging contest, in Engineer tech fest in NITK',
      'Board Exam Performance',
      'Got a certificate for the excellent performance in 10th class from',
      'Rajasthan Board in 2009',
      'Inter School sports',
      'Actively participated in various sports activities for inter school',
      'competitions',
    ]);
    expect(achievements.map((a) => a.title)).toEqual([
      'Rectify',
      'Board Exam Performance',
      'Inter School sports',
    ]);
    expect(achievements[1].description).toContain('Rajasthan Board');
    expect(ym(achievements[1].date)).toBe('2009-01');
  });
});

describe('skill lists', () => {
  it('drops a link that rides along in a tech list', () => {
    const skills = parseSkillsSection(['HTML5, CSS3, SCSS | Live: www.example.com']);
    expect(skills).toEqual(expect.arrayContaining(['HTML5', 'CSS3', 'SCSS']));
    expect(skills.some((s) => s.includes('example.com'))).toBe(false);
  });
});
