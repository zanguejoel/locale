/**
 * Export an invoice to Markdown, PDF, or DOCX and hand it to the OS share
 * sheet — reuses the exact same generic export plumbing as `exportCase.ts`
 * (markdownToHtml + docxWriter + expo-print/expo-sharing).
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { markdownToHtml, wrapHtmlDocument } from '@/lib/export/markdownToHtml';
import { writeDocx } from '@/lib/export/docxWriter';
import { getInvoice, listLineItems } from './invoices';
import { getClient } from './clients';

export type ExportFormat = 'markdown' | 'pdf' | 'docx';

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'invoice';
}

async function buildInvoiceMarkdown(invoiceId: string): Promise<{ title: string; markdown: string }> {
  const invoice = await getInvoice(invoiceId);
  if (!invoice) throw new Error('Invoice not found');
  const client = await getClient(invoice.clientId);
  const lineItems = await listLineItems(invoiceId);

  const lines: string[] = [];
  lines.push(`# Invoice ${invoice.invoiceNumber}`);
  lines.push('');
  lines.push(`**Client:** ${client?.name ?? 'Unknown'}${client?.company ? ` (${client.company})` : ''}`);
  lines.push(`**Issue date:** ${invoice.issueDate}`);
  lines.push(`**Due date:** ${invoice.dueDate}`);
  lines.push('');
  lines.push('## Line Items');
  if (lineItems.length > 0) {
    for (const item of lineItems) {
      lines.push(`- ${item.description}: ${item.quantity} x $${item.rate} = $${item.amount.toFixed(2)}`);
    }
  } else {
    lines.push(`- ${invoice.hours} hours at $${invoice.rate}/hour = $${invoice.subtotal.toFixed(2)}`);
  }
  lines.push('');
  lines.push('## Totals');
  lines.push(`- Subtotal: $${invoice.subtotal.toFixed(2)}`);
  if (invoice.taxAmount > 0) {
    lines.push(`- Tax (${(invoice.taxRate * 100).toFixed(1)}%): $${invoice.taxAmount.toFixed(2)}`);
  }
  lines.push(`- **Total: $${invoice.total.toFixed(2)}**`);
  lines.push('');
  lines.push(`Status: ${invoice.status}`);

  return { title: `Invoice ${invoice.invoiceNumber}`, markdown: lines.join('\n') };
}

export async function exportInvoice(invoiceId: string, format: ExportFormat): Promise<void> {
  const { title, markdown } = await buildInvoiceMarkdown(invoiceId);
  const slug = slugify(title);

  let uri: string;
  if (format === 'markdown') {
    uri = `${FileSystem.cacheDirectory}${slug}.md`;
    await FileSystem.writeAsStringAsync(uri, markdown, { encoding: FileSystem.EncodingType.UTF8 });
  } else if (format === 'pdf') {
    const html = wrapHtmlDocument(title, markdownToHtml(markdown));
    const result = await Print.printToFileAsync({ html, base64: false });
    uri = result.uri;
  } else {
    uri = await writeDocx(markdown, `${slug}.docx`);
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri);
  } else {
    throw new Error('Sharing is not available on this device.');
  }
}
