/**
 * useLocalModelGlobal - Global initialization hook
 *
 * Initializes the on-device model ONCE at app level (inside ChatProvider)
 * so the same instance is shared everywhere. This is the single source of
 * truth for model readiness, download progress and errors.
 *
 * IMPORTANT: This must only be called in one place (ChatProvider). Calling
 * useLLM in more than one mounted component loads the model into memory
 * multiple times (~1.2GB each) and will crash the app under memory pressure.
 */

import { useLLM } from 'react-native-executorch';
import { Platform } from 'react-native';
import { DEFAULT_LOCAL_MODEL } from '@/constants/LocalModelsConfig';

export interface UseLocalModelGlobalReturn {
  /** Real readiness from ExecuTorch (model downloaded + loaded into memory) */
  isReady: boolean;
  /** Real download progress 0..1 reported by ExecuTorch */
  downloadProgress: number;
  /** Whether the model is actively downloading (progress started, not ready) */
  isDownloading: boolean;
  /** Load/download error, if any */
  error: string | null;
  /** Whether this platform can run on-device models at all */
  isSupported: boolean;
  /** The shared LLM instance */
  llm: ReturnType<typeof useLLM>;
}

export function useLocalModelGlobal(): UseLocalModelGlobalReturn {
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  // Single shared LLM instance for the whole app.
  // preventLoad on unsupported platforms avoids attempting a native load.
  const llm = useLLM({
    model: DEFAULT_LOCAL_MODEL.model,
    preventLoad: !isSupported,
  });

  // Derive everything from the library's real state — no fake timers.
  const isReady = llm.isReady;
  const downloadProgress = llm.downloadProgress;
  const error = llm.error;
  const isDownloading = !isReady && downloadProgress > 0 && downloadProgress < 1;

  return {
    isReady,
    downloadProgress,
    isDownloading,
    error,
    isSupported,
    llm,
  };
}
