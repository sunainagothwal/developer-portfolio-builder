import { createEntityStore } from './createEntityStore';
import { learningRepository } from '@lib/db/repositories/learningRepository';
import type { LearningItem } from '@models/models';

export const useLearningStore = createEntityStore<LearningItem>(learningRepository);
