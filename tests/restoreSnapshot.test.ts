/**
 * Restoring a snapshot must open exactly one SQLite transaction.
 *
 * It used to run all ten tables through `Promise.all`, each opening its own
 * transaction on the single shared connection. SQLite rejects that with
 * "cannot start a transaction within a transaction", which is what every
 * sign-in hit once login started restoring from the server.
 */

/** Mirrors expo-sqlite: a second concurrent transaction is an error. */
class FakeDatabase {
  inTransaction = false;
  transactionCount = 0;
  readonly deletedTables: string[] = [];
  readonly inserts: string[] = [];

  async withTransactionAsync(work: () => Promise<void>): Promise<void> {
    if (this.inTransaction) {
      throw new Error('Calling the "execAsync" function has failed\n→ Caused by: cannot start a transaction within a transaction');
    }
    this.inTransaction = true;
    this.transactionCount += 1;
    try {
      await work();
    } finally {
      this.inTransaction = false;
    }
  }

  async execAsync(sql: string): Promise<void> {
    const match = /DELETE FROM (\w+)/.exec(sql);
    if (match) this.deletedTables.push(match[1]);
  }

  async runAsync(sql: string): Promise<void> {
    this.inserts.push(sql);
  }

  async getAllAsync(): Promise<unknown[]> {
    return [];
  }
}

const mockDb = new FakeDatabase();

jest.mock('@lib/db/database', () => ({
  getDatabase: async () => mockDb,
  initDatabase: jest.fn(),
}));

/* eslint-disable @typescript-eslint/no-var-requires */
const { restoreFromSnapshot } = require('@lib/export/backupService');
/* eslint-enable @typescript-eslint/no-var-requires */

const SNAPSHOT = {
  schemaVersion: 1,
  exportedAt: '2024-01-01T00:00:00.000Z',
  data: {
    profile: [{ id: 'pr1', fullName: 'Jane', socialLinks: [] }],
    skills: [{ id: 's1', name: 'TypeScript' }],
    projects: [{ id: 'p1', title: 'Portfolio Builder', techStack: [], links: [], images: [], skillIds: [] }],
    experiences: [{ id: 'e1', company: 'Acme', achievements: [], techStack: [] }],
    education: [{ id: 'ed1', institution: 'Stanford' }],
    certificates: [{ id: 'c1', name: 'AWS' }],
    achievements: [{ id: 'a1', title: 'Award' }],
    notes: [{ id: 'n1', content: 'Hello', tags: [] }],
    learningItems: [{ id: 'l1', title: 'Course' }],
    interviewEntries: [{ id: 'i1', company: 'Globex', rounds: [] }],
  },
};

describe('restoreFromSnapshot', () => {
  beforeEach(() => {
    mockDb.transactionCount = 0;
    mockDb.inTransaction = false;
    mockDb.deletedTables.length = 0;
    mockDb.inserts.length = 0;
  });

  it('does not nest transactions', async () => {
    await expect(restoreFromSnapshot(SNAPSHOT)).resolves.toBeUndefined();
  });

  it('uses a single transaction for the whole restore', async () => {
    await restoreFromSnapshot(SNAPSHOT);
    // One, not one per table: a half-applied restore would mix the snapshot's
    // tables with the device's.
    expect(mockDb.transactionCount).toBe(1);
  });

  it('clears and repopulates every table in the snapshot', async () => {
    await restoreFromSnapshot(SNAPSHOT);
    expect(mockDb.deletedTables).toHaveLength(10);
    expect(mockDb.inserts).toHaveLength(10);
  });

  it('skips tables the snapshot does not carry', async () => {
    await restoreFromSnapshot({ ...SNAPSHOT, data: { skills: SNAPSHOT.data.skills } });
    expect(mockDb.deletedTables).toHaveLength(1);
    expect(mockDb.transactionCount).toBe(1);
  });
});
