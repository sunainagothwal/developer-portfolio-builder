/**
 * Resume parsing.
 *
 * Runs entirely on-device with no network calls and no extra native modules.
 * Text comes from `extractText`, which interprets the PDF properly (positions,
 * fonts, encodings) rather than pattern-matching it, so the parsers below can
 * assume one resume line per text line.
 *
 * Results are always presented to the user for review before anything is
 * saved — treat every field here as a suggestion, not a fact.
 */

import {
  splitSections,
  parseEducation,
  parseCertificates,
  parseProjects,
  parseSkillsSection,
  parseExperience,
  parseAchievements,
  skillMatcher,
  type ParsedEducation,
  type ParsedCertificate,
  type ParsedProject,
  type ParsedExperience,
  type ParsedAchievement,
} from '@utils/resumeSections';

export interface ParsedResume {
  fullName?: string;
  headline?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  links: { label: string; url: string }[];
  /** Skill names only — the Skill model has no dates, and none are inferred. */
  skills: string[];
  education: ParsedEducation[];
  certificates: ParsedCertificate[];
  projects: ParsedProject[];
  experience: ParsedExperience[];
  achievements: ParsedAchievement[];
}

/** Common skills we can match with high confidence. Extend freely. */
const SKILL_DICTIONARY = [
  // Languages
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Kotlin', 'Swift', 'Go', 'Rust', 'C++', 'C#', 'C',
  'Ruby', 'PHP', 'Scala', 'Dart', 'Elixir', 'Haskell', 'Perl', 'R', 'MATLAB', 'Objective-C', 'Solidity',
  'SQL', 'Bash', 'PowerShell', 'Assembly', 'Lua', 'Groovy', 'Clojure', 'F#', 'Julia',
  // Frontend
  'React', 'React Native', 'Next.js', 'Vue', 'Nuxt', 'Angular', 'Svelte', 'SvelteKit', 'Remix',
  'HTML', 'CSS', 'Tailwind', 'Sass', 'Less', 'Bootstrap', 'Material UI', 'Redux', 'Zustand',
  'jQuery', 'Webpack', 'Vite', 'Babel', 'Storybook', 'Three.js', 'D3.js',
  // Backend
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Rails',
  'Laravel', 'ASP.NET', '.NET', 'Gin', 'Phoenix', 'GraphQL', 'REST', 'gRPC', 'WebSocket', 'tRPC',
  // Data
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Cassandra', 'DynamoDB', 'Elasticsearch',
  'Neo4j', 'MariaDB', 'Oracle', 'Snowflake', 'BigQuery', 'Kafka', 'RabbitMQ', 'Spark', 'Hadoop',
  'Airflow', 'dbt', 'Prisma', 'Sequelize', 'SQLAlchemy', 'Hibernate',
  // Cloud & infra
  'AWS', 'Azure', 'GCP', 'Firebase', 'Supabase', 'Vercel', 'Netlify', 'Heroku', 'Cloudflare',
  'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins', 'CI/CD', 'GitHub Actions', 'GitLab CI',
  'Nginx', 'Linux', 'Ubuntu', 'Serverless', 'Lambda', 'Prometheus', 'Grafana', 'Datadog',
  // Mobile
  'Expo', 'Flutter', 'Android', 'iOS', 'SwiftUI', 'Jetpack Compose', 'Xamarin', 'Ionic',
  // Testing & tools
  'Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'JUnit', 'PyTest', 'Mocha', 'Testing Library',
  'Git', 'GitHub', 'GitLab', 'Bitbucket', 'Jira', 'Confluence', 'Figma', 'Postman', 'Swagger',
  // Data science / ML
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'Pandas',
  'NumPy', 'OpenCV', 'NLP', 'Hugging Face', 'LangChain', 'Computer Vision',
  // Practices
  'Agile', 'Scrum', 'Kanban', 'TDD', 'Microservices', 'DevOps', 'MLOps', 'System Design',
];

/** Professions that identify a headline rather than a person's name. */
const HEADLINE_ROLE_RE =
  /\b(engineer|developer|designer|manager|analyst|architect|scientist|consultant|specialist|programmer|administrator|technician|intern|freelancer|student|professional)\b/i;

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;
// Tolerates spaces, dashes, dots, parentheses and an optional country code.
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
/**
 * URLs as they actually appear on a resume: with a protocol, with `www.`, or
 * as a bare host *with a path* ("github.com/janedoe"). Requiring the path on
 * bare hosts is what keeps "Scrum.org" or "Node.js" from being read as links.
 */
const URL_RE =
  /(https?:\/\/[^\s,;)\]|]+|www\.[^\s,;)\]|]+|(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|me|co|ai|app|tech|xyz|in|uk|edu|gov)\/[^\s,;)\]|]*)/gi;

/** Strips a leading protocol/www so labels read cleanly. */
function normalizeUrl(raw: string): string {
  const trimmed = raw.replace(/[.,;)\]]+$/, '');
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

function labelForUrl(url: string): string {
  const host = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].toLowerCase();
  if (host.includes('github')) return 'GitHub';
  if (host.includes('linkedin')) return 'LinkedIn';
  if (host.includes('gitlab')) return 'GitLab';
  if (host.includes('stackoverflow')) return 'Stack Overflow';
  if (host.includes('medium') || host.includes('dev.to') || host.includes('hashnode')) return 'Blog';
  if (host.includes('twitter') || host.includes('x.com')) return 'Twitter';
  if (host.includes('leetcode') || host.includes('hackerrank') || host.includes('codeforces')) return 'Coding profile';
  if (host.includes('behance') || host.includes('dribbble')) return 'Portfolio';
  return 'Website';
}

/**
 * The name is normally the first substantial line of a resume, before any
 * contact details. We look at the first few lines and take the first that
 * looks like a person's name rather than a heading or contact string.
 */
function guessName(lines: string[]): string | undefined {
  for (const [index, line] of lines.slice(0, 8).entries()) {
    const clean = line.trim().replace(/[,|·]+$/, '').trim();
    if (!clean || clean.length > 48) continue;
    if (EMAIL_RE.test(clean) || PHONE_RE.test(clean) || /https?:|www\./i.test(clean)) continue;
    if (/resume|curriculum vitae|^cv$/i.test(clean)) continue;
    // The headline sits right under the name and is also capitalised, so a
    // line naming a profession is never the name — without this, a one-word
    // name like "SUNAINA" was skipped and "Frontend Developer" took its place.
    if (HEADLINE_ROLE_RE.test(clean)) continue;
    const words = clean.split(/\s+/);
    // A single-word name only counts on the opening line, where a lone first
    // name is a common design choice.
    if (words.length > 4 || words.length < (index === 0 ? 1 : 2)) continue;
    // Mostly-letters words, each capitalised — typical of a name line.
    if (words.every((w) => /^[A-Z][a-zA-Z'’.-]*$/.test(w))) return clean;
  }
  return undefined;
}

/** The headline usually sits directly under the name. */
function guessHeadline(lines: string[], name?: string): string | undefined {
  const startIndex = name ? lines.findIndex((l) => l.trim() === name) + 1 : 0;
  for (const line of lines.slice(startIndex, startIndex + 4)) {
    const clean = line.trim();
    if (!clean || clean.length > 70) continue;
    if (EMAIL_RE.test(clean) || PHONE_RE.test(clean) || /https?:|www\./i.test(clean)) continue;
    if (/^(summary|profile|about|objective|experience|education|skills)\b/i.test(clean)) continue;
    if (/engineer|developer|designer|manager|analyst|architect|scientist|consultant|specialist|lead|intern/i.test(clean)) {
      return clean;
    }
  }
  return undefined;
}

/**
 * Location is usually "City, ST" or "City, Country", either alone on a line or
 * as one segment of a contact line ("email | phone | San Francisco, CA").
 */
function guessLocation(lines: string[]): string | undefined {
  const pattern = /^([A-Z][a-zA-Z.\s-]{1,28},\s*[A-Z][a-zA-Z.\s-]{1,28}(,\s*[A-Z][a-zA-Z.\s-]{1,28})?)$/;
  for (const line of lines.slice(0, 14)) {
    for (const segment of line.split(/\s*[|·•]\s*|\s{2,}/)) {
      const clean = segment.trim().replace(/[.;]$/, '');
      if (!clean || EMAIL_RE.test(clean) || /https?:|www\./i.test(clean)) continue;
      const match = clean.match(pattern);
      if (match) return match[1];
    }
  }
  return undefined;
}

function findSkills(text: string): string[] {
  // Shared matcher handles escaping (C++, C#, Next.js, CI/CD) and token
  // boundaries consistently with the section parsers.
  return SKILL_DICTIONARY.filter((skill) => skillMatcher(skill).test(text));
}

export function parseResumeText(text: string): ParsedResume {
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n').filter((l) => l.trim().length > 0);

  const fullName = guessName(lines);
  const headline = guessHeadline(lines, fullName);
  const email = normalized.match(EMAIL_RE)?.[0];
  const phone = normalized.match(PHONE_RE)?.[0]?.trim();
  const location = guessLocation(lines);

  const rawUrls = normalized.match(URL_RE) ?? [];
  const seen = new Set<string>();
  const links: { label: string; url: string }[] = [];
  for (const raw of rawUrls) {
    const url = normalizeUrl(raw);
    if (seen.has(url.toLowerCase())) continue;
    seen.add(url.toLowerCase());
    links.push({ label: labelForUrl(url), url });
  }

  // A plain personal site (not a known social profile) makes the best website.
  const website = links.find((l) => l.label === 'Website')?.url;

  const sections = splitSections(normalized);

  // Skills listed under an explicit heading are authoritative, but a resume
  // also names technologies inside its project and job bullets. Both belong in
  // the portfolio, so the two sets are merged rather than one replacing the
  // other — a dictionary hit is high confidence wherever it appears.
  // Some resumes separate skills with spaces alone ("ReactJS JavaScript HTML
  // CSS"), which no separator-based split can break up. Such a line is dropped
  // here rather than saved as one giant skill — the dictionary pass below
  // recovers the individual names from the very same text.
  const isSkillList = (candidate: string): boolean => {
    if (!/\s/.test(candidate)) return false;
    const hits = SKILL_DICTIONARY.filter((skill) => skillMatcher(skill).test(candidate));
    return hits.length >= 2;
  };

  const skills: string[] = [];
  const skillSeen = new Set<string>();
  const sectionSkills = parseSkillsSection(sections.skills).filter((s) => !isSkillList(s));
  for (const skill of [...sectionSkills, ...findSkills(normalized)]) {
    const key = skill.toLowerCase();
    if (skillSeen.has(key)) continue;
    skillSeen.add(key);
    skills.push(skill);
  }

  return {
    fullName,
    headline,
    email,
    phone,
    location,
    website,
    links: links.filter((l) => l.url !== website),
    skills,
    education: parseEducation(sections.education),
    certificates: parseCertificates(sections.certificates),
    projects: parseProjects(sections.projects, SKILL_DICTIONARY),
    experience: parseExperience(sections.experience, SKILL_DICTIONARY),
    achievements: parseAchievements(sections.achievements),
  };
}

/** True when we found enough to be worth showing the user. */
export function hasUsefulData(parsed: ParsedResume): boolean {
  return Boolean(
    parsed.fullName ||
      parsed.email ||
      parsed.phone ||
      parsed.headline ||
      parsed.skills.length ||
      parsed.links.length ||
      parsed.education.length ||
      parsed.certificates.length ||
      parsed.projects.length ||
      parsed.experience.length ||
      parsed.achievements.length,
  );
}
