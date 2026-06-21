/**
 * Shared helpers for the case repos: id generation and embedding (de)serialization.
 */
import * as Crypto from 'expo-crypto';

/** Generate a random UUID for new rows. */
export function newId(): string {
  return Crypto.randomUUID();
}

/** Current epoch milliseconds — the unit all `*_at` columns use. */
export function now(): number {
  return Date.now();
}

/**
 * Serialize an embedding vector to a Float32 byte buffer for BLOB storage.
 * Returns a Uint8Array, which expo-sqlite binds as a BLOB.
 */
export function embeddingToBlob(vector: number[]): Uint8Array {
  const floats = Float32Array.from(vector);
  return new Uint8Array(floats.buffer);
}

/** Hydrate a BLOB (Uint8Array) back into an embedding vector. */
export function blobToEmbedding(blob: Uint8Array | null): number[] | null {
  if (!blob) return null;
  // Ensure the byte buffer is aligned/copied before viewing as Float32.
  const copy = new Uint8Array(blob);
  const floats = new Float32Array(copy.buffer, copy.byteOffset, Math.floor(copy.byteLength / 4));
  return Array.from(floats);
}
