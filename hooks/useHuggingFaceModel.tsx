import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { Alert, InteractionManager } from 'react-native';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AIEvent } from '@/types/mixpanel';
import { Message, Role } from '@/utils/Interfaces';
import { 
  HUGGINGFACE_MODELS, 
  DEFAULT_HUGGINGFACE_MODEL,
  HuggingFaceModel,
  ModelUtils
} from '@/constants/HuggingFaceModels';

// Extend global type to include importMeta
declare global {
  // eslint-disable-next-line no-var
  var importMeta: { url: string } | undefined;
}

// Polyfill for import.meta if needed
if (typeof global !== 'undefined' && !globalThis.importMeta) {
  globalThis.importMeta = { url: '' };
}

// Import Transformers.js - NOW USING REACT NATIVE FORK!
let pipeline: any;
let env: any;

// ✅ NOW USING @fugood/transformers (React Native compatible fork)
// This fork works with native ONNX Runtime instead of WebAssembly
let TRANSFORMERS_JS_AVAILABLE = false;

try {
  // Verify ONNX Runtime was initialized in polyfills
  const ORT_SYMBOL = Symbol.for('onnxruntime');
  const ortFromGlobal = (globalThis as any)[ORT_SYMBOL];
  
  if (!ortFromGlobal || !ortFromGlobal.InferenceSession) {
    throw new Error('ONNX Runtime not found. Make sure polyfills.js loaded correctly.');
  }
  
  console.log('[HuggingFace] ✅ ONNX Runtime detected from polyfills');
  
  // Import the React Native fork (@fugood/transformers aliased as @huggingface/transformers)
  const transformers = require('@huggingface/transformers');
  pipeline = transformers.pipeline;
  env = transformers.env;
  
  console.log('[HuggingFace] ✅ Transformers.js loaded (@fugood/transformers fork)');
  
  // Simple configuration - the fork auto-detects ONNX Runtime from the Symbol
  env.allowLocalModels = false; // Download from Hugging Face
  env.allowRemoteModels = true;
  
  // Check that the backend was detected
  if (env.backends?.onnx) {
    console.log('[HuggingFace] ✅ ONNX backend detected:', !!env.backends.onnx);
    console.log('[HuggingFace] ✅ deviceToExecutionProviders available:', 
      typeof env.backends.onnx.deviceToExecutionProviders === 'function');
  }
  
  TRANSFORMERS_JS_AVAILABLE = true;
  
  console.log('[HuggingFace] ✅ Ready for inference with native ONNX Runtime');
} catch (error) {
  console.error('[HuggingFace] ❌ Failed to initialize:', error);
  console.error('[HuggingFace] Make sure onnxruntime-react-native is properly installed');
  console.error('[HuggingFace] and polyfills.js loaded before this hook');
  TRANSFORMERS_JS_AVAILABLE = false;
}

export interface UseHuggingFaceModelOptions {
  currentConversationId: string | null;
  onStreamUpdate: (text: string) => void;
  onSendingUpdate: (isSending: boolean) => void;
  onStreamWorkingUpdate: (isWorking: boolean) => void;
  onIntermediateUpdate: (text: string) => void;
  messages: Message[];
  appendToMessageHistory: (message: string, role: Role) => void;
}

export interface UseHuggingFaceModelReturn {
  isLocal: boolean;
  setIsLocal: (value: boolean) => void;
  isLocalLLMSupported: boolean;
  localModelDownloadProgress: number;
  isLocalModelReady: boolean;
  handleSendLocalMessage: (message: string) => Promise<string | undefined>;
  clearLocalModel: () => void;
}

// Model definitions are now imported from constants file

/**
 * Hook for managing Hugging Face local models
 * Replaces ExecuTorch with more stable Transformers.js
 */
export function useHuggingFaceModel(options: UseHuggingFaceModelOptions): UseHuggingFaceModelReturn {
  const {
    currentConversationId,
    onStreamUpdate,
    onSendingUpdate,
    onStreamWorkingUpdate,
    onIntermediateUpdate,
    messages,
    appendToMessageHistory,
  } = options;

  // ============ State Management ============
  const [isLocal, setIsLocal] = useState(false);
  const [localModelDownloadProgress, setLocalModelDownloadProgress] = useState(0);
  const [isLocalModelReady, setIsLocalModelReady] = useState(false);
  const [currentModel, setCurrentModel] = useState<HuggingFaceModel>(DEFAULT_HUGGINGFACE_MODEL);

  // ============ Refs ============
  const isSendingRef = useRef(false);
  const messagesRef = useRef(messages);
  const isMountedRef = useRef(true);
  const pipelineRef = useRef<any>(null);
  const isLoadingModelRef = useRef(false);
  
  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({
    onStreamUpdate,
    onSendingUpdate,
    onStreamWorkingUpdate,
    onIntermediateUpdate,
    appendToMessageHistory,
  });
  
  // Keep refs up to date
  useEffect(() => {
    messagesRef.current = messages;
    callbacksRef.current = {
      onStreamUpdate,
      onSendingUpdate,
      onStreamWorkingUpdate,
      onIntermediateUpdate,
      appendToMessageHistory,
    };
  }, [messages, onStreamUpdate, onSendingUpdate, onStreamWorkingUpdate, onIntermediateUpdate, appendToMessageHistory]);
  
  // Track mounted state for cleanup
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      console.log('[HuggingFace] Component unmounting - cleaning up...');
      isMountedRef.current = false;
      pipelineRef.current = null;
    };
  }, []);

  // ============ Device & Model Support ============
  const isLocalLLMSupported = useMemo(() => {
    // Following hans00 example: Just check if pipeline is available
    // The fork handles ONNX Runtime detection automatically
    const supported = TRANSFORMERS_JS_AVAILABLE && pipeline !== undefined;
    
    console.log('[HuggingFace] Transformers.js available:', supported);
    
    if (!supported) {
      console.warn('[HuggingFace] ⚠️ Transformers.js not loaded');
      console.warn('[HuggingFace] Using cloud models only');
    }
    
    return supported;
  }, []);

  // ============ Model Loading ============
  const loadModel = useCallback(async (model: HuggingFaceModel) => {
    if (isLoadingModelRef.current || !isMountedRef.current) {
      return false;
    }

    // Check if Transformers.js is available
    if (!TRANSFORMERS_JS_AVAILABLE || !pipeline) {
      console.error('[HuggingFace] ❌ Transformers.js not loaded properly');
      
      if (isMountedRef.current) {
        Alert.alert(
          'Setup Issue',
          'Local AI models couldn\'t initialize. This could be due to:\n\n• Missing dependencies\n• Native module setup incomplete\n• First-time initialization delay\n\nWould you like to use cloud models instead?',
          [
            { 
              text: 'Use Cloud Models', 
              onPress: () => setIsLocal(false),
              style: 'default'
            },
            { 
              text: 'Try Again', 
              style: 'cancel'
            }
          ]
        );
      }
      
      return false;
    }

    try {
      isLoadingModelRef.current = true;
      setLocalModelDownloadProgress(0);
      setIsLocalModelReady(false);

      console.log(`[HuggingFace] Loading model: ${model.name}`);
      
      const taskType = 'text-generation';
      
      const modelPipeline = await pipeline(taskType, model.huggingFaceName, {
        progress_callback: (progress: any) => {
          if (!isMountedRef.current) return;
          
          const percentage = progress.progress || 0;
          console.log(`[HuggingFace] Download progress: ${Math.round(percentage * 100)}%`);
          setLocalModelDownloadProgress(percentage);
        }
      });

      if (!isMountedRef.current) {
        console.log('[HuggingFace] Component unmounted during loading');
        return false;
      }

      pipelineRef.current = modelPipeline;
      setIsLocalModelReady(true);
      setLocalModelDownloadProgress(1);
      console.log(`[HuggingFace] ✅ Model loaded successfully: ${model.name}`);
      
      return true;
    } catch (error) {
      console.error('[HuggingFace] Model loading failed:', error);
      
      if (isMountedRef.current) {
        Alert.alert(
          'Model Loading Failed',
          `Failed to load ${model.name}. This could be due to:\n\n• Network connectivity issues\n• Insufficient storage space\n• Model compatibility\n\nTry a smaller model or switch to cloud models?`,
          [
            { text: 'Use Cloud Models', onPress: () => setIsLocal(false) },
            { text: 'Try Again', onPress: () => loadModel(model) }
          ]
        );
      }
      
      return false;
    } finally {
      isLoadingModelRef.current = false;
    }
  }, []);

  // ============ Model Initialization ============
  useEffect(() => {
    if (isLocal && isLocalLLMSupported && !isLocalModelReady && !isLoadingModelRef.current) {
      console.log('[HuggingFace] Starting model initialization...');
      loadModel(currentModel);
    }
  }, [isLocal, isLocalLLMSupported, isLocalModelReady, currentModel, loadModel]);

  // ============ Message Generation ============
  const handleSendLocalMessage = useCallback(async (message: string) => {
    if (!isMountedRef.current || isSendingRef.current) {
      return;
    }

    if (!pipelineRef.current || !isLocalModelReady) {
      Alert.alert(
        'Model Not Ready',
        'The local model is still loading. Please wait a moment and try again.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      console.log('[HuggingFace] ✅ Starting message generation');
      isSendingRef.current = true;
      callbacksRef.current.onSendingUpdate(true);
      
      const responseStartTime = Date.now();
      
      callbacksRef.current.onStreamUpdate('');
      callbacksRef.current.onIntermediateUpdate('');
      callbacksRef.current.onStreamWorkingUpdate(true);
      
      // Track message sent
      mixpanelService.trackAI(AIEvent.CHAT_MESSAGE_SENT, {
        message_type: 'text',
        message_length: message.length,
        model_used: currentModel.id,
        is_local_model: true,
        conversation_id: currentConversationId || '',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
      
      // Add messages to chat history
      try {
        console.log('[HuggingFace] Adding messages to history');
        callbacksRef.current.appendToMessageHistory(message, Role.User);
        callbacksRef.current.appendToMessageHistory('', Role.Bot);
      } catch (appendError) {
        console.error('[HuggingFace] Error appending messages:', appendError);
      }
      
      // Prepare conversation context
      const conversationHistory = messagesRef.current
        .map(msg => ({
          role: msg.role === Role.User ? 'user' : 'assistant',
          content: msg.content || ''
        }))
        .filter(msg => msg.content.trim() !== '')
        .slice(-10); // Keep last 10 messages for context
      
      conversationHistory.push({ role: 'user', content: message });
      
      // Generate response using text-generation pipeline
      // Format prompt based on model type for optimal performance
      let prompt: string;
      let result: string;
      
      if (currentModel.taskType === 'conversational') {
        // For conversational models (like DialoGPT), use simpler prompt format
        prompt = `${message}`;
      } else {
        // For instruct models (like Qwen), use conversation format
        prompt = conversationHistory
          .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
          .join('\n') + '\nAssistant:';
      }
      
      const response = await pipelineRef.current(prompt, {
        max_new_tokens: 100,
        temperature: 0.7,
        do_sample: true,
        return_full_text: false
      });
      
      result = response[0]?.generated_text || 'Sorry, I couldn\'t generate a response.';
      
      // Clean up the response (remove prompt if included)
      if (currentModel.taskType !== 'conversational' && result.includes('Assistant:')) {
        result = result.split('Assistant:').pop()?.trim() || result;
      }
      
      // Simulate streaming by revealing text progressively
      await simulateStreaming(result);
      
      const responseDuration = Date.now() - responseStartTime;
      
      // Track successful generation
      await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_RECEIVED, {
        response_time: responseDuration,
        model_used: currentModel.id,
        is_local_model: true,
        conversation_id: currentConversationId || '',
        response_length: result.length,
      });
      
      console.log('[HuggingFace] ✅ Generation completed successfully');
      return result;
      
    } catch (error: any) {
      console.error('[HuggingFace] Generation failed:', error);
      
      mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
        model_used: currentModel.id,
        is_local_model: true,
        conversation_id: currentConversationId || '',
        error_message: error.message || String(error),
      }).catch(() => {});
      
      if (isMountedRef.current) {
        Alert.alert(
          'Generation Failed',
          `Failed to generate response: ${error.message || 'Unknown error'}\n\nThis could be due to:\n• Model not fully loaded\n• Input too complex\n• Device memory constraints\n\nTry again or switch to cloud models.`,
          [
            { text: 'Use Cloud', onPress: () => setIsLocal(false) },
            { text: 'Try Again' }
          ]
        );
      }
      
    } finally {
      console.log('[HuggingFace] ❌ Cleaning up generation state');
      isSendingRef.current = false;
      
      if (isMountedRef.current) {
        callbacksRef.current.onSendingUpdate(false);
        callbacksRef.current.onStreamWorkingUpdate(false);
      }
    }
  }, [currentModel, isLocalModelReady, currentConversationId]);

  // ============ Streaming Simulation ============
  const simulateStreaming = useCallback(async (text: string) => {
    if (!isMountedRef.current) return;
    
    let displayedText = '';
    const words = text.split(' ');
    
    for (const word of words) {
      if (!isMountedRef.current) break;
      
      displayedText += (displayedText ? ' ' : '') + word;
      callbacksRef.current.onStreamUpdate(displayedText);
      
      // Small delay between words for streaming effect
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }, []);

  // ============ Cleanup ============
  const clearLocalModel = useCallback(() => {
    pipelineRef.current = null;
    setIsLocalModelReady(false);
    setLocalModelDownloadProgress(0);
    
    Alert.alert(
      'Model Cleared',
      'Local model has been cleared. You can reload it by switching to local mode again.',
      [{ text: 'OK' }]
    );
  }, []);

  // ============ Return Interface ============
  return useMemo(() => ({
    isLocal,
    setIsLocal,
    isLocalLLMSupported,
    localModelDownloadProgress,
    isLocalModelReady,
    handleSendLocalMessage,
    clearLocalModel,
  }), [
    isLocal,
    isLocalLLMSupported,
    localModelDownloadProgress,
    isLocalModelReady,
    handleSendLocalMessage,
    clearLocalModel,
  ]);
}
