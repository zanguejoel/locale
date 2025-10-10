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

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  useLLM,
} from 'react-native-executorch';

import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { Message, Role } from '@/utils/Interfaces';


import { processStream, filterSpecialTokens } from '@/utils/ChatStream';
import { Keyboard, Alert, Platform, InteractionManager } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from './useAuth';
import { getDefaultModelId } from './useDefaultModel';
import { getDefaultLocalModelId, useDefaultLocalModel } from './useDefaultLocalModel';
import { isLocalLLMSupported, getLocalLLMUnsupportedMessage } from '@/utils/DeviceCapabilities';
import { getToken } from '@/utils/SecureTokenManager';
import { formatAuthHeader } from '@/utils/AuthHelpers';
import { getLocalModelById } from '@/constants/LocalModels';
import { DownloadedModelsTracker } from '@/utils/DownloadedModelsTracker';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AIEvent } from '@/types/mixpanel';

// Import API_URL_PROD from ApiClient configuration
const API_URL_PROD = "https://api.odysseytech.ai";
const BASE_URL = API_URL_PROD;

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1200;

function updateLastItem<T>(array: T[], updateFn: (item: T) => T): T[] {
  if (array.length === 0) return array;
  return [...array.slice(0, -1), updateFn(array[array.length - 1])];
}

// Types
export interface Conversations {
  title?: string;
  id?: string;
  content_summary?: string;
  time_created?: Date;
  time_updated?: Date;
  pinned?: boolean;
  model_type?: string;
}

export interface ChatRoom {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ChatError {
  type: 'network' | 'api' | 'permission' | 'model' | 'credit' | 'generic';
  message: string;
  statusCode?: number;
}

interface ChatContextType {
  messages: Message[];
  conversations: Conversations[];
  currentConversationId: string | null;
  isLoading: boolean;
  isSending: boolean;
  stream: string;
  sendMessage: (message: string, messageType?: string, operation?: string | null, additionalData?: string, options?: any) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchConversation: (q?: string, limitValue?: number, updateCurrentRoom?: (a: string) => void) => Promise<Conversations[] | void>;
  createConversation: (participantIds: string[]) => Promise<string>;
  markAsRead: (conversationId: string) => Promise<void>;
  setCurrentRoom: (conversationId: string) => void;
  clearChat: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  renameConversation: (conversationId: string, newTitle: string) => Promise<boolean>;
  resetChat: () => void;
  createNewConversation: () => Promise<string>;
  intermediate: string;
  setChatLoading?: (a: boolean) => void;
  isChatLoading?: boolean;
  appendToMessageHistory: (message: string, role: Role) => void;
  handleSendLocalMessage: (message: string) => void;
  isLocal: boolean;
  setIsLocal: (a: boolean) => void;
  isLocalLLMSupported: boolean;
  localModelDownloadProgress: number;
  isLocalModelReady: boolean;
  clearLocalModel: () => void;
  chatError: ChatError | null;
  clearChatError: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversations[]>([])
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState<ChatError | null>(null);
  const [stream, setStream] = useState('');
  const [intermediate, setIntermediate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [pastedActive, setPastedActive] = useState(false);
  const [streamWorking, setStreamWorking] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false)
  const [additionalData, setAdditionalData] = useState<any[]>([]);
  const [isLocal, setIsLocal] = useState(false);
  
  // AbortController refs for managing streaming requests
  const streamControllerRef = useRef<AbortController | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  
  // Local model state - declare early to use in effects below
  const [localModelDownloadProgress, setLocalModelDownloadProgress] = useState(0);
  const [isLocalModelReady, setIsLocalModelReady] = useState(false);
  const [hasTestedModelReady, setHasTestedModelReady] = useState(false);
  const [hasTestedOnSwitch, setHasTestedOnSwitch] = useState(false);
  
  // Track if LLM should be initialized (only when user switches to local mode)
  const [shouldInitializeLLM, setShouldInitializeLLM] = useState(false);
  
  // Check if device supports local LLM
  const deviceSupportsLocalLLM = useMemo(() => isLocalLLMSupported(), []);
  
  // Get the selected default local model from settings
  const selectedLocalModel = useDefaultLocalModel();
  
  // Initialize LLM with new API (v0.5.8+)
  // Always call the hook (React rules), but use preventLoad to delay initialization until user switches to local mode
  const llm = useLLM({
    model: selectedLocalModel.modelSource,
    preventLoad: !deviceSupportsLocalLLM || !shouldInitializeLLM
  });
  
  // Initialize ExecuTorch when user switches to local mode
  useEffect(() => {
    if (isLocal && deviceSupportsLocalLLM && !shouldInitializeLLM) {
      console.log('[Local] User switched to local mode - initializing ExecuTorch...');
      setShouldInitializeLLM(true);
    } else if (!isLocal && shouldInitializeLLM) {
      // Clean up when switching back to cloud
      console.log('[Local] Switched to cloud mode - cleaning up local state...');
      setShouldInitializeLLM(false);
      setHasTestedModelReady(false);
      setHasTestedOnSwitch(false);
      setLocalModelDownloadProgress(0);
      setIsLocalModelReady(false);
    }
  }, [isLocal, deviceSupportsLocalLLM, shouldInitializeLLM]);
  
  // Log and notify when model changes
  useEffect(() => {
    // console.log('[Local] Selected model changed:', {
    //   id: selectedLocalModel.id,
    //   name: selectedLocalModel.displayName,
    //   size: selectedLocalModel.size
    // });
    
    // Reset test flags when model changes
    setHasTestedModelReady(false);
    setLocalModelDownloadProgress(0);
    setIsLocalModelReady(false);
    
    // console.log('[Local] Model changed - state reset for new model');
  }, [selectedLocalModel.id]);


  // Cleanup AbortControllers on unmount
  useEffect(() => {
    return () => {
      if (streamControllerRef.current) {
        streamControllerRef.current.abort();
        streamControllerRef.current = null;
      }
      if (fetchControllerRef.current) {
        fetchControllerRef.current.abort();
        fetchControllerRef.current = null;
      }
    };
  }, []);

  // Update conversation ID ref when it changes
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // Wait for user to be loaded before fetching conversations
  useEffect(() => {
    if (user?.user_id) {
      fetchConversation(undefined, undefined, setCurrentRoom);
      Keyboard.dismiss();
    }
  }, [user]);


  useEffect(() => {
    // console.log('[useChat] Updating message - stream length:', stream?.length, 'additionalData:', additionalData);
    setMessages(prev => updateLastItem(prev, message => {
      const updatedMessage = {
        ...message,
        content: stream,
      };
      
      // Update additional_data if we have new data, otherwise preserve existing
      if (additionalData?.length > 0) {
        updatedMessage.additional_data = additionalData;
        // console.log('[useChat] Setting additional_data on message:', additionalData);
      } else if (message.additional_data) {
        // Preserve existing additional_data
        updatedMessage.additional_data = message.additional_data;
      }
      
      return updatedMessage;
    }));
  }, [stream, additionalData]);

  useEffect(() => {
    // Only update stream from LLM response when in LOCAL mode and LLM is initialized
    // This prevents interfering with cloud streaming
    if(llm && isLocal && shouldInitializeLLM && 'response' in llm && (llm as any).response) {
      const filteredResponse = filterSpecialTokens((llm as any).response);
      setStream(filteredResponse);
    } else if (!isLocal) {
      // Clear local response when switching to cloud to prevent stale data
      // Note: Don't clear stream entirely as cloud sets it directly
    }
  }, [llm, isLocal, shouldInitializeLLM, (llm as any)?.response]);
  
  // Log LLM state changes for debugging (disabled when llm is null or not initialized)
  useEffect(() => {
    if (llm && isLocal && shouldInitializeLLM) {
      // console.log('[Local] LLM state update:', {
      //   isReady: (llm as any).isReady,
      //   downloadProgress: (llm as any).downloadProgress,
      //   isGenerating: (llm as any).isGenerating,
      //   error: (llm as any).error,
      //   allProps: Object.keys(llm)
      // });
    }
  }, [llm, isLocal, shouldInitializeLLM]);

 
  // Test model readiness by sending a simple test message
  const testModelReadiness = useCallback(async () => {
    // Use InteractionManager to avoid blocking UI
    InteractionManager.runAfterInteractions(async () => {
      // console.log('[Local] Testing model readiness...');
      
      if (!llm || !deviceSupportsLocalLLM) {
        // console.log('[Local] Cannot test - LLM not available');
        return;
      }
      
      try {
        const testMessages = [{ role: 'user', content: 'Hi' }] as any[];
        // console.log('[Local] Sending test message to verify model is ready...');
        
        // Small delay to ensure UI stays responsive
        await new Promise(resolve => setTimeout(resolve, 100));
        
        await (llm as any).generate(testMessages);
        
        // console.log('[Local] ✅ Model test successful - model is ready!');
      } catch (error) {
        // console.log('[Local] ⚠️ Model test failed (expected if still loading):', error);
      }
    });
  }, [llm, deviceSupportsLocalLLM]);

  const handleSendLocalMessage = async (message: string) => {
    // Wrap entire function in try-catch for unexpected errors
    try {
      // console.log('[Local] Starting local message send:', message);
      
      // Start timing for response
      const responseStartTime = Date.now();
      
      // Track message sent with local model (non-blocking)
      mixpanelService.trackAI(AIEvent.CHAT_MESSAGE_SENT, {
        message_type: 'text',
        message_length: message.length,
        model_used: selectedLocalModel?.id || 'unknown',
        is_local_model: true,
        conversation_id: currentConversationId || '',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
      
      // Check if device supports local LLM
      if (!deviceSupportsLocalLLM) {
        // console.error('[Local] Device does not support local LLM');
        Alert.alert(
          'Local LLM Not Supported',
          getLocalLLMUnsupportedMessage(),
          [{ text: 'OK' }]
        );
        
        // Track failure (non-blocking)
        mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          error_message: 'Device does not support local LLM',
        }).catch(() => {});
        return;
      }
      
      // Check if LLM hasn't been initialized yet (shouldn't happen but safety check)
      if (!llm) {
        // console.error('[Local] LLM not initialized');
        Alert.alert(
          'Model Initializing',
          'The local model is being initialized. Please wait a moment and try again.',
          [{ text: 'OK' }]
        );
        
        // Track failure (non-blocking)
        mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
          model_used: selectedLocalModel?.id || 'unknown',
          is_local_model: true,
          error_message: 'LLM not initialized',
        }).catch(() => {});
        return;
      }
    
    // Log LLM state for debugging
    // console.log('[Local] LLM state:', { 
    //   isReady: llm ? (llm as any).isReady : 'N/A',
    //   isGenerating: llm ? (llm as any).isGenerating : 'N/A',
    //   downloadProgress: llm ? (llm as any).downloadProgress : 'N/A',
    //   response: llm && 'response' in llm ? (llm as any).response?.substring(0, 50) : 'N/A',
    //   modelName: selectedLocalModel.displayName,
    //   modelSize: selectedLocalModel.size
    // });
    
    // Note: We removed the model ready check here - let the generate() call handle it
    // This allows the library to trigger download if needed
    
    // Set sending state
    setIsSending(true);
    
    // Add user message to chat
    appendToMessageHistory(message, Role.User);
    appendToMessageHistory('...', Role.Bot);
    
    try {
      // console.log('[Local] Calling llm.generate...');
      
      // Format message history for react-native-executorch API
      // It expects an array of message objects: [{ role: 'user' | 'assistant', content: 'text' }]
      // Note: At this point, messages array includes the new user message and '...' placeholder (last 2 items)
      const conversationHistory = messages
        //.slice(0, -2) // Exclude the last 2 messages (new user message and '...' placeholder)
        .map(msg => ({
          role: msg.role === Role.User ? 'user' : 'assistant',
          content: msg.content || ''
        }))
        .filter(msg => msg.content.trim() !== ''); // Remove empty messages
      
      // Add the new user message (not from state, but from parameter to ensure it's fresh)
      conversationHistory.push({ role: 'user', content: message });
      
      // Limit context window to last N messages to avoid token limits
      // Most local models have limited context windows (typically 2K-4K tokens)
      const MAX_CONTEXT_MESSAGES = 20; // ~10 conversation turns
      const contextMessages = conversationHistory.slice(-MAX_CONTEXT_MESSAGES);
      
      console.log('[Local] Sending with context:', contextMessages.length, 'messages in history');
      
      // Use InteractionManager to avoid blocking UI during generation
      await InteractionManager.runAfterInteractions(async () => {
        // Small delay to ensure UI stays responsive
        await new Promise(resolve => setTimeout(resolve, 100));
      });
      
      const result = await (llm as any).generate(contextMessages);
      // console.log('[Local] Generation result:', result);
      
      // Update last used timestamp for this model
      DownloadedModelsTracker.updateLastUsed(selectedLocalModel.id);
      
      // Track successful response
      const responseDuration = Date.now() - responseStartTime;
      await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_RECEIVED, {
        response_time: responseDuration,
        model_used: selectedLocalModel?.id || 'unknown',
        is_local_model: true,
        conversation_id: currentConversationId || '',
        response_length: result?.length || 0,
      });
      
      return result;
    } catch (error: any) {
      // console.error('[Local] LLM generation error:', error);
      
      // Track failed response (non-blocking)
      mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
        model_used: selectedLocalModel?.id || 'unknown',
        is_local_model: true,
        conversation_id: currentConversationId || '',
        error_message: error instanceof Error ? error.message : String(error),
      }).catch(() => {});
      
      const modelName = selectedLocalModel?.displayName || 'Local Model';
      const modelSize = selectedLocalModel?.size || 'Unknown';
      
      // Check if error is due to model still loading
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
        Alert.alert(
          'Generation Error',
          `Failed to generate response with ${modelName}.\n\nPlease try again or switch to cloud models.`,
          [{ text: 'OK' }]
        );
      }
    } finally {
      // Always reset sending state
      setIsSending(false);
    }
    } catch (unexpectedError: any) {
      // Catch any unexpected errors in the entire function
      console.error('[Local] Unexpected error in handleSendLocalMessage:', unexpectedError);
      
      // Track unexpected error (non-blocking)
      mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
        model_used: selectedLocalModel?.id || 'unknown',
        is_local_model: true,
        conversation_id: currentConversationId || '',
        error_message: 'Unexpected error: ' + (unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError)),
      }).catch(() => {});
      
      Alert.alert(
        'Unexpected Error',
        'An unexpected error occurred. Please try again or switch to cloud models.',
        [{ text: 'OK' }]
      );
      
      setIsSending(false);
    }
  };

  const handleSetConversation = (id: string) => {
    setCurrentConversationId(id);
    fetchMessages(id);
  }



  const optimizeImage = useCallback(async (imagePath: string): Promise<string> => {
    try {
      if (
        Platform.OS === 'android' &&
        !imagePath.startsWith('file://') &&
        !imagePath.startsWith('content://')
      ) {
        imagePath = 'file://' + imagePath;
      }

      const fileInfo = await FileSystem.getInfoAsync(imagePath, { size: true });
      if (!fileInfo.exists) {
        throw new Error(`${imagePath}`);
      }

      if (fileInfo.size && fileInfo.size <= MAX_IMAGE_SIZE) {
        return imagePath;
      }

      let actions = [];
      if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE * 1.5) {
        actions.push({
          resize: { width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION },
        });
      }

      let compression = 0.8;
      if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE * 3) {
        compression = 0.6;
      }

      const result = await ImageManipulator.manipulateAsync(
        imagePath,
        actions,
        { compress: compression, format: ImageManipulator.SaveFormat.JPEG }
      );

      const optimizedInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
      if (optimizedInfo.exists && 'size' in optimizedInfo && optimizedInfo.size && optimizedInfo.size > MAX_IMAGE_SIZE) {
        const finalResult = await ImageManipulator.manipulateAsync(
          result.uri,
          [],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );
        return finalResult.uri;
      }

      return result.uri;
    } catch (error) {
      // console.error('Error optimizing image:', error);
      return imagePath;
    }
  }, []);

  const getFileType = useCallback((filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(extension)) {
      return extension === 'png' ? 'image/png' : 'image/jpeg';
    }
    return 'image/jpeg';
  }, []);

  const checkFileExists = useCallback(async (filePath: string) => {
    try {
      let path = filePath;
      if (Platform.OS === 'ios' && !path.startsWith('file://')) {
        path = `file://${path}`;
      }
      const stats = await RNFS.stat(path);
      if (stats.size === 0) {
        // console.warn('File exists but has 0 bytes size');
        return false;
      }
      return true;
    } catch (error) {
      // console.error('Error checking file existence:', error);
      return false;
    }
  }, []);

  const saveBase64ToFile = useCallback(async (base64: string, filename: string) => {
    const path = FileSystem.documentDirectory + filename;
    try {

      if (!base64 || base64.length < 10) {
        throw new Error('Invalid base64 data');
      }
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileInfo = await FileSystem.getInfoAsync(path);

      return path;
    } catch (error) {
      // console.error('Error saving file: ', error);
      throw error;
    }
  }, []);
  const appendToMessageHistory = useCallback((message: string, role: Role) => {
    setMessages(prev => [...prev, { role, content: message }]);
  }, []);

  const handleError = useCallback((error: string) => {
    // Parse streaming errors and set chat error
    setChatError({
      type: 'api',
      message: error,
      statusCode: 0,
    });
  }, []);

  const clearChatError = useCallback(() => {
    setChatError(null);
  }, []);

  const parseErrorResponse = useCallback((errorText: string, statusCode: number): ChatError => {
    let errorMessage = errorText;
    let errorType: ChatError['type'] = 'generic';

    try {
      // Try to parse as JSON
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.detail || errorJson.message || errorText;
    } catch {
      // Not JSON, use as-is
    }

    // Determine error type based on status code and message
    if (statusCode === 401) {
      errorType = 'permission';
    } else if (statusCode === 429) {
      errorType = 'credit';
    } else if (statusCode === 400 && (errorMessage.toLowerCase().includes('credit') || errorMessage.toLowerCase().includes('upgrade'))) {
      errorType = 'credit';
    } else if (statusCode >= 500) {
      errorType = 'api';
    } else if (errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('connection')) {
      errorType = 'network';
    } else if (errorMessage.toLowerCase().includes('model')) {
      errorType = 'model';
    }

    return {
      type: errorType,
      message: errorMessage,
      statusCode,
    };
  }, []);

  // ---------------- Chat Operations ----------------

  const sendMessage = useCallback(async (
    message: string, 
    messageType = 'text', 
    operation: string | null = null, 
    additionalData: string = '',
    options?: {
      webSearch?: boolean;
      generateImage?: string;
      imageProvider?: string;
      imageModel?: string;
      generateVideo?: string;
      files?: Array<{
        uri: string;
        type: string;
        name: string;
        size?: number;
      }>;
    }
  ) => {
    // console.log('[Cloud] Starting cloud message send:', { message, messageType, operation, options });
    
    // Prevent duplicate sends while already sending
    if (isSending) {
      console.log('[Cloud] Already sending a message, ignoring duplicate call');
      return;
    }
    
    // Start timing for response
    const responseStartTime = Date.now();
    
    setChatLoading(true)
    setError('');
    setChatError(null); // Clear any previous errors
    setStream('');
    setIntermediate('');
    setAdditionalData([]); // Reset additional data for new message
    setIsSending(true);

    setMessages(prev => [
      ...prev,
      { role: Role.User, content: messageType === 'image' ? additionalData : message || '', imageData: message },
      { role: Role.Bot, content: '' },
    ]);

    const formData = new FormData();

    // Handle multiple files from options (new multi-file approach)
    const filesToUpload = options?.files || [];
    
    if (messageType !== 'audio' && messageType !== 'image' && message) {
      formData.append('text', message);
    }

    // Multi-file upload (new approach)
    if (filesToUpload.length > 0) {
      console.log('[Cloud] Processing', filesToUpload.length, 'files for upload');
      
      for (let i = 0; i < filesToUpload.length; i++) {
        const file = filesToUpload[i];
        try {
          // Optimize images before upload
          if (file.type.startsWith('image/')) {
            const optimizedPath = await optimizeImage(file.uri);
            const mimeType = getFileType(optimizedPath);
            formData.append('files', {
              uri: optimizedPath,
              type: mimeType,
              name: file.name || `file_${i}.jpg`,
            } as any);
          } else {
            // Other file types - send as-is
            formData.append('files', {
              uri: file.uri,
              type: file.type,
              name: file.name || `file_${i}`,
            } as any);
          }
        } catch (error) {
          console.error(`[Cloud] Error processing file ${i}:`, error);
          // Continue with other files even if one fails
        }
      }
      
      // Add text/caption if provided
      if (additionalData || message) {
        formData.append('text', additionalData || message);
      }
    } else if (files?.length || messageType === 'audio' || messageType === 'image') {
      // Legacy single file handling (for backward compatibility)
      let file = null;
      if (message.startsWith('file://')) {
        try {
          const filePath = message.replace('file://', '');

          const fileExists = await checkFileExists(filePath);
          if (!fileExists) {
            Alert.alert('Error', 'The selected file could not be found.');
            setIsSending(false);
            setInputDisabled(false);
            return;
          }
          if (messageType === 'audio') {
            const fileData = await RNFS.readFile(filePath, 'base64');
            const savedFilePath = await saveBase64ToFile(fileData, 'audio.m4a');
            formData.append('audio', {
              uri: savedFilePath,
              type: 'audio/x-m4a',
              name: 'audio.m4a',
            } as any); // React Native FormData accepts object with uri/type/name
          } else if (messageType === 'image') {
            try {
              const optimizedImagePath = await optimizeImage(filePath);
              const mimeType = getFileType(optimizedImagePath);
              const extension = mimeType.split('/')[1];
              formData.append('files', {
                uri: optimizedImagePath,
                type: mimeType,
                name: `image.${extension}`,
              } as any); // React Native FormData accepts object with uri/type/name
              formData.append('text', additionalData);

            } catch (imageError) {
              const fileData = await RNFS.readFile(filePath, 'base64');
              const savedFilePath = await saveBase64ToFile(fileData, 'image.png');
              formData.append('files', {
                uri: savedFilePath,
                type: 'image/png',
                name: 'image.png',
              } as any); // React Native FormData accepts object with uri/type/name
              formData.append('text', additionalData);

            }
          }
        } catch (error) {
          Alert.alert('Error', 'There was a problem processing your file.');
          setIsSending(false);
          setInputDisabled(false);
          return;
        }
      } else {
        if (files && files.length > 0) {
          file = files[0];
        } else {
          setIsSending(false);
          setInputDisabled(false);
          return;
        }
        if (file && file instanceof File) {
          if (messageType === 'audio') {
            formData.append('audio', file, file.name);
          } else if (messageType === 'image') {
            formData.append('image', file, file.name);
          }
        } else {
          setIsSending(false);
          setInputDisabled(false);
          return;
        }
        setFiles([]);
      }
    }

    if (operation) {
      formData.append('operations', JSON.stringify(operation));
    }
    
    // Add the default model ID to the request
    const modelId = getDefaultModelId();
    formData.append('model', modelId);
    
    const conversationId = currentConversationId || '';
    
    // Track message sent
    await mixpanelService.trackAI(AIEvent.CHAT_MESSAGE_SENT, {
      message_type: messageType as any,
      message_length: (messageType === 'image' ? additionalData : message)?.length || 0,
      model_used: modelId,
      is_local_model: false,
      conversation_id: conversationId,
      has_web_search: options?.webSearch || false,
      has_image_generation: !!options?.generateImage,
      has_files: filesToUpload.length > 0 || (files && files.length > 0),
      file_count: filesToUpload.length,
    });

    if (conversationId) {
      formData.append('conversation_id', conversationId);
    } else {

      const res = await api.post<Conversations>('/conversation', { title: 'New Chat' });
      if (!res.ok || !res.data) {
        throw new Error('Failed to create new conversation');
      }

      const conv = res.data?.id;
      if (conv) {
        formData.append('conversation_id', conv);
        setConversations(prev => [...prev, res.data as Conversations]);
        setCurrentConversationId(conv);
      } else {
        setIsSending(false);
        setInputDisabled(false);
        throw new Error('Failed to create new conversation');
      }
    }

    // Add generation options if provided
    console.log('[Cloud] ════════════════════════════════════');
    console.log('[Cloud] Generation options:', JSON.stringify(options, null, 2));
    console.log('[Cloud] - webSearch:', options?.webSearch);
    console.log('[Cloud] - generateImage:', options?.generateImage);
    console.log('[Cloud] - generateVideo:', options?.generateVideo);
    console.log('[Cloud] ════════════════════════════════════');
    
    if (options?.webSearch) {
      formData.append('web_search', 'true');
      console.log('[Cloud] Added web_search to request');
    }
    
    if (options?.generateVideo && options.generateVideo !== 'none') {
      formData.append('generate_video', options.generateVideo);
      console.log('[Cloud] ✅ Added generate_video:', options.generateVideo);
      console.log('[Cloud] Valid models: aws_nova_reel, google_veo2, google_veo3, google_veo3_audio');
      
      // Validate model name
      const validModels = ['aws_nova_reel', 'google_veo2', 'google_veo3', 'google_veo3_audio'];
      if (!validModels.includes(options.generateVideo)) {
        console.warn('[Cloud] ⚠️ INVALID VIDEO MODEL:', options.generateVideo);
        console.warn('[Cloud] Backend expects one of:', validModels.join(', '));
      }
    } else {
      console.log('[Cloud] No video generation (generateVideo is none or missing)');
    }
    
    if (options?.generateImage && options.generateImage !== 'none') {
      formData.append('generate_image', options.generateImage);
      console.log('[Cloud] Added generate_image:', options.generateImage);
      if (options.imageProvider) {
        formData.append('image_provider', options.imageProvider);
        console.log('[Cloud] Added image_provider:', options.imageProvider);
      }
      if (options.imageModel) {
        formData.append('image_model', options.imageModel);
        console.log('[Cloud] Added image_model:', options.imageModel);
      }
    } else {
      console.log('[Cloud] ⚠️ No image generation option set or generateImage is "none"');
    }

    // Abort any previous stream (only if it exists and is different)
    if (streamControllerRef.current) {
      console.log('[Cloud] Aborting previous stream controller');
      streamControllerRef.current.abort();
      streamControllerRef.current = null;
    }
    
    const newController = new AbortController();
    streamControllerRef.current = newController;
    console.log('[Cloud] Created new AbortController for request');
    
    try {
      // Get token from secure storage
      const token = await getToken();
      // console.log('[Cloud] Token exists:', !!token);
      
      if (!token) {
        // console.error('[Cloud] No token found');
        Alert.alert('Error', 'Authentication required. Please sign in again.');
        setIsSending(false);
        setInputDisabled(false);
        setChatLoading(false);
        return;
      }
      
      // Log token info (first/last 10 chars for debugging without exposing full token)
      // console.log('[Cloud] Token preview:', token.substring(0, 10) + '...' + token.substring(token.length - 10));
      // console.log('[Cloud] Token length:', token.length);

      // console.log('[Cloud] Sending fetch request to:', `${BASE_URL}/chat`);
      console.log('[Cloud] Making fetch request with options:', {
        generateImage: options?.generateImage,
        imageProvider: options?.imageProvider,
        hasSignal: !!newController.signal,
      });
      
      const _response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          Authorization: formatAuthHeader(token),
          'Accept': 'text/event-stream, application/json',
          // Don't set Content-Type - let fetch set it with boundary for multipart/form-data
        },
        body: formData,
        // @ts-ignore - React Native specific properties
        reactNative: { 
          textStreaming: true 
        },
        signal: newController.signal,
        // Ensure streaming is enabled
        cache: 'no-cache',
      });
      console.log('[Cloud] Fetch completed with status:', _response.status);
      // console.log('[Cloud] Fetch response status:', _response.status, 'ok:', _response.ok);
      // console.log('[Cloud] Response headers:', Object.fromEntries(_response.headers.entries()));
      // console.log('[Cloud] Response body exists:', !!_response.body);
      
      if (!_response.ok) {
        const errorMessage = await _response.text();
        console.log('[Cloud] Error response:', errorMessage, 'Status:', _response.status);
        
        // Parse the error and set it in state
        const parsedError = parseErrorResponse(errorMessage, _response.status);
        setChatError(parsedError);
        
        // Still show alerts for critical errors (like auth)
        if (_response.status === 401) {
          Alert.alert(
            'Authentication Error',
            'Your session has expired. Please sign in again.',
            [{ text: 'OK' }]
          );
        }
        
        setIsSending(false);
        setInputDisabled(false);
        setChatLoading(false);
        return;
      }
      
      console.log('[Cloud] Starting processStream...');
      const res = await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate,
        setStreamWorking,
        setAdditionalData
      );
      console.log('[Cloud] processStream completed successfully');
      console.log('[Cloud] Final result:', JSON.stringify(res, null, 2));
      
      // Handle additional_data after streaming completes
      if (res?.data?.additional_data) {
        console.log('[Cloud] Processing additional_data:', res.data.additional_data);
        
        // Update last message with additional_data
        // DON'T create separate messages for videos - they're already in files[]
        setMessages(prev => updateLastItem(prev, message => ({
          ...message,
          additional_data: res?.data?.additional_data || []
        })));
      } else {
        console.log('[Cloud] ⚠️ No additional_data in final result');
      }
      
      // Track successful response
      const responseDuration = Date.now() - responseStartTime;
      await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_RECEIVED, {
        response_time: responseDuration,
        model_used: modelId,
        is_local_model: false,
        conversation_id: conversationId,
        response_length: res?.content?.length || 0,
      });
      
      setInputDisabled(false);
      setPastedActive(false);
    } catch (e: any) {
      // Check if request was aborted (user cancelled or switched conversations)
      if (e.name === 'AbortError') {
        console.log('[Cloud] Request cancelled/aborted');
        console.log('[Cloud] Abort reason:', e.message);
        return;
      }
      
      console.error('[Cloud] Unexpected error during message send:', e);
      
      // Set network error if it's a network issue
      if (e.message?.toLowerCase().includes('network') || 
          e.message?.toLowerCase().includes('fetch') ||
          e.message?.toLowerCase().includes('connection')) {
        setChatError({
          type: 'network',
          message: 'Network error. Please check your connection and try again.',
          statusCode: 0,
        });
      } else {
        setChatError({
          type: 'generic',
          message: e instanceof Error ? e.message : 'Something went wrong. Please try again.',
          statusCode: 0,
        });
      }
      
      // Track failed response
      const modelId = getDefaultModelId();
      const conversationId = currentConversationId || '';
      await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
        model_used: modelId,
        is_local_model: false,
        conversation_id: conversationId,
        error_message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      streamControllerRef.current = null;
      setIsSending(false);
      setInputDisabled(false);
      setChatLoading(false);
      setIntermediate(''); // Clear intermediate state to stop loading indicator
      
      // Don't reset additionalData here - it needs to persist in the message
      console.log('[Cloud] Send message completed, clearing states');
    }
  }, [files, currentConversationId, user, checkFileExists, saveBase64ToFile, optimizeImage, getFileType, handleError]);

  const fetchConversation = useCallback(async (q?: string, limitValue?: number, updateCurrentRoom?: (a: string) => void) => {
    const effectiveLimit = limitValue || 20;
    try {
      const token = await getToken();
      await api.setAuthToken(token || '');

      const response = await api.get<Conversations[]>(
        `/conversation/search?limit=${effectiveLimit}${q ? `&q=${q}` : ""}`
      );

      if (!response.ok || !response.data) {
        // console.error(JSON.stringify(response.problem));
        return [];
      }
      if (effectiveLimit > 20) {
        setConversations(prev => {
          const combined = response.data;
          if (!combined) return prev;
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
          );
          return unique;
        });
      } else {
        setConversations(response.data);
        if (response.data.length > 0 && response.data[0].id) {
          // updateCurrentRoom?.(response.data[0].id);
        }
      }
      return response.data;
    } catch (error) {
      // console.error('Fetch conversations error:', error);
      return [];
    } finally {
      if (effectiveLimit === 20) {
        setIsLoading(false);
      }
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId?: string) => {
    if (!conversationId) return;
    
    // Abort any previous fetch
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
    
    fetchControllerRef.current = new AbortController();
    const fetchConvId = conversationId; // Capture for closure
    
    try {
      setIsLoading(true);
      const response = await api.get<Message[]>(`/conversation/${conversationId}/logs`, {
        params: { conversation_id: conversationId, limit: 50 },
      });
      
      // Only update messages if this is still the current conversation
      if (currentConversationIdRef.current === fetchConvId) {
        if (response.ok && response.data) {
          // console.log('[useChat] Fetched messages:', response.data.length);
          const msgs = response.data.map(m => {
            // console.log('[useChat] Message additional_data:', m.additional_data);
            // console.log('[useChat] Message files:', m.files);
            
            // Ensure additional_data is preserved and properly formatted
            const message: Message = {
              ...m,
              role: `${m.role}` === "assistant" ? Role.Bot : Role.User,
              additional_data: m.additional_data || [],
            };
            
            // Web compatibility: If files array contains items with data_type, treat them as additional_data
            if (m.files && m.files.length > 0) {
              m.files.forEach(file => {
                // If file has data_type (from web), it should be in additional_data format
                if (file.data_type && ['img', 'video', 'voice'].includes(file.data_type)) {
                  if (!message.additional_data) {
                    message.additional_data = [];
                  }
                  // Add to additional_data if not already there
                  const alreadyExists = message.additional_data.some(
                    ad => ad.data === (file.s3_url || file.file_path)
                  );
                  if (!alreadyExists) {
                    message.additional_data.push({
                      data_type: file.data_type,
                      data: file.s3_url || file.file_path || ''
                    });
                  }
                }
              });
            }
            
            // console.log('[useChat] Processed message with additional_data:', message.additional_data);
            return message;
          });
          setMessages(msgs || []);
        }
      } else {
        console.log('[Chat] Fetch cancelled - conversation changed');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('[Chat] Fetch messages cancelled');
        return;
      }
      // console.error('Fetch messages error:', error);
    } finally {
      fetchControllerRef.current = null;
      setIsLoading(false);
    }
  }, []);

  const createConversation = useCallback(async (participantIds: string[]): Promise<string> => {
    try {
      setIsLoading(true);
      const response = await api.post<ChatRoom>('/chat/rooms', { participants: participantIds });
      if (!response.ok || !response.data) {
        throw new Error('Failed to create chat room');
      }
      const newRoom = response.data;
      setConversations(prev => [...prev, newRoom]);
      setCurrentRoom(newRoom.id);
      return newRoom.id;
    } catch (error) {
      // console.error('Create conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
    } catch (error) {
      // console.error('Mark as read error:', error);
      throw error;
    }
  }, []);

  const setCurrentRoom = useCallback((conversationId: string) => {
    handleSetConversation(conversationId);
    markAsRead(conversationId);
  }, [markAsRead]);

  const clearChat = useCallback(async (conversationId: string) => {
    try {
      await api.delete(`/chat/rooms/${conversationId}/messages`);
      setMessages([]);
    } catch (error) {
      // console.error('Clear chat error:', error);
      throw error;
    }
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setStream('');
    setIntermediate('');
    setAdditionalData([]); // Reset additional data when clearing chat
    setCurrentConversationId(null); // Clear conversation ID to prevent refetch
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = await getToken();
      await api.setAuthToken(token || '');
      const response = await api.delete(`/conversation/${conversationId}`);
      if (!response.ok) {
        // console.error(JSON.stringify(response.problem));
        return false;
      }
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      setMessages([]);
      if (currentConversationId === conversationId) {
        if (conversations.length > 1) {
          const nextConv = conversations.find(c => c.id !== conversationId);
          if (nextConv?.id) {
            setCurrentRoom(nextConv.id);
          } else {
            setCurrentConversationId(null);
            resetChat();
          }
        } else {
          setCurrentConversationId(null);
          resetChat();
        }
      }
      return true;
    } catch (error) {
      // console.error('Delete conversation error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, currentConversationId, conversations, setCurrentRoom, resetChat]);

  const renameConversation = useCallback(async (conversationId: string, newTitle: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = await getToken();
      await api.setAuthToken(token || '');
      const response = await api.put(`/conversation/${conversationId}`, { title: newTitle });
      if (!response.ok) {
        // console.error(JSON.stringify(response.problem));
        return false;
      }
      setConversations(prev =>
        prev.map(conv => conv.id === conversationId ? { ...conv, title: newTitle } : conv)
      );
      return true;
    } catch (error) {
      // console.error('Rename conversation error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createNewConversation = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      const token = await getToken();
      await api.setAuthToken(token || '');
      
      // Get default model based on current mode
      const defaultModelId = isLocal ? getDefaultLocalModelId() : getDefaultModelId();
      
      const response = await api.post<Conversations>('/conversation', { 
        title: 'New Chat',
        model_type: defaultModelId
      });
      if (!response.ok || !response.data) {
        throw new Error('Failed to create new conversation');
      }
      const newConversation = response.data;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentRoom(newConversation.id || '');
      resetChat();
      return newConversation.id || '';
    } catch (error) {
      // console.error('Create new conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, setConversations, setCurrentRoom, resetChat, isLocal]);

  // Get local model state (declarations moved to top of component)
  
  // Update model state when llm changes
  useEffect(() => {
    // Early return and cleanup if not in local mode
    if (!llm || !isLocal || !shouldInitializeLLM) {
      setLocalModelDownloadProgress(0);
      setIsLocalModelReady(false);
      console.log('[Local] Cleaning up model state - not in local mode');
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
      
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        if (!isMounted) return;
        
        const progress = (llm as any).downloadProgress || 0;
        
        // Only update state if values have changed significantly (prevents unnecessary rerenders)
        if (Math.abs(progress - previousProgress) > 0.05) { // Only update if changed by more than 5%
          setLocalModelDownloadProgress(progress);
          // console.log('[Local] Progress changed:', progress.toFixed(2));
          previousProgress = progress;
        }
        
        // Stop polling once complete
        if (progress >= 1 && progressInterval) {
          // console.log('[Local] Download complete, stopping progress polling');
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        // Test if model is ready when download reaches 100%
        if (progress >= 1 && previousProgress < 1 && !testScheduled && !hasTestedModelReady) {
          // console.log('[Local] Download reached 100%, testing model readiness...');
          testScheduled = true;
          setHasTestedModelReady(true);
          
          // Send a test message to verify model is ready
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
          // console.log('[Local] Ready state changed:', isReady);
        });
        previousIsReady = isReady;
        
        // Stop polling once model is ready to save resources
        if (isReady) {
          // console.log('[Local] Model is ready, stopping ready state polling');
          
          if (readyInterval) {
            clearInterval(readyInterval);
            readyInterval = null;
          }
          
          // Mark model as downloaded in tracker
          DownloadedModelsTracker.markAsDownloaded(
            selectedLocalModel.id,
            selectedLocalModel.size
          );
          // console.log('[Local] Model marked as downloaded:', selectedLocalModel.id);
        }
      }
    };
    
    // Update immediately
    updateModelState();
    updateReadyState();
    
    // Only start polling if not already complete/ready
    const currentProgress = (llm as any).downloadProgress || 0;
    const currentReady = (llm as any).isReady || false;
    
    // Optimized polling - reduced frequency to prevent UI freezing
    // Only poll if not complete
    if (currentProgress < 1) {
      // Progress updates every 5 seconds (reduced from 3s for better performance)
      progressInterval = setInterval(updateModelState, 5000);
      // console.log('[Local] Started progress polling (5s interval)');
    } else {
      // console.log('[Local] Model already at 100%, skipping progress polling');
    }
    
    if (!currentReady) {
      // Ready state checked every 3 seconds (reduced from 2s for better performance)
      readyInterval = setInterval(updateReadyState, 3000);
      // console.log('[Local] Started ready state polling (3s interval)');
    } else {
      // console.log('[Local] Model already ready, skipping ready state polling');
    }
    
    return () => {
      isMounted = false;
      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }
      if (readyInterval) {
        clearInterval(readyInterval);
        readyInterval = null;
      }
    };
  }, [llm, isLocal, shouldInitializeLLM, selectedLocalModel.id, selectedLocalModel.size, hasTestedModelReady, testModelReadiness]);
  
  // Test model when switching to local mode (only once per switch)
  useEffect(() => {
    if (isLocal && deviceSupportsLocalLLM && shouldInitializeLLM && llm && !hasTestedOnSwitch) {
      // console.log('[Local] Switched to local mode, testing model readiness in 2 seconds...');
      setHasTestedOnSwitch(true);
      setHasTestedModelReady(false); // Reset download completion test flag
      
      // Abort any ongoing cloud streams when switching to local
      if (streamControllerRef.current) {
        console.log('[Local] Aborting ongoing cloud stream on switch to local');
        streamControllerRef.current.abort();
        streamControllerRef.current = null;
      }
      
      // Wait a bit for model to start loading
      const timer = setTimeout(() => {
        testModelReadiness();
      }, 2000);
      
      return () => clearTimeout(timer);
    } else if (!isLocal) {
      // Reset flag when switching away from local mode
      setHasTestedOnSwitch(false);
      
      // Clear any local generation state
      if (isSending) {
        console.log('[Cloud] Switched to cloud while local generation in progress');
        setIsSending(false);
      }
    }
  }, [isLocal, deviceSupportsLocalLLM, shouldInitializeLLM, llm, hasTestedOnSwitch, testModelReadiness, isSending]);
  
  const clearLocalModel = useCallback(() => {
    // Get current local model info
    const currentLocalModel = getLocalModelById(getDefaultLocalModelId());
    const modelSize = currentLocalModel?.size || '~1.2GB';
    const modelName = currentLocalModel?.displayName || 'Llama 3.2 1B';
    
    // Clear the downloaded models tracker
    DownloadedModelsTracker.clearAll();
    
    // This would need to be implemented in react-native-executorch
    // For now, just show a message
    Alert.alert(
      'Clear Downloaded Models',
      `To clear the ${modelName} (${modelSize}), you need to clear the app data or reinstall the app. This will free up the storage space used by downloaded models.\n\nModel tracking has been reset.`,
      [{ text: 'OK' }]
    );
  }, []);

  const contextValue = useMemo(() => ({
    isChatLoading,
    setChatLoading,
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isSending,
    stream,
    sendMessage,
    fetchMessages,
    fetchConversation,
    createConversation,
    markAsRead,
    setCurrentRoom,
    clearChat,
    deleteConversation,
    renameConversation,
    resetChat,
    createNewConversation,
    streamWorking,
    intermediate,
    appendToMessageHistory,
    handleSendLocalMessage,
    isLocal,
    setIsLocal,
    isLocalLLMSupported: deviceSupportsLocalLLM,
    localModelDownloadProgress,
    isLocalModelReady,
    clearLocalModel,
    chatError,
    clearChatError
  }), [
    isChatLoading,
    setChatLoading,
    intermediate,
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isSending,
    stream,
    sendMessage,
    fetchMessages,
    fetchConversation,
    createConversation,
    markAsRead,
    setCurrentRoom,
    clearChat,
    deleteConversation,
    renameConversation,
    resetChat,
    createNewConversation,
    streamWorking,
    appendToMessageHistory,
    handleSendLocalMessage,
    isLocal,
    setIsLocal,
    deviceSupportsLocalLLM,
    localModelDownloadProgress,
    isLocalModelReady,
    clearLocalModel,
    chatError,
    clearChatError
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const clearChatStorage = () => {
  storage.delete('chat_messages');
  storage.delete('chat_rooms');
};
