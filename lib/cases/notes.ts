/** Notes repo — free-form user notes attached to a case. */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseNote } from './types';

interface NoteRow {
  id: string;
  case_id: string;
  text: string;
  created_at: number;
}

const rowToNote = (r: NoteRow): CaseNote => ({
  id: r.id,
  caseId: r.case_id,
  text: r.text,
  createdAt: r.created_at,
});

export async function listNotes(caseId: string): Promise<CaseNote[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<NoteRow>(
    'SELECT * FROM case_notes WHERE case_id = ? ORDER BY created_at DESC',
    caseId
  );
  return rows.map(rowToNote);
}

export async function addNote(input: { caseId: string; text: string }): Promise<CaseNote> {
  const db = await getDb();
  const row: NoteRow = {
    id: newId(),
    case_id: input.caseId,
    text: input.text,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_notes (id, case_id, text, created_at) VALUES (?, ?, ?, ?)',
    row.id, row.case_id, row.text, row.created_at
  );
  return rowToNote(row);
}

export async function deleteNote(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_notes WHERE id = ?', id);
}
