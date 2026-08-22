import { z } from 'zod';

export const learningSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  type: z.enum(['course', 'book', 'video', 'article', 'project', 'other']),
  status: z.enum(['planned', 'in-progress', 'completed', 'paused']),
  progress: z.preprocess((v) => Number(v) || 0, z.number().min(0).max(100)),
  source: z.string().max(150).optional(),
  url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  notes: z.string().max(500).optional(),
  targetDate: z.string().optional(),
});

export type LearningFormValues = z.infer<typeof learningSchema>;

export const LEARNING_TYPE_OPTIONS = [
  { label: 'Course', value: 'course' },
  { label: 'Book', value: 'book' },
  { label: 'Video', value: 'video' },
  { label: 'Article', value: 'article' },
  { label: 'Project', value: 'project' },
  { label: 'Other', value: 'other' },
];

export const LEARNING_STATUS_OPTIONS = [
  { label: 'Planned', value: 'planned' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Paused', value: 'paused' },
];

export const LEARNING_STATUS_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  planned: 'neutral',
  'in-progress': 'info',
  completed: 'success',
  paused: 'warning',
};
