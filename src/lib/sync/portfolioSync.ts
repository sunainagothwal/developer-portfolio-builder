import { apiRequest } from '@lib/api/client';
import {
  BACKUP_SCHEMA_VERSION,
  buildBackupSnapshot,
  restoreFromSnapshot,
  type BackupSnapshot,
} from '@lib/export/backupService';
import { loadSettings, saveSettings } from '@lib/storage/preferences';
import type { AppSettings } from '@models/models';
import { refreshAllStores } from './storeRefresh';

/**
 * Keeps the whole local database and the user's settings in MongoDB, so
 * nothing is lost on logout or reinstall.
 *
 * The app already serialises everything it owns into one snapshot for its
 * backup feature; that same snapshot is what gets stored, which means sync and
 * backup can never disagree about what "all the data" is.
 */

interface RemotePortfolio {
  schemaVersion: number;
  settings: Partial<AppSettings>;
  data: BackupSnapshot['data'];
  syncedAt?: string;
  updatedAt?: string;
}

export type PullOutcome =
  /** The account had a snapshot; local data was replaced by it. */
  | { status: 'restored'; syncedAt?: string }
  /** Nothing stored yet, so whatever is on the device was uploaded instead. */
  | { status: 'seeded' };

/**
 * Called after sign-in.
 *
 * A brand-new account has nothing stored, and the server says so with 204
 * rather than an empty snapshot. That distinction matters: replacing local
 * data with an empty payload would wipe work the user did before signing up,
 * so the empty case uploads instead of downloading.
 */
export async function pullPortfolio(token: string): Promise<PullOutcome> {
  const remote = await apiRequest<RemotePortfolio>('/api/portfolio', { token, allowEmpty: true });

  if (!remote) {
    await pushPortfolio(token);
    return { status: 'seeded' };
  }

  await restoreFromSnapshot({
    schemaVersion: remote.schemaVersion ?? BACKUP_SCHEMA_VERSION,
    exportedAt: remote.updatedAt ?? new Date().toISOString(),
    data: remote.data,
  });

  if (remote.settings && Object.keys(remote.settings).length) {
    const current = await loadSettings();
    await saveSettings({ ...current, ...remote.settings });
  }

  // The rows changed underneath the stores, which still hold the previous
  // ones. Without this the account's data is on the device but the screens
  // keep showing what was there before signing in.
  await refreshAllStores();

  return { status: 'restored', syncedAt: remote.syncedAt };
}

/** Uploads everything currently on the device, replacing what is stored. */
export async function pushPortfolio(token: string): Promise<void> {
  const snapshot = await buildBackupSnapshot();
  const settings = await loadSettings();

  await apiRequest('/api/portfolio', {
    method: 'PUT',
    token,
    body: {
      schemaVersion: snapshot.schemaVersion,
      settings,
      data: snapshot.data,
    },
  });
}
