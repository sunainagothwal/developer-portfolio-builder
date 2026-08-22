import { create, StoreApi, UseBoundStore } from 'zustand';
import type { BaseEntity } from '@models/models';
import { scheduleSync } from '@lib/sync/syncScheduler';
import { registerStoreReloader } from '@lib/sync/storeRefresh';

export interface EntityRepository<T extends BaseEntity> {
  getAll: () => Promise<T[]>;
  getById: (id: string) => Promise<T | null>;
  create: (input: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T>;
  update: (id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>) => Promise<T | null>;
  remove: (id: string) => Promise<void>;
  bulkReplace: (entities: T[], options?: { withinTransaction?: boolean }) => Promise<void>;
}

export interface EntityState<T extends BaseEntity> {
  items: T[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  load: () => Promise<void>;
  add: (input: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<T>;
  edit: (id: string, patch: Partial<Omit<T, 'id' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  getById: (id: string) => T | undefined;
  replaceAll: (items: T[]) => Promise<void>;
}

/**
 * Factory that produces a Zustand store bound to a repository.
 * Every "manager" feature (Skills, Projects, Experience, ...) uses this
 * so CRUD + loading/error state stays perfectly consistent app-wide.
 */
export function createEntityStore<T extends BaseEntity>(
  repository: EntityRepository<T>
): UseBoundStore<StoreApi<EntityState<T>>> {
  const store = create<EntityState<T>>((set, get) => ({
    items: [],
    loading: false,
    error: null,
    loaded: false,

    load: async () => {
      set({ loading: true, error: null });
      try {
        const items = await repository.getAll();
        set({ items, loading: false, loaded: true });
      } catch (e) {
        set({ loading: false, error: e instanceof Error ? e.message : 'Failed to load data' });
      }
    },

    add: async (input) => {
      const created = await repository.create(input);
      set({ items: [created, ...get().items] });
      // Every mutation queues a push, so the account copy never lags far
      // behind the device.
      scheduleSync();
      return created;
    },

    edit: async (id, patch) => {
      const updated = await repository.update(id, patch);
      if (!updated) return;
      set({ items: get().items.map((i) => (i.id === id ? updated : i)) });
      scheduleSync();
    },

    remove: async (id) => {
      await repository.remove(id);
      set({ items: get().items.filter((i) => i.id !== id) });
      scheduleSync();
    },

    getById: (id) => get().items.find((i) => i.id === id),

    replaceAll: async (items) => {
      await repository.bulkReplace(items);
      set({ items });
    },
  }));

  // A sync pull rewrites the database through the repositories, behind this
  // store's back. Registering here lets it reload once the pull lands, instead
  // of serving rows that no longer exist.
  registerStoreReloader(() => store.getState().load());

  return store;
}
