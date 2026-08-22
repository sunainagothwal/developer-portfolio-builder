import {
  splitSections,
  extractDateRange,
  parseEducation,
  parseCertificates,
  parseProjects,
  parseSkillsSection,
  parseExperience,
  parseAchievements,
} from '../src/utils/resumeSections';

const ym = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 7) : undefined);

const SAMPLE = `
Jane Doe
Senior Frontend Engineer
jane@example.com | +1 415 555 0134
San Francisco, CA

EDUCATION
Stanford University | B.S. in Computer Science | 2014 - 2018
MIT | M.S. Artificial Intelligence | 2018 - 2020

TECHNICAL SKILLS
Languages: TypeScript, Python, Go
Frameworks: React, React Native

PROJECTS
Portfolio Builder — React Native, TypeScript
Offline-first app for managing developer portfolios.
Trade Analytics
Dashboard built with React and PostgreSQL.

CERTIFICATIONS
AWS Certified Solutions Architect — Amazon Web Services, Mar 2023
Professional Scrum Master | Scrum.org | 2021
`;

const DICT = ['React', 'React Native', 'TypeScript', 'PostgreSQL', 'Python', 'Go'];

describe('splitSections', () => {
  const sections = splitSections(SAMPLE);

  it('routes lines under the correct heading', () => {
    expect(sections.education).toHaveLength(2);
    expect(sections.certificates).toHaveLength(2);
    expect(sections.skills.length).toBeGreaterThan(0);
    expect(sections.projects.length).toBeGreaterThan(0);
  });

  it('keeps pre-heading contact lines in "other"', () => {
    expect(sections.other.join(' ')).toContain('jane@example.com');
  });

  it('does not treat long body text as a heading', () => {
    const s = splitSections('EDUCATION\nProjects completed during my degree included several apps.');
    expect(s.projects).toHaveLength(0);
    expect(s.education).toHaveLength(1);
  });
});

describe('splitSections — run-on text with no line breaks', () => {
  // Reproduces a PDF that emits one continuous string with no newlines, which
  // previously matched no headings and so imported only skills.
  const BLOB =
    'Jane Doe jane@example.com EDUCATION Stanford University | B.S. Computer Science | 2014 - 2018 ' +
    'WORK EXPERIENCE Senior Engineer | Acme Corp | Jan 2021 - Present ' +
    'PROJECTS Portfolio Builder — React Native app ' +
    'CERTIFICATIONS AWS Certified Solutions Architect — Amazon Web Services, Mar 2023 ' +
    'TECHNICAL SKILLS TypeScript, Python, Go';

  const sections = splitSections(BLOB);

  it('still finds every section without newlines', () => {
    expect(sections.education.length).toBeGreaterThan(0);
    expect(sections.experience.length).toBeGreaterThan(0);
    expect(sections.projects.length).toBeGreaterThan(0);
    expect(sections.certificates.length).toBeGreaterThan(0);
    expect(sections.skills.length).toBeGreaterThan(0);
  });

  it('parses education out of the blob', () => {
    const edu = parseEducation(sections.education);
    expect(edu.length).toBeGreaterThan(0);
    expect(edu[0].institution).toContain('Stanford');
  });

  it('parses certificates out of the blob', () => {
    const certs = parseCertificates(sections.certificates);
    expect(certs.length).toBeGreaterThan(0);
    expect(certs[0].name).toContain('AWS');
  });

  it('does not regress well-structured resumes', () => {
    const normal = splitSections(SAMPLE);
    expect(normal.education).toHaveLength(2);
    expect(normal.certificates).toHaveLength(2);
  });
});

describe('extractDateRange', () => {
  it('parses month-year ranges', () => {
    const r = extractDateRange('Jan 2020 - Dec 2022');
    expect(ym(r.startDate)).toBe('2020-01');
    expect(ym(r.endDate)).toBe('2022-12');
    expect(r.isCurrent).toBe(false);
  });

  it('parses bare year ranges with en dash', () => {
    const r = extractDateRange('2014 – 2018');
    expect(ym(r.startDate)).toBe('2014-01');
    expect(ym(r.endDate)).toBe('2018-01');
  });

  it('flags ongoing ranges and leaves the end date empty', () => {
    const r = extractDateRange('Aug 2019 - Present');
    expect(ym(r.startDate)).toBe('2019-08');
    expect(r.endDate).toBeUndefined();
    expect(r.isCurrent).toBe(true);
  });

  it('handles a single date with no range', () => {
    expect(ym(extractDateRange('Mar 2023').startDate)).toBe('2023-03');
  });
});

describe('parseEducation', () => {
  const edu = parseEducation(splitSections(SAMPLE).education);

  it('extracts institution, degree, field and dates', () => {
    expect(edu).toHaveLength(2);
    expect(edu[0].institution).toBe('Stanford University');
    expect(edu[0].degree).toMatch(/B\.?\s?S/i);
    expect(edu[0].fieldOfStudy).toBe('Computer Science');
    expect(ym(edu[0].startDate)).toBe('2014-01');
    expect(ym(edu[0].endDate)).toBe('2018-01');
  });

  it('handles a second entry independently', () => {
    expect(edu[1].institution).toBe('MIT');
    expect(edu[1].fieldOfStudy).toContain('Artificial Intelligence');
  });
});

describe('parseCertificates', () => {
  const certs = parseCertificates(splitSections(SAMPLE).certificates);

  it('splits name from issuing organisation', () => {
    expect(certs).toHaveLength(2);
    expect(certs[0].name).toBe('AWS Certified Solutions Architect');
    expect(certs[0].issuingOrg).toContain('Amazon Web Services');
    expect(ym(certs[0].issueDate)).toBe('2023-03');
  });

  it('handles pipe-separated entries', () => {
    expect(certs[1].name).toBe('Professional Scrum Master');
    expect(certs[1].issuingOrg).toContain('Scrum.org');
  });
});

describe('parseProjects', () => {
  const projects = parseProjects(splitSections(SAMPLE).projects, DICT);

  it('extracts titles and detects tech stack from the block', () => {
    expect(projects.length).toBeGreaterThanOrEqual(2);
    expect(projects[0].title).toBe('Portfolio Builder');
    expect(projects[0].techStack).toEqual(expect.arrayContaining(['React Native', 'TypeScript']));
  });

  it('uses following detail lines as the summary', () => {
    expect(projects[0].summary).toContain('Offline-first');
  });
});

describe('parseExperience', () => {
  const RESUME = `
WORK EXPERIENCE
Senior Frontend Engineer | Acme Corp | Jan 2021 - Present
Led the React Native rewrite of the mobile app.
Software Engineer | Globex | Jun 2018 - Dec 2020
Built internal tools with Python and PostgreSQL.
`;
  const exp = parseExperience(splitSections(RESUME).experience, DICT);

  it('separates role from company', () => {
    expect(exp).toHaveLength(2);
    expect(exp[0].role).toBe('Senior Frontend Engineer');
    expect(exp[0].company).toBe('Acme Corp');
  });

  it('marks an ongoing role as current with no end date', () => {
    expect(exp[0].isCurrent).toBe(true);
    expect(exp[0].endDate).toBeUndefined();
    expect(ym(exp[0].startDate)).toBe('2021-01');
  });

  it('captures closed date ranges and detail lines', () => {
    expect(ym(exp[1].startDate)).toBe('2018-06');
    expect(ym(exp[1].endDate)).toBe('2020-12');
    expect(exp[1].description).toContain('internal tools');
  });

  it('detects tech stack mentioned in the entry', () => {
    expect(exp[0].techStack).toContain('React Native');
    expect(exp[1].techStack).toEqual(expect.arrayContaining(['Python', 'PostgreSQL']));
  });
});

describe('parseAchievements', () => {
  const RESUME = `
ACHIEVEMENTS
Winner, National Hackathon 2022
Published paper on distributed systems, Mar 2021
`;
  const achievements = parseAchievements(splitSections(RESUME).achievements);

  it('extracts one achievement per line with the date removed from the title', () => {
    expect(achievements).toHaveLength(2);
    expect(achievements[0].title).toBe('Winner, National Hackathon');
    expect(ym(achievements[0].date)).toBe('2022-01');
  });

  it('parses month-year dates', () => {
    expect(ym(achievements[1].date)).toBe('2021-03');
    expect(achievements[1].title).toContain('distributed systems');
  });

  it('recognises "Awards" and "Honours" as the same section', () => {
    expect(splitSections('AWARDS\nBest Paper').achievements).toEqual(['Best Paper']);
    expect(splitSections('Honours\nDean\'s List').achievements).toEqual(["Dean's List"]);
  });
});

describe('reported defects', () => {
  it('keeps a multi-line education entry together instead of emitting "Unknown"', () => {
    const edu = parseEducation([
      'Stanford University',
      'B.S. Computer Science',
      '2014 - 2018',
      'MIT',
      'M.S. Artificial Intelligence',
      '2018 - 2020',
    ]);
    expect(edu).toHaveLength(2);
    expect(edu[0].institution).toBe('Stanford University');
    expect(edu[0].degree).not.toMatch(/unknown/i);
    expect(edu[1].institution).toBe('MIT');
    expect(edu.every((e) => !/unknown/i.test(e.institution))).toBe(true);
  });

  it('keeps every job when detail lines sit between entries', () => {
    const exp = parseExperience(
      [
        'Senior Engineer | Acme Corp | Jan 2021 - Present',
        'Led the mobile rewrite.',
        'Improved performance by 40%.',
        'Software Engineer | Globex | Jun 2018 - Dec 2020',
        'Built internal tools.',
        'Engineer | Initech | 2016 - 2018',
      ],
      DICT,
    );
    expect(exp).toHaveLength(3);
    expect(exp.map((e) => e.company)).toEqual(['Acme Corp', 'Globex', 'Initech']);
  });

  it('uses the project name as title and detail as summary, not the reverse', () => {
    const projects = parseProjects(
      ['Portfolio Builder', 'Built an offline-first app using React Native.', 'Trade Analytics', 'Dashboard using PostgreSQL.'],
      DICT,
    );
    expect(projects).toHaveLength(2);
    expect(projects[0].title).toBe('Portfolio Builder');
    expect(projects[0].summary).toContain('offline-first');
    expect(projects[1].title).toBe('Trade Analytics');
  });

  it('imports certificates under alternative heading names', () => {
    for (const heading of ['CERTIFICATIONS', 'CERTIFICATES', 'LICENSES', 'CREDENTIALS', 'COURSES']) {
      const s = splitSections(`${heading}\nAWS Certified Solutions Architect — Amazon, Mar 2023`);
      expect(parseCertificates(s.certificates).length).toBeGreaterThan(0);
    }
  });

  it('ignores heading words used in ordinary prose', () => {
    // "projects" here is prose, not a heading — it must not split the section.
    const s = splitSections(
      'EXPERIENCE: Senior Engineer at Acme where I led projects and mentored staff. CERTIFICATIONS: AWS Architect',
    );
    expect(parseCertificates(s.certificates).length).toBeGreaterThan(0);
  });
});

describe('parseSkillsSection', () => {
  const skills = parseSkillsSection(splitSections(SAMPLE).skills);

  it('strips category prefixes and splits lists', () => {
    expect(skills).toEqual(expect.arrayContaining(['TypeScript', 'Python', 'Go', 'React', 'React Native']));
  });

  it('never emits category labels as skills', () => {
    expect(skills).not.toContain('Languages');
    expect(skills).not.toContain('Frameworks');
  });

  it('ignores bare numbers and over-long fragments', () => {
    const noisy = parseSkillsSection(['2019, TypeScript, ' + 'x'.repeat(40)]);
    expect(noisy).toContain('TypeScript');
    expect(noisy).not.toContain('2019');
    expect(noisy.every((s) => s.length <= 30)).toBe(true);
  });
});
