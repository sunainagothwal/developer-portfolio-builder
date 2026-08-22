import { z } from 'zod';

export const certificateSchema = z.object({
  name: z.string().min(1, 'Certificate name is required').max(120),
  issuingOrg: z.string().min(1, 'Issuing organization is required').max(120),
  issueDate: z.string().min(1, 'Issue date is required'),
  expiryDate: z.string().optional(),
  credentialId: z.string().max(120).optional(),
  credentialUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

export type CertificateFormValues = z.infer<typeof certificateSchema>;
