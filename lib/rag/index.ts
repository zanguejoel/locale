/**
 * Indexing entry point: chunk a piece of case text, embed each chunk
 * (best-effort — null until the embeddings model is loaded), and persist to
 * the case-scoped `case_chunks` table.
 */
import { addChunk, deleteChunksForSource } from '@/lib/cases/chunks';
import { ChunkSourceType } from '@/lib/cases/types';
import { chunkText } from './chunk';
import { embedText } from './embed';

export async function indexCaseText(input: {
  caseId: string;
  sourceType: ChunkSourceType;
  sourceId?: string | null;
  text: string;
}): Promise<void> {
  const pieces = chunkText(input.text);
  for (const piece of pieces) {
    const embedding = await embedText(piece);
    await addChunk({
      caseId: input.caseId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      text: piece,
      embedding: embedding ?? undefined,
    });
  }
}

/** Re-index a source by deleting its old chunks first (e.g. document re-analyzed). */
export async function reindexCaseText(input: {
  caseId: string;
  sourceType: ChunkSourceType;
  sourceId: string;
  text: string;
}): Promise<void> {
  await deleteChunksForSource(input.caseId, input.sourceId);
  await indexCaseText(input);
}
