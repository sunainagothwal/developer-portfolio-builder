import { create } from 'zustand';
import type { ChecklistItem } from '@models/models';
import { checklistRepository } from '@lib/db/repositories/checklistRepository';

interface ChecklistState {
  items: ChecklistItem[];
  loaded: boolean;
  load: () => Promise<void>;
  toggle: (id: string, done: boolean) => Promise<void>;
}

export const useChecklistStore = create<ChecklistState>((set, get) => ({
  items: [],
  loaded: false,

  load: async () => {
    const items = await checklistRepository.getAll();
    set({ items, loaded: true });
  },

  toggle: async (id, done) => {
    await checklistRepository.toggle(id, done);
    set({ items: get().items.map((i) => (i.id === id ? { ...i, done } : i)) });
  },
}));
