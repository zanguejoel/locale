/**
 * On-device text embeddings, shared across the app the same way the LLM is —
 * loaded once. Until the embeddings model is registered/loaded (step: RAG
 * pipeline), `embedText` resolves to `null` and callers fall back to lexical
 * retrieval (see lib/rag/retrieve.ts).
 *
 * This indirection lets the chat send path call `embedText` unconditionally
 * today and start getting real vectors the moment the model is wired in,
 * with no call-site changes.
 */
export interface EmbeddingsHandle {
  forward: (text: string) => Promise<number[]>;
  isReady: boolean;
}

let handle: EmbeddingsHandle | null = null;

/** Called once the embeddings model hook is mounted (see useTextEmbeddingsGlobal). */
export function registerEmbeddingsHandle(h: EmbeddingsHandle | null): void {
  handle = h;
}

export async function embedText(text: string): Promise<number[] | null> {
  if (!handle || !handle.isReady) return null;
  try {
    return await handle.forward(text);
  } catch (error) {
    console.error('[RAG] Embedding failed, falling back to lexical:', error);
    return null;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
