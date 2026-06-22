/**
 * Index Freelancer Hub entities into `freelance_chunks` for RAG retrieval.
 * Called whenever a client/project/invoice/expense/contract is created or
 * updated so the assistant can answer cross-entity questions ("who still
 * owes me money") by retrieving these summaries instead of doing live SQL
 * joins from the chat path.
 */
import { chunkText } from '@/lib/rag/chunk';
import { embedText } from '@/lib/rag/embed';
import { addChunk, deleteChunksForScope, deleteChunksForSource } from './chunks';
import { Client, Project, Invoice, Expense, Contract, TimeEntry } from './types';
import { formatDuration } from './timeMetrics';

async function reindex(scopeType: 'client' | 'project' | 'invoice' | 'expense' | 'contract', scopeId: string, text: string): Promise<void> {
  await deleteChunksForScope(scopeType, scopeId);
  const chunks = chunkText(text);
  for (const chunk of chunks) {
    const embedding = await embedText(chunk);
    await addChunk({
      scopeType,
      scopeId,
      sourceType: scopeType,
      sourceId: scopeId,
      text: chunk,
      embedding: embedding ?? undefined,
    });
  }
}

export async function indexClient(client: Client): Promise<void> {
  const text = [
    `Client: ${client.name}`,
    client.company ? `Company: ${client.company}` : null,
    client.email ? `Email: ${client.email}` : null,
    client.phone ? `Phone: ${client.phone}` : null,
    `Status: ${client.status}`,
    client.notes ? `Notes: ${client.notes}` : null,
  ].filter(Boolean).join('\n');
  await reindex('client', client.id, text);
}

export async function indexProject(project: Project, clientName?: string): Promise<void> {
  const text = [
    `Project: ${project.title}${clientName ? ` (client: ${clientName})` : ''}`,
    project.description ? `Description: ${project.description}` : null,
    `Hourly rate: $${project.hourlyRate}`,
    project.budget ? `Budget: $${project.budget}` : null,
    `Status: ${project.status}`,
    `Hours logged: ${project.hoursLogged}`,
    project.startDate ? `Start date: ${project.startDate}` : null,
    project.endDate ? `End date: ${project.endDate}` : null,
  ].filter(Boolean).join('\n');
  await reindex('project', project.id, text);
}

export async function indexInvoice(invoice: Invoice, clientName?: string): Promise<void> {
  const text = [
    `Invoice ${invoice.invoiceNumber}${clientName ? ` for client ${clientName}` : ''}`,
    `Issued: ${invoice.issueDate}, due: ${invoice.dueDate}`,
    `Hours: ${invoice.hours} at $${invoice.rate}/hour, subtotal $${invoice.subtotal}`,
    invoice.taxAmount ? `Tax: $${invoice.taxAmount} (${(invoice.taxRate * 100).toFixed(1)}%)` : null,
    `Total: $${invoice.total}`,
    `Status: ${invoice.status}`,
  ].filter(Boolean).join('\n');
  await reindex('invoice', invoice.id, text);
}

export async function indexExpense(expense: Expense): Promise<void> {
  const text = [
    `Expense: ${expense.vendor}`,
    `Amount: $${expense.amount}`,
    `Date: ${expense.date}`,
    `Category: ${expense.category}`,
    expense.notes ? `Notes: ${expense.notes}` : null,
  ].filter(Boolean).join('\n');
  await reindex('expense', expense.id, text);
}

export async function indexContract(contract: Contract): Promise<void> {
  const text = [
    `Contract: ${contract.name} (${contract.type})`,
    contract.startDate ? `Start date: ${contract.startDate}` : null,
    contract.endDate ? `End date: ${contract.endDate}` : null,
    contract.renewalDate ? `Renewal date: ${contract.renewalDate}` : null,
    contract.paymentTerms ? `Payment terms: ${contract.paymentTerms}` : null,
    contract.noticePeriod ? `Notice period: ${contract.noticePeriod}` : null,
    contract.extractedText ? `Excerpt: ${contract.extractedText.slice(0, 500)}` : null,
  ].filter(Boolean).join('\n');
  await reindex('contract', contract.id, text);
}

/**
 * Index a time entry under its project's scope (so "how many hours on X" is
 * retrievable) without clobbering the project's own summary — we target the
 * entry's source row rather than re-indexing the whole project scope.
 */
export async function indexTimeEntry(entry: TimeEntry, projectTitle?: string, clientName?: string): Promise<void> {
  await deleteChunksForSource('time_entry', entry.id);
  const date = new Date(entry.startTime).toISOString().slice(0, 10);
  const text = [
    `Time entry on ${date}: ${formatDuration(entry.durationSeconds)} of work`,
    projectTitle ? `Project: ${projectTitle}` : null,
    clientName ? `Client: ${clientName}` : null,
    entry.description ? `Work: ${entry.description}` : null,
    `Billable: ${entry.isBillable ? 'yes' : 'no'}${entry.billed ? ' (invoiced)' : ''}`,
  ].filter(Boolean).join('\n');
  const embedding = await embedText(text);
  await addChunk({
    scopeType: 'project',
    scopeId: entry.projectId,
    sourceType: 'time_entry',
    sourceId: entry.id,
    text,
    embedding: embedding ?? undefined,
  });
}

export async function removeTimeEntryIndex(entryId: string): Promise<void> {
  await deleteChunksForSource('time_entry', entryId);
}
