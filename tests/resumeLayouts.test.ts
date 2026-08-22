/**
 * Layout shapes that used to lose data: multiple pages, sidebar columns,
 * right-aligned date columns, fully-bulleted sections and letter-spaced
 * headings.
 */

import { extractPdfText } from '../src/utils/documentText';
import { parseResumeText } from '../src/lib/import/resumeParser';
import { buildPdf, buildPdfPages, placeLines, type Placed } from './helpers/buildPdf';
import { parseProjects, parseCertificates, splitSections } from '../src/utils/resumeSections';

const DICT = ['React', 'React Native', 'TypeScript', 'PostgreSQL', 'Python', 'Go', 'Docker'];

describe('multi-page resumes', () => {
  const pageOne: Placed[] = [
    { x: 72, y: 740, text: 'Jane Doe', size: 18 },
    { x: 72, y: 716, text: 'WORK EXPERIENCE', size: 13 },
    { x: 72, y: 696, text: 'Senior Engineer, Acme Corp' },
    { x: 430, y: 696, text: 'Jan 2021 - Present' },
    { x: 86, y: 680, text: '• Led the payments rewrite.' },
    { x: 72, y: 656, text: 'Engineer, Globex Inc' },
    { x: 430, y: 656, text: 'Jun 2018 - Dec 2020' },
    { x: 86, y: 640, text: '• Built React dashboards.' },
  ];
  const pageTwo: Placed[] = [
    { x: 72, y: 740, text: 'Developer, Initech' },
    { x: 430, y: 740, text: 'Jul 2016 - May 2018' },
    { x: 86, y: 724, text: '• Maintained the Python services.' },
    { x: 72, y: 690, text: 'EDUCATION', size: 13 },
    { x: 72, y: 670, text: 'Stanford University' },
    { x: 430, y: 670, text: '2012 - 2016' },
    { x: 72, y: 654, text: 'B.S. in Computer Science' },
  ];

  const parsed = parseResumeText(extractPdfText(buildPdfPages([pageOne, pageTwo], { style: 'literal' })));

  it('keeps entries that continue onto the second page', () => {
    expect(parsed.experience.map((e) => e.company)).toEqual(['Acme Corp', 'Globex Inc', 'Initech']);
  });

  it('reads sections that only appear on the second page', () => {
    expect(parsed.education).toHaveLength(1);
    expect(parsed.education[0].institution).toBe('Stanford University');
    expect(parsed.education[0].fieldOfStudy).toBe('Computer Science');
  });
});

describe('right-aligned date column', () => {
  // A wide gap between the role and its dates must stay on one line. Splitting
  // here would strand every date in a section of its own.
  const lines: Placed[] = [
    { x: 72, y: 740, text: 'EXPERIENCE', size: 13 },
    { x: 72, y: 720, text: 'Senior Engineer, Acme Corp' },
    { x: 440, y: 720, text: 'Jan 2021 - Present' },
    { x: 86, y: 704, text: '• Shipped the billing service and cut cost per request by a third.' },
    { x: 72, y: 680, text: 'Engineer, Globex Inc' },
    { x: 440, y: 680, text: 'Jun 2018 - Dec 2020' },
    { x: 86, y: 664, text: '• Built and maintained the internal analytics dashboards in React.' },
  ];
  const text = extractPdfText(buildPdf(lines, { style: 'literal' }));
  const parsed = parseResumeText(text);

  it('joins the role and its dates onto one line', () => {
    expect(text).toContain('Senior Engineer, Acme Corp Jan 2021 - Present');
  });

  it('assigns each date range to the right job', () => {
    expect(parsed.experience[0].startDate?.slice(0, 7)).toBe('2021-01');
    expect(parsed.experience[0].isCurrent).toBe(true);
    expect(parsed.experience[1].startDate?.slice(0, 7)).toBe('2018-06');
    expect(parsed.experience[1].endDate?.slice(0, 7)).toBe('2020-12');
  });
});

describe('two-column sidebar resume', () => {
  // Skills run down a narrow left column; the history fills the right one. Read
  // row by row the two interleave into nonsense.
  const sidebar = [
    'SKILLS',
    'TypeScript',
    'React',
    'PostgreSQL',
    'Docker',
    'Go',
    'Python',
    'CONTACT',
    'jane@example.com',
  ].map((text, i) => ({ x: 50, y: 720 - i * 18, text }));

  const main = [
    'EXPERIENCE',
    'Senior Engineer, Acme Corp',
    'Jan 2021 - Present',
    'Led the payments rewrite.',
    'Engineer, Globex Inc',
    'Jun 2018 - Dec 2020',
    'Built internal tools.',
    'EDUCATION',
    'Stanford University',
    'B.S. in Computer Science',
    '2014 - 2018',
  ].map((text, i) => ({ x: 250, y: 720 - i * 18, text }));

  const text = extractPdfText(buildPdf([...sidebar, ...main], { style: 'literal' }));
  const parsed = parseResumeText(text);

  it('reads each column as a block rather than interleaving them', () => {
    expect(text.indexOf('Docker')).toBeLessThan(text.indexOf('EXPERIENCE'));
    expect(text).not.toMatch(/TypeScript .*Senior Engineer/);
  });

  it('still finds both jobs and the degree', () => {
    expect(parsed.experience.map((e) => e.company)).toEqual(['Acme Corp', 'Globex Inc']);
    expect(parsed.education[0].institution).toBe('Stanford University');
  });
});

describe('comma-packed, pipe-delimited resume', () => {
  // A second resume style, kept because it caught three defects the first one
  // could not: comma-packed education lines, "Company — Role" ordering, and
  // "Tech Stack:" annotations being mistaken for section headings.
  const LINES = [
    'RAHUL SHARMA',
    'Full Stack Developer',
    'rahul.sharma@gmail.com  •  +91 98765 43210  •  Bengaluru, India',
    'EDUCATION',
    'B.Tech in Computer Science, VIT University, 2019 - 2023  |  CGPA: 8.7/10',
    'Higher Secondary, Delhi Public School, 2017 - 2019  |  Percentage: 92%',
    'PROFESSIONAL EXPERIENCE',
    'Infosys Limited  —  Systems Engineer  —  Aug 2023 - Present',
    'Developed microservices in Java and Spring Boot.',
    'Zoho Corporation  —  Software Development Intern  —  Jan 2023 - Jun 2023',
    'Built internal tooling with Vue and MySQL.',
    'KEY PROJECTS',
    'MediTrack  |  Hospital management system  |  2022',
    'Tech Stack: React, Node.js, MongoDB',
    'CampusConnect  |  Student social network  |  2021',
    'Tech Stack: Flutter, Firebase',
    'CERTIFICATIONS & COURSES',
    'Oracle Certified Java Programmer, Oracle, Nov 2022',
    'TECHNICAL SKILLS',
    'Languages: Java, JavaScript, Python, SQL',
    'ACHIEVEMENTS',
    'Runner-up, Smart India Hackathon 2022',
  ];

  const parsed = parseResumeText(extractPdfText(buildPdf(placeLines(LINES), { style: 'kerned' })));

  it('separates degree, field and institution on a comma-packed line', () => {
    expect(parsed.education.map((e) => e.institution)).toEqual(['VIT University', 'Delhi Public School']);
    expect(parsed.education[0].degree).toBe('B.Tech');
    expect(parsed.education[0].fieldOfStudy).toBe('Computer Science');
    expect(parsed.education[0].grade).toBe('8.7/10');
    // "Higher Secondary" is the whole qualification, not a degree plus a field.
    expect(parsed.education[1].degree).toBe('Higher Secondary');
    expect(parsed.education[1].fieldOfStudy).toBeUndefined();
  });

  it('reads company-first entries the right way round', () => {
    expect(parsed.experience.map((e) => e.company)).toEqual(['Infosys Limited', 'Zoho Corporation']);
    expect(parsed.experience.map((e) => e.role)).toEqual(['Systems Engineer', 'Software Development Intern']);
    expect(parsed.experience[0].isCurrent).toBe(true);
  });

  it('treats "Tech Stack:" as an entry annotation, not a section heading', () => {
    expect(parsed.projects.map((p) => p.title)).toEqual(['MediTrack', 'CampusConnect']);
    expect(parsed.projects[0].techStack).toEqual(expect.arrayContaining(['React', 'Node.js', 'MongoDB']));
    expect(parsed.projects[1].techStack).toEqual(expect.arrayContaining(['Flutter', 'Firebase']));
    // The project names must not leak into skills, which is where they landed
    // when the annotation was read as a heading.
    expect(parsed.skills).not.toContain('CampusConnect');
    expect(parsed.skills).not.toContain('Student social network');
  });

  it('keeps the remaining sections intact', () => {
    expect(parsed.certificates[0].name).toBe('Oracle Certified Java Programmer');
    expect(parsed.certificates[0].issuingOrg).toBe('Oracle');
    expect(parsed.skills).toEqual(expect.arrayContaining(['Java', 'JavaScript', 'Python', 'SQL']));
    expect(parsed.achievements[0].title).toBe('Runner-up, Smart India Hackathon');
    expect(parsed.achievements[0].category).toBe('competition');
  });
});

describe('fully bulleted sections', () => {
  it('treats every bullet as its own project when nothing is unbulleted', () => {
    const projects = parseProjects(
      [
        '• Portfolio Builder — offline-first app',
        '• Trailmix — GPS aggregation service',
        '• Chartwright — charting library',
      ],
      DICT,
    );
    expect(projects.map((p) => p.title)).toEqual(['Portfolio Builder', 'Trailmix', 'Chartwright']);
  });

  it('treats bullets as detail when the section mixes both', () => {
    const projects = parseProjects(
      [
        'Portfolio Builder',
        '• Offline-first app built with React Native',
        '• Ships to iOS and Android',
        'Trailmix',
        '• GPS aggregation service in Go',
      ],
      DICT,
    );
    expect(projects.map((p) => p.title)).toEqual(['Portfolio Builder', 'Trailmix']);
    expect(projects[0].summary).toContain('Ships to iOS');
  });
});

describe('letter-spaced headings', () => {
  it('recognises a heading whose glyphs are tracked apart', () => {
    const sections = splitSections('E D U C A T I O N\nStanford University | B.S. Computer Science | 2014 - 2018');
    expect(sections.education).toHaveLength(1);
  });
});

describe('wrapped certificate entries', () => {
  it('joins a continuation line back onto its certificate', () => {
    const certs = parseCertificates([
      'AWS Certified Solutions Architect –',
      'Associate, Amazon Web Services, Mar 2023',
      'Certified Kubernetes Administrator | Linux Foundation | 2021',
    ]);
    expect(certs).toHaveLength(2);
    expect(certs[0].name).toContain('AWS Certified Solutions Architect');
    expect(certs[0].issuingOrg).toContain('Amazon Web Services');
  });

  it('captures a credential URL without leaving it in the name', () => {
    const certs = parseCertificates(['Google Cloud Architect | Google | credly.com/badges/abc123 | 2022']);
    expect(certs[0].name).toBe('Google Cloud Architect');
    expect(certs[0].credentialUrl).toContain('credly.com');
  });
});

describe('overprinted bold text', () => {
  it('does not duplicate a word drawn twice to fake a bold weight', () => {
    const lines: Placed[] = [
      { x: 72, y: 700, text: 'EXPERIENCE', size: 13 },
      { x: 72, y: 680, text: 'Senior Engineer' },
      { x: 72.3, y: 680, text: 'Senior Engineer' },
    ];
    const text = extractPdfText(buildPdf(lines, { style: 'literal' }));
    expect(text).toContain('Senior Engineer');
    expect(text).not.toContain('Senior EngineerSenior Engineer');
  });
});

describe('two-column body under a full-width header', () => {
  // The layout that motivated per-line column classification: the name and
  // summary run the full width, the body below splits into two columns.
  // Splitting the header at the gutter cut its words in half.
  const header: Placed[] = [
    { x: 60, y: 760, text: 'BHAGIRATH SHEELA', size: 18 },
    { x: 60, y: 740, text: 'Front End Developer' },
    { x: 60, y: 722, text: '5+ years experience in front end development. Seeking a front end developer position.' },
  ];
  const leftColumn = [
    'WORK EXPERIENCE',
    'Senior Programmer Analyst',
    'IDrive Software India Pvt. Ltd.',
    '07/2017 - Present, Bangalore',
    'Developed the server UI.',
    'EDUCATION',
    'B.Tech in Computer Science',
    'National Institute of Technology',
    '2013 - 2017',
  ].map((text, i) => ({ x: 60, y: 690 - i * 18, text }));
  const rightColumn = [
    'SKILLS',
    'ReactJS',
    'JavaScript',
    'HTML',
    'CSS',
    'Bootstrap',
    'Git',
    'ACHIEVEMENTS',
    'Rectify',
  ].map((text, i) => ({ x: 380, y: 690 - i * 18, text }));

  const text = extractPdfText(buildPdf([...header, ...leftColumn, ...rightColumn], { style: 'literal' }));
  const parsed = parseResumeText(text);

  it('keeps the full-width header on one line', () => {
    expect(text).toContain('Seeking a front end developer position.');
  });

  it('reads each column as a block rather than interleaving the rows', () => {
    expect(text.indexOf('EDUCATION')).toBeLessThan(text.indexOf('SKILLS'));
    expect(text).not.toMatch(/Senior Programmer Analyst ReactJS/);
  });

  it('imports the job with its company rather than "Unknown company"', () => {
    expect(parsed.fullName).toBe('BHAGIRATH SHEELA');
    expect(parsed.experience[0].role).toBe('Senior Programmer Analyst');
    expect(parsed.experience[0].company).toBe('IDrive Software India Pvt. Ltd.');
    expect(parsed.education[0].institution).toBe('National Institute of Technology');
  });
});

describe('scanned PDFs with no text layer', () => {
  it('returns nothing rather than binary noise', () => {
    const bytes = Uint8Array.from('%PDF-1.4\n1 0 obj\n<< /Type /XObject /Subtype /Image >>\nendobj\n%%EOF', (c) =>
      c.charCodeAt(0),
    );
    expect(extractPdfText(bytes)).toBe('');
  });
});
