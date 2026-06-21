/**
 * Generic markdown→file→share helper, factored out of the duplicated
 * markdown/PDF/DOCX/share logic in exportCase.ts and exportInvoice.ts so new
 * one-off exports (Reports, Taxes) don't need their own copy.
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { markdownToHtml, wrapHtmlDocument } from './markdownToHtml';
import { writeDocx } from './docxWriter';

export type ExportFormat = 'markdown' | 'pdf' | 'docx';

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'export';
}

export async function shareMarkdownDocument(title: string, markdown: string, format: ExportFormat): Promise<void> {
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
