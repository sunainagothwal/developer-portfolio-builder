/**
 * Mock interview question generation.
 *
 * Runs entirely on-device from the parsed resume plus a target company name —
 * no network call, no paid API, consistent with the rest of the app. "AI" here
 * means a heuristic question engine: it matches the candidate's skills and
 * most recent role against a curated question bank rather than calling an LLM.
 */
import type { ParsedResume } from '@lib/import/resumeParser';

export interface InterviewQuestionGroup {
  category: string;
  questions: string[];
}

export interface InterviewQuestionItem {
  category: string;
  question: string;
}

interface SkillDomain {
  name: string;
  /** Skill names (matched case-insensitively) that put a resume in this domain. */
  skills: string[];
  /** `{skill}` is replaced with whichever of `skills` the resume actually has. */
  questions: string[];
}

const SKILL_DOMAINS: SkillDomain[] = [
  {
    name: 'Frontend',
    skills: ['React', 'React Native', 'Vue', 'Angular', 'Next.js', 'Svelte', 'HTML', 'CSS', 'Tailwind', 'Redux', 'Zustand'],
    questions: [
      'Walk me through how you would diagnose and fix a slow-rendering list in a {skill} app.',
      'How do you decide between local component state and a global store in {skill}?',
      'Describe how you approach accessibility when building UI components.',
      'Tell me about a tricky cross-browser or cross-device rendering bug you fixed.',
    ],
  },
  {
    name: 'Backend',
    skills: ['Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot', 'Rails', 'Laravel', 'ASP.NET', '.NET', 'Go', 'Java', 'GraphQL', 'REST', 'gRPC'],
    questions: [
      'Design a rate limiter for a public API built with {skill}. What are the tradeoffs of your approach?',
      'How would you version an API without breaking existing clients?',
      'Walk me through how you would debug a service that intermittently returns 500s in production.',
      'How do you decide what belongs in a request handler versus a background job?',
    ],
  },
  {
    name: 'Data & Databases',
    skills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'SQLite', 'Elasticsearch', 'Kafka', 'Spark', 'BigQuery', 'Snowflake'],
    questions: [
      'How would you design a schema in {skill} for a system with heavy read traffic and occasional bulk writes?',
      'Walk me through how you would find and fix a slow query in production.',
      'When would you reach for a cache versus optimizing the query itself?',
    ],
  },
  {
    name: 'Cloud & DevOps',
    skills: ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD', 'GitHub Actions', 'Jenkins', 'Serverless'],
    questions: [
      'Walk me through the deployment pipeline of a recent project using {skill}.',
      'How would you roll back a bad deployment with minimal downtime?',
      'Describe how you would investigate a sudden spike in cloud costs.',
    ],
  },
  {
    name: 'Mobile',
    skills: ['Expo', 'React Native', 'Flutter', 'Android', 'iOS', 'SwiftUI', 'Jetpack Compose'],
    questions: [
      'How do you handle offline-first data sync in a {skill} app?',
      'Walk me through how you would debug a crash that only reproduces on certain devices.',
      'How do you approach app performance on lower-end devices?',
    ],
  },
  {
    name: 'Data Science & ML',
    skills: ['Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'scikit-learn', 'Pandas', 'NLP', 'Computer Vision'],
    questions: [
      'Walk me through how you would evaluate whether a {skill} model is ready for production.',
      'How would you detect and handle data drift after a model is deployed?',
      'Describe a time a model underperformed in production despite good offline metrics.',
    ],
  },
  {
    name: 'Testing & Quality',
    skills: ['Jest', 'Vitest', 'Cypress', 'Playwright', 'Selenium', 'JUnit', 'PyTest', 'TDD'],
    questions: [
      'How do you decide what to cover with unit tests versus integration or end-to-end tests?',
      'Describe how you would add test coverage to a legacy codebase with none.',
    ],
  },
];

/** Used when nothing in the resume matches a specific domain. */
const GENERAL_DOMAIN: SkillDomain = {
  name: 'Technical',
  skills: [],
  questions: [
    'Walk me through a project you are most proud of, end to end.',
    'Describe the most difficult bug you have ever debugged.',
    'How do you approach learning an unfamiliar codebase?',
    'How do you decide when a piece of code needs refactoring versus shipping as-is?',
  ],
}

const BEHAVIORAL_QUESTIONS = [
  'Tell me about a time you disagreed with a teammate on a technical decision. How did you resolve it?',
  'Describe a project that fell short of expectations. What did you learn?',
  'Tell me about a time you had to learn something new quickly to ship on time.',
  'Describe a situation where you had to balance code quality against a tight deadline.',
  'Tell me about a time you gave, or received, difficult feedback.',
  'Describe a time you had to influence a decision without having authority over it.',
];

function companyQuestions(company: string, role: string): string[] {
  const forRole = role ? ` as a ${role}` : '';
  return [
    `What do you know about ${company}'s products and the problems they solve for their users?`,
    `Why do you want to work at ${company}${forRole}, rather than a similar role elsewhere?`,
    `How would you contribute to ${company}'s engineering culture${forRole} in your first 90 days?`,
    `What would you want to learn in your first week${forRole} at ${company} to be effective faster?`,
  ];
}

function roleQuestions(role: string): string[] {
  return [
    `What about the ${role} role specifically drew you to apply?`,
    `Which of your skills and experience make you a strong fit for a ${role} position?`,
    `Where do you think you'd need to ramp up the most to succeed as a ${role}?`,
  ];
}

/** Matches a skill name against the resume's skill list, case-insensitively. */
function hasSkill(skills: Set<string>, name: string): boolean {
  return skills.has(name.toLowerCase());
}

/**
 * Builds a categorized set of mock interview questions from a parsed resume,
 * a target company name, and the job role being interviewed for. The resume
 * is required to tailor the technical questions; company and role are each
 * optional, but when given they shape the "About the company" and role-fit
 * questions and are woven into the rest of the question groups.
 */
export function generateMockInterviewQuestions(parsed: ParsedResume, company: string, role: string = ''): InterviewQuestionGroup[] {
  const trimmedCompany = company.trim();
  const trimmedRole = role.trim();
  const groups: InterviewQuestionGroup[] = [];

  if (trimmedCompany) {
    groups.push({ category: `About ${trimmedCompany}`, questions: companyQuestions(trimmedCompany, trimmedRole) });
  }

  if (trimmedRole) {
    groups.push({ category: `Fit for ${trimmedRole}`, questions: roleQuestions(trimmedRole) });
  }

  const skillSet = new Set(parsed.skills.map((s) => s.toLowerCase()));
  const matchedDomains = SKILL_DOMAINS.filter((domain) => domain.skills.some((s) => hasSkill(skillSet, s)));
  const domainsToUse = matchedDomains.length ? matchedDomains.slice(0, 3) : [GENERAL_DOMAIN];

  for (const domain of domainsToUse) {
    const matchedSkill = domain.skills.find((s) => hasSkill(skillSet, s)) ?? domain.name;
    groups.push({
      category: `${domain.name} technical`,
      questions: domain.questions.map((q) => q.replace(/\{skill\}/g, matchedSkill)),
    });
  }

  const latestExperience = parsed.experience[0];
  if (latestExperience) {
    groups.push({
      category: 'Your experience',
      questions: [
        `Walk me through your role as ${latestExperience.role} at ${latestExperience.company}, and its biggest technical challenge.`,
        `What would you do differently if you started that role again?`,
        ...(trimmedRole
          ? [`How does your experience as ${latestExperience.role} translate to a ${trimmedRole} position?`]
          : []),
      ],
    });
  }

  groups.push({ category: 'Behavioral', questions: BEHAVIORAL_QUESTIONS });

  return groups;
}

/**
 * Flattens grouped questions into the single ordered sequence a live mock
 * interview session steps through one at a time.
 */
export function flattenInterviewQuestions(groups: InterviewQuestionGroup[]): InterviewQuestionItem[] {
  return groups.flatMap((group) => group.questions.map((question) => ({ category: group.category, question })));
}
