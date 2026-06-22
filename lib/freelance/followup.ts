/**
 * Overdue-invoice follow-up generator. Same kind x tone draft pattern as
 * lib/followups/generate.ts (Procedure Hub), with Freelancer Hub's
 * Friendly/Standard/Final tone set instead of Legal's.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { getInvoice } from './invoices';
import { getClient } from './clients';

export type FollowUpTone = 'friendly' | 'standard' | 'final';

const TONE_DESCRIPTION: Record<FollowUpTone, string> = {
  friendly: 'a friendly, low-pressure reminder',
  standard: 'a clear, professional standard reminder',
  final: 'a firm final notice, while remaining professional',
};

export async function generateInvoiceFollowUp(invoiceId: string, tone: FollowUpTone, llm: LlmHandle): Promise<string> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  const client = await getClient(invoice.clientId);

  const daysOverdue = Math.max(0, Math.round(
    (Date.now() - new Date(`${invoice.dueDate}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24)
  ));

  const prompt =
    `Draft ${TONE_DESCRIPTION[tone]} email about an overdue invoice. ` +
    'Write only the email itself — no preamble, no explanation, no markdown formatting.\n\n' +
    `Client: ${client?.name ?? 'the client'}\n` +
    `Invoice number: ${invoice.invoiceNumber}\n` +
    `Amount due: $${invoice.total.toFixed(2)}\n` +
    `Due date: ${invoice.dueDate} (${daysOverdue} days overdue)`;

  await llm.generate([{ role: 'user', content: prompt }]);
  return (llm.response || '').trim() || 'Unable to generate a draft. Please try again.';
}
