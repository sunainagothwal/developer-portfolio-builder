import { getDatabase } from '../database';
import { generateId } from '@utils/id';
import { nowIso } from '@utils/date';
import type { BaseEntity } from '@models/models';

/**
 * Columns that must be JSON-serialized/deserialized because SQLite
 * has no native array/object type.
 */
export interface RepositoryConfig<T extends BaseEntity> {
  table: string;
  jsonColumns?: (keyof T)[];
  booleanColumns?: (keyof T)[];
  /** Default values applied to a new entity before insert. */
  defaults: Omit<T, 'id' | 'createdAt' | 'updatedAt'>;
}

function serializeRow<T extends BaseEntity>(
  entity: Partial<T>,
  config: RepositoryConfig<T>
): Record<string, unknown> {
  const row: Record<string, unknown> = { ...entity };
  for (const col of config.jsonColumns ?? []) {
    if (col in row) row[col as string] = JSON.stringify(row[col as string]);
  }
  for (const col of config.booleanColumns ?? []) {
    if (col in row) row[col as string] = row[col as string] ? 1 : 0;
  }
  return row;
}

function deserializeRow<T extends BaseEntity>(
  row: Record<string, unknown>,
  config: RepositoryConfig<T>
): T {
  const out: Record<string, unknown> = { ...row };
  for (const col of config.jsonColumns ?? []) {
    const raw = out[col as string];
    try {
      out[col as string] = typeof raw === 'string' ? JSON.parse(raw) : raw ?? [];
    } catch {
      out[col as string] = [];
    }
  }
  for (const col of config.booleanColumns ?? []) {
    out[col as string] = !!out[col as string];
  }
  return out as T;
}

export function createRepository<T extends BaseEntity>(config: RepositoryConfig<T>) {
  const { table } = config;

  async function getAll(): Promise<T[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} ORDER BY updatedAt DESC`
    );
    return rows.map((r) => deserializeRow<T>(r, config));
  }

  async function getById(id: string): Promise<T | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<Record<string, unknown>>(
      `SELECT * FROM ${table} WHERE id = ?`,
      [id]
    );
    return row ? deserializeRow<T>(row, config) : null;
  }

  async function create(input: Partial<Omit<T, 'id' | 'createdAt' | 'updatedAt'>>): Promise<T> {
    const db = await getDatabase();
    const id = generateId();
    const timestamp = nowIso();
    const entity = {
      ...config.defaults,
      ...input,
      id,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as T;

    const row = serializeRow(entity, config);
    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((c) => row[c]);

    await db.runAsync(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
      values as (string | number | null)[]
    );
    return entity;
  }

  async function update(
    id: string,
    patch: Partial<Omit<T, 'id' | 'createdAt'>>
  ): Promise<T | null> {
    const db = await getDatabase();
    const existing = await getById(id);
    if (!existing) return null;

    const updated: T = { ...existing, ...patch, updatedAt: nowIso() } as T;
    const row = serializeRow(updated, config);
    const columns = Object.keys(row).filter((c) => c !== 'id');
    const setClause = columns.map((c) => `${c} = ?`).join(', ');
    const values = columns.map((c) => row[c]);

    await db.runAsync(`UPDATE ${table} SET ${setClause} WHERE id = ?`, [
      ...(values as (string | number | null)[]),
      id,
    ]);
    return updated;
  }

  async function remove(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(`DELETE FROM ${table} WHERE id = ?`, [id]);
  }

  /**
   * Replaces every row in this table.
   *
   * `withinTransaction` is for callers that are already inside one — SQLite
   * has a single connection here and cannot nest transactions, so opening
   * another raises "cannot start a transaction within a transaction". That is
   * what restoring several tables at once used to do.
   */
  async function bulkReplace(entities: T[], options?: { withinTransaction?: boolean }): Promise<void> {
    const db = await getDatabase();

    const work = async () => {
      await db.execAsync(`DELETE FROM ${table};`);
      for (const entity of entities) {
        const row = serializeRow(entity, config);
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map((c) => row[c]);
        await db.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          values as (string | number | null)[]
        );
      }
    };

    if (options?.withinTransaction) return work();
    await db.withTransactionAsync(work);
  }

  return { getAll, getById, create, update, remove, bulkReplace };
}
