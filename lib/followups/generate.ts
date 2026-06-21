/**
 * Follow-up communication generator. Drafts an email/letter/complaint/status
 * request/information request from the case's accumulated memory (facts,
 * timeline, deadlines) in the requested tone, on-device.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { getCase } from '@/lib/cases/cases';
import { listFacts } from '@/lib/cases/facts';
import { listEvents } from '@/lib/cases/events';
import { listDeadlines } from '@/lib/cases/deadlines';
import { addLetter } from '@/lib/cases/letters';
import { LetterKind, LetterTone, CaseLetter } from '@/lib/cases/types';
import { LEGAL_DISCLAIMER } from '@/lib/navigators/legal';

const KIND_DESCRIPTION: Record<LetterKind, string> = {
  email: 'a short email',
  letter: 'a formal letter',
  complaint: 'a formal complaint',
  status_request: 'a request for a status update',
  information_request: 'a request for information',
};

const TONE_DESCRIPTION: Record<LetterTone, string> = {
  professional: 'professional and courteous',
  neutral: 'neutral and matter-of-fact',
  assertive: 'firm and assertive, while remaining respectful',
};

export async function generateFollowUp(
  caseId: string,
  kind: LetterKind,
  tone: LetterTone,
  llm: LlmHandle
): Promise<CaseLetter> {
  const [legalCase, facts, events, deadlines] = await Promise.all([
    getCase(caseId),
    listFacts(caseId),
    listEvents(caseId),
    listDeadlines(caseId),
  ]);

  const factLines = facts.filter((f) => !f.isAssumption).map((f) => `- ${f.text}`).join('\n') || 'None recorded.';
  const eventLines = events.map((e) => `- ${e.date}: ${e.label}`).join('\n') || 'None recorded.';
  const deadlineLines = deadlines.map((d) => `- ${d.dueDate}: ${d.label}`).join('\n') || 'None recorded.';

  const prompt =
    `Draft ${KIND_DESCRIPTION[kind]} regarding the following case. Tone: ${TONE_DESCRIPTION[tone]}. ` +
    'Write only the communication itself — no preamble, no explanation, no markdown formatting. ' +
    `Do not give legal advice or guarantee outcomes. End with this disclaimer line verbatim: "${LEGAL_DISCLAIMER}"\n\n` +
    `Case: ${legalCase?.title ?? 'Untitled case'}\n` +
    `Category: ${legalCase?.category ?? 'Unknown'}\n` +
    `Jurisdiction: ${legalCase?.jurisdiction ?? 'Unknown'}\n\n` +
    `Known facts:\n${factLines}\n\n` +
    `Timeline:\n${eventLines}\n\n` +
    `Deadlines:\n${deadlineLines}`;

  await llm.generate([{ role: 'user', content: prompt }]);
  const content = (llm.response || '').trim() || 'Unable to generate a draft. Please try again.';

  return addLetter({ caseId, kind, tone, content });
}
