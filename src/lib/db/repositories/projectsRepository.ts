import { createRepository } from './createRepository';
import type { Project } from '@models/models';

export const projectsRepository = createRepository<Project>({
  table: 'projects',
  jsonColumns: ['techStack', 'links', 'images', 'skillIds'],
  booleanColumns: ['featured'],
  defaults: {
    title: '',
    summary: '',
    description: '',
    status: 'in-progress',
    techStack: [],
    links: [],
    images: [],
    featured: false,
    skillIds: [],
  },
});
