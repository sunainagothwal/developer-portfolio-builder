import { createRepository } from './createRepository';
import type { LearningItem } from '@models/models';

export const learningRepository = createRepository<LearningItem>({
  table: 'learning_items',
  defaults: {
    title: '',
    type: 'course',
    status: 'planned',
    progress: 0,
  },
});
