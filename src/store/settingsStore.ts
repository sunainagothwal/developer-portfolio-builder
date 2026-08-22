import { create } from 'zustand';
import type { AppSettings, ThemeMode } from '@models/models';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '@lib/storage/preferences';
import { scheduleSync } from '@lib/sync/syncScheduler';

interface SettingsState {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  setLastBackupAt: (iso: string) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const settings = await loadSettings();
    set({ settings, hydrated: true });
  },

  setThemeMode: async (themeMode) => {
    const next = { ...get().settings, themeMode };
    set({ settings: next });
    await saveSettings(next);
    scheduleSync();
  },

  completeOnboarding: async () => {
    const next = { ...get().settings, onboardingComplete: true };
    set({ settings: next });
    await saveSettings(next);
    scheduleSync();
  },

  setLastBackupAt: async (iso) => {
    const next = { ...get().settings, lastBackupAt: iso };
    set({ settings: next });
    await saveSettings(next);
  },
}));
