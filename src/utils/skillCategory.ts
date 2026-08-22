import type { SkillCategory } from '@models/models';

/**
 * Best-guess category for a skill name, used when importing from a resume
 * where no category is stated. Pure and table-driven so it can be unit tested
 * and extended without touching UI code.
 */
const CATEGORY_TABLE: { category: SkillCategory; names: string[] }[] = [
  {
    category: 'language',
    names: [
      'javascript', 'typescript', 'python', 'java', 'kotlin', 'swift', 'go', 'golang', 'rust',
      'c', 'c++', 'c#', 'ruby', 'php', 'scala', 'dart', 'r', 'perl', 'objective-c', 'sql',
      'html', 'css', 'bash', 'shell',
    ],
  },
  {
    category: 'framework',
    names: [
      'react', 'react native', 'next.js', 'nextjs', 'vue', 'angular', 'svelte', 'node.js', 'nodejs',
      'express', 'django', 'flask', 'spring', 'spring boot', 'rails', 'laravel', 'flutter',
      'expo', '.net', 'fastapi', 'nestjs', 'redux', 'zustand', 'tailwind', 'sass', 'bootstrap',
      'graphql', 'tensorflow', 'pytorch',
    ],
  },
  {
    category: 'database',
    names: [
      'postgresql', 'postgres', 'mysql', 'mongodb', 'redis', 'sqlite', 'oracle', 'dynamodb',
      'cassandra', 'elasticsearch', 'firebase', 'supabase', 'mariadb', 'neo4j',
    ],
  },
  {
    category: 'devops',
    names: [
      'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'terraform', 'ansible',
      'jenkins', 'ci/cd', 'github actions', 'gitlab ci', 'linux', 'nginx', 'prometheus', 'grafana',
    ],
  },
  {
    category: 'design',
    names: ['figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'ui design', 'ux design', 'wireframing'],
  },
  {
    category: 'tool',
    names: ['git', 'github', 'gitlab', 'jira', 'confluence', 'postman', 'jest', 'cypress', 'playwright', 'webpack', 'vite'],
  },
  {
    category: 'soft-skill',
    names: [
      'leadership', 'communication', 'teamwork', 'problem solving', 'mentoring', 'agile', 'scrum',
      'time management', 'collaboration', 'public speaking',
    ],
  },
];

export function guessSkillCategory(skillName: string): SkillCategory {
  const needle = skillName.trim().toLowerCase();
  if (!needle) return 'other';

  for (const { category, names } of CATEGORY_TABLE) {
    if (names.includes(needle)) return category;
  }
  // Substring fallback catches variants like "React Hooks" or "AWS Lambda".
  for (const { category, names } of CATEGORY_TABLE) {
    if (names.some((n) => n.length >= 3 && needle.includes(n))) return category;
  }
  return 'other';
}
