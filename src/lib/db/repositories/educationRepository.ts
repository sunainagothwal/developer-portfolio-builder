import { createRepository } from './createRepository';
import type { Education } from '@models/models';

export const educationRepository = createRepository<Education>({
  table: 'education',
  booleanColumns: ['isCurrent'],
  defaults: {
    institution: '',
    degree: '',
    startDate: new Date().toISOString(),
    isCurrent: false,
  },
});
