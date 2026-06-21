/**
 * Minimal DOCX writer. There's no maintained "write a .docx" library that's
 * React Native-safe (mammoth only *reads* DOCX), so this builds the smallest
 * valid OOXML package by hand with JSZip: paragraphs and h1/h2 headings only
 * — enough to faithfully carry the case export's structure into Word/Google
 * Docs, without rich formatting like tables or nested lists.
 */
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';

interface DocLine {
  type: 'h1' | 'h2' | 'p' | 'li' | 'hr';
  text: string;
}

function parseMarkdownLines(markdown: string): DocLine[] {
  const lines: DocLine[] = [];
  for (const raw of markdown.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line === '---') { lines.push({ type: 'hr', text: '' }); continue; }
    if (line.startsWith('# ')) { lines.push({ type: 'h1', text: line.slice(2) }); continue; }
    if (line.startsWith('## ')) { lines.push({ type: 'h2', text: line.slice(3) }); continue; }
    if (line.startsWith('- ')) { lines.push({ type: 'li', text: line.slice(2) }); continue; }
    lines.push({ type: 'p', text: line });
  }
  return lines;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\*\*/g, '') // strip markdown bold/italic markers — plain text only
    .replace(/_/g, '');
}

function paragraphXml(line: DocLine): string {
  if (line.type === 'hr') {
    return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="auto"/></w:pBdr></w:pPr></w:p>';
  }
  const text = escapeXml(line.text);
  const runProps = line.type === 'h1'
    ? '<w:rPr><w:b/><w:sz w:val="32"/></w:rPr>'
    : line.type === 'h2'
      ? '<w:rPr><w:b/><w:sz w:val="26"/></w:rPr>'
      : '';
  const bullet = line.type === 'li' ? '• ' : '';
  return `<w:p><w:r>${runProps}<w:t xml:space="preserve">${bullet}${text}</w:t></w:r></w:p>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>`;

function documentXml(markdown: string): string {
  const body = parseMarkdownLines(markdown).map(paragraphXml).join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}</w:body>
</w:document>`;
}

/** Write the markdown content as a .docx file and return its file:// uri. */
export async function writeDocx(markdown: string, fileName: string): Promise<string> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.folder('_rels')!.file('.rels', ROOT_RELS);
  const word = zip.folder('word')!;
  word.file('document.xml', documentXml(markdown));
  word.folder('_rels')!.file('document.xml.rels', DOC_RELS);

  const base64 = await zip.generateAsync({ type: 'base64' });
  const uri = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });
  return uri;
}
