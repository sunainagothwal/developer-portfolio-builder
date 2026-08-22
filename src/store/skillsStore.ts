import { createEntityStore } from './createEntityStore';
import { skillsRepository } from '@lib/db/repositories/skillsRepository';
import type { Skill } from '@models/models';

export const useSkillsStore = createEntityStore<Skill>(skillsRepository);
