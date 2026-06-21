/**
 * Minimal Markdown→HTML for the subset our case export actually produces
 * (h1/h2 headings, bold, list items, italics, hr, plain paragraphs). Not a
 * general-purpose renderer — just enough to print the export nicely.
 */
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(s: string): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/_(.+?)_/g, '<em>$1</em>');
  return out;
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split('\n');
  const html: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) { html.push('</ul>'); inList = false; }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') { closeList(); continue; }
    if (trimmed === '---') { closeList(); html.push('<hr/>'); continue; }
    if (trimmed.startsWith('# ')) { closeList(); html.push(`<h1>${inline(trimmed.slice(2))}</h1>`); continue; }
    if (trimmed.startsWith('## ')) { closeList(); html.push(`<h2>${inline(trimmed.slice(3))}</h2>`); continue; }
    if (trimmed.startsWith('- ')) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${inline(trimmed.slice(2))}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${inline(trimmed)}</p>`);
  }
  closeList();
  return html.join('\n');
}

export function wrapHtmlDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  h2 { font-size: 16px; margin-top: 20px; color: #334155; }
  li { margin-bottom: 4px; }
  hr { border: none; border-top: 1px solid #e2e8f0; margin: 24px 0; }
  em { color: #64748b; }
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
}
