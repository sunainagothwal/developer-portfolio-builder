import { z } from 'zod';

export const profileSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(120),
  headline: z.string().max(150).optional(),
  bio: z.string().max(1000).optional(),
  email: z.string().email('Enter a valid email').or(z.literal('')),
  phone: z.string().max(30).optional(),
  location: z.string().max(120).optional(),
  website: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
  avatarUri: z.string().optional(),
  socialLinks: z.array(z.object({ id: z.string(), label: z.string(), url: z.string() })).default([]),
  availability: z.enum(['open-to-work', 'open-to-freelance', 'not-looking']).optional(),
});

export type ProfileFormValues = z.infer<typeof profileSchema>;

export const AVAILABILITY_OPTIONS = [
  { label: 'Open to work', value: 'open-to-work' },
  { label: 'Open to freelance', value: 'open-to-freelance' },
  { label: 'Not looking', value: 'not-looking' },
];
