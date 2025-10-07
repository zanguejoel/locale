import { useState, useEffect } from 'react';
import { storage } from './useMMKVStorage';
import { DEFAULT_MODEL_ID, getModelById, Model } from '@/constants/Models';

/**
 * Hook to get and manage the default model selection
 * @returns {Model} The currently selected default model
 */
export const useDefaultModel = (): Model => {
  const [model, setModel] = useState<Model>(() => {
    try {
      const storedModelId = storage.getString('default_model_id');
      const modelId = storedModelId || DEFAULT_MODEL_ID;
      
      // Initialize storage with default if not set
      if (!storedModelId) {
        storage.set('default_model_id', DEFAULT_MODEL_ID);
        // console.log('[DefaultModel] Initialized default cloud model:', DEFAULT_MODEL_ID);
      }
      
      return getModelById(modelId) || getModelById(DEFAULT_MODEL_ID)!;
    } catch (error) {
      // console.error('Error reading default model from storage:', error);
      return getModelById(DEFAULT_MODEL_ID)!;
    }
  });

  useEffect(() => {
    // Listen for storage changes
    const listener = storage.addOnValueChangedListener((key) => {
      if (key === 'default_model_id') {
        try {
          const storedModelId = storage.getString('default_model_id');
          if (storedModelId) {
            const newModel = getModelById(storedModelId);
            if (newModel) {
              setModel(newModel);
            }
          }
        } catch (error) {
          // console.error('Error updating default model:', error);
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
 * Helper function to get the default model ID synchronously
 * @returns {string} The default model ID
 */
export const getDefaultModelId = (): string => {
  try {
    const storedModelId = storage.getString('default_model_id');
    return storedModelId || DEFAULT_MODEL_ID;
  } catch (error) {
    // console.error('Error reading default model ID:', error);
    return DEFAULT_MODEL_ID;
  }
};

