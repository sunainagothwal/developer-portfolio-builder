import { createRepository } from './createRepository';
import type { InterviewEntry } from '@models/models';

export const interviewRepository = createRepository<InterviewEntry>({
  table: 'interview_entries',
  jsonColumns: ['rounds'],
  defaults: {
    company: '',
    role: '',
    stage: 'applied',
    appliedDate: new Date().toISOString(),
    rounds: [],
  },
});
