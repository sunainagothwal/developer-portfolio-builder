import { z } from 'zod';

export const interviewSchema = z.object({
  company: z.string().min(1, 'Company is required').max(150),
  role: z.string().min(1, 'Role is required').max(150),
  stage: z.enum(['applied', 'phone-screen', 'technical', 'onsite', 'offer', 'rejected', 'withdrawn', 'accepted']),
  appliedDate: z.string().min(1, 'Applied date is required'),
  location: z.string().max(150).optional(),
  salaryRange: z.string().max(80).optional(),
  notes: z.string().max(1000).optional(),
  jobUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

export type InterviewFormValues = z.infer<typeof interviewSchema>;

export const INTERVIEW_STAGE_OPTIONS = [
  { label: 'Applied', value: 'applied' },
  { label: 'Phone Screen', value: 'phone-screen' },
  { label: 'Technical', value: 'technical' },
  { label: 'Onsite', value: 'onsite' },
  { label: 'Offer', value: 'offer' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
];

export const INTERVIEW_STAGE_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'primary'> = {
  applied: 'neutral',
  'phone-screen': 'info',
  technical: 'info',
  onsite: 'primary',
  offer: 'success',
  accepted: 'success',
  rejected: 'danger',
  withdrawn: 'warning',
};
