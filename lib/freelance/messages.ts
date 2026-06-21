/** The single global FREELANCER_MODE assistant thread — no per-entity scoping. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { FreelanceMessage, FreelanceMessageRole } from './types';

interface MessageRow {
  id: string;
  role: string;
  content: string;
  created_at: number;
}

const rowToMessage = (r: MessageRow): FreelanceMessage => ({
  id: r.id,
  role: r.role as FreelanceMessageRole,
  content: r.content,
  createdAt: r.created_at,
});

export async function listFreelanceMessages(): Promise<FreelanceMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MessageRow>('SELECT * FROM freelance_messages ORDER BY created_at ASC');
  return rows.map(rowToMessage);
}

export async function addFreelanceMessage(input: {
  role: FreelanceMessageRole;
  content: string;
}): Promise<FreelanceMessage> {
  const db = await getDb();
  const row: MessageRow = { id: newId(), role: input.role, content: input.content, created_at: now() };
  await db.runAsync(
    'INSERT INTO freelance_messages (id, role, content, created_at) VALUES (?, ?, ?, ?)',
    row.id, row.role, row.content, row.created_at
  );
  return rowToMessage(row);
}

export async function updateFreelanceMessageContent(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE freelance_messages SET content = ? WHERE id = ?', content, id);
}
