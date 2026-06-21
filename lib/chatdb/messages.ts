/**
 * Messages data layer (local SQLite).
 *
 * Drop-in replacement for the old Supabase-backed `lib/supabase/messages.ts`.
 * `metadata` is stored as a JSON text column and spread back onto the
 * returned `Message`, matching the old row shape so callers in
 * `hooks/useChat.tsx` don't need changes.
 */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Message, Role } from '@/utils/Interfaces';

interface MessageRow {
  id: string;
  conversation_id: string;
  role: number;
  content: string;
  metadata: string | null;
  created_at: number;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chat_id: row.id,
    role: row.role === Role.User ? Role.User : Role.Bot,
    content: row.content,
    timestamp: new Date(row.created_at),
    ...(row.metadata ? JSON.parse(row.metadata) : {}),
  };
}

/** Load all messages for a conversation in chronological order. */
export async function listMessages(conversationId: string): Promise<Message[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MessageRow>(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC;',
    [conversationId]
  );
  return rows.map(rowToMessage);
}

/** Insert a message and return its id (for later content updates). */
export async function insertMessage(input: {
  conversationId: string;
  role: Role;
  content: string;
  metadata?: Record<string, any>;
}): Promise<Message> {
  const db = await getDb();
  const id = newId();
  const timestamp = now();
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;
  await db.runAsync(
    'INSERT INTO messages (id, conversation_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?);',
    [id, input.conversationId, input.role, input.content, metadataJson, timestamp]
  );
  return {
    id,
    chat_id: id,
    role: input.role,
    content: input.content,
    timestamp: new Date(timestamp),
    ...(input.metadata ?? {}),
  };
}

/** Update a streaming assistant message once generation completes. */
export async function updateMessageContent(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE messages SET content = ? WHERE id = ?;', [content, id]);
}
