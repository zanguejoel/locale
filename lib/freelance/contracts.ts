/** Contracts repo. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Contract } from './types';

interface ContractRow {
  id: string;
  client_id: string | null;
  project_id: string | null;
  name: string;
  type: string;
  uri: string | null;
  extracted_text: string | null;
  start_date: string | null;
  end_date: string | null;
  renewal_date: string | null;
  payment_terms: string | null;
  notice_period: string | null;
  reminder_id: string | null;
  created_at: number;
}

const rowToContract = (r: ContractRow): Contract => ({
  id: r.id,
  clientId: r.client_id,
  projectId: r.project_id,
  name: r.name,
  type: r.type,
  uri: r.uri,
  extractedText: r.extracted_text,
  startDate: r.start_date,
  endDate: r.end_date,
  renewalDate: r.renewal_date,
  paymentTerms: r.payment_terms,
  noticePeriod: r.notice_period,
  reminderId: r.reminder_id,
  createdAt: r.created_at,
});

export async function listContracts(): Promise<Contract[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ContractRow>('SELECT * FROM contracts ORDER BY created_at DESC');
  return rows.map(rowToContract);
}

export async function getContract(id: string): Promise<Contract | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ContractRow>('SELECT * FROM contracts WHERE id = ?', id);
  return row ? rowToContract(row) : null;
}

/** Active projects (passed in by caller) with no linked contract — used by the AI Insights layer. */
export async function listContractsByProject(projectId: string): Promise<Contract[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ContractRow>('SELECT * FROM contracts WHERE project_id = ?', projectId);
  return rows.map(rowToContract);
}

export async function addContract(input: {
  clientId?: string | null;
  projectId?: string | null;
  name: string;
  type?: string;
  uri?: string | null;
  extractedText?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  renewalDate?: string | null;
  paymentTerms?: string | null;
  noticePeriod?: string | null;
}): Promise<Contract> {
  const db = await getDb();
  const row: ContractRow = {
    id: newId(),
    client_id: input.clientId ?? null,
    project_id: input.projectId ?? null,
    name: input.name,
    type: input.type ?? 'agreement',
    uri: input.uri ?? null,
    extracted_text: input.extractedText ?? null,
    start_date: input.startDate ?? null,
    end_date: input.endDate ?? null,
    renewal_date: input.renewalDate ?? null,
    payment_terms: input.paymentTerms ?? null,
    notice_period: input.noticePeriod ?? null,
    reminder_id: null,
    created_at: now(),
  };
  await db.runAsync(
    `INSERT INTO contracts (id, client_id, project_id, name, type, uri, extracted_text, start_date, end_date, renewal_date, payment_terms, notice_period, reminder_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.client_id, row.project_id, row.name, row.type, row.uri, row.extracted_text,
    row.start_date, row.end_date, row.renewal_date, row.payment_terms, row.notice_period, row.reminder_id, row.created_at
  );
  return rowToContract(row);
}

export async function setContractReminder(id: string, reminderId: string | null): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE contracts SET reminder_id = ? WHERE id = ?', reminderId, id);
}

export async function deleteContract(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM contracts WHERE id = ?', id);
}
