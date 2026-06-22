/**
 * Parse a natural-language time log ("I spent 3 hours on the bank dashboard
 * yesterday afternoon") into structured fields. Same constrained-JSON + repair
 * pattern as parseInvoiceRequest.ts / lib/docs/analyze.ts.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { repairAndParseJsonObject } from '@/lib/llm/jsonRepair';

export interface ParsedTimeEntry {
  projectName: string | null;
  description: string | null;
  hours: number | null;
  /** ISO date (YYYY-MM-DD) the work happened, if stated. */
  date: string | null;
}

export async function parseTimeEntry(text: string, llm: LlmHandle, today = new Date()): Promise<ParsedTimeEntry> {
  const todayIso = today.toISOString().slice(0, 10);
  const prompt =
    'Extract a time-tracking entry from the text below. Respond with ONLY a ' +
    'single JSON object, no prose, no code fence. Use this exact shape:\n' +
    '{\n' +
    '  "projectName": string | null,\n' +
    '  "description": string | null,\n' +
    '  "hours": number | null,\n' +
    '  "date": string | null\n' +
    '}\n' +
    `Today is ${todayIso}. Resolve relative dates ("yesterday", "last Monday") ` +
    'to an absolute YYYY-MM-DD. hours is the decimal duration worked (e.g. 1.5). ' +
    '"description" is a short, clean summary of the work. Use null for anything ' +
    'not stated.\n\nText:\n' +
    text;

  try {
    await llm.generate([{ role: 'user', content: prompt }]);
    const parsed = repairAndParseJsonObject<Partial<ParsedTimeEntry>>(llm.response || '');
    if (!parsed) return { projectName: null, description: null, hours: null, date: null };
    const date = typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : null;
    return {
      projectName: typeof parsed.projectName === 'string' && parsed.projectName.trim() ? parsed.projectName.trim() : null,
      description: typeof parsed.description === 'string' && parsed.description.trim() ? parsed.description.trim() : null,
      hours: typeof parsed.hours === 'number' && parsed.hours > 0 ? parsed.hours : null,
      date,
    };
  } catch (error) {
    console.error('[Freelancer] Time entry parsing failed:', error);
    return { projectName: null, description: null, hours: null, date: null };
  }
}
