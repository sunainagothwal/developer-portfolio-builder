import { createRepository } from './createRepository';
import type { WorkExperience } from '@models/models';

export const experienceRepository = createRepository<WorkExperience>({
  table: 'experiences',
  jsonColumns: ['achievements', 'techStack'],
  booleanColumns: ['isCurrent'],
  defaults: {
    company: '',
    role: '',
    startDate: new Date().toISOString(),
    isCurrent: true,
    description: '',
    achievements: [],
    techStack: [],
  },
});
