/**
 * Parse a natural-language invoice request ("Generate an invoice for National
 * Bank for 160 hours at $25/hour") into structured fields, same constrained-
 * JSON + repair pattern as lib/docs/analyze.ts / lib/cases/extract.ts.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { repairAndParseJsonObject } from '@/lib/llm/jsonRepair';

export interface ParsedInvoiceRequest {
  clientName: string | null;
  hours: number | null;
  rate: number | null;
}

export async function parseInvoiceRequest(text: string, llm: LlmHandle): Promise<ParsedInvoiceRequest> {
  const prompt =
    'Extract invoice fields from the request below. Respond with ONLY a single ' +
    'JSON object, no prose, no code fence. Use this exact shape:\n' +
    '{\n' +
    '  "clientName": string | null,\n' +
    '  "hours": number | null,\n' +
    '  "rate": number | null\n' +
    '}\n' +
    'rate is the dollar amount per hour (no currency symbol). Use null for any field ' +
    'not mentioned.\n\nRequest:\n' +
    text;

  try {
    await llm.generate([{ role: 'user', content: prompt }]);
    const parsed = repairAndParseJsonObject<Partial<ParsedInvoiceRequest>>(llm.response || '');
    if (!parsed) return { clientName: null, hours: null, rate: null };
    return {
      clientName: typeof parsed.clientName === 'string' && parsed.clientName.trim() ? parsed.clientName.trim() : null,
      hours: typeof parsed.hours === 'number' ? parsed.hours : null,
      rate: typeof parsed.rate === 'number' ? parsed.rate : null,
    };
  } catch (error) {
    console.error('[Freelancer] Invoice request parsing failed:', error);
    return { clientName: null, hours: null, rate: null };
  }
}
