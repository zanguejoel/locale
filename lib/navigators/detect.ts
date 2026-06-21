/**
 * Lightweight, keyword-based potential-case detection for normal chat.
 *
 * Deliberately heuristic rather than an LLM call: running the on-device model
 * a second time on every single message would noticeably slow down normal
 * chat. This only flags an opt-in suggestion card — false positives are low
 * cost (the user just ignores it), so a fast regex pass is the right
 * trade-off here.
 */
import { LEGAL_CATEGORIES } from './legal';

interface CategoryRule {
  category: string;
  keywords: RegExp;
}

const RULES: CategoryRule[] = [
  { category: 'Housing', keywords: /\b(landlord|tenant|eviction|security deposit|lease|rent)\b/i },
  { category: 'Employment', keywords: /\b(fired|wrongful termination|unpaid wages|workplace harassment|laid off|severance)\b/i },
  { category: 'Family', keywords: /\b(divorce|custody|child support|alimony|restraining order)\b/i },
  { category: 'Consumer', keywords: /\b(refund|warranty|scam(med)?|chargeback|defective product)\b/i },
  { category: 'Immigration', keywords: /\b(visa|deportation|green card|asylum|immigration status)\b/i },
  { category: 'Benefits & Government', keywords: /\b(unemployment benefits|disability benefits|denied claim|social security)\b/i },
  { category: 'Small Claims', keywords: /\b(small claims|sue|lawsuit|breach of contract)\b/i },
];

export interface DetectedCase {
  category: string;
  /** A short suggested case title derived from the message. */
  title: string;
}

function suggestTitle(message: string, category: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 60) return trimmed;
  return `${category} matter`;
}

export function detectPotentialCase(message: string): DetectedCase | null {
  for (const rule of RULES) {
    if (rule.keywords.test(message)) {
      return { category: rule.category, title: suggestTitle(message, rule.category) };
    }
  }
  return null;
}

export { LEGAL_CATEGORIES };
