/**
 * Simple text chunker for RAG indexing. Splits on paragraph/sentence
 * boundaries with a target size and slight overlap so a single fact doesn't
 * get split across chunk boundaries too aggressively.
 */
const TARGET_CHARS = 800; // ~roughly 500 tokens
const OVERLAP_CHARS = 120;

export function chunkText(text: string): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= TARGET_CHARS) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + TARGET_CHARS, clean.length);
    chunks.push(clean.slice(start, end).trim());
    if (end >= clean.length) break;
    start = end - OVERLAP_CHARS;
  }
  return chunks.filter((c) => c.length > 0);
}
