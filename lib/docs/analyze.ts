/**
 * Document analysis: feed extracted document text to a constrained LLM pass
 * that returns the Document Summary fields (type, important date, required
 * action, risk level) as strict JSON.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { repairAndParseJsonObject } from '@/lib/llm/jsonRepair';
import { RiskLevel } from '@/lib/cases/types';

export interface DocumentSummary {
  documentType: string;
  importantDate: string | null; // YYYY-MM-DD
  requiredAction: string | null;
  risk: RiskLevel;
}

const RISK_LEVELS: RiskLevel[] = ['Low', 'Medium', 'High', 'Unknown'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Cap the text fed to the model — the on-device 1B model has a small context
// window and document text (especially OCR output) can be long.
const MAX_INPUT_CHARS = 3000;

export async function analyzeDocumentText(text: string, llm: LlmHandle): Promise<DocumentSummary> {
  const truncated = text.slice(0, MAX_INPUT_CHARS);
  const prompt =
    'You are analyzing a legal/administrative document. Respond with ONLY a single ' +
    'JSON object, no prose, no code fence. Use this exact shape:\n' +
    '{\n' +
    '  "documentType": string,\n' +
    '  "importantDate": "YYYY-MM-DD" | null,\n' +
    '  "requiredAction": string | null,\n' +
    '  "risk": "Low" | "Medium" | "High" | "Unknown"\n' +
    '}\n' +
    'documentType should be a short label (e.g. "Notice of Hearing", "Lease Agreement", ' +
    '"Demand Letter"). risk reflects how urgent/consequential missing the document\'s ' +
    'action would be.\n\nDocument text:\n' +
    truncated;

  try {
    await llm.generate([{ role: 'user', content: prompt }]);
    const parsed = repairAndParseJsonObject<Partial<DocumentSummary>>(llm.response || '');
    if (!parsed) return fallbackSummary();

    return {
      documentType: typeof parsed.documentType === 'string' && parsed.documentType.trim()
        ? parsed.documentType.trim()
        : 'Document',
      importantDate: typeof parsed.importantDate === 'string' && DATE_RE.test(parsed.importantDate)
        ? parsed.importantDate
        : null,
      requiredAction: typeof parsed.requiredAction === 'string' && parsed.requiredAction.trim()
        ? parsed.requiredAction.trim()
        : null,
      risk: RISK_LEVELS.includes(parsed.risk as RiskLevel) ? (parsed.risk as RiskLevel) : 'Unknown',
    };
  } catch (error) {
    console.error('[Docs] Document analysis failed:', error);
    return fallbackSummary();
  }
}

function fallbackSummary(): DocumentSummary {
  return { documentType: 'Document', importantDate: null, requiredAction: null, risk: 'Unknown' };
}
