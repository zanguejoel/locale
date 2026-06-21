/** Expenses repo. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Expense, ExpenseCategory } from './types';

interface ExpenseRow {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  source_document_uri: string | null;
  notes: string | null;
  created_at: number;
}

const rowToExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  vendor: r.vendor,
  amount: r.amount,
  date: r.date,
  category: r.category as ExpenseCategory,
  sourceDocumentUri: r.source_document_uri,
  notes: r.notes,
  createdAt: r.created_at,
});

export async function listExpenses(): Promise<Expense[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ExpenseRow>('SELECT * FROM expenses ORDER BY date DESC');
  return rows.map(rowToExpense);
}

export async function addExpense(input: {
  vendor: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  sourceDocumentUri?: string | null;
  notes?: string | null;
}): Promise<Expense> {
  const db = await getDb();
  const row: ExpenseRow = {
    id: newId(),
    vendor: input.vendor,
    amount: input.amount,
    date: input.date,
    category: input.category,
    source_document_uri: input.sourceDocumentUri ?? null,
    notes: input.notes ?? null,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO expenses (id, vendor, amount, date, category, source_document_uri, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    row.id, row.vendor, row.amount, row.date, row.category, row.source_document_uri, row.notes, row.created_at
  );
  return rowToExpense(row);
}

export async function deleteExpense(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', id);
}
