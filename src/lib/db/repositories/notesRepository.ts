import { createRepository } from './createRepository';
import type { Note } from '@models/models';

export const notesRepository = createRepository<Note>({
  table: 'notes',
  jsonColumns: ['tags'],
  booleanColumns: ['pinned'],
  defaults: {
    title: '',
    content: '',
    tags: [],
    pinned: false,
  },
});
