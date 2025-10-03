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
        if (storedModel) {
          return storedModel;
        }
      }
      
      // Initialize storage with default if not set
      if (!storedModelId) {
        storage.set('default_local_model_id', DEFAULT_LOCAL_MODEL_ID);
        console.log('[DefaultLocalModel] Initialized default local model:', DEFAULT_LOCAL_MODEL_ID);
      }
      
      // Fall back to recommended or default model
      return getLocalModelById(DEFAULT_LOCAL_MODEL_ID) || getRecommendedLocalModel();
    } catch (error) {
      console.error('Error reading default local model from storage:', error);
      return getLocalModelById(DEFAULT_LOCAL_MODEL_ID) || getRecommendedLocalModel();
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
            if (newModel) {
              console.log('[DefaultLocalModel] Model changed to:', newModel.displayName);
              setModel(newModel);
            }
          }
        } catch (error) {
          console.error('Error updating default local model:', error);
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
    console.error('Error reading default local model ID:', error);
    return DEFAULT_LOCAL_MODEL_ID;
  }
};

