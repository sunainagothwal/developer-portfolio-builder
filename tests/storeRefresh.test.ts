/**
 * A pull must refresh every entity store, not just SQLite.
 *
 * `pullPortfolio` rewrites the database through the repositories directly.
 * The zustand stores that screens actually read from never saw that write, so
 * signing in on a device that already held local data left every screen
 * showing the old rows — the account's real data was on the device, just
 * invisible until something happened to remount that screen.
 */

const mockReload = jest.fn().mockResolvedValue(undefined);

jest.mock('@lib/api/client', () => ({
  apiRequest: jest.fn(),
}));

jest.mock('@lib/export/backupService', () => ({
  BACKUP_SCHEMA_VERSION: 1,
  // The seed path (a brand-new account) calls this to build what gets
  // uploaded, so it needs a real shape even though this suite is about pull.
  buildBackupSnapshot: jest.fn().mockResolvedValue({ schemaVersion: 1, data: {} }),
  restoreFromSnapshot: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@lib/storage/preferences', () => ({
  loadSettings: jest.fn().mockResolvedValue({}),
  saveSettings: jest.fn().mockResolvedValue(undefined),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const { apiRequest } = require('@lib/api/client');
const { registerStoreReloader } = require('@lib/sync/storeRefresh');
const { pullPortfolio } = require('@lib/sync/portfolioSync');
/* eslint-enable @typescript-eslint/no-var-requires */

describe('pullPortfolio', () => {
  beforeEach(() => {
    mockReload.mockClear();
    registerStoreReloader(mockReload);
  });

  it('reloads every registered store after restoring a snapshot', async () => {
    (apiRequest as jest.Mock).mockResolvedValue({
      schemaVersion: 1,
      settings: {},
      data: { skills: [{ id: 's1', name: 'TypeScript' }] },
    });

    await pullPortfolio('jwt-123');

    expect(mockReload).toHaveBeenCalled();
  });

  it('does not touch the stores for a brand-new account with nothing stored', async () => {
    // 204: the caller falls back to uploading, not downloading.
    (apiRequest as jest.Mock).mockResolvedValue(undefined);

    mockReload.mockClear();
    await pullPortfolio('jwt-123');
    // A seed (upload) path never restores, so it never needs to reload.
    expect(mockReload).not.toHaveBeenCalled();
  });
});
