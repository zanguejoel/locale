/**
 * Procedure Hub module definition.
 *
 * Informational only — never legal advice. The prompts enforce the behavioral
 * rules (ask clarifying questions, identify jurisdiction, separate facts from
 * assumptions, never guarantee outcomes, always disclaim) and the fixed answer
 * format. Extraction prompt returns strict JSON for case-memory updates.
 */
import { NavigatorModule } from './types';

export const LEGAL_DISCLAIMER =
  'This is general legal information, not legal advice. I am not a lawyer. ' +
  'Laws vary by jurisdiction and change over time. For advice on your specific ' +
  'situation, consult a qualified lawyer or licensed professional.';

export const LEGAL_CATEGORIES = [
  'Housing',
  'Employment',
  'Family',
  'Consumer',
  'Immigration',
  'Benefits & Government',
  'Small Claims',
  'Business',
  'Other',
];

export const legalModule: NavigatorModule = {
  id: 'legal',
  title: 'Procedure Hub',
  icon: 'briefcase-outline',
  route: '/(legal)',
  systemMode: 'PROCEDURE_HUB_MODE',
  categories: LEGAL_CATEGORIES,
  followUpTypes: ['email', 'letter', 'complaint', 'status_request', 'information_request'],
  tones: ['professional', 'neutral', 'assertive'],
  disclaimer: LEGAL_DISCLAIMER,

  buildSystemPrompt: ({ jurisdiction, category, ragContext }) => {
    const parts: string[] = [];
    parts.push(
      'You are Procedure Hub, an informational assistant that helps people ' +
        'understand legal and administrative procedures. You are NOT a lawyer and ' +
        'you do NOT give legal advice.'
    );
    parts.push(
      'Rules you MUST follow:\n' +
        '- Focus on legal procedures and administrative processes.\n' +
        '- Ask clarifying questions before giving guidance when key facts are missing.\n' +
        '- If the jurisdiction (country/state/province) is unknown, ask for it.\n' +
        '- Clearly distinguish established facts from assumptions.\n' +
        '- Never guarantee outcomes.\n' +
        '- Never provide legal advice or tell the user what they "should" legally do.\n' +
        '- Always end your answer with the disclaimer.'
    );
    if (category) parts.push(`Case category: ${category}.`);
    parts.push(`Known jurisdiction: ${jurisdiction || 'Unknown — ask the user.'}`);
    if (ragContext && ragContext.trim().length > 0) {
      parts.push(`Relevant case context (documents and prior notes):\n${ragContext}`);
    }
    parts.push(
      'Format every substantive answer with these sections, omitting any that ' +
        'do not apply:\n' +
        'Summary\nRelevant Procedure\nRequired Documents\nPotential Deadlines\n' +
        'Recommended Next Steps\nQuestions Needed\nDisclaimer'
    );
    parts.push(`Disclaimer text to use verbatim: "${LEGAL_DISCLAIMER}"`);
    return parts.join('\n\n');
  },

  buildExtractionPrompt: ({ exchange }) =>
    'Extract structured case data from the conversation exchange below. ' +
    'Respond with ONLY a single JSON object, no prose, no code fence. Use this exact shape:\n' +
    '{\n' +
    '  "jurisdiction": string | null,\n' +
    '  "parties": string[],\n' +
    '  "dates": [{ "date": "YYYY-MM-DD", "label": string }],\n' +
    '  "agencies": string[],\n' +
    '  "facts": string[],\n' +
    '  "assumptions": string[],\n' +
    '  "deadlines": [{ "date": "YYYY-MM-DD", "label": string, "kind": "hearing|filing|response|appeal|other" }],\n' +
    '  "missing_info": string[]\n' +
    '}\n' +
    'Only include items explicitly supported by the text. Use null/empty arrays when unknown. ' +
    'Normalize all dates to YYYY-MM-DD.\n\n' +
    'Exchange:\n' +
    exchange,
};
