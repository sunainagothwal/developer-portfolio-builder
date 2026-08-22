import { z } from 'zod';

export const achievementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(150),
  category: z.enum(['award', 'publication', 'talk', 'open-source', 'competition', 'other']),
  date: z.string().min(1, 'Date is required'),
  description: z.string().max(500).optional(),
  url: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

export type AchievementFormValues = z.infer<typeof achievementSchema>;

export const ACHIEVEMENT_CATEGORY_OPTIONS = [
  { label: 'Award', value: 'award' },
  { label: 'Publication', value: 'publication' },
  { label: 'Talk', value: 'talk' },
  { label: 'Open Source', value: 'open-source' },
  { label: 'Competition', value: 'competition' },
  { label: 'Other', value: 'other' },
];
