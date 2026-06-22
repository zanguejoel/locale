/**
 * Chunks repo — RAG index across all Freelancer Hub entities. Unlike Legal
 * Navigator's per-case `case_chunks`, retrieval here spans every scope type
 * (client/project/invoice/expense/contract/global) since the assistant answers
 * cross-entity business questions ("who still owes me money").
 */
import { getDb } from './db';
import { newId, now, embeddingToBlob, blobToEmbedding } from '@/lib/cases/util';
import { FreelanceChunk, FreelanceChunkScopeType } from './types';

interface ChunkRow {
  id: string;
  scope_type: string;
  scope_id: string | null;
  source_type: string;
  source_id: string | null;
  text: string;
  embedding: Uint8Array | null;
  created_at: number;
}

const rowToChunk = (r: ChunkRow): FreelanceChunk => ({
  id: r.id,
  scopeType: r.scope_type as FreelanceChunkScopeType,
  scopeId: r.scope_id,
  sourceType: r.source_type,
  sourceId: r.source_id,
  text: r.text,
  embedding: blobToEmbedding(r.embedding),
  createdAt: r.created_at,
});

export async function addChunk(input: {
  scopeType: FreelanceChunkScopeType;
  scopeId?: string | null;
  sourceType: string;
  sourceId?: string | null;
  text: string;
  embedding?: number[];
}): Promise<FreelanceChunk> {
  const db = await getDb();
  const row: ChunkRow = {
    id: newId(),
    scope_type: input.scopeType,
    scope_id: input.scopeId ?? null,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    text: input.text,
    embedding: input.embedding ? embeddingToBlob(input.embedding) : null,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO freelance_chunks (id, scope_type, scope_id, source_type, source_id, text, embedding, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    row.id, row.scope_type, row.scope_id, row.source_type, row.source_id, row.text, row.embedding, row.created_at
  );
  return rowToChunk(row);
}

/** All chunks (used by the in-JS cosine retriever, which spans every entity). */
export async function listAllChunks(): Promise<FreelanceChunk[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChunkRow>('SELECT * FROM freelance_chunks');
  return rows.map(rowToChunk);
}

/** Replace any existing chunks for a given entity (re-index on update). */
export async function deleteChunksForScope(scopeType: FreelanceChunkScopeType, scopeId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM freelance_chunks WHERE scope_type = ? AND scope_id = ?', scopeType, scopeId);
}

/**
 * Delete chunks for a single source row. Used when re-indexing a sub-entity
 * (like a time entry) that shares a scope with its parent project — deleting
 * by scope would wipe the project's own summary chunk, so we target the row.
 */
export async function deleteChunksForSource(sourceType: string, sourceId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM freelance_chunks WHERE source_type = ? AND source_id = ?', sourceType, sourceId);
}
