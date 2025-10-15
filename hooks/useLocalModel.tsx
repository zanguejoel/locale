// Apply polyfills FIRST before any other imports
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillURL } from 'react-native-polyfill-globals/src/url';

// Apply polyfills immediately in correct order
polyfillEncoding();
polyfillReadableStream();
polyfillFetch();
polyfillURL();

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useLLM } from 'react-native-executorch';
import { Alert, InteractionManager } from 'react-native';
import { isLocalLLMSupported, getLocalLLMUnsupportedMessage } from '@/utils/DeviceCapabilities';
import { useDefaultLocalModel } from './useDefaultLocalModel';
import { DownloadedModelsTracker } from '@/utils/DownloadedModelsTracker';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AIEvent } from '@/types/mixpanel';
import { deferToBackgroundThread, AppStateMonitor } from '@/utils/DownloadOptimizer';
import { CrashReporter } from '@/utils/CrashReporter';
import { getLocalModelById } from '@/constants/LocalModels';
import { getDefaultLocalModelId } from './useDefaultLocalModel';
import { filterSpecialTokens } from '@/utils/ChatStream';
import { Message, Role } from '@/utils/Interfaces';
import {
  safeExecuTorchGenerate,
  getExecuTorchState,
  isExecuTorchReady,
  getExecuTorchResponse,
  formatExecuTorchState,
  isRecoverableError,
  isFatalError,
} from '@/utils/ExecuTorchWrapper';

export interface UseLocalModelOptions {
  currentConversationId: string | null;
  onStreamUpdate: (text: string) => void;
  onSendingUpdate: (isSending: boolean) => void;
  onStreamWorkingUpdate: (isWorking: boolean) => void;
  onIntermediateUpdate: (text: string) => void;
  messages: Message[];
  appendToMessageHistory: (message: string, role: Role) => void;
}

export interface UseLocalModelReturn {
  isLocal: boolean;
  setIsLocal: (value: boolean) => void;
  isLocalLLMSupported: boolean;
  localModelDownloadProgress: number;
  isLocalModelReady: boolean;
  handleSendLocalMessage: (message: string) => Promise<string | undefined>;
  clearLocalModel: () => void;
}

/**
 * Hook for managing local LLM model state and operations
 * Handles model downloading, initialization, and message generation
 */
export function useLocalModel(options: UseLocalModelOptions): UseLocalModelReturn {
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
  const [hasTestedModelReady, setHasTestedModelReady] = useState(false);
  const [hasTestedOnSwitch, setHasTestedOnSwitch] = useState(false);
  const [shouldInitializeLLM, setShouldInitializeLLM] = useState(false);

  // ============ Refs ============
  const isSendingRef = useRef(false);
  const messagesRef = useRef(messages);
  const isMountedRef = useRef(true);
  
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
  
  // Track mounted state for cleanup safety
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      console.log('[Local] Component unmounting');
    };
  }, []);

  // ============ Device & Model Configuration ============
  const deviceSupportsLocalLLM = useMemo(() => isLocalLLMSupported(), []);
  const selectedLocalModel = useDefaultLocalModel();
  const hasValidModelSource = Boolean(selectedLocalModel?.modelSource);

  if (!hasValidModelSource && selectedLocalModel) {
    console.error('[Local] Invalid model source:', {
      modelId: selectedLocalModel?.id,
      modelSource: selectedLocalModel?.modelSource
    });
  }

  // ============ LLM Initialization ============
  const safeModelSource = hasValidModelSource ? selectedLocalModel.modelSource : null;
  
  const llm = useLLM({
    model: safeModelSource,
    preventLoad: !deviceSupportsLocalLLM || !shouldInitializeLLM || !hasValidModelSource
  });

  // ============ App State Monitoring ============
  useEffect(() => {
    if (isLocal && shouldInitializeLLM) {
      console.log('[Local] Setting up app state monitoring for downloads...');
      
      AppStateMonitor.addListener('local-model-download', (nextAppState) => {
        if (nextAppState === 'background') {
          console.log('[Local] App went to background - download will pause automatically');
        } else if (nextAppState === 'active') {
          console.log('[Local] App became active - download will resume');
        }
      });
      
      return () => {
        AppStateMonitor.removeListener('local-model-download');
      };
    }
  }, [isLocal, shouldInitializeLLM]);

  // ============ ExecuTorch Initialization ============
  useEffect(() => {
    if (isLocal && deviceSupportsLocalLLM && !shouldInitializeLLM && hasValidModelSource) {
      // Check if local models are temporarily disabled due to crash loop
      if (CrashReporter.isLocalModelsDisabled()) {
        console.warn('[Local] Local models temporarily disabled due to recent crashes');
        Alert.alert(
          'Local Models Temporarily Disabled',
          'Local models were disabled due to recent crashes. Please try again in 30 minutes or use cloud models.',
          [
            { text: 'Use Cloud', onPress: () => setIsLocal(false) },
            { text: 'Enable Anyway', onPress: () => {
              CrashReporter.reenableLocalModels();
              setShouldInitializeLLM(true);
            }}
          ]
        );
        return;
      }
      
      console.log('[Local] User switched to local mode - scheduling ExecuTorch initialization...');
      
      deferToBackgroundThread(async () => {
        console.log('[Local] Starting ExecuTorch initialization (deferred to background)...');
        await new Promise(resolve => setTimeout(resolve, 150));
        
        try {
          setShouldInitializeLLM(true);
          console.log('[Local] ExecuTorch initialization triggered');
        } catch (error) {
          CrashReporter.report(error as Error, 'ExecuTorch initialization', {
            modelId: selectedLocalModel?.id
          });
          throw error;
        }
      }).catch(error => {
        console.error('[Local] Error during deferred initialization:', error);
        CrashReporter.report(error as Error, 'Deferred initialization', {
          modelId: selectedLocalModel?.id
        });
        
        Alert.alert(
          'Initialization Error',
          'Failed to start local model download. Please try again or use cloud models.',
          [
            { text: 'Use Cloud', onPress: () => setIsLocal(false) },
            { text: 'Try Again', onPress: () => {
              setShouldInitializeLLM(false);
              setTimeout(() => {
                if (CrashReporter.isLocalModelsDisabled()) {
                  setIsLocal(false);
                }
              }, 100);
            }}
          ]
        );
      });
    } else if (isLocal && deviceSupportsLocalLLM && !hasValidModelSource) {
      console.error('[Local] Cannot initialize - invalid model source');
      Alert.alert(
        'Model Error',
        'The selected local model is not available. Please select a different model from settings.',
        [
          { 
            text: 'Use Cloud Instead', 
            onPress: () => setIsLocal(false),
            style: 'cancel'
          },
          { text: 'OK' }
        ]
      );
    } else if (!isLocal && shouldInitializeLLM) {
      console.log('[Local] Switched to cloud mode - cleaning up local state...');
      setShouldInitializeLLM(false);
      setHasTestedModelReady(false);
      setHasTestedOnSwitch(false);
      setLocalModelDownloadProgress(0);
      setIsLocalModelReady(false);
      
      // Reset streaming states when switching to cloud
      callbacksRef.current.onStreamUpdate('');
      callbacksRef.current.onIntermediateUpdate('');
      callbacksRef.current.onStreamWorkingUpdate(false);
    }
  }, [isLocal, deviceSupportsLocalLLM, shouldInitializeLLM, hasValidModelSource, selectedLocalModel.id]);

  // ============ Model Change Handler ============
  useEffect(() => {
    setHasTestedModelReady(false);
    setLocalModelDownloadProgress(0);
    setIsLocalModelReady(false);
  }, [selectedLocalModel.id]);

  // ============ LLM Response Handler ============
  const llmResponse = useMemo(() => {
    try {
      if (!llm || typeof llm !== 'object' || !isLocal || !shouldInitializeLLM || !('response' in llm)) {
        return null;
      }
      return (llm as any).response;
    } catch (error) {
      return null;
    }
  }, [llm, isLocal, shouldInitializeLLM]);
  
  useEffect(() => {
    // Guard: Only update if mounted
    if (!isMountedRef.current) {
      return;
    }
    
    try {
      if (llmResponse) {
        const filteredResponse = filterSpecialTokens(llmResponse);
        
        // Double-check mounted state before callback
        if (isMountedRef.current) {
          callbacksRef.current.onStreamUpdate(filteredResponse);
        }
      }
    } catch (error) {
      console.error('[Local] Error updating stream from LLM:', error);
      
      if (String(error).toLowerCase().includes('unload')) {
        console.warn('[Local] Unload error caught - ignoring cleanup issue');
      } else {
        // Report non-unload errors
        CrashReporter.report(error as Error, 'LLM stream update', {
          modelId: selectedLocalModel?.id,
          hasResponse: !!llmResponse
        });
      }
    }
  }, [llmResponse]);

  // ============ LLM State Monitoring ============
  useEffect(() => {
    if (!llm || typeof llm !== 'object') {
      return;
    }
    
    if (llm && isLocal && shouldInitializeLLM) {
      try {
        const state = getExecuTorchState(llm);
        
        if (state.hasError && state.errorMessage) {
          console.error('[Local] LLM has error:', state.errorMessage);
          
          // Skip alerts for recoverable errors
          if (!isRecoverableError(state.errorMessage)) {
            Alert.alert(
              'Local Model Error',
              `The local model encountered an error: ${state.errorMessage}\n\nYou can switch to cloud models to continue.`,
              [
                { text: 'Use Cloud', onPress: () => setIsLocal(false) },
                { text: 'Try Again', onPress: () => setShouldInitializeLLM(false) }
              ]
            );
          }
        }
      } catch (error) {
        console.error('[Local] Error checking LLM state:', error);
        if (!isRecoverableError(error)) {
          CrashReporter.report(error as Error, 'LLM state check', {
            modelId: selectedLocalModel?.id
          });
        }
      }
    }
  }, [llm, isLocal, shouldInitializeLLM]);

  // ============ Model Readiness Testing ============
  const testModelReadiness = useCallback(async () => {
    InteractionManager.runAfterInteractions(async () => {
      if (!llm || !deviceSupportsLocalLLM) {
        return;
      }
      
      try {
        const testMessages = [{ role: 'user', content: 'Hi' }] as any[];
        await new Promise(resolve => setTimeout(resolve, 100));
        await (llm as any).generate(testMessages);
      } catch (error) {
        // Expected if still loading
      }
    });
  }, [llm, deviceSupportsLocalLLM]);

  // ============ Local Message Handler ============
  const handleSendLocalMessage = useCallback(async (message: string) => {
    // Guard: Check if component is mounted
    if (!isMountedRef.current) {
      console.warn('[Local] Attempt to send message on unmounted component');
      return;
    }
    
    try {
      callbacksRef.current.onSendingUpdate(true);
      
      const responseStartTime = Date.now();
      
      callbacksRef.current.onStreamUpdate('');
      callbacksRef.current.onIntermediateUpdate('');
      callbacksRef.current.onStreamWorkingUpdate(true);
      
      mixpanelService.trackAI(AIEvent.CHAT_MESSAGE_SENT, {
        message_type: 'text',
        message_length: message.length,
        model_used: selectedLocalModel?.id || 'unknown',
        is_local_model: true,
        conversation_id: currentConversationId || '',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
      
      if (!hasValidModelSource) {
        console.error('[Local] Invalid model source');
        Alert.alert(
          'Model Error',
          'The selected local model is not available. Please select a different model from settings or switch to cloud models.',
          [
            { 
              text: 'Use Cloud Instead', 
              onPress: () => setIsLocal(false),
              style: 'cancel'
            },
            { text: 'OK' }
          ]
        );
        
        mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          error_message: 'Invalid model source',
        }).catch(() => {});
        return;
      }
      
      if (!deviceSupportsLocalLLM) {
        Alert.alert(
          'Local LLM Not Supported',
          getLocalLLMUnsupportedMessage(),
          [{ text: 'OK' }]
        );
        
        mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          error_message: 'Device does not support local LLM',
        }).catch(() => {});
        return;
      }
      
      if (!llm) {
        Alert.alert(
          'Model Initializing',
          'The local model is being initialized. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
        
        mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          error_message: 'LLM not initialized',
        }).catch(() => {});
        return;
      }
    
      console.log('[Local] ✅ Setting isSending = true');
      isSendingRef.current = true;
      callbacksRef.current.onSendingUpdate(true);
      
      // Add messages to chat history (wrapped for safety)
      try {
        console.log('[Local] Adding user message to history');
        callbacksRef.current.appendToMessageHistory(message, Role.User);
        console.log('[Local] Adding bot placeholder to history');
        callbacksRef.current.appendToMessageHistory('', Role.Bot);
        console.log('[Local] Messages added successfully');
      } catch (appendError) {
        console.error('[Local] Error appending messages to history:', appendError);
        CrashReporter.report(appendError as Error, 'Append message history', {
          modelId: selectedLocalModel?.id,
          messageLength: message.length,
        });
        throw appendError; // Re-throw to stop execution if we can't add messages
      }
      
      try {
        // Use ref to avoid recreating callback on every message update
        const conversationHistory = messagesRef.current
          .map(msg => ({
            role: msg.role === Role.User ? 'user' : 'assistant',
            content: msg.content || ''
          }))
          .filter(msg => msg.content.trim() !== '');
        
        conversationHistory.push({ role: 'user', content: message });
        
        const MAX_CONTEXT_MESSAGES = 20;
        const contextMessages = conversationHistory.slice(-MAX_CONTEXT_MESSAGES);
        
        console.log('[Local] Sending with context:', contextMessages.length, 'messages in history');
        
        await InteractionManager.runAfterInteractions(async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        });
        
        // Use ExecuTorch wrapper for safe generation
        let result;
        try {
          console.log('[Local] Model state before generation:');
          console.log(formatExecuTorchState(llm));
          
          // Use wrapper to handle ExecuTorch quirks (streaming, undefined results, etc.)
          const generationResult = await safeExecuTorchGenerate(llm, contextMessages);
          
          if (!generationResult.success) {
            console.error('[Local] Generation failed:', generationResult.error);
            throw new Error(generationResult.error || 'Unknown generation error');
          }
          
          // For streaming models, response may be empty initially and populated later
          if (generationResult.isStreaming) {
            console.log('[Local] Streaming mode detected - response will be updated via llm.response');
            
            // Get the latest streamed response (may still be in progress)
            const currentResponse = getExecuTorchResponse(llm);
            result = currentResponse || generationResult.response || '';
            
            console.log('[Local] Current streamed response length:', result.length);
          } else {
            // Non-streaming mode - we have the full response
            result = generationResult.response || '';
            console.log('[Local] Direct response received, length:', result.length);
          }
          
          // Mark model as used successfully
          DownloadedModelsTracker.updateLastUsed(selectedLocalModel.id);
        } catch (llmError: any) {
          console.error('[Local] ExecuTorch generation error:', llmError);
          
          const errorMessage = llmError?.message || String(llmError);
          
          // Report to crash reporter with ExecuTorch context
          CrashReporter.report(llmError as Error, 'ExecuTorch generation', {
            modelId: selectedLocalModel?.id,
            contextLength: contextMessages.length,
            errorType: llmError?.name || 'Unknown',
            errorMessage: errorMessage,
            modelState: getExecuTorchState(llm)
          });
          
          // Check if this is a recoverable error (can skip alert)
          if (isRecoverableError(llmError)) {
            console.warn('[Local] Recoverable error, not showing alert:', errorMessage);
            throw llmError; // Re-throw to be handled by outer catch
          }
          
          // Check if this is a fatal ExecuTorch error
          if (isFatalError(llmError)) {
            console.error('[Local] FATAL ExecuTorch error detected - disabling local models');
            
            // Auto-switch to cloud mode
            setTimeout(() => {
              if (isMountedRef.current) {
                Alert.alert(
                  'Local Model Error',
                  'The local model encountered a fatal error and has been disabled. Switching to cloud models for stability.',
                  [{ 
                    text: 'OK', 
                    onPress: () => setIsLocal(false)
                  }]
                );
              }
            }, 100);
          } else {
            // Check for undefined/empty result errors
            const errorMsg = errorMessage.toLowerCase();
            const isUndefinedResultError = errorMsg.includes('undefined') || 
                                          errorMsg.includes('returned no response') ||
                                          errorMsg.includes('no response');
            
            if (isUndefinedResultError) {
              // Suggest model reinitialization for undefined results
              console.warn('[Local] Model returned undefined - checking for repeated failures');
              
              // Check if this is a repeated issue with this model
              const hasRepeatedIssues = CrashReporter.hasRepeatedUndefinedResults(selectedLocalModel?.id);
              
              if (hasRepeatedIssues) {
                console.error('[Local] Repeated undefined results detected for model:', selectedLocalModel?.id);
                console.log(CrashReporter.getDiagnosticInfo());
                
                setTimeout(() => {
                  if (isMountedRef.current) {
                    Alert.alert(
                      'Model Consistently Failing',
                      `The ${selectedLocalModel?.displayName || 'local model'} is consistently returning invalid responses. This may indicate:\n\n` +
                      `• Insufficient device memory\n` +
                      `• Corrupted model download\n` +
                      `• Device compatibility issue\n\n` +
                      `We recommend using cloud models for now.`,
                      [
                        { 
                          text: 'Switch to Cloud', 
                          onPress: () => {
                            setIsLocal(false);
                            CrashReporter.clearCrashHistory();
                          },
                          style: 'default'
                        },
                        { text: 'Keep Trying', style: 'cancel' }
                      ]
                    );
                  }
                }, 100);
              } else {
                setTimeout(() => {
                  if (isMountedRef.current) {
                    Alert.alert(
                      'Model Issue Detected',
                      'The local model appears to be in a bad state. Try switching to cloud mode and then back to local mode to reinitialize the model.',
                      [
                        { 
                          text: 'Switch to Cloud', 
                          onPress: () => setIsLocal(false),
                          style: 'cancel'
                        },
                        { text: 'Try Again' }
                      ]
                    );
                  }
                }, 100);
              }
            }
          }
          
          throw llmError; // Re-throw to be handled by outer catch
        }
        
        const responseDuration = Date.now() - responseStartTime;
        
        // Track successful generation
        await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_RECEIVED, {
          response_time: responseDuration,
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          conversation_id: currentConversationId || '',
          response_length: result?.length || 0,
        });
        
        console.log('[Local] Generation completed, cleaning up...');
        
        // Small delay to ensure UI updates complete before cleanup
        await new Promise(resolve => setTimeout(resolve, 50));
        
        console.log('[Local] Cleanup complete');
        
        return result;
      } catch (error: any) {
        mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          conversation_id: currentConversationId || '',
          error_message: error instanceof Error ? error.message : String(error),
        }).catch(() => {});
        
        const modelName = selectedLocalModel?.displayName || 'Local Model';
        const modelSize = selectedLocalModel?.size || 'Unknown';
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('still loading') || errorMessage.includes('not loaded')) {
          Alert.alert(
            'Model Still Loading',
            `${modelName} (${modelSize}) is still downloading. This may take several minutes depending on your connection.\n\nYou can switch to cloud models for immediate responses.`,
            [{ text: 'OK' }]
          );
        } else if (errorMessage.toLowerCase().includes('memory') || errorMessage.toLowerCase().includes('out of memory')) {
          Alert.alert(
            'Memory Error',
            `Your device does not have enough memory to run ${modelName}.\n\nTry switching to a smaller model or use cloud models instead.`,
            [{ text: 'OK' }]
          );
        } else {
          /* Alert.alert(
            'Generation Error',
            `Failed to generate response with ${modelName}.\n\nPlease try again or switch to cloud models.`,
            [{ text: 'OK' }]
          ); */
        }
      } finally {
        console.log('[Local] ❌ Setting isSending = false in finally block');
        isSendingRef.current = false;
        
        // Guard: Only update state if still mounted
        if (isMountedRef.current) {
          try {
            callbacksRef.current.onSendingUpdate(false);
            callbacksRef.current.onStreamWorkingUpdate(false);
          } catch (cleanupError) {
            console.error('[Local] Error in finally cleanup:', cleanupError);
          }
        } else {
          console.warn('[Local] Skipped state update - component unmounted');
        }
      }
    } catch (unexpectedError: any) {
      console.error('[Local] Unexpected error in handleSendLocalMessage:', unexpectedError);
      
      // Report crash to CrashReporter
      try {
        CrashReporter.report(unexpectedError as Error, 'Local message generation', {
          modelId: selectedLocalModel?.id,
          conversationId: currentConversationId || '',
          messageLength: message.length,
        });
      } catch (reportError) {
        console.error('[Local] Failed to report crash:', reportError);
      }
      
      mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
        model_used: selectedLocalModel?.id || 'unknown',
        is_local_model: true,
        conversation_id: currentConversationId || '',
        error_message: 'Unexpected error: ' + (unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError)),
      }).catch(() => {});
      
      // Only show alert if still mounted
      if (isMountedRef.current) {
        Alert.alert(
          'Unexpected Error',
          'An unexpected error occurred. Please try again or switch to cloud models.',
          [{ text: 'OK' }]
        );
      }
      
      console.log('[Local] ❌ Setting isSending = false in outer catch block');
      isSendingRef.current = false;
      
      // Guard: Only update state if still mounted
      if (isMountedRef.current) {
        try {
          callbacksRef.current.onSendingUpdate(false);
          callbacksRef.current.onStreamWorkingUpdate(false);
        } catch (cleanupError) {
          console.error('[Local] Error in outer catch cleanup:', cleanupError);
        }
      }
    }
  }, [
    llm,
    deviceSupportsLocalLLM,
    hasValidModelSource,
    selectedLocalModel.id, // Use ID instead of object to prevent recreating on object reference change
    selectedLocalModel.displayName, // Include display name for alerts
    selectedLocalModel.size, // Include size for alerts
    currentConversationId,
    // messages and callbacks removed - using refs instead to prevent infinite loop
  ]);

  // ============ Model State Updates ============
  useEffect(() => {
    if (!llm || !isLocal || !shouldInitializeLLM) {
      setLocalModelDownloadProgress(0);
      setIsLocalModelReady(false);
      return;
    }
    
    let previousProgress = 0;
    let previousIsReady = false;
    let isMounted = true;
    let testScheduled = false;
    let progressInterval: NodeJS.Timeout | null = null;
    let readyInterval: NodeJS.Timeout | null = null;
    
    const updateModelState = () => {
      if (!isMounted || !llm) return;
      
      requestAnimationFrame(() => {
        if (!isMounted) return;
        
        const progress = (llm as any).downloadProgress || 0;
        
        if (Math.abs(progress - previousProgress) > 0.05) {
          setLocalModelDownloadProgress(progress);
          previousProgress = progress;
        }
        
        if (progress >= 1 && progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        if (progress >= 1 && previousProgress < 1 && !testScheduled && !hasTestedModelReady) {
          testScheduled = true;
          setHasTestedModelReady(true);
          
          setTimeout(() => {
            if (isMounted) {
              testModelReadiness();
            }
          }, 1000);
        }
      });
    };
    
    const updateReadyState = () => {
      if (!isMounted || !llm) return;
      
      const isReady = (llm as any).isReady || false;
      
      if (isReady !== previousIsReady) {
        requestAnimationFrame(() => {
          if (!isMounted) return;
          
          setIsLocalModelReady(isReady);
        });
        previousIsReady = isReady;
        
        if (isReady) {
          if (readyInterval) {
            clearInterval(readyInterval);
            readyInterval = null;
          }
          
          DownloadedModelsTracker.markAsDownloaded(
            selectedLocalModel.id,
            selectedLocalModel.size
          );
        }
      }
    };
    
    updateModelState();
    updateReadyState();
    
    const currentProgress = (llm as any).downloadProgress || 0;
    const currentReady = (llm as any).isReady || false;
    
    if (currentProgress < 1) {
      progressInterval = setInterval(updateModelState, 5000);
    }
    
    if (!currentReady) {
      readyInterval = setInterval(updateReadyState, 3000);
    }
    
    return () => {
      isMounted = false;
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      if (readyInterval) {
        clearInterval(readyInterval);
      }
    };
  }, [llm, isLocal, shouldInitializeLLM, selectedLocalModel.id, selectedLocalModel.size, hasTestedModelReady, testModelReadiness]);

  // ============ Model Testing on Switch ============
  useEffect(() => {
    if (isLocal && deviceSupportsLocalLLM && shouldInitializeLLM && llm && !hasTestedOnSwitch) {
      setHasTestedOnSwitch(true);
      setHasTestedModelReady(false);
      
      callbacksRef.current.onStreamUpdate('');
      callbacksRef.current.onIntermediateUpdate('');
      callbacksRef.current.onStreamWorkingUpdate(false);
      
      const timer = setTimeout(() => {
        testModelReadiness();
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (!isLocal) {
      setHasTestedOnSwitch(false);
      
      if (isSendingRef.current) {
        console.log('[Cloud] Switched to cloud while local generation in progress');
        isSendingRef.current = false;
        callbacksRef.current.onSendingUpdate(false);
      }
    }
  }, [isLocal, deviceSupportsLocalLLM, shouldInitializeLLM, llm, hasTestedOnSwitch, testModelReadiness]);

  // ============ Clear Local Model ============
  const clearLocalModel = useCallback(() => {
    const currentLocalModel = getLocalModelById(getDefaultLocalModelId());
    const modelSize = currentLocalModel?.size || '~1.2GB';
    const modelName = currentLocalModel?.displayName || 'Llama 3.2 1B';
    
    DownloadedModelsTracker.clearAll();
    
    Alert.alert(
      'Clear Downloaded Models',
      `To clear the ${modelName} (${modelSize}), you need to clear the app data or reinstall the app. This will free up the storage space used by downloaded models.\n\nModel tracking has been reset.`,
      [{ text: 'OK' }]
    );
  }, []);

  // ============ Memoized Return Value ============
  // CRITICAL: Memoize the return object to prevent infinite loops in parent components
  // Without this, every render creates a new object, causing parent's useMemo to invalidate
  return useMemo(() => ({
    isLocal,
    setIsLocal,
    isLocalLLMSupported: deviceSupportsLocalLLM,
    localModelDownloadProgress,
    isLocalModelReady,
    handleSendLocalMessage,
    clearLocalModel,
  }), [
    isLocal,
    setIsLocal, // setState function (stable, but included for completeness)
    deviceSupportsLocalLLM,
    localModelDownloadProgress,
    isLocalModelReady,
    handleSendLocalMessage,
    clearLocalModel,
  ]);
}

