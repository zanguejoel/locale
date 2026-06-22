/**
 * Build an invoice from unbilled, billable time entries — the bridge that
 * closes the Time Tracking → Invoices loop. Groups entries by description into
 * line items, applies the stored tax rate, persists the invoice, and stamps
 * the source entries as billed so they can't be invoiced twice.
 */
import { TimeEntry } from './types';
import { listTimeEntries, markEntriesBilled } from './time';
import { addInvoice, nextInvoiceNumber } from './invoices';
import { getTaxRate } from './settings';
import { defaultDueDate } from './invoiceCalc';
import { toHours } from './timeMetrics';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Group entries into invoice line items keyed by (description, rate). */
export function buildLineItemsFromEntries(entries: TimeEntry[]): {
  description: string; quantity: number; rate: number; amount: number;
}[] {
  const groups = new Map<string, { description: string; rate: number; seconds: number }>();
  for (const e of entries) {
    const description = e.description?.trim() || 'Work';
    const key = `${description}::${e.rateSnapshot}`;
    const g = groups.get(key) ?? { description, rate: e.rateSnapshot, seconds: 0 };
    g.seconds += e.durationSeconds;
    groups.set(key, g);
  }
  return Array.from(groups.values()).map((g) => {
    const quantity = toHours(g.seconds);
    return { description: g.description, quantity, rate: g.rate, amount: round2(quantity * g.rate) };
  });
}

/**
 * Create a draft invoice for a client from all of its unbilled billable time.
 * Returns null when there's nothing to bill.
 */
export async function createInvoiceFromUnbilledTime(input: {
  clientId: string;
  projectId?: string | null;
}): Promise<{ invoiceId: string; total: number; entryCount: number } | null> {
  const entries = (await listTimeEntries({ clientId: input.clientId, unbilledOnly: true }))
    .filter((e) => !input.projectId || e.projectId === input.projectId);
  if (entries.length === 0) return null;

  const lineItems = buildLineItemsFromEntries(entries);
  const subtotal = round2(lineItems.reduce((sum, li) => sum + li.amount, 0));
  const totalHours = round2(lineItems.reduce((sum, li) => sum + li.quantity, 0));
  // Blended rate for the invoice's headline hours×rate fields (line items hold
  // the per-rate detail). Tax/total are derived from the exact line-item
  // subtotal, not hours×blendedRate, so they can't drift from the line items.
  const blendedRate = totalHours > 0 ? round2(subtotal / totalHours) : 0;

  const taxRate = await getTaxRate();
  const taxAmount = round2(subtotal * taxRate);
  const total = round2(subtotal + taxAmount);
  const issueDate = new Date().toISOString().slice(0, 10);
  const invoiceNumber = await nextInvoiceNumber();

  const invoice = await addInvoice({
    clientId: input.clientId,
    projectId: input.projectId ?? entries[0].projectId,
    invoiceNumber,
    issueDate,
    dueDate: defaultDueDate(issueDate),
    hours: totalHours,
    rate: blendedRate,
    subtotal,
    taxRate,
    taxAmount,
    total,
    status: 'draft',
    lineItems,
  });

  await markEntriesBilled(entries.map((e) => e.id), invoice.id);

  return { invoiceId: invoice.id, total: invoice.total, entryCount: entries.length };
}
