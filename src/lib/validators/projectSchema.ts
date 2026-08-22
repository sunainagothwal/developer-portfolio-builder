import { z } from 'zod';

export const projectLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url('Enter a valid URL'),
});

export const projectSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  summary: z.string().max(200).optional(),
  description: z.string().max(3000).optional(),
  status: z.enum(['idea', 'in-progress', 'completed', 'archived', 'maintained']),
  techStack: z.array(z.string()).default([]),
  role: z.string().max(100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  links: z.array(projectLinkSchema).default([]),
  images: z.array(z.string()).default([]),
  featured: z.boolean(),
  skillIds: z.array(z.string()).default([]),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;

export const PROJECT_STATUS_OPTIONS = [
  { label: 'Idea', value: 'idea' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Maintained', value: 'maintained' },
  { label: 'Archived', value: 'archived' },
];

export const PROJECT_STATUS_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'primary'> = {
  idea: 'neutral',
  'in-progress': 'info',
  completed: 'success',
  maintained: 'primary',
  archived: 'warning',
};
