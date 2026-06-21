/** Documents repo — uploaded/analyzed documents attached to a case. */
import { getDb } from './db';
import { newId, now } from './util';
import { CaseDocument, CaseDocType, RiskLevel } from './types';

interface DocumentRow {
  id: string;
  case_id: string;
  name: string;
  type: string;
  uri: string | null;
  extracted_text: string | null;
  summary_json: string | null;
  risk: string;
  created_at: number;
}

const rowToDocument = (r: DocumentRow): CaseDocument => ({
  id: r.id,
  caseId: r.case_id,
  name: r.name,
  type: r.type as CaseDocType,
  uri: r.uri,
  extractedText: r.extracted_text,
  summaryJson: r.summary_json,
  risk: r.risk as RiskLevel,
  createdAt: r.created_at,
});

export async function listDocuments(caseId: string): Promise<CaseDocument[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<DocumentRow>(
    'SELECT * FROM case_documents WHERE case_id = ? ORDER BY created_at DESC',
    caseId
  );
  return rows.map(rowToDocument);
}

export async function addDocument(input: {
  caseId: string;
  name: string;
  type: CaseDocType;
  uri?: string | null;
  extractedText?: string | null;
  summaryJson?: string | null;
  risk?: RiskLevel;
}): Promise<CaseDocument> {
  const db = await getDb();
  const row: DocumentRow = {
    id: newId(),
    case_id: input.caseId,
    name: input.name,
    type: input.type,
    uri: input.uri ?? null,
    extracted_text: input.extractedText ?? null,
    summary_json: input.summaryJson ?? null,
    risk: input.risk ?? 'Unknown',
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_documents (id, case_id, name, type, uri, extracted_text, summary_json, risk, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    row.id, row.case_id, row.name, row.type, row.uri, row.extracted_text, row.summary_json, row.risk, row.created_at
  );
  return rowToDocument(row);
}

export async function deleteDocument(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_documents WHERE id = ?', id);
}
