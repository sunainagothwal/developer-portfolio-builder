import { z } from 'zod';

export const skillSchema = z.object({
  name: z.string().min(1, 'Skill name is required').max(60),
  category: z.enum(['language', 'framework', 'database', 'devops', 'design', 'soft-skill', 'tool', 'other']),
  level: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  yearsOfExperience: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(0).max(50).optional()
  ),
  featured: z.boolean(),
  notes: z.string().max(500).optional(),
});

export type SkillFormValues = z.infer<typeof skillSchema>;

export const SKILL_CATEGORY_OPTIONS = [
  { label: 'Language', value: 'language' },
  { label: 'Framework', value: 'framework' },
  { label: 'Database', value: 'database' },
  { label: 'DevOps', value: 'devops' },
  { label: 'Design', value: 'design' },
  { label: 'Soft Skill', value: 'soft-skill' },
  { label: 'Tool', value: 'tool' },
  { label: 'Other', value: 'other' },
];

export const SKILL_LEVEL_OPTIONS = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
  { label: 'Expert', value: 'expert' },
];
