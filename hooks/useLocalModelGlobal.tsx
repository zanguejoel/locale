/**
 * useLocalModelGlobal - Global initialization hook
 * 
 * This hook initializes the local model at app level (not ChatPage level)
 * so the ready state is available immediately in the sidebar.
 */

import { useEffect, useState } from 'react';
import { useLLM } from 'react-native-executorch';
import { Platform } from 'react-native';
import { DEFAULT_LOCAL_MODEL } from '@/constants/LocalModelsConfig';

export function useLocalModelGlobal() {
  const [isReady, setIsReady] = useState(false);
  
  // Initialize LLM at global level
  const llm = useLLM({
    model: DEFAULT_LOCAL_MODEL.model,
  });
  
  // Check when ready
  useEffect(() => {
    console.log('[useLocalModelGlobal] Initializing global local model...');
    
    const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';
    
    if (isSupported) {
      const timer = setTimeout(() => {
        console.log('[useLocalModelGlobal] ✅ Model ready, setting global state');
        setIsReady(true);
      }, 1000); // Slightly longer delay for safety
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  // Log when ready state changes
  useEffect(() => {
    console.log('[useLocalModelGlobal] Ready state changed to:', isReady);
  }, [isReady]);
  
  return {
    isReady,
    llm, // Can be used by ChatPage if needed
  };
}

