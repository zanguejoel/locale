import { LOCAL_MODELS, LocalModelConfig, DEFAULT_LOCAL_MODEL } from '@/constants/LocalModelsConfig';
import { storage } from './useMMKVStorage';

export const DEFAULT_MODEL_ID = DEFAULT_LOCAL_MODEL.id;

/**
 * Returns the currently selected local model config synchronously.
 */
export const getDefaultModelId = (): string => {
  try {
    return storage.getString('default_local_model_id') || DEFAULT_MODEL_ID;
  } catch {
    return DEFAULT_MODEL_ID;
  }
};

export const getDefaultModel = (): LocalModelConfig => {
  const id = getDefaultModelId();
  return LOCAL_MODELS.find(m => m.id === id) ?? DEFAULT_LOCAL_MODEL;
};

/**
 * Hook kept for ChatPage compatibility — returns the active local model.
 */
export const useDefaultModel = (): LocalModelConfig => {
  return getDefaultModel();
};
