import { z } from 'zod';

export const educationSchema = z.object({
  institution: z.string().min(1, 'Institution is required').max(150),
  degree: z.string().min(1, 'Degree is required').max(150),
  fieldOfStudy: z.string().max(150).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  grade: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

export type EducationFormValues = z.infer<typeof educationSchema>;
