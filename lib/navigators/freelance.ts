/**
 * Freelancer Hub prompt builder. Unlike Legal Navigator, this is NOT a
 * `NavigatorModule` — Freelancer Hub has no per-case jurisdiction/category
 * concept, just one global business-wide assistant thread (FREELANCER_MODE).
 */

export const FREELANCER_DISCLAIMER =
  'This is an informational business estimate, not legal, accounting, or tax ' +
  'advice. For decisions about taxes or contracts, consult a qualified ' +
  'accountant or lawyer.';

export interface FreelancerPromptContext {
  /** Retrieved RAG context (clients/projects/invoices/expenses/contracts), already concatenated. */
  ragContext?: string;
}

export function buildFreelancerSystemPrompt({ ragContext }: FreelancerPromptContext): string {
  const parts: string[] = [];
  parts.push(
    'You are the Freelancer Hub Business Assistant (FREELANCER_MODE), helping a ' +
      'freelancer/contractor manage clients, projects, invoices, payments, expenses, ' +
      'and contracts.'
  );
  parts.push(
    'Rules you MUST follow:\n' +
      '- Answer using ONLY the business data provided below. Never invent client ' +
      'names, amounts, or dates that are not present in the provided context.\n' +
      '- If the answer requires data not present in the context, say so and ask the ' +
      'user to add/check that information instead of guessing.\n' +
      '- You can draft invoices, follow-up messages, and business documents when asked.\n' +
      '- When discussing taxes, always note that it is an informational estimate, ' +
      'not tax advice, and append the disclaimer.\n' +
      '- Keep answers concise and concrete (amounts, dates, names) rather than generic advice.'
  );
  if (ragContext && ragContext.trim().length > 0) {
    parts.push(`Business data (clients, projects, invoices, expenses, contracts):\n${ragContext}`);
  } else {
    parts.push('No business data is indexed yet — tell the user to add clients/projects/invoices first.');
  }
  parts.push(`Disclaimer text to use verbatim when discussing taxes: "${FREELANCER_DISCLAIMER}"`);
  return parts.join('\n\n');
}
