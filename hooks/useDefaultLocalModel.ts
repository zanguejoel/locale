import { useState, useEffect } from 'react';
import { storage } from './useMMKVStorage';
import { DEFAULT_LOCAL_MODEL_ID, getLocalModelById, LocalModel, getRecommendedLocalModel } from '@/constants/LocalModels';

/**
 * Hook to get and manage the default local model selection
 * @returns {LocalModel} The currently selected default local model
 */
export const useDefaultLocalModel = (): LocalModel => {
  const [model, setModel] = useState<LocalModel>(() => {
    try {
      const storedModelId = storage.getString('default_local_model_id');
      if (storedModelId) {
        const storedModel = getLocalModelById(storedModelId);
        if (storedModel && storedModel.modelSource) {
          // Validate that the model has a valid modelSource
          console.log('[DefaultLocalModel] Loaded stored model:', storedModel.id);
          return storedModel;
        } else {
          console.warn('[DefaultLocalModel] Stored model has no modelSource, falling back:', storedModelId);
        }
      }
      
      // Initialize storage with default if not set
      if (!storedModelId) {
        storage.set('default_local_model_id', DEFAULT_LOCAL_MODEL_ID);
        console.log('[DefaultLocalModel] Initialized default local model:', DEFAULT_LOCAL_MODEL_ID);
      }
      
      // Fall back to default or recommended model
      const defaultModel = getLocalModelById(DEFAULT_LOCAL_MODEL_ID);
      if (defaultModel && defaultModel.modelSource) {
        console.log('[DefaultLocalModel] Using default model:', defaultModel.id);
        return defaultModel;
      }
      
      // Last resort: get recommended model
      const recommendedModel = getRecommendedLocalModel();
      console.log('[DefaultLocalModel] Using recommended model:', recommendedModel.id);
      return recommendedModel;
    } catch (error) {
      console.error('[DefaultLocalModel] Error reading from storage:', error);
      // Emergency fallback: ensure we always return a valid model
      const fallbackModel = getLocalModelById(DEFAULT_LOCAL_MODEL_ID) || getRecommendedLocalModel();
      console.log('[DefaultLocalModel] Emergency fallback to:', fallbackModel.id);
      return fallbackModel;
    }
  });

  useEffect(() => {
    // Listen for storage changes
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === 'default_local_model_id') {
        try {
          const storedModelId = storage.getString('default_local_model_id');
          if (storedModelId) {
            const newModel = getLocalModelById(storedModelId);
            if (newModel && newModel.modelSource) {
              console.log('[DefaultLocalModel] Model changed to:', newModel.displayName);
              setModel(newModel);
            } else {
              console.warn('[DefaultLocalModel] Invalid model on change, keeping current:', storedModelId);
              // Keep the current model if the new one is invalid
            }
          }
        } catch (error) {
          console.error('[DefaultLocalModel] Error updating model:', error);
        }
      }
    });

    return () => {
      listener.remove();
    };
  }, []);

  return model;
};

/**
 * Helper function to get the default local model ID synchronously
 * @returns {string} The default local model ID
 */
export const getDefaultLocalModelId = (): string => {
  try {
    const storedModelId = storage.getString('default_local_model_id');
    return storedModelId || DEFAULT_LOCAL_MODEL_ID;
  } catch (error) {
    // console.error('Error reading default local model ID:', error);
    return DEFAULT_LOCAL_MODEL_ID;
  }
};

