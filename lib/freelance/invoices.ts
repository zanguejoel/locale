/** Invoices + line items repo. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Invoice, InvoiceStatus, InvoiceLineItem } from './types';

interface InvoiceRow {
  id: string;
  client_id: string;
  project_id: string | null;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  hours: number;
  rate: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
  status: string;
  created_at: number;
  updated_at: number;
}

interface LineItemRow {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

const rowToInvoice = (r: InvoiceRow): Invoice => ({
  id: r.id,
  clientId: r.client_id,
  projectId: r.project_id,
  invoiceNumber: r.invoice_number,
  issueDate: r.issue_date,
  dueDate: r.due_date,
  hours: r.hours,
  rate: r.rate,
  subtotal: r.subtotal,
  taxRate: r.tax_rate,
  taxAmount: r.tax_amount,
  total: r.total,
  status: r.status as InvoiceStatus,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const rowToLineItem = (r: LineItemRow): InvoiceLineItem => ({
  id: r.id,
  invoiceId: r.invoice_id,
  description: r.description,
  quantity: r.quantity,
  rate: r.rate,
  amount: r.amount,
});

export async function listInvoices(clientId?: string): Promise<Invoice[]> {
  const db = await getDb();
  const rows = clientId
    ? await db.getAllAsync<InvoiceRow>('SELECT * FROM invoices WHERE client_id = ? ORDER BY issue_date DESC', clientId)
    : await db.getAllAsync<InvoiceRow>('SELECT * FROM invoices ORDER BY issue_date DESC');
  return rows.map(rowToInvoice);
}

export async function listOverdueInvoices(): Promise<Invoice[]> {
  const db = await getDb();
  const today = new Date().toISOString().slice(0, 10);
  const rows = await db.getAllAsync<InvoiceRow>(
    "SELECT * FROM invoices WHERE status = 'sent' AND due_date < ? ORDER BY due_date ASC",
    today
  );
  return rows.map(rowToInvoice);
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<InvoiceRow>('SELECT * FROM invoices WHERE id = ?', id);
  return row ? rowToInvoice(row) : null;
}

export async function listLineItems(invoiceId: string): Promise<InvoiceLineItem[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<LineItemRow>('SELECT * FROM invoice_line_items WHERE invoice_id = ?', invoiceId);
  return rows.map(rowToLineItem);
}

/** Next invoice number, formatted `INV-{year}-{seq}`, backed by `freelance_settings`. */
export async function nextInvoiceNumber(): Promise<string> {
  const db = await getDb();
  const year = new Date().getFullYear();
  const key = `invoice_seq_${year}`;
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM freelance_settings WHERE key = ?', key);
  const seq = (row ? parseInt(row.value, 10) : 0) + 1;
  await db.runAsync(
    'INSERT INTO freelance_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key, String(seq)
  );
  return `INV-${year}-${String(seq).padStart(3, '0')}`;
}

export async function addInvoice(input: {
  clientId: string;
  projectId?: string | null;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  hours: number;
  rate: number;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  status?: InvoiceStatus;
  lineItems?: { description: string; quantity: number; rate: number; amount: number }[];
}): Promise<Invoice> {
  const db = await getDb();
  const row: InvoiceRow = {
    id: newId(),
    client_id: input.clientId,
    project_id: input.projectId ?? null,
    invoice_number: input.invoiceNumber,
    issue_date: input.issueDate,
    due_date: input.dueDate,
    hours: input.hours,
    rate: input.rate,
    subtotal: input.subtotal,
    tax_rate: input.taxRate ?? 0,
    tax_amount: input.taxAmount ?? 0,
    total: input.total,
    status: input.status ?? 'draft',
    created_at: now(),
    updated_at: now(),
  };
  await db.runAsync(
    `INSERT INTO invoices (id, client_id, project_id, invoice_number, issue_date, due_date, hours, rate, subtotal, tax_rate, tax_amount, total, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.client_id, row.project_id, row.invoice_number, row.issue_date, row.due_date, row.hours, row.rate,
    row.subtotal, row.tax_rate, row.tax_amount, row.total, row.status, row.created_at, row.updated_at
  );

  for (const item of input.lineItems ?? []) {
    await db.runAsync(
      'INSERT INTO invoice_line_items (id, invoice_id, description, quantity, rate, amount) VALUES (?, ?, ?, ?, ?, ?)',
      newId(), row.id, item.description, item.quantity, item.rate, item.amount
    );
  }

  return rowToInvoice(row);
}

export async function updateInvoiceStatus(id: string, status: InvoiceStatus): Promise<void> {
  const db = await getDb();
  await db.runAsync('UPDATE invoices SET status = ?, updated_at = ? WHERE id = ?', status, now(), id);
}

export async function deleteInvoice(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM invoices WHERE id = ?', id);
}
