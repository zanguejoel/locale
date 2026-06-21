/**
 * Structured extraction: after each case chat exchange, run a constrained
 * second LLM pass that returns strict JSON (jurisdiction, parties, dates,
 * agencies, facts, assumptions, deadlines, missing_info) and apply it to the
 * case repos. The on-device model is small, so this uses a tight prompt
 * (see NavigatorModule.buildExtractionPrompt) plus a JSON-repair fallback
 * rather than relying on long reasoning.
 */
import { LlmHandle } from '@/lib/llm/generate';
import { repairAndParseJsonObject } from '@/lib/llm/jsonRepair';
import { getCase, updateCase } from './cases';
import { addFact } from './facts';
import { addEvent } from './events';
import { addDeadline } from './deadlines';
import { DeadlineKind } from './types';
import { legalModule } from '@/lib/navigators/legal';

interface RawExtractionResult {
  jurisdiction?: unknown;
  parties?: unknown;
  dates?: unknown;
  agencies?: unknown;
  facts?: unknown;
  assumptions?: unknown;
  deadlines?: unknown;
  missing_info?: unknown;
}

interface ExtractionResult {
  jurisdiction: string | null;
  parties: string[];
  dates: { date: string; label: string }[];
  agencies: string[];
  facts: string[];
  assumptions: string[];
  deadlines: { date: string; label: string; kind: string }[];
  missing_info: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_DEADLINE_KINDS: DeadlineKind[] = ['hearing', 'filing', 'response', 'appeal', 'other'];

/** Validate + coerce the repaired JSON into the strict shape we trust to write to the DB. */
function sanitizeExtraction(parsed: RawExtractionResult): ExtractionResult {
  return {
    jurisdiction: typeof parsed.jurisdiction === 'string' ? parsed.jurisdiction : null,
    parties: Array.isArray(parsed.parties) ? parsed.parties.filter((p: unknown) => typeof p === 'string') : [],
    dates: Array.isArray(parsed.dates)
      ? parsed.dates.filter((d: any) => d && typeof d.label === 'string' && DATE_RE.test(d.date))
      : [],
    agencies: Array.isArray(parsed.agencies) ? parsed.agencies.filter((a: unknown) => typeof a === 'string') : [],
    facts: Array.isArray(parsed.facts) ? parsed.facts.filter((f: unknown) => typeof f === 'string') : [],
    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions.filter((a: unknown) => typeof a === 'string') : [],
    deadlines: Array.isArray(parsed.deadlines)
      ? parsed.deadlines.filter((d: any) => d && typeof d.label === 'string' && DATE_RE.test(d.date))
      : [],
    missing_info: Array.isArray(parsed.missing_info) ? parsed.missing_info.filter((m: unknown) => typeof m === 'string') : [],
  };
}

/**
 * Run the extraction pass for an exchange and write results into the case's
 * facts/timeline/deadlines. Failures are swallowed (logged) — extraction is a
 * best-effort enrichment, never something that should break the chat.
 */
export async function extractAndApply(
  caseId: string,
  exchange: string,
  llm: LlmHandle
): Promise<void> {
  try {
    const prompt = legalModule.buildExtractionPrompt({ exchange });
    await llm.generate([{ role: 'user', content: prompt }]);
    const raw = llm.response || '';
    const parsed = repairAndParseJsonObject<RawExtractionResult>(raw);
    if (!parsed) {
      console.warn('[Legal] Extraction returned unparseable JSON, skipping.');
      return;
    }
    const result = sanitizeExtraction(parsed);

    if (result.jurisdiction) {
      const current = await getCase(caseId);
      if (current && !current.jurisdiction) {
        await updateCase(caseId, { jurisdiction: result.jurisdiction });
      }
    }

    for (const fact of result.facts) {
      await addFact({ caseId, text: fact, isAssumption: false });
    }
    for (const assumption of result.assumptions) {
      await addFact({ caseId, text: assumption, isAssumption: true });
    }
    for (const d of result.dates) {
      await addEvent({ caseId, date: d.date, label: d.label, source: 'chat' });
    }
    for (const d of result.deadlines) {
      const kind = VALID_DEADLINE_KINDS.includes(d.kind as DeadlineKind) ? (d.kind as DeadlineKind) : 'other';
      await addDeadline({ caseId, dueDate: d.date, label: d.label, kind });
    }
  } catch (error) {
    console.error('[Legal] Structured extraction failed:', error);
  }
}
