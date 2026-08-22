import { create } from 'zustand';
import type { Profile } from '@models/models';
import { profileRepository, getOrCreateProfile } from '@lib/db/repositories/profileRepository';
import { scheduleSync } from '@lib/sync/syncScheduler';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  update: (patch: Partial<Omit<Profile, 'id' | 'createdAt'>>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true });
    const profile = await getOrCreateProfile();
    set({ profile, loading: false, loaded: true });
  },

  update: async (patch) => {
    const current = get().profile;
    if (!current) return;
    const updated = await profileRepository.update(current.id, patch);
    if (updated) {
      set({ profile: updated });
      scheduleSync();
    }
  },
}));
