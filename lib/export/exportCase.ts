/**
 * Export a case to Markdown, PDF, or DOCX and hand it to the OS share sheet
 * (AirDrop, Mail, Files, etc.) — the "Lawyer Handoff" flow.
 */
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { buildCaseExport } from './build';
import { markdownToHtml, wrapHtmlDocument } from './markdownToHtml';
import { writeDocx } from './docxWriter';

export type ExportFormat = 'markdown' | 'pdf' | 'docx';

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'case';
}

export async function exportCase(caseId: string, format: ExportFormat): Promise<void> {
  const { title, markdown } = await buildCaseExport(caseId);
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
