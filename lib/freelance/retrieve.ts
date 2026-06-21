/**
 * Cross-entity retrieval for Freelancer Hub. Unlike Legal Navigator's
 * per-case `retrieveContext`, this spans every scope type (clients, projects,
 * invoices, expenses, contracts) since the assistant answers business-wide
 * questions. Same cosine/lexical-fallback approach as `lib/rag/retrieve.ts`.
 */
import { listAllChunks } from './chunks';
import { embedText, cosineSimilarity } from '@/lib/rag/embed';

const TOP_K = 8;
const MAX_CONTEXT_CHARS = 3000;

function lexicalScore(query: string, text: string): number {
  const queryTerms = query.toLowerCase().split(/\W+/).filter((t) => t.length > 2);
  if (queryTerms.length === 0) return 0;
  const lowerText = text.toLowerCase();
  let hits = 0;
  for (const term of queryTerms) {
    if (lowerText.includes(term)) hits++;
  }
  return hits / queryTerms.length;
}

export async function retrieveFreelanceContext(query: string): Promise<string> {
  const chunks = await listAllChunks();
  if (chunks.length === 0) return '';

  const queryEmbedding = await embedText(query);

  const scored = chunks.map((chunk) => {
    const score = queryEmbedding && chunk.embedding
      ? cosineSimilarity(queryEmbedding, chunk.embedding)
      : lexicalScore(query, chunk.text);
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.filter((s) => s.score > 0).slice(0, TOP_K);

  let context = '';
  for (const { chunk } of top) {
    if (context.length + chunk.text.length > MAX_CONTEXT_CHARS) break;
    context += (context ? '\n---\n' : '') + chunk.text;
  }
  return context;
}
