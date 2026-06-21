/** Letters repo — generated follow-up communications (email/letter/complaint/…). */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseLetter, LetterKind, LetterTone } from './types';

interface LetterRow {
  id: string;
  case_id: string;
  kind: string;
  tone: string;
  content: string;
  created_at: number;
}

const rowToLetter = (r: LetterRow): CaseLetter => ({
  id: r.id,
  caseId: r.case_id,
  kind: r.kind as LetterKind,
  tone: r.tone as LetterTone,
  content: r.content,
  createdAt: r.created_at,
});

export async function listLetters(caseId: string): Promise<CaseLetter[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LetterRow>(
    'SELECT * FROM case_letters WHERE case_id = ? ORDER BY created_at DESC',
    caseId
  );
  return rows.map(rowToLetter);
}

export async function addLetter(input: {
  caseId: string;
  kind: LetterKind;
  tone: LetterTone;
  content: string;
}): Promise<CaseLetter> {
  const db = await getDb();
  const row: LetterRow = {
    id: newId(),
    case_id: input.caseId,
    kind: input.kind,
    tone: input.tone,
    content: input.content,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_letters (id, case_id, kind, tone, content, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    row.id, row.case_id, row.kind, row.tone, row.content, row.created_at
  );
  return rowToLetter(row);
}

export async function deleteLetter(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_letters WHERE id = ?', id);
}
