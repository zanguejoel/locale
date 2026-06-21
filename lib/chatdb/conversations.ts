/**
 * Conversations data layer (local SQLite).
 *
 * Drop-in replacement for the old Supabase-backed `lib/supabase/conversations.ts`
 * — same function names/signatures so `hooks/useChat.tsx` only needed an
 * import swap. No `user_id`/auth/RLS scoping: the whole database is local to
 * this device.
 */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import type { Conversations } from '@/hooks/useChat';

interface ConversationRow {
  id: string;
  title: string | null;
  model_type: string | null;
  created_at: number;
  updated_at: number;
}

function rowToConversation(row: ConversationRow): Conversations {
  return {
    id: row.id,
    title: row.title ?? undefined,
    model_type: row.model_type ?? undefined,
    time_created: new Date(row.created_at),
    time_updated: new Date(row.updated_at),
  };
}

/** List conversations, newest first. */
export async function listConversations(limit = 20, search?: string): Promise<Conversations[]> {
  const db = await getDb();
  const rows = search
    ? await db.getAllAsync<ConversationRow>(
        'SELECT * FROM conversations WHERE title LIKE ? ORDER BY updated_at DESC LIMIT ?;',
        [`%${search}%`, limit]
      )
    : await db.getAllAsync<ConversationRow>(
        'SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ?;',
        [limit]
      );
  return rows.map(rowToConversation);
}

export async function createConversation(input: {
  title?: string;
  modelType?: string;
}): Promise<Conversations> {
  const db = await getDb();
  const id = newId();
  const timestamp = now();
  await db.runAsync(
    'INSERT INTO conversations (id, title, model_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?);',
    [id, input.title ?? null, input.modelType ?? null, timestamp, timestamp]
  );
  return {
    id,
    title: input.title,
    model_type: input.modelType,
    time_created: new Date(timestamp),
    time_updated: new Date(timestamp),
  };
}

export async function renameConversation(id: string, title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE conversations SET title = ? WHERE id = ?;', [title, id]);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM conversations WHERE id = ?;', [id]);
}

/** Touch updated_at so a conversation bubbles to the top of the list. */
export async function touchConversation(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE conversations SET updated_at = ? WHERE id = ?;', [now(), id]);
}
