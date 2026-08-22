import { createEntityStore } from './createEntityStore';
import { educationRepository } from '@lib/db/repositories/educationRepository';
import type { Education } from '@models/models';

export const useEducationStore = createEntityStore<Education>(educationRepository);
