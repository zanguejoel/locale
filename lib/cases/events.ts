/** Timeline events repo — dated events shown chronologically per case. */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseEvent } from './types';

interface EventRow {
  id: string;
  case_id: string;
  date: string;
  label: string;
  source: string;
  created_at: number;
}

const rowToEvent = (r: EventRow): CaseEvent => ({
  id: r.id,
  caseId: r.case_id,
  date: r.date,
  label: r.label,
  source: r.source,
  createdAt: r.created_at,
});

/** Events sorted chronologically by their `date` (ascending). */
export async function listEvents(caseId: string): Promise<CaseEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    'SELECT * FROM case_events WHERE case_id = ? ORDER BY date ASC, created_at ASC',
    caseId
  );
  return rows.map(rowToEvent);
}

export async function addEvent(input: {
  caseId: string;
  date: string;
  label: string;
  source?: string;
}): Promise<CaseEvent> {
  const db = await getDb();
  // Dedup on (date, label) within a case.
  const existing = await db.getFirstAsync<EventRow>(
    'SELECT * FROM case_events WHERE case_id = ? AND date = ? AND lower(label) = lower(?)',
    input.caseId, input.date, input.label
  );
  if (existing) return rowToEvent(existing);

  const row: EventRow = {
    id: newId(),
    case_id: input.caseId,
    date: input.date,
    label: input.label,
    source: input.source ?? 'chat',
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_events (id, case_id, date, label, source, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    row.id, row.case_id, row.date, row.label, row.source, row.created_at
  );
  return rowToEvent(row);
}

export async function deleteEvent(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_events WHERE id = ?', id);
}
