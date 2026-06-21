/** Deadlines repo — dated deadlines, optionally linked to a scheduled reminder. */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseDeadline, DeadlineKind } from './types';

interface DeadlineRow {
  id: string;
  case_id: string;
  due_date: string;
  label: string;
  kind: string;
  reminder_id: string | null;
  created_at: number;
}

const rowToDeadline = (r: DeadlineRow): CaseDeadline => ({
  id: r.id,
  caseId: r.case_id,
  dueDate: r.due_date,
  label: r.label,
  kind: r.kind as DeadlineKind,
  reminderId: r.reminder_id,
  createdAt: r.created_at,
});

export async function listDeadlines(caseId: string): Promise<CaseDeadline[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DeadlineRow>(
    'SELECT * FROM case_deadlines WHERE case_id = ? ORDER BY due_date ASC',
    caseId
  );
  return rows.map(rowToDeadline);
}

export async function addDeadline(input: {
  caseId: string;
  dueDate: string;
  label: string;
  kind?: DeadlineKind;
  reminderId?: string | null;
}): Promise<CaseDeadline> {
  const db = await getDb();
  // Dedup on (due_date, label) within a case.
  const existing = await db.getFirstAsync<DeadlineRow>(
    'SELECT * FROM case_deadlines WHERE case_id = ? AND due_date = ? AND lower(label) = lower(?)',
    input.caseId, input.dueDate, input.label
  );
  if (existing) return rowToDeadline(existing);

  const row: DeadlineRow = {
    id: newId(),
    case_id: input.caseId,
    due_date: input.dueDate,
    label: input.label,
    kind: input.kind ?? 'other',
    reminder_id: input.reminderId ?? null,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_deadlines (id, case_id, due_date, label, kind, reminder_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    row.id, row.case_id, row.due_date, row.label, row.kind, row.reminder_id, row.created_at
  );
  return rowToDeadline(row);
}

export async function setDeadlineReminder(id: string, reminderId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE case_deadlines SET reminder_id = ? WHERE id = ?', reminderId, id);
}

export async function deleteDeadline(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_deadlines WHERE id = ?', id);
}
