/**
 * Assemble a case's exportable content (Case Summary, Timeline, Facts,
 * Evidence List, Documents, Outstanding Issues, Questions) as Markdown — the
 * single source of truth other export formats (PDF, DOCX) render from.
 *
 * "Outstanding Issues" surfaces unconfirmed assumptions (facts the extraction
 * pass flagged as inferred rather than stated) since the app doesn't keep a
 * separate missing-information table.
 */
import { getCase } from '@/lib/cases/cases';
import { listFacts } from '@/lib/cases/facts';
import { listEvents } from '@/lib/cases/events';
import { listDeadlines } from '@/lib/cases/deadlines';
import { listDocuments } from '@/lib/cases/documents';
import { LEGAL_DISCLAIMER } from '@/lib/navigators/legal';

export interface CaseExport {
  title: string;
  markdown: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function buildCaseExport(caseId: string): Promise<CaseExport> {
  const [legalCase, facts, events, deadlines, documents] = await Promise.all([
    getCase(caseId),
    listFacts(caseId),
    listEvents(caseId),
    listDeadlines(caseId),
    listDocuments(caseId),
  ]);

  const title = legalCase?.title ?? 'Case';
  const lines: string[] = [];

  lines.push(`# ${title}`);
  lines.push('');
  lines.push(`**Category:** ${legalCase?.category ?? 'Unknown'}`);
  lines.push(`**Jurisdiction:** ${legalCase?.jurisdiction ?? 'Unknown'}`);
  lines.push(`**Status:** ${legalCase?.status ?? 'Open'}`);
  lines.push('');

  lines.push('## Case Summary');
  lines.push('');
  const establishedFacts = facts.filter((f) => !f.isAssumption);
  if (establishedFacts.length > 0) {
    establishedFacts.forEach((f) => lines.push(`- ${f.text}`));
  } else {
    lines.push('_No facts recorded yet._');
  }
  lines.push('');

  lines.push('## Timeline');
  lines.push('');
  if (events.length > 0) {
    events.forEach((e) => lines.push(`- **${formatDate(e.date)}** — ${e.label}`));
  } else {
    lines.push('_No timeline events recorded yet._');
  }
  lines.push('');

  lines.push('## Facts');
  lines.push('');
  if (establishedFacts.length > 0) {
    establishedFacts.forEach((f) => lines.push(`- ${f.text}`));
  } else {
    lines.push('_None recorded._');
  }
  lines.push('');

  lines.push('## Evidence List (Documents)');
  lines.push('');
  if (documents.length > 0) {
    documents.forEach((d) => {
      const summary = d.summaryJson ? JSON.parse(d.summaryJson) : null;
      lines.push(`- **${d.name}** (${d.type.toUpperCase()})${summary ? ` — ${summary.documentType}` : ''}`);
    });
  } else {
    lines.push('_No documents attached._');
  }
  lines.push('');

  lines.push('## Deadlines');
  lines.push('');
  if (deadlines.length > 0) {
    deadlines.forEach((d) => lines.push(`- **${formatDate(d.dueDate)}** — ${d.label} (${d.kind})`));
  } else {
    lines.push('_No deadlines recorded._');
  }
  lines.push('');

  lines.push('## Outstanding Issues / Questions');
  lines.push('');
  const assumptions = facts.filter((f) => f.isAssumption);
  if (assumptions.length > 0) {
    lines.push('Unconfirmed assumptions that should be verified:');
    assumptions.forEach((a) => lines.push(`- ${a.text}`));
  } else {
    lines.push('_None recorded._');
  }
  lines.push('');

  lines.push('---');
  lines.push('');
  lines.push(`_${LEGAL_DISCLAIMER}_`);

  return { title, markdown: lines.join('\n') };
}
