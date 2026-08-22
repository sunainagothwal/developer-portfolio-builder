import { z } from 'zod';

export const experienceSchema = z.object({
  company: z.string().min(1, 'Company is required').max(150),
  role: z.string().min(1, 'Role is required').max(150),
  location: z.string().max(150).optional(),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']).optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  isCurrent: z.boolean(),
  description: z.string().max(2000).optional(),
  achievements: z.array(z.string()).default([]),
  techStack: z.array(z.string()).default([]),
});

export type ExperienceFormValues = z.infer<typeof experienceSchema>;

export const EMPLOYMENT_TYPE_OPTIONS = [
  { label: 'Full-time', value: 'full-time' },
  { label: 'Part-time', value: 'part-time' },
  { label: 'Contract', value: 'contract' },
  { label: 'Internship', value: 'internship' },
  { label: 'Freelance', value: 'freelance' },
];
