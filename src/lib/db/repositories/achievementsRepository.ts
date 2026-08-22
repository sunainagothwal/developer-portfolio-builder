import { createRepository } from './createRepository';
import type { Achievement } from '@models/models';

export const achievementsRepository = createRepository<Achievement>({
  table: 'achievements',
  defaults: {
    title: '',
    category: 'other',
    date: new Date().toISOString(),
  },
});
