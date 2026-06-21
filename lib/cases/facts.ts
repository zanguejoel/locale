/** Facts repo — facts and assumptions extracted for a case. */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseFact } from './types';

interface FactRow {
  id: string;
  case_id: string;
  text: string;
  is_assumption: number;
  created_at: number;
}

const rowToFact = (r: FactRow): CaseFact => ({
  id: r.id,
  caseId: r.case_id,
  text: r.text,
  isAssumption: r.is_assumption === 1,
  createdAt: r.created_at,
});

export async function listFacts(caseId: string): Promise<CaseFact[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<FactRow>(
    'SELECT * FROM case_facts WHERE case_id = ? ORDER BY created_at ASC',
    caseId
  );
  return rows.map(rowToFact);
}

export async function addFact(input: {
  caseId: string;
  text: string;
  isAssumption?: boolean;
}): Promise<CaseFact> {
  const db = await getDb();
  // Dedup: skip if an identical fact text already exists for the case.
  const existing = await db.getFirstAsync<FactRow>(
    'SELECT * FROM case_facts WHERE case_id = ? AND lower(text) = lower(?)',
    input.caseId, input.text
  );
  if (existing) return rowToFact(existing);

  const row: FactRow = {
    id: newId(),
    case_id: input.caseId,
    text: input.text,
    is_assumption: input.isAssumption ? 1 : 0,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_facts (id, case_id, text, is_assumption, created_at) VALUES (?, ?, ?, ?, ?)',
    row.id, row.case_id, row.text, row.is_assumption, row.created_at
  );
  return rowToFact(row);
}

export async function deleteFact(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_facts WHERE id = ?', id);
}
