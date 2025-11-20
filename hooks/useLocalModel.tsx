/**
 * useLocalModel Hook - ExecuTorch Integration
 * 
 * This hook manages local on-device AI using Meta's ExecuTorch framework
 * via react-native-executorch library by Software Mansion.
 * 
 * Features:
 * - On-device LLM inference (Llama 3.2 models)
 * - Real-time streaming responses
 * - Interrupt/cancel generation
 * - Automatic context management
 * - Safe cleanup on unmount
 * - No network required
 * 
 * Documentation: https://docs.swmansion.com/react-native-executorch/
 * 
 * IMPORTANT: Must call interrupt() before unmounting component during generation
 * to prevent crashes. See: https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useLLM#interrupting-the-model
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { 
  useLLM, 
  Message as ExecuTorchMessage,
} from 'react-native-executorch';
import { Platform } from 'react-native';
import { 
  DEFAULT_LOCAL_MODEL,
  LOCAL_MODEL_LIMITS,
} from '@/constants/LocalModelsConfig';

// ============================================================
// Types & Interfaces
// ============================================================

/**
 * Message format from your app
 * (Flexible to match various Message interfaces)
 */
export interface AppMessage {
  id?: string;
  chat_id?: string;
  role: any; // Flexible role type
  text?: string;
  content?: string;
  timestamp?: number | Date | string;
  [key: string]: any;
}

/**
 * Options for initializing the local model hook
 */
export interface UseLocalModelOptions {
  /** Current conversation ID for context tracking */
  currentConversationId: string | null;
  
  /** Callback when stream updates (new tokens arrive) */
  onStreamUpdate: (text: string) => void;
  
  /** Callback when sending state changes */
  onSendingUpdate: (isSending: boolean) => void;
  
  /** Messages for conversation context */
  messages: AppMessage[];
  
  /** Optional: Custom model ID to use */
  modelId?: string;
  
  /** Optional: Callback to update global ready state */
  onReadyStateChange?: (ready: boolean) => void;
  
  /** Optional: Callback to update global generating state */
  onGeneratingStateChange?: (generating: boolean) => void;
}

/**
 * Return interface for the hook
 */
export interface UseLocalModelReturn {
  /** Whether local mode is enabled */
  isLocal: boolean;
  
  /** Toggle local mode on/off */
  setIsLocal: (value: boolean) => void;
  
  /** Whether local model is ready for inference */
  isLocalModelReady: boolean;
  
  /** Whether model is currently generating */
  isLocalModelGenerating: boolean;
  
  /** Whether component can safely unmount */
  canSafelyUnmount: boolean;
  
  /** Send a message to the local model */
  handleSendLocalMessage: (text: string) => Promise<void>;
  
  /** Manually interrupt generation */
  interruptLocalGeneration: () => void;
  
  /** Clear model state */
  clearLocalModel: () => void;
  
  /** Get current model info */
  currentLocalModel: typeof DEFAULT_LOCAL_MODEL;
}

// ============================================================
// Main Hook
// ============================================================

export function useLocalModel({
  currentConversationId,
  onStreamUpdate,
  onSendingUpdate,
  messages,
  modelId,
  onReadyStateChange,
  onGeneratingStateChange,
}: UseLocalModelOptions): UseLocalModelReturn {
  
  // ============ State Management ============
  const [isLocal, setIsLocal] = useState(false);
  const [isLocalModelReady, setIsLocalModelReady] = useState(false);
  
  // Refs for cleanup safety
  const isCleaningUpRef = useRef(false);
  const isMountedRef = useRef(true);
  const lastResponseRef = useRef('');
  
  // ============ ExecuTorch Model Initialization ============
  
  // Initialize the LLM with the default or specified model
  const currentModel = DEFAULT_LOCAL_MODEL; // Could be dynamic based on modelId
  
  const llm = useLLM({
    model: currentModel.model,
  });
  
  // ============ Model Readiness Detection ============
  
  useEffect(() => {
    console.log('[useLocalModel] Initializing... Platform:', Platform.OS, 'LLM:', !!llm);
    
    // ExecuTorch models are ready when useLLM hook initializes
    // No manual model loading required - the library handles it
    
    // Check platform support
    const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';
    
    if (isSupported) {
      console.log('[useLocalModel] Platform supported, waiting for model initialization...');
      // Small delay to ensure model is fully initialized
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          console.log('[useLocalModel] 🔄 Setting ready state to TRUE');
          setIsLocalModelReady(true);
          
          // Notify global state immediately
          if (onReadyStateChange) {
            console.log('[useLocalModel] 📢 Notifying global state: READY');
            onReadyStateChange(true);
          }
          
          console.log('[useLocalModel] ✅ ExecuTorch model ready!');
        } else {
          console.warn('[useLocalModel] ⚠️ Component unmounted before ready');
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      console.warn('[useLocalModel] ❌ Local models not supported on this platform:', Platform.OS);
    }
  }, []);
  
  // ============ Generation State Tracking ============
  
  const isGenerating = llm?.isGenerating || false;
  const canSafelyUnmount = !isGenerating;
  
  // ============ Stream Response Updates ============
  
  useEffect(() => {
    // Prevent updates during cleanup or if unmounted
    if (isCleaningUpRef.current || !isMountedRef.current) {
      return;
    }
    
    // Update stream with current response from ExecuTorch
    // The response property updates automatically as tokens are generated
    const currentResponse = llm?.response || '';
    
    if (currentResponse && currentResponse !== lastResponseRef.current) {
      lastResponseRef.current = currentResponse;
      console.log('[useLocalModel] Response updated:', currentResponse.substring(0, 100) + '...');
      onStreamUpdate(currentResponse);
    }
  }, [llm?.response, onStreamUpdate]);
  
  // ============ Track LLM Reference ============
  
  // Store llm and isGenerating in refs to avoid effect re-runs
  const llmRef = useRef(llm);
  const isGeneratingRef = useRef(isGenerating);
  
  useEffect(() => {
    llmRef.current = llm;
    isGeneratingRef.current = isGenerating;
    
    // Notify global state when generating changes
    if (onGeneratingStateChange) {
      onGeneratingStateChange(isGenerating);
    }
  }, [llm, isGenerating, onGeneratingStateChange]);
  
  // ============ Cleanup on Unmount ============
  
  useEffect(() => {
    isMountedRef.current = true;
    isCleaningUpRef.current = false; // Reset on mount
    
    return () => {
      console.log('[useLocalModel] Component unmounting - running cleanup');
      isMountedRef.current = false;
      isCleaningUpRef.current = true; // Only set on actual unmount
      
      // CRITICAL: Interrupt generation if in progress
      // React cleanup functions must be synchronous
      // We cannot wait for isGenerating to become false
      // See: https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useLLM#interrupting-the-model
      
      const currentLLM = llmRef.current;
      const currentlyGenerating = isGeneratingRef.current;
      
      if (currentlyGenerating && currentLLM && typeof currentLLM.interrupt === 'function') {
        console.log('[useLocalModel] Interrupting generation on unmount');
        try {
          currentLLM.interrupt();
          console.log('[useLocalModel] Interrupt call successful');
        } catch (error) {
          console.error('[useLocalModel] Error during interrupt:', error);
        }
      }
      
      console.log('[useLocalModel] Cleanup complete');
    };
  }, []); // Empty dependencies - only run on mount/unmount!
  
  // ============ Context Building Helper ============
  
  const buildConversationContext = useCallback((userMessage: string): ExecuTorchMessage[] => {
    // Limit context to prevent token overflow
    const maxMessages = LOCAL_MODEL_LIMITS.MAX_CONTEXT_MESSAGES;
    
    // Get recent messages (safety check for undefined)
    const messageArray = Array.isArray(messages) ? messages : [];
    const recentMessages = messageArray.slice(-maxMessages);
    
    // Convert to ExecuTorch format
    const contextMessages: ExecuTorchMessage[] = recentMessages.map(msg => ({
      role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
      content: msg.text || msg.content || '',
    }));
    
    // Add current user message
    contextMessages.push({
      role: 'user',
      content: userMessage,
    });
    
    // Add system prompt at the beginning
    // ExecuTorch recommends always providing a system prompt
    const systemPrompt = `You are a helpful AI assistant. Current date and time: ${new Date().toLocaleString()}. Be concise and helpful.`;
    
    return [
      { role: 'system', content: systemPrompt },
      ...contextMessages,
    ];
  }, [messages]);
  
  // ============ Send Message to Local Model ============
  
  const handleSendLocalMessage = useCallback(
    async (text: string) => {
      // Validation checks
      if (!text || text.trim().length === 0) {
        console.warn('[useLocalModel] Empty message, skipping');
        return;
      }
      
      if (!isLocalModelReady) {
        throw new Error('Local model not ready. Please wait for initialization.');
      }
      
      // Don't check isCleaningUpRef here - it's only for actual component unmount
      // if (isCleaningUpRef.current) {
      //   console.warn('[useLocalModel] Cannot send message during cleanup');
      //   return;
      // }
      
      if (!llm) {
        throw new Error('ExecuTorch LLM not initialized');
      }
      
      try {
        // Update UI state
        onSendingUpdate(true);
        lastResponseRef.current = ''; // Reset for new generation
        
        // Build conversation context
        const conversationMessages = buildConversationContext(text);
        
        console.log('[useLocalModel] Starting generation with', conversationMessages.length, 'messages');
        
        // Generate response
        // The response will stream via llm.response updates (handled in useEffect above)
        await llm.generate(conversationMessages);
        
        console.log('[useLocalModel] Generation complete');
        
      } catch (error: any) {
        console.error('[useLocalModel] Generation error:', error);
        
        // User-friendly error messages
        let errorMessage = 'Failed to generate response';
        
        if (error?.message?.includes('interrupt')) {
          errorMessage = 'Generation was interrupted';
        } else if (error?.message?.includes('memory')) {
          errorMessage = 'Not enough memory. Try closing other apps.';
        } else if (error?.message?.includes('timeout')) {
          errorMessage = 'Generation timed out. Please try again.';
        }
        
        throw new Error(errorMessage);
        
      } finally {
        // Update UI state
        if (isMountedRef.current) {
          onSendingUpdate(false);
        }
      }
    },
    [isLocalModelReady, llm, buildConversationContext, onSendingUpdate]
  );
  
  // ============ Manual Interrupt ============
  
  const interruptLocalGeneration = useCallback(() => {
    if (!llm) {
      console.warn('[useLocalModel] Cannot interrupt - LLM not initialized');
      return;
    }
    
    if (!isGenerating) {
      console.log('[useLocalModel] No generation in progress to interrupt');
      return;
    }
    
    if (typeof llm.interrupt !== 'function') {
      console.error('[useLocalModel] Interrupt function not available');
      return;
    }
    
    try {
      console.log('[useLocalModel] Manual interrupt requested');
      llm.interrupt();
      
      // Update UI state
      onSendingUpdate(false);
      onStreamUpdate(''); // Clear stream
      
      console.log('[useLocalModel] Interrupt successful');
    } catch (error) {
      console.error('[useLocalModel] Error during manual interrupt:', error);
    }
  }, [llm, isGenerating, onSendingUpdate, onStreamUpdate]);
  
  // ============ Clear Model State ============
  
  const clearLocalModel = useCallback(() => {
    console.log('[useLocalModel] Clearing model state');
    
    // Reset UI state
    lastResponseRef.current = '';
    onStreamUpdate('');
    onSendingUpdate(false);
    
    // Note: ExecuTorch manages model lifecycle automatically
    // No manual cleanup needed for the model itself
  }, [onStreamUpdate, onSendingUpdate]);
  
  // ============ Return Hook Interface ============
  
  // Memoize the return object to prevent infinite loops
  const returnValue = useMemo(() => {
    console.log('[useLocalModel] 📦 Return value updated:', {
      isLocal,
      isLocalModelReady,
      isGenerating,
    });
    
    return {
      // State
      isLocal,
      setIsLocal,
      isLocalModelReady,
      isLocalModelGenerating: isGenerating,
      canSafelyUnmount,
      
      // Actions
      handleSendLocalMessage,
      interruptLocalGeneration,
      clearLocalModel,
      
      // Info
      currentLocalModel: currentModel,
    };
  }, [
    isLocal,
    isLocalModelReady,
    isGenerating,
    canSafelyUnmount,
    handleSendLocalMessage,
    interruptLocalGeneration,
    clearLocalModel,
  ]);
  
  return returnValue;
}

// ============================================================
// Utility Functions (Optional)
// ============================================================

/**
 * Check if device meets minimum requirements for local models
 */
export function checkDeviceCapabilities(): {
  supported: boolean;
  reason?: string;
} {
  // Check platform
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return {
      supported: false,
      reason: 'Platform not supported. Requires iOS or Android.',
    };
  }
  
  // Check iOS version
  if (Platform.OS === 'ios') {
    // You could check Platform.Version here
    // For now, we assume iOS 17+ based on your app config
  }
  
  // Check Android API level
  if (Platform.OS === 'android') {
    const apiLevel = Platform.Version as number;
    if (apiLevel < 26) {
      return {
        supported: false,
        reason: 'Android 8.0 or higher required (API level 26+)',
      };
    }
  }
  
  return { supported: true };
}

/**
 * Estimate memory usage for a model
 */
export function estimateMemoryUsage(modelId: string): string {
  // This would normally query actual device memory
  // For now, return expected values from our config
  return DEFAULT_LOCAL_MODEL.ram;
}

