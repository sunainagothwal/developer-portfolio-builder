import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppSettings } from '@models/models';

const SETTINGS_KEY = '@devportfolio/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  // System is the default: the app follows the device appearance unless the
  // user picks otherwise.
  themeMode: 'system',
  onboardingComplete: false,
};

export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function clearAllPreferences(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_KEY);
}
