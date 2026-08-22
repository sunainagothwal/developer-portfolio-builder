import { createEntityStore } from './createEntityStore';
import { achievementsRepository } from '@lib/db/repositories/achievementsRepository';
import type { Achievement } from '@models/models';

export const useAchievementsStore = createEntityStore<Achievement>(achievementsRepository);
