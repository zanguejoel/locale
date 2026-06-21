/** Payments repo. */
import { getDb } from './db';
import { newId, now } from '@/lib/cases/util';
import { Payment, PaymentStatus } from './types';

interface PaymentRow {
  id: string;
  invoice_id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_date: string | null;
  created_at: number;
}

const rowToPayment = (r: PaymentRow): Payment => ({
  id: r.id,
  invoiceId: r.invoice_id,
  amount: r.amount,
  status: r.status as PaymentStatus,
  dueDate: r.due_date,
  paidDate: r.paid_date,
  createdAt: r.created_at,
});

export async function listPayments(invoiceId?: string): Promise<Payment[]> {
  const db = await getDb();
  const rows = invoiceId
    ? await db.getAllAsync<PaymentRow>('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at DESC', invoiceId)
    : await db.getAllAsync<PaymentRow>('SELECT * FROM payments ORDER BY created_at DESC');
  return rows.map(rowToPayment);
}

export async function addPayment(input: {
  invoiceId: string;
  amount: number;
  status?: PaymentStatus;
  dueDate?: string | null;
  paidDate?: string | null;
}): Promise<Payment> {
  const db = await getDb();
  const row: PaymentRow = {
    id: newId(),
    invoice_id: input.invoiceId,
    amount: input.amount,
    status: input.status ?? 'pending',
    due_date: input.dueDate ?? null,
    paid_date: input.paidDate ?? null,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO payments (id, invoice_id, amount, status, due_date, paid_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    row.id, row.invoice_id, row.amount, row.status, row.due_date, row.paid_date, row.created_at
  );
  return rowToPayment(row);
}

export async function markPaymentPaid(id: string, paidDate: string): Promise<void> {
  const db = await getDb();
  await db.runAsync("UPDATE payments SET status = 'paid', paid_date = ? WHERE id = ?", paidDate, id);
}
