/**
 * Chunks repo — RAG index for a case. Stores text chunks with their embedding
 * (Float32 BLOB). Retrieval is always scoped to a single case_id so case
 * knowledge never leaks across cases or into normal chat.
 */
import { getDb } from './db';
import { newId, now, embeddingToBlob, blobToEmbedding } from './util';
import { CaseChunk, ChunkSourceType } from './types';

interface ChunkRow {
  id: string;
  case_id: string;
  source_type: string;
  source_id: string | null;
  text: string;
  embedding: Uint8Array | null;
  created_at: number;
}

const rowToChunk = (r: ChunkRow): CaseChunk => ({
  id: r.id,
  caseId: r.case_id,
  sourceType: r.source_type as ChunkSourceType,
  sourceId: r.source_id,
  text: r.text,
  embedding: blobToEmbedding(r.embedding),
  createdAt: r.created_at,
});

export async function addChunk(input: {
  caseId: string;
  sourceType: ChunkSourceType;
  sourceId?: string | null;
  text: string;
  /** Omit while the embeddings model isn't loaded yet — retrieval falls back
   * to lexical matching for chunks with no embedding. */
  embedding?: number[];
}): Promise<CaseChunk> {
  const db = await getDb();
  const row: ChunkRow = {
    id: newId(),
    case_id: input.caseId,
    source_type: input.sourceType,
    source_id: input.sourceId ?? null,
    text: input.text,
    embedding: input.embedding ? embeddingToBlob(input.embedding) : null,
    created_at: now(),
  };
  await db.runAsync(
    'INSERT INTO case_chunks (id, case_id, source_type, source_id, text, embedding, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    row.id, row.case_id, row.source_type, row.source_id, row.text, row.embedding, row.created_at
  );
  return rowToChunk(row);
}

/** All chunks for a case (used by the in-JS cosine retriever). */
export async function listChunks(caseId: string): Promise<CaseChunk[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ChunkRow>(
    'SELECT * FROM case_chunks WHERE case_id = ?',
    caseId
  );
  return rows.map(rowToChunk);
}

export async function deleteChunksForSource(caseId: string, sourceId: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM case_chunks WHERE case_id = ? AND source_id = ?', caseId, sourceId);
}
