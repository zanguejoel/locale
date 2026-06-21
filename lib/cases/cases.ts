/**
 * Cases repo. CRUD over the `cases` table, scoped by module_id so each
 * navigator module (legal, immigration, …) lists only its own cases.
 */
import { getDb } from './db';
import { newId, now } from './util';
import { LegalCase, CaseStatus } from './types';

interface CaseRow {
  id: string;
  module_id: string;
  title: string;
  category: string;
  jurisdiction: string | null;
  status: string;
  created_at: number;
  updated_at: number;
}

function rowToCase(row: CaseRow): LegalCase {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    category: row.category,
    jurisdiction: row.jurisdiction,
    status: row.status as CaseStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listCases(moduleId: string): Promise<LegalCase[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<CaseRow>(
    'SELECT * FROM cases WHERE module_id = ? ORDER BY updated_at DESC',
    moduleId
  );
  return rows.map(rowToCase);
}

export async function getCase(id: string): Promise<LegalCase | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<CaseRow>('SELECT * FROM cases WHERE id = ?', id);
  return row ? rowToCase(row) : null;
}

export async function createCase(input: {
  moduleId: string;
  title: string;
  category: string;
  jurisdiction?: string | null;
  status?: CaseStatus;
}): Promise<LegalCase> {
  const db = await getDb();
  const ts = now();
  const row: CaseRow = {
    id: newId(),
    module_id: input.moduleId,
    title: input.title,
    category: input.category,
    jurisdiction: input.jurisdiction ?? null,
    status: input.status ?? 'Open',
    created_at: ts,
    updated_at: ts,
  };
  await db.runAsync(
    'INSERT INTO cases (id, module_id, title, category, jurisdiction, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    row.id, row.module_id, row.title, row.category, row.jurisdiction, row.status, row.created_at, row.updated_at
  );
  return rowToCase(row);
}

export async function updateCase(
  id: string,
  patch: Partial<Pick<LegalCase, 'title' | 'category' | 'jurisdiction' | 'status'>>
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const params: (string | null)[] = [];
  if (patch.title !== undefined) { fields.push('title = ?'); params.push(patch.title); }
  if (patch.category !== undefined) { fields.push('category = ?'); params.push(patch.category); }
  if (patch.jurisdiction !== undefined) { fields.push('jurisdiction = ?'); params.push(patch.jurisdiction); }
  if (patch.status !== undefined) { fields.push('status = ?'); params.push(patch.status); }
  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  await db.runAsync(
    `UPDATE cases SET ${fields.join(', ')} WHERE id = ?`,
    ...params, now(), id
  );
}

/** Bump updated_at so the case rises to the top of the list. */
export async function touchCase(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE cases SET updated_at = ? WHERE id = ?', now(), id);
}

export async function deleteCase(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM cases WHERE id = ?', id);
}
