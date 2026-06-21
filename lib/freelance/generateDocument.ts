/**
 * Generate a business document (proposal/SOW/service agreement/change
 * request) from stored client+project facts, same draft-from-context pattern
 * as lib/followups/generate.ts and lib/freelance/followup.ts.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { Client, Project } from './types';

export type DocumentKind = 'proposal' | 'sow' | 'service_agreement' | 'change_request';

const KIND_DESCRIPTION: Record<DocumentKind, string> = {
  proposal: 'a project proposal',
  sow: 'a statement of work',
  service_agreement: 'a service agreement',
  change_request: 'a change request document',
};

export async function generateBusinessDocument(
  kind: DocumentKind,
  client: Client,
  project: Project | null,
  llm: LlmHandle
): Promise<string> {
  const prompt =
    `Draft ${KIND_DESCRIPTION[kind]}. Write only the document itself — no preamble, ` +
    'no explanation, use clear section headings as plain text lines (no markdown).\n\n' +
    `Client: ${client.name}${client.company ? ` (${client.company})` : ''}\n` +
    (project
      ? `Project: ${project.title}\n` +
        (project.description ? `Description: ${project.description}\n` : '') +
        `Rate: $${project.hourlyRate}/hour${project.budget ? `, budget $${project.budget}` : ''}\n`
      : 'No specific project linked yet — keep scope/terms generic and clearly marked as placeholders.\n');

  await llm.generate([{ role: 'user', content: prompt }]);
  return (llm.response || '').trim() || 'Unable to generate a draft. Please try again.';
}
