import { createEntityStore } from './createEntityStore';
import { notesRepository } from '@lib/db/repositories/notesRepository';
import type { Note } from '@models/models';

export const useNotesStore = createEntityStore<Note>(notesRepository);
