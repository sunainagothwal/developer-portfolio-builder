import { getDatabase } from '../database';
import type { ChecklistItem } from '@models/models';

/** Checklist items are simpler (no createdAt/updatedAt) so they get a hand-written repo. */
export const checklistRepository = {
  async getAll(): Promise<ChecklistItem[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<Record<string, unknown>>(
      'SELECT * FROM checklist_items ORDER BY category ASC'
    );
    return rows.map((r) => ({ ...(r as unknown as ChecklistItem), done: !!r.done }));
  },

  async toggle(id: string, done: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('UPDATE checklist_items SET done = ? WHERE id = ?', [done ? 1 : 0, id]);
  },
};
