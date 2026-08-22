import { createRepository } from './createRepository';
import type { Skill } from '@models/models';

export const skillsRepository = createRepository<Skill>({
  table: 'skills',
  defaults: {
    name: '',
    category: 'other',
    level: 'intermediate',
    featured: false,
  },
  booleanColumns: ['featured'],
});
