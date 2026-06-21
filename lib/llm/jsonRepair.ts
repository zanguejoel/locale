/**
 * Best-effort JSON extraction from a small on-device model's raw text output.
 * Strips code fences / leading-trailing prose the model sometimes adds, then
 * locates the outermost {...} block and parses it. Returns null on failure
 * so callers can skip the enrichment rather than crash.
 */
export function repairAndParseJsonObject<T = Record<string, unknown>>(raw: string): T | null {
  let text = raw.trim();
  text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
  text = text.slice(firstBrace, lastBrace + 1);

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
