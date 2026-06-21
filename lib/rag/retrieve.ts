/**
 * Case-scoped retrieval. Uses cosine similarity over embedded chunks when
 * available, and falls back to simple keyword-overlap scoring for chunks that
 * don't have an embedding yet (or while the embeddings model isn't loaded).
 * Retrieval is always filtered to a single `caseId` — case knowledge never
 * leaks across cases or into normal chat.
 */
import { listChunks } from '@/lib/cases/chunks';
import { embedText, cosineSimilarity } from './embed';

const TOP_K = 4;
const MAX_CONTEXT_CHARS = 2000;

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

/** Top-k relevant chunks for a case, concatenated into a single context string. */
export async function retrieveContext(caseId: string, query: string): Promise<string> {
  const chunks = await listChunks(caseId);
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
