import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { profileRepository } from '@lib/db/repositories/profileRepository';
import { skillsRepository } from '@lib/db/repositories/skillsRepository';
import { projectsRepository } from '@lib/db/repositories/projectsRepository';
import { experienceRepository } from '@lib/db/repositories/experienceRepository';
import { educationRepository } from '@lib/db/repositories/educationRepository';
import { certificatesRepository } from '@lib/db/repositories/certificatesRepository';
import { achievementsRepository } from '@lib/db/repositories/achievementsRepository';
import { notesRepository } from '@lib/db/repositories/notesRepository';
import { learningRepository } from '@lib/db/repositories/learningRepository';
import { interviewRepository } from '@lib/db/repositories/interviewRepository';
import { getDatabase } from '@lib/db/database';

export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupSnapshot {
  schemaVersion: number;
  exportedAt: string;
  data: {
    profile: unknown;
    skills: unknown;
    projects: unknown;
    experiences: unknown;
    education: unknown;
    certificates: unknown;
    achievements: unknown;
    notes: unknown;
    learningItems: unknown;
    interviewEntries: unknown;
  };
}

export async function buildBackupSnapshot(): Promise<BackupSnapshot> {
  const [profile, skills, projects, experiences, education, certificates, achievements, notes, learningItems, interviewEntries] =
    await Promise.all([
      profileRepository.getAll(),
      skillsRepository.getAll(),
      projectsRepository.getAll(),
      experienceRepository.getAll(),
      educationRepository.getAll(),
      certificatesRepository.getAll(),
      achievementsRepository.getAll(),
      notesRepository.getAll(),
      learningRepository.getAll(),
      interviewRepository.getAll(),
    ]);

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      profile,
      skills,
      projects,
      experiences,
      education,
      certificates,
      achievements,
      notes,
      learningItems,
      interviewEntries,
    },
  };
}

export async function exportBackupToFile(): Promise<string> {
  const snapshot = await buildBackupSnapshot();
  const json = JSON.stringify(snapshot, null, 2);
  const filename = `devportfolio-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const file = new FileSystem.File(FileSystem.Paths.document, filename);
  file.create({ overwrite: true });
  file.write(json);
  return file.uri;
}

export async function shareBackupFile(fileUri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (available) {
    await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Export backup' });
  }
}

export async function pickAndParseBackupFile(): Promise<BackupSnapshot | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true });
  if (result.canceled || !result.assets?.[0]) return null;

  const content = await new FileSystem.File(result.assets[0].uri).text();
  const parsed = JSON.parse(content) as BackupSnapshot;
  if (!parsed?.data) throw new Error('Invalid backup file format');
  return parsed;
}

/**
 * Replaces the whole local database with a snapshot.
 *
 * One transaction, applied in order. Running the tables concurrently used to
 * open ten transactions on a single SQLite connection, which fails with
 * "cannot start a transaction within a transaction" — and a half-applied
 * restore would leave the user with some tables from the snapshot and some
 * from the device.
 */
export async function restoreFromSnapshot(snapshot: BackupSnapshot): Promise<void> {
  const { data } = snapshot;

  const tables: [unknown, { bulkReplace: (e: never, o?: { withinTransaction?: boolean }) => Promise<void> }][] = [
    [data.profile, profileRepository],
    [data.skills, skillsRepository],
    [data.projects, projectsRepository],
    [data.experiences, experienceRepository],
    [data.education, educationRepository],
    [data.certificates, certificatesRepository],
    [data.achievements, achievementsRepository],
    [data.notes, notesRepository],
    [data.learningItems, learningRepository],
    [data.interviewEntries, interviewRepository],
  ];

  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    for (const [rows, repository] of tables) {
      if (!rows) continue;
      await repository.bulkReplace(rows as never, { withinTransaction: true });
    }
  });
}
