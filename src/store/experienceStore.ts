import { createEntityStore } from './createEntityStore';
import { experienceRepository } from '@lib/db/repositories/experienceRepository';
import type { WorkExperience } from '@models/models';

export const useExperienceStore = createEntityStore<WorkExperience>(experienceRepository);
