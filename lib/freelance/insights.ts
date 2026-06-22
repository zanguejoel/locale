/**
 * AI Insights layer — deterministic heuristics over the existing data, NOT
 * LLM-generated. Reliable and free to compute on every dashboard load, unlike
 * an LLM call which would be slow and could hallucinate numbers.
 */
import { Invoice, Payment, Expense, Client, Project, TimeEntry } from './types';
import { revenueByClient } from './metrics';
import { listContractsByProject } from './contracts';
import { unbilledValue, unbilledSeconds, toHours } from './timeMetrics';

export interface Insight {
  id: string;
  severity: 'info' | 'warning' | 'risk';
  icon: string;
  message: string;
}

export interface InsightInput {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  clients: Client[];
  projects?: Project[];
  timeEntries?: TimeEntry[];
}

function withinTrailingDays(dateStr: string, days: number): boolean {
  const ms = Date.now() - new Date(`${dateStr}T00:00:00`).getTime();
  return ms <= days * 24 * 60 * 60 * 1000 && ms >= 0;
}

export async function computeInsights(input: InsightInput): Promise<Insight[]> {
  const insights: Insight[] = [];

  // Revenue concentration: one client > 55% of trailing-90-day revenue.
  const recentInvoices = input.invoices.filter((i) => i.status === 'paid' && withinTrailingDays(i.issueDate, 90));
  if (recentInvoices.length > 0) {
    const ranked = revenueByClient(recentInvoices);
    const totalRecent = ranked.reduce((sum, r) => sum + r.total, 0);
    if (totalRecent > 0) {
      const top = ranked[0];
      const share = top.total / totalRecent;
      if (share > 0.55) {
        const client = input.clients.find((c) => c.id === top.clientId);
        insights.push({
          id: 'revenue-concentration',
          severity: 'warning',
          icon: 'alert-circle-outline',
          message: `${Math.round(share * 100)}% of your revenue in the last 90 days comes from ${client?.name ?? 'one client'}.`,
        });
      }
    }
  }

  // Slow payers: clients averaging > 30 days to pay.
  const paidPayments = input.payments.filter((p) => p.status === 'paid' && p.paidDate);
  const daysByClient = new Map<string, number[]>();
  for (const p of paidPayments) {
    const invoice = input.invoices.find((i) => i.id === p.invoiceId);
    if (!invoice || !p.paidDate) continue;
    const days = (new Date(`${p.paidDate}T00:00:00`).getTime() - new Date(`${invoice.issueDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24);
    if (days < 0) continue;
    const arr = daysByClient.get(invoice.clientId) ?? [];
    arr.push(days);
    daysByClient.set(invoice.clientId, arr);
  }
  for (const [clientId, days] of daysByClient) {
    const avg = days.reduce((a, b) => a + b, 0) / days.length;
    if (avg > 30) {
      const client = input.clients.find((c) => c.id === clientId);
      insights.push({
        id: `slow-payer-${clientId}`,
        severity: 'warning',
        icon: 'time-outline',
        message: `${client?.name ?? 'A client'} averages ${Math.round(avg)} days to pay.`,
      });
    }
  }

  // Missing contracts: active projects with no linked contract.
  if (input.projects) {
    for (const project of input.projects.filter((p) => p.status === 'active')) {
      const contracts = await listContractsByProject(project.id);
      if (contracts.length === 0) {
        insights.push({
          id: `missing-contract-${project.id}`,
          severity: 'risk',
          icon: 'document-lock-outline',
          message: `No signed contract found for "${project.title}".`,
        });
      }
    }
  }

  // Hours dip: this month's invoiced hours vs. trailing-6-month average.
  const hoursByMonth = new Map<string, number>();
  for (const invoice of input.invoices) {
    const key = invoice.issueDate.slice(0, 7);
    hoursByMonth.set(key, (hoursByMonth.get(key) ?? 0) + invoice.hours);
  }
  const thisMonthKey = new Date().toISOString().slice(0, 7);
  const thisMonthHours = hoursByMonth.get(thisMonthKey) ?? 0;
  const priorMonths = Array.from(hoursByMonth.entries())
    .filter(([key]) => key !== thisMonthKey)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .slice(0, 6);
  if (priorMonths.length >= 3) {
    const avg = priorMonths.reduce((sum, [, hours]) => sum + hours, 0) / priorMonths.length;
    if (avg > 0 && thisMonthHours < avg * 0.6) {
      insights.push({
        id: 'hours-dip',
        severity: 'info',
        icon: 'trending-down-outline',
        message: `You've invoiced ${Math.round(thisMonthHours)} hours this month, below your 6-month average of ${Math.round(avg)}.`,
      });
    }
  }

  // Unbilled time: billable hours tracked but not yet invoiced.
  if (input.timeEntries && input.timeEntries.length > 0) {
    const value = unbilledValue(input.timeEntries);
    const hours = toHours(unbilledSeconds(input.timeEntries));
    if (hours >= 4) {
      insights.push({
        id: 'unbilled-time',
        severity: 'info',
        icon: 'hourglass-outline',
        message: `You have ${hours}h of unbilled billable time ($${Math.round(value)}) ready to invoice.`,
      });
    }
  }

  // Project over budget: tracked value (hours × rate) nearing/exceeding budget.
  if (input.projects) {
    for (const project of input.projects.filter((p) => p.status === 'active' && p.budget && p.budget > 0)) {
      const trackedValue = project.hoursLogged * project.hourlyRate;
      const ratio = trackedValue / (project.budget as number);
      if (ratio >= 0.85) {
        insights.push({
          id: `budget-${project.id}`,
          severity: ratio >= 1 ? 'risk' : 'warning',
          icon: ratio >= 1 ? 'warning-outline' : 'trending-up-outline',
          message: ratio >= 1
            ? `"${project.title}" is over its $${project.budget} budget (${Math.round(trackedValue)} tracked).`
            : `"${project.title}" has used ${Math.round(ratio * 100)}% of its $${project.budget} budget.`,
        });
      }
    }
  }

  return insights;
}
