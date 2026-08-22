import { createEntityStore } from './createEntityStore';
import { projectsRepository } from '@lib/db/repositories/projectsRepository';
import type { Project } from '@models/models';

export const useProjectsStore = createEntityStore<Project>(projectsRepository);
