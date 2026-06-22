/**
 * Expense receipt analysis: feed extracted receipt text to a constrained LLM
 * pass returning vendor/amount/date/category as strict JSON. Same pattern as
 * lib/docs/analyze.ts (Procedure Hub's document summary extraction).
 */
import { LlmHandle } from '@/lib/llm/generate';
import { repairAndParseJsonObject } from '@/lib/llm/jsonRepair';
import { EXPENSE_CATEGORIES, ExpenseCategory } from './types';

export interface ParsedExpense {
  vendor: string;
  amount: number;
  date: string | null; // YYYY-MM-DD
  category: ExpenseCategory;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_INPUT_CHARS = 3000;

export async function analyzeExpenseText(text: string, llm: LlmHandle): Promise<ParsedExpense> {
  const truncated = text.slice(0, MAX_INPUT_CHARS);
  const prompt =
    'You are analyzing a business expense receipt or statement line. Respond with ONLY ' +
    'a single JSON object, no prose, no code fence. Use this exact shape:\n' +
    '{\n' +
    '  "vendor": string,\n' +
    '  "amount": number,\n' +
    '  "date": "YYYY-MM-DD" | null,\n' +
    `  "category": one of ${JSON.stringify(EXPENSE_CATEGORIES)}\n` +
    '}\n\nReceipt text:\n' +
    truncated;

  try {
    await llm.generate([{ role: 'user', content: prompt }]);
    const parsed = repairAndParseJsonObject<Partial<ParsedExpense>>(llm.response || '');
    if (!parsed) return fallback();

    return {
      vendor: typeof parsed.vendor === 'string' && parsed.vendor.trim() ? parsed.vendor.trim() : 'Unknown vendor',
      amount: typeof parsed.amount === 'number' ? parsed.amount : 0,
      date: typeof parsed.date === 'string' && DATE_RE.test(parsed.date) ? parsed.date : null,
      category: EXPENSE_CATEGORIES.includes(parsed.category as ExpenseCategory) ? (parsed.category as ExpenseCategory) : 'Other',
    };
  } catch (error) {
    console.error('[Freelancer] Expense analysis failed:', error);
    return fallback();
  }
}

function fallback(): ParsedExpense {
  return { vendor: 'Unknown vendor', amount: 0, date: null, category: 'Other' };
}
