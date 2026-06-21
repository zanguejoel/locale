/**
 * Case messages repo — the per-case chat transcript.
 *
 * Kept entirely in local SQLite and isolated from the Supabase-backed normal
 * chat: these rows are never written to `conversations`/`messages`.
 */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseMessage, CaseMessageRole } from './types';

interface MessageRow {
  id: string;
  case_id: string;
  role: string;
  content: string;
  created_at: number;
}

const rowToMessage = (r: MessageRow): CaseMessage => ({
  id: r.id,
  caseId: r.case_id,
  role: r.role as CaseMessageRole,
  content: r.content,
  createdAt: r.created_at,
});

/** Messages in chronological order (oldest first). */
export async function listCaseMessages(caseId: string): Promise<CaseMessage[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<MessageRow>(
    'SELECT * FROM case_messages WHERE case_id = ? ORDER BY created_at ASC',
    caseId
  );
  return rows.map(rowToMessage);
}

export async function addCaseMessage(input: {
  caseId: string;
  role: CaseMessageRole;
  content: string;
}): Promise<CaseMessage> {
  const db = await getDb();
  const row: MessageRow = {
    id: newId(),
    case_id: input.caseId,
    role: input.role,
    content: input.content,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_messages (id, case_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
    row.id, row.case_id, row.role, row.content, row.created_at
  );
  return rowToMessage(row);
}

export async function updateCaseMessage(id: string, content: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE case_messages SET content = ? WHERE id = ?', content, id);
}
