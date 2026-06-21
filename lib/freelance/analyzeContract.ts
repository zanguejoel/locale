/**
 * Contract field extraction: feed extracted contract text to a constrained
 * LLM pass returning key dates and terms as strict JSON. Same pattern as
 * lib/docs/analyze.ts / lib/freelance/analyzeExpense.ts.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { repairAndParseJsonObject } from '@/lib/llm/jsonRepair';

export interface ParsedContract {
  startDate: string | null;
  endDate: string | null;
  renewalDate: string | null;
  paymentTerms: string | null;
  noticePeriod: string | null;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INPUT_CHARS = 3000;

export async function analyzeContractText(text: string, llm: LlmHandle): Promise<ParsedContract> {
  const truncated = text.slice(0, MAX_INPUT_CHARS);
  const prompt =
    'You are analyzing a business contract/agreement. Respond with ONLY a single ' +
    'JSON object, no prose, no code fence. Use this exact shape:\n' +
    '{\n' +
    '  "startDate": "YYYY-MM-DD" | null,\n' +
    '  "endDate": "YYYY-MM-DD" | null,\n' +
    '  "renewalDate": "YYYY-MM-DD" | null,\n' +
    '  "paymentTerms": string | null,\n' +
    '  "noticePeriod": string | null\n' +
    '}\n' +
    'paymentTerms should be a short phrase (e.g. "Net 30", "50% upfront, 50% on completion"). ' +
    'noticePeriod is how much advance notice is required to terminate/not renew (e.g. "30 days").\n\n' +
    'Contract text:\n' +
    truncated;

  try {
    await llm.generate([{ role: 'user', content: prompt }]);
    const parsed = repairAndParseJsonObject<Partial<ParsedContract>>(llm.response || '');
    if (!parsed) return fallback();

    const normDate = (v: unknown) => (typeof v === 'string' && DATE_RE.test(v) ? v : null);
    return {
      startDate: normDate(parsed.startDate),
      endDate: normDate(parsed.endDate),
      renewalDate: normDate(parsed.renewalDate),
      paymentTerms: typeof parsed.paymentTerms === 'string' && parsed.paymentTerms.trim() ? parsed.paymentTerms.trim() : null,
      noticePeriod: typeof parsed.noticePeriod === 'string' && parsed.noticePeriod.trim() ? parsed.noticePeriod.trim() : null,
    };
  } catch (error) {
    console.error('[Freelancer] Contract analysis failed:', error);
    return fallback();
  }
}

function fallback(): ParsedContract {
  return { startDate: null, endDate: null, renewalDate: null, paymentTerms: null, noticePeriod: null };
}
