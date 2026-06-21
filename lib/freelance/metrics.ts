/**
 * Pure aggregation functions over invoices/payments/expenses/clients. No I/O —
 * callers (Dashboard, Reports) fetch the rows and pass them in, so the same
 * logic isn't duplicated across screens.
 */
import { Invoice, Payment, Expense, Client } from './types';

export interface DashboardMetrics {
  monthlyRevenue: number;
  monthlyExpenses: number;
  netProfit: number;
  outstandingTotal: number;
  overdueTotal: number;
  totalReceivables: number;
  activeClientCount: number;
  averageInvoiceValue: number;
  averagePaymentDays: number | null;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7); // YYYY-MM
}

function isOverdue(invoice: Invoice, today: string): boolean {
  return invoice.status === 'sent' && invoice.dueDate < today;
}

export function computeDashboardMetrics(
  invoices: Invoice[],
  payments: Payment[],
  expenses: Expense[],
  clients: Client[]
): DashboardMetrics {
  const today = new Date().toISOString().slice(0, 10);
  const thisMonth = monthKey(today);

  const monthlyRevenue = invoices
    .filter((i) => i.status === 'paid' && monthKey(i.issueDate) === thisMonth)
    .reduce((sum, i) => sum + i.total, 0);

  const monthlyExpenses = expenses
    .filter((e) => monthKey(e.date) === thisMonth)
    .reduce((sum, e) => sum + e.amount, 0);

  const outstandingInvoices = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue');
  const overdueInvoices = invoices.filter((i) => isOverdue(i, today));

  const paidPayments = payments.filter((p) => p.status === 'paid' && p.paidDate);
  const paymentDays = paidPayments
    .map((p) => {
      const invoice = invoices.find((i) => i.id === p.invoiceId);
      if (!invoice || !p.paidDate) return null;
      const issued = new Date(`${invoice.issueDate}T00:00:00`).getTime();
      const paid = new Date(`${p.paidDate}T00:00:00`).getTime();
      return (paid - issued) / (1000 * 60 * 60 * 24);
    })
    .filter((d): d is number => d !== null && d >= 0);

  const paidInvoices = invoices.filter((i) => i.status === 'paid');

  return {
    monthlyRevenue,
    monthlyExpenses,
    netProfit: monthlyRevenue - monthlyExpenses,
    outstandingTotal: outstandingInvoices.reduce((sum, i) => sum + i.total, 0),
    overdueTotal: overdueInvoices.reduce((sum, i) => sum + i.total, 0),
    totalReceivables: outstandingInvoices.reduce((sum, i) => sum + i.total, 0),
    activeClientCount: clients.filter((c) => c.status === 'active').length,
    averageInvoiceValue: invoices.length > 0 ? invoices.reduce((sum, i) => sum + i.total, 0) / invoices.length : 0,
    averagePaymentDays: paymentDays.length > 0 ? paymentDays.reduce((a, b) => a + b, 0) / paymentDays.length : null,
  };
}

export interface MonthlyRevenuePoint {
  month: string; // YYYY-MM
  revenue: number;
  expenses: number;
}

/** Revenue/expense trend, oldest to newest, for the trailing N months present in the data. */
export function computeRevenueTrend(invoices: Invoice[], expenses: Expense[]): MonthlyRevenuePoint[] {
  const months = new Map<string, MonthlyRevenuePoint>();

  for (const i of invoices) {
    if (i.status !== 'paid') continue;
    const key = monthKey(i.issueDate);
    const point = months.get(key) ?? { month: key, revenue: 0, expenses: 0 };
    point.revenue += i.total;
    months.set(key, point);
  }
  for (const e of expenses) {
    const key = monthKey(e.date);
    const point = months.get(key) ?? { month: key, revenue: 0, expenses: 0 };
    point.expenses += e.amount;
    months.set(key, point);
  }

  return Array.from(months.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function bestMonth(trend: MonthlyRevenuePoint[]): MonthlyRevenuePoint | null {
  if (trend.length === 0) return null;
  return trend.reduce((best, p) => (p.revenue > best.revenue ? p : best), trend[0]);
}

export interface ClientRevenue {
  clientId: string;
  total: number;
}

export function revenueByClient(invoices: Invoice[]): ClientRevenue[] {
  const byClient = new Map<string, number>();
  for (const i of invoices) {
    if (i.status !== 'paid') continue;
    byClient.set(i.clientId, (byClient.get(i.clientId) ?? 0) + i.total);
  }
  return Array.from(byClient.entries())
    .map(([clientId, total]) => ({ clientId, total }))
    .sort((a, b) => b.total - a.total);
}

export function topClientByRevenue(invoices: Invoice[]): ClientRevenue | null {
  const ranked = revenueByClient(invoices);
  return ranked.length > 0 ? ranked[0] : null;
}
