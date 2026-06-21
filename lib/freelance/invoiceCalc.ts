/** Pure invoice-amount calculations — no I/O, easy to test/reuse. */

export interface InvoiceCalcInput {
  hours: number;
  rate: number;
  taxRate?: number; // decimal, e.g. 0.13
}

export interface InvoiceCalcResult {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export function calcInvoice({ hours, rate, taxRate = 0 }: InvoiceCalcInput): InvoiceCalcResult {
  const subtotal = round2(hours * rate);
  const taxAmount = round2(subtotal * taxRate);
  const total = round2(subtotal + taxAmount);
  return { subtotal, taxAmount, total };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Due date N days after issue date (default 14, net-14 terms). */
export function defaultDueDate(issueDate: string, netDays = 14): string {
  const d = new Date(`${issueDate}T00:00:00`);
  d.setDate(d.getDate() + netDays);
  return d.toISOString().slice(0, 10);
}
