import * as SQLite from 'expo-sqlite';

/**
 * Single SQLite connection for the whole app (offline-first, no backend).
 * expo-sqlite (>=14) exposes an async API backed by the new JSI engine.
 */
let dbInstance: SQLite.SQLiteDatabase | null = null;

export const DB_NAME = 'devportfolio.db';
export const SCHEMA_VERSION = 1;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
  await dbInstance.execAsync('PRAGMA journal_mode = WAL;');
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');
  return dbInstance;
}

/**
 * Table definitions. Every entity table stores its "rich" fields
 * (arrays/objects) as JSON text columns — SQLite has no native array type,
 * and for a local-first single-user app this keeps repositories simple
 * without needing a join-table explosion for every list field.
 */
const CREATE_STATEMENTS: string[] = [
  `CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY NOT NULL,
    fullName TEXT NOT NULL DEFAULT '',
    headline TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT,
    location TEXT,
    avatarUri TEXT,
    website TEXT,
    socialLinks TEXT NOT NULL DEFAULT '[]',
    availability TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS skills (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    level TEXT NOT NULL,
    yearsOfExperience REAL,
    featured INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'in-progress',
    techStack TEXT NOT NULL DEFAULT '[]',
    role TEXT,
    startDate TEXT,
    endDate TEXT,
    links TEXT NOT NULL DEFAULT '[]',
    images TEXT NOT NULL DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    skillIds TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS experiences (
    id TEXT PRIMARY KEY NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    location TEXT,
    employmentType TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT,
    isCurrent INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL DEFAULT '',
    achievements TEXT NOT NULL DEFAULT '[]',
    techStack TEXT NOT NULL DEFAULT '[]',
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS education (
    id TEXT PRIMARY KEY NOT NULL,
    institution TEXT NOT NULL,
    degree TEXT NOT NULL,
    fieldOfStudy TEXT,
    startDate TEXT NOT NULL,
    endDate TEXT,
    isCurrent INTEGER NOT NULL DEFAULT 0,
    grade TEXT,
    description TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS certificates (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    issuingOrg TEXT NOT NULL,
    issueDate TEXT NOT NULL,
    expiryDate TEXT,
    credentialId TEXT,
    credentialUrl TEXT,
    fileUri TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT,
    url TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags TEXT NOT NULL DEFAULT '[]',
    pinned INTEGER NOT NULL DEFAULT 0,
    color TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS learning_items (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned',
    progress REAL NOT NULL DEFAULT 0,
    source TEXT,
    url TEXT,
    notes TEXT,
    targetDate TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS interview_entries (
    id TEXT PRIMARY KEY NOT NULL,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'applied',
    appliedDate TEXT NOT NULL,
    location TEXT,
    salaryRange TEXT,
    rounds TEXT NOT NULL DEFAULT '[]',
    notes TEXT,
    jobUrl TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );`,
];

export async function initDatabase(): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const stmt of CREATE_STATEMENTS) {
      await db.execAsync(stmt);
    }
  });
}

/** Danger zone: wipes every table. Used by Backup & Restore before a full restore. */
export async function resetDatabase(): Promise<void> {
  const db = await getDatabase();
  const tables = [
    'profile', 'skills', 'projects', 'experiences', 'education',
    'certificates', 'achievements', 'notes', 'learning_items',
    'interview_entries', 'meta',
  ];
  await db.withTransactionAsync(async () => {
    for (const t of tables) {
      await db.execAsync(`DELETE FROM ${t};`);
    }
  });
}
