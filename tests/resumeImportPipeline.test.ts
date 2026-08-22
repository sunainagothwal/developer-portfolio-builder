/**
 * End-to-end cover for the resume import path: PDF bytes -> extracted text ->
 * parsed sections.
 *
 * The bug this suite exists for was invisible to the old tests because their
 * fixture PDF used a shape no real writer produces. Each case here reproduces
 * how an actual tool lays text out, and asserts that *every* entry in the
 * document survives with its fields on the right record.
 */

import { extractPdfText } from '../src/utils/documentText';
import { parseResumeText } from '../src/lib/import/resumeParser';
import { buildPdf, type BuildOptions, type Placed } from './helpers/buildPdf';

/** A resume with two jobs, three projects, two degrees, three certificates. */
const RESUME: Placed[] = [
  { x: 72, y: 740, text: 'Jane Doe', size: 20 },
  { x: 72, y: 718, text: 'Senior Software Engineer' },
  { x: 72, y: 702, text: 'jane.doe@example.com | +1 415 555 0132 | San Francisco, CA' },
  { x: 72, y: 686, text: 'github.com/janedoe | linkedin.com/in/janedoe' },

  { x: 72, y: 656, text: 'WORK EXPERIENCE', size: 13 },
  { x: 72, y: 636, text: 'Senior Software Engineer, Acme Corp' },
  { x: 430, y: 636, text: 'Jan 2021 - Present' },
  { x: 86, y: 620, text: '• Led migration of the payments service to TypeScript and Node.js.' },
  { x: 86, y: 606, text: '• Cut p95 latency by 40% with Redis caching.' },
  { x: 72, y: 584, text: 'Software Engineer, Globex Inc' },
  { x: 430, y: 584, text: 'Jun 2018 - Dec 2020' },
  { x: 86, y: 568, text: '• Built React dashboards used by 20k customers.' },
  { x: 72, y: 546, text: 'Junior Developer, Initech' },
  { x: 430, y: 546, text: 'Jul 2016 - May 2018' },
  { x: 86, y: 530, text: '• Maintained the Django backend and its PostgreSQL schema.' },

  { x: 72, y: 500, text: 'PROJECTS', size: 13 },
  { x: 72, y: 480, text: 'Portfolio Builder' },
  { x: 86, y: 464, text: '• Offline-first mobile app for developers.' },
  { x: 86, y: 450, text: 'Tech: React Native, Expo, SQLite' },
  { x: 72, y: 428, text: 'Trailmix' },
  { x: 86, y: 412, text: '• Go service that aggregates GPS traces.' },
  { x: 86, y: 398, text: 'Tech: Go, PostgreSQL, Docker' },
  { x: 72, y: 376, text: 'Chartwright' },
  { x: 86, y: 360, text: '• Charting library with 4k GitHub stars.' },
  { x: 86, y: 346, text: 'Tech: TypeScript, D3.js' },

  { x: 72, y: 316, text: 'EDUCATION', size: 13 },
  { x: 72, y: 296, text: 'Stanford University' },
  { x: 430, y: 296, text: '2014 - 2018' },
  { x: 72, y: 280, text: 'B.S. in Computer Science' },
  { x: 72, y: 258, text: 'MIT' },
  { x: 430, y: 258, text: '2018 - 2020' },
  { x: 72, y: 242, text: 'M.S. in Artificial Intelligence' },

  { x: 72, y: 212, text: 'CERTIFICATIONS', size: 13 },
  { x: 72, y: 192, text: 'AWS Certified Solutions Architect - Amazon Web Services, Mar 2023' },
  { x: 72, y: 176, text: 'Certified Kubernetes Administrator | Linux Foundation | 2021' },
  { x: 72, y: 160, text: 'Professional Scrum Master - Scrum.org, Jun 2020' },

  { x: 72, y: 130, text: 'SKILLS', size: 13 },
  { x: 72, y: 110, text: 'Languages: TypeScript, Go, Python' },
  { x: 72, y: 94, text: 'Frameworks: React, React Native, Django' },

  { x: 72, y: 64, text: 'ACHIEVEMENTS', size: 13 },
  { x: 72, y: 48, text: 'Winner, National Hackathon 2022' },
];

const EXPECTED = {
  companies: ['Acme Corp', 'Globex Inc', 'Initech'],
  roles: ['Senior Software Engineer', 'Software Engineer', 'Junior Developer'],
  projects: ['Portfolio Builder', 'Trailmix', 'Chartwright'],
  institutions: ['Stanford University', 'MIT'],
  certificates: [
    'AWS Certified Solutions Architect',
    'Certified Kubernetes Administrator',
    'Professional Scrum Master',
  ],
};

const STYLES: [string, BuildOptions][] = [
  ['literal strings, Tm positioning', { style: 'literal' }],
  ['kerned TJ arrays', { style: 'kerned' }],
  ['Identity-H hex strings', { style: 'identity-h' }],
  ['relative Td advances', { style: 'kerned', relative: true }],
  ['form XObject content', { style: 'literal', viaForm: true }],
  ['one BT block per line', { style: 'literal', singleBlock: false }],
];

describe.each(STYLES)('resume import — %s', (_label, options) => {
  const text = extractPdfText(buildPdf(RESUME, options));
  const parsed = parseResumeText(text);

  it('recovers the contact details without fusing adjacent lines', () => {
    expect(parsed.fullName).toBe('Jane Doe');
    expect(parsed.email).toBe('jane.doe@example.com');
    expect(parsed.phone).toContain('415');
    expect(parsed.location).toBe('San Francisco, CA');
    expect(parsed.links.map((l) => l.label)).toEqual(expect.arrayContaining(['GitHub', 'LinkedIn']));
  });

  it('imports every job with its own company, role and dates', () => {
    expect(parsed.experience.map((e) => e.company)).toEqual(EXPECTED.companies);
    expect(parsed.experience.map((e) => e.role)).toEqual(EXPECTED.roles);
    expect(parsed.experience[0].isCurrent).toBe(true);
    expect(parsed.experience[0].startDate?.slice(0, 7)).toBe('2021-01');
    expect(parsed.experience[1].startDate?.slice(0, 7)).toBe('2018-06');
    expect(parsed.experience[1].endDate?.slice(0, 7)).toBe('2020-12');
    expect(parsed.experience[2].startDate?.slice(0, 7)).toBe('2016-07');
  });

  it('attaches each bullet to the job above it, not to a phantom entry', () => {
    expect(parsed.experience[0].description).toContain('payments service');
    expect(parsed.experience[0].description).toContain('Redis caching');
    expect(parsed.experience[1].description).toContain('React dashboards');
    expect(parsed.experience[2].description).toContain('Django');
  });

  it('imports every project with its declared tech stack', () => {
    expect(parsed.projects.map((p) => p.title)).toEqual(EXPECTED.projects);
    expect(parsed.projects[0].techStack).toEqual(expect.arrayContaining(['React Native', 'Expo', 'SQLite']));
    expect(parsed.projects[1].techStack).toEqual(expect.arrayContaining(['Go', 'PostgreSQL', 'Docker']));
    expect(parsed.projects[2].techStack).toEqual(expect.arrayContaining(['TypeScript', 'D3.js']));
  });

  it('keeps the project summary out of the title', () => {
    expect(parsed.projects[0].summary).toContain('Offline-first');
    expect(parsed.projects[0].title).not.toContain('Offline-first');
  });

  it('imports both degrees with institution, degree, field and dates', () => {
    expect(parsed.education.map((e) => e.institution)).toEqual(EXPECTED.institutions);
    expect(parsed.education[0].degree).toMatch(/B\.?\s?S/i);
    expect(parsed.education[0].fieldOfStudy).toBe('Computer Science');
    expect(parsed.education[0].startDate?.slice(0, 4)).toBe('2014');
    expect(parsed.education[0].endDate?.slice(0, 4)).toBe('2018');
    expect(parsed.education[1].fieldOfStudy).toBe('Artificial Intelligence');
    expect(parsed.education.every((e) => !/unknown/i.test(e.institution))).toBe(true);
  });

  it('imports every certificate with its issuer and no stray punctuation', () => {
    expect(parsed.certificates.map((c) => c.name)).toEqual(EXPECTED.certificates);
    expect(parsed.certificates[0].issuingOrg).toBe('Amazon Web Services');
    expect(parsed.certificates[1].issuingOrg).toBe('Linux Foundation');
    expect(parsed.certificates[2].issuingOrg).toBe('Scrum.org');
    expect(parsed.certificates[0].issueDate?.slice(0, 7)).toBe('2023-03');
    expect(parsed.certificates.every((c) => !/[,;|]$/.test(c.issuingOrg))).toBe(true);
  });

  it('imports the skills without their category labels', () => {
    expect(parsed.skills).toEqual(expect.arrayContaining(['TypeScript', 'Go', 'Python', 'React', 'React Native']));
    expect(parsed.skills).not.toContain('Languages');
    expect(parsed.skills).not.toContain('Frameworks');
  });

  it('imports achievements', () => {
    expect(parsed.achievements.map((a) => a.title)).toContain('Winner, National Hackathon');
    expect(parsed.achievements[0].date?.slice(0, 4)).toBe('2022');
  });

  it('leaves no field holding another fields value', () => {
    for (const job of parsed.experience) {
      expect(job.company).not.toBe(job.role);
      expect(job.company).not.toMatch(/\d{4}/);
      expect(job.role).not.toMatch(/\d{4}/);
    }
    for (const edu of parsed.education) {
      expect(edu.institution).not.toMatch(/\d{4}/);
      expect(edu.degree).not.toMatch(/\d{4}/);
    }
    for (const cert of parsed.certificates) {
      expect(cert.name).not.toMatch(/\d{4}/);
    }
  });
});
