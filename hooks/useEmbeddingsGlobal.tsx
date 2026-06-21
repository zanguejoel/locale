/**
 * useEmbeddingsGlobal - lazy, single-instance on-device text embeddings.
 *
 * Unlike the chat LLM (loaded once for the whole app in ChatProvider), the
 * embeddings model is only needed inside Navigator-module workspaces (Legal
 * Navigator, and future modules), so it's mounted once at the `(legal)`
 * layout level instead — most users never pay the ~90MB download.
 *
 * Mount this in exactly one place per "session" of a Navigator workspace
 * (the route group layout). Mounting it in multiple places simultaneously
 * would load the model into memory more than once.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useTextEmbeddings } from 'react-native-executorch';
import { EMBEDDINGS_MODEL } from '@/constants/LocalModelsConfig';
import { registerEmbeddingsHandle } from '@/lib/rag/embed';

export function useEmbeddingsGlobal() {
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  const embeddings = useTextEmbeddings({
    model: EMBEDDINGS_MODEL,
    preventLoad: !isSupported,
  });

  // Keep the RAG module's shared handle in sync with this instance's
  // lifecycle so lib/rag/embed.ts can embed text without importing the hook.
  useEffect(() => {
    registerEmbeddingsHandle({
      forward: async (text: string) => Array.from(await embeddings.forward(text)),
      isReady: embeddings.isReady,
    });
    return () => registerEmbeddingsHandle(null);
  }, [embeddings.forward, embeddings.isReady]);

  return embeddings;
}
