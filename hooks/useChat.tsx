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

import useMMKVStorage, { storage } from './useMMKVStorage';
import api, { API_URL_PROD } from '@/utils/ApiClient';
import { Message, Role } from '@/utils/Interfaces';
import { processStream } from '@/utils/ChatStream';
import { Keyboard, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from './useAuth';
import { getDefaultModelId } from './useDefaultModel';
import { getDefaultLocalModelId } from './useDefaultLocalModel';
import { getToken } from '@/utils/SecureTokenManager';
import { formatAuthHeader } from '@/utils/AuthHelpers';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AIEvent } from '@/types/mixpanel';
import { useLocalModel } from './useLocalModel';

// Import API_URL_PROD from ApiClient configuration
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
  clearAllConversations: () => Promise<boolean>;
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
  // ============ Debugging & Lifecycle Management ============
  const mountTimeRef = useRef(Date.now());
  const lastRenderLogRef = useRef(0);
  
  // Throttle render logs to prevent log spam (log at most every 1 second)
  const now = Date.now();
  if (now - lastRenderLogRef.current > 1000) {
    console.log('[ChatProvider] Rendering - mount time:', mountTimeRef.current, 'age:', now - mountTimeRef.current, 'ms');
    lastRenderLogRef.current = now;
  }
  
  const { user } = useAuth();
  
  // ============ Conversation State ============
  const [conversations, setConversations] = useState<Conversations[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  
  // ============ Message State ============
  const [messages, setMessages] = useState<Message[]>([]);
  const [additionalData, setAdditionalData] = useState<any[]>([]);
  
  // ============ Loading & Sending State ============
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false);
  const isSendingRef = useRef(isSending);
  
  // ============ Streaming State ============
  const [stream, setStream] = useState('');
  const [intermediate, setIntermediate] = useState('');
  const [streamWorking, setStreamWorking] = useState(false);
  const streamWorkingRef = useRef(streamWorking);
  const intermediateRef = useRef(intermediate);
  
  // ============ Error State ============
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState<ChatError | null>(null);
  
  // ============ File Handling State ============
  const [files, setFiles] = useState<any[]>([]);
  const [pastedActive, setPastedActive] = useState(false);
  
  // ============ Request Management ============
  const streamControllerRef = useRef<AbortController | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  
  // ============ Message Timing ============
  const lastMessageUpdateTimeRef = useRef(0);
  const messageStartTimeRef = useRef(0);
  const MESSAGE_UPDATE_THROTTLE_MS = 50;
  
  // ============ Message History Management ============
  const appendToMessageHistory = useCallback((message: string, role: Role) => {
    try {
      if (typeof message !== 'string') {
        console.error('[Chat] Invalid message type:', typeof message, message);
        return;
      }
      if (role !== Role.User && role !== Role.Bot) {
        console.error('[Chat] Invalid role:', role);
        return;
      }
      setMessages(prev => {
        try {
          return [...prev, { role, content: message }];
        } catch (error) {
          console.error('[Chat] Error creating new messages array:', error);
          return prev; // Return previous state on error
        }
      });
    } catch (error) {
      console.error('[Chat] Error in appendToMessageHistory:', error);
    }
  }, []);
  
  // ============ Local Model Integration ============
  // Note: messages is passed but useLocalModel uses a ref internally to avoid infinite loops
  const localModel = useLocalModel({
    currentConversationId,
    onStreamUpdate: setStream,
    onSendingUpdate: setIsSending,
    onStreamWorkingUpdate: setStreamWorking,
    onIntermediateUpdate: setIntermediate,
    messages,
    appendToMessageHistory,
  });
  
  // ============ Update Refs When State Changes ============
  useEffect(() => {
    isSendingRef.current = isSending;
    streamWorkingRef.current = streamWorking;
    intermediateRef.current = intermediate;
  }, [isSending, streamWorking, intermediate]);
  
  // ============ Effective Sending State ============
  // Safety mechanism: Keep isSending true while we have intermediate state
  // Note: stream is NOT included here as it persists after sending completes
  const effectiveIsSending = useMemo(() => 
    isSending || !!intermediate,
    [isSending, intermediate]
  );


  // ============ Cleanup on Unmount ============
  useEffect(() => {
    return () => {
      const lifetime = Date.now() - mountTimeRef.current;
      console.log('[ChatProvider] ⚠️ UNMOUNTING after', lifetime, 'ms of life');
      console.log('[ChatProvider] Current state at unmount:', {
        isSending: isSendingRef.current,
        streamWorking: streamWorkingRef.current,
        intermediate: intermediateRef.current,
        hasMessages: messages.length > 0,
        currentConversationId: currentConversationIdRef.current,
      });
      
      // Clean up abort controllers
      if (streamControllerRef.current) {
        console.log('[ChatProvider] ⚠️ Aborting active stream controller on unmount!');
        try {
          streamControllerRef.current.abort();
        } catch (e) {
          console.warn('[ChatProvider] Error aborting stream controller:', e);
        }
        streamControllerRef.current = null;
      }
      
      if (fetchControllerRef.current) {
        try {
          fetchControllerRef.current.abort();
        } catch (e) {
          console.warn('[ChatProvider] Error aborting fetch controller:', e);
        }
        fetchControllerRef.current = null;
      }
      
      console.log('[ChatProvider] Cleanup complete');
    };
  }, []);

  // ============ Conversation ID Sync ============
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // ============ Initial Conversation Fetch ============
  useEffect(() => {
    if (user?.user_id) {
      fetchConversation(undefined, undefined, setCurrentRoom);
      Keyboard.dismiss();
    }
  }, [user]);

  // ============ Message Update Handler (Throttled) ============
  useEffect(() => {
    // console.log('[useChat] Updating message - stream length:', stream?.length, 'additionalData:', additionalData);
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastMessageUpdateTimeRef.current;
    
    // Record message start time for new messages
    if (isSending && stream.length === 0 && additionalData?.length === 0 && !intermediate) {
      const timeSinceMessageStart = now - messageStartTimeRef.current;
      if (messageStartTimeRef.current === 0 || timeSinceMessageStart > 2000) {
        messageStartTimeRef.current = now;
      }
    }
    
    // Always show intermediate state immediately (no throttling)
    // Always show additional_data immediately (no throttling)
    const shouldUpdateImmediately = intermediate || additionalData?.length > 0;
    
    // Throttle regular stream updates to prevent excessive re-renders
    if (!shouldUpdateImmediately && 
        timeSinceLastUpdate < MESSAGE_UPDATE_THROTTLE_MS && 
        stream.length > 0) {
      // Will update on next throttle window
      return;
    }
    
    lastMessageUpdateTimeRef.current = now;
    
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
  }, [stream, additionalData, isSending, intermediate]);

  // Helper function to abort current stream and wait for cleanup
  const abortCurrentStream = useCallback(async () => {
    if (streamControllerRef.current) {
      console.log('[Chat] Aborting current stream...');
      try {
        streamControllerRef.current.abort();
        // Wait a tick for abort to propagate through the stream processing
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (e) {
        console.warn('[Chat] Error aborting stream:', e);
      } finally {
        streamControllerRef.current = null;
      }
    }
  }, []);

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
    
    // Set sending state FIRST (both state and ref for immediate UI update)
    console.log('[Cloud] ✅ Setting isSending = true at start of sendMessage');
    isSendingRef.current = true;
    setIsSending(true);
    
    // Reset all streaming states
    setChatLoading(true)
    setError('');
    setChatError(null); // Clear any previous errors
    setStream('');
    setIntermediate(''); // Clear intermediate initially - will be set by stream or remain empty for loading dots
    setAdditionalData([]); // Reset additional data for new message
    setStreamWorking(false); // Reset stream working state

    setMessages(prev => [
      ...prev,
      { role: Role.User, content: messageType === 'image' ? additionalData : message || '', imageData: message },
      { role: Role.Bot, content: '' }, // Empty content - will show loading dots until stream starts
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
            isSendingRef.current = false;
            setIsSending(false);
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
          isSendingRef.current = false;
          setIsSending(false);
          return;
        }
      } else {
        if (files && files.length > 0) {
          file = files[0];
        } else {
          isSendingRef.current = false;
          setIsSending(false);
          return;
        }
        if (file && file instanceof File) {
          if (messageType === 'audio') {
            formData.append('audio', file, file.name);
          } else if (messageType === 'image') {
            formData.append('image', file, file.name);
          }
        } else {
          isSendingRef.current = false;
          setIsSending(false);
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
        isSendingRef.current = false;
        setIsSending(false);
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

    // Abort any previous stream with proper synchronization
    await abortCurrentStream();
    
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
        isSendingRef.current = false;
        setIsSending(false);
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
        
        // Reset all streaming states on error
        isSendingRef.current = false;
        setIsSending(false);
        setChatLoading(false);
        setStreamWorking(false);
        setIntermediate('');
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
      
      setPastedActive(false);
    } catch (e: any) {
      // Check if request was aborted (user cancelled or switched conversations)
      if (e.name === 'AbortError') {
        console.log('[Cloud] Request cancelled/aborted');
        console.log('[Cloud] Abort reason:', e.message);
        // Reset streaming states on abort
        setStreamWorking(false);
        setIntermediate('');
        messageStartTimeRef.current = 0;
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
      // Always clean up streaming state
      streamControllerRef.current = null;
      console.log('[Cloud] ❌ Setting isSending = false in finally block');
      isSendingRef.current = false;
      setIsSending(false);
      setChatLoading(false);
      setStreamWorking(false); // Reset stream working state
      setIntermediate(''); // Clear intermediate state to stop loading indicator
      messageStartTimeRef.current = 0; // Reset for next message
      
      // Don't reset additionalData here - it needs to persist in the message
      // Don't reset stream here - it's used for display and doesn't affect input state
      console.log('[Cloud] Send message completed, clearing states');
    }
    
  }, [files, currentConversationId, user, checkFileExists, saveBase64ToFile, optimizeImage, getFileType, handleError, abortCurrentStream]);

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
    
    // Abort any ongoing stream when switching conversations (with proper synchronization)
    await abortCurrentStream();
    
    // Reset all streaming states when switching conversations
    // Do this after abort completes to prevent race conditions
    setStream('');
    setIntermediate('');
    setStreamWorking(false);
    isSendingRef.current = false;
    setIsSending(false);
    setAdditionalData([]);
    messageStartTimeRef.current = 0; // Reset message timer
    
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
  }, [abortCurrentStream]);

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

  const resetChat = useCallback(async () => {
    // Abort any ongoing streams with proper synchronization
    await abortCurrentStream();
    
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
    
    // Reset all chat and streaming states
    setMessages([]);
    setStream('');
    setIntermediate('');
    setStreamWorking(false);
    isSendingRef.current = false;
    setIsSending(false);
    setAdditionalData([]); // Reset additional data when clearing chat
    setChatError(null); // Clear any errors
    setCurrentConversationId(null); // Clear conversation ID to prevent refetch
    messageStartTimeRef.current = 0; // Reset message timer
  }, [abortCurrentStream]);

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

  const clearAllConversations = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = await getToken();
      await api.setAuthToken(token || '');
      
      // Delete all conversations one by one
      const deletePromises = conversations.map(conv => 
        api.delete(`/conversation/${conv.id}`)
      );
      
      const results = await Promise.all(deletePromises);
      const allSucceeded = results.every(response => response.ok);
      
      if (allSucceeded) {
        setConversations([]);
        setMessages([]);
        setCurrentConversationId(null);
        resetChat();
        return true;
      }
      
      return false;
    } catch (error) {
      // console.error('Clear all conversations error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [conversations, resetChat]);

  const createNewConversation = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);
      const token = await getToken();
      await api.setAuthToken(token || '');
      
      // Get default model based on current mode
      const defaultModelId = localModel.isLocal ? getDefaultLocalModelId() : getDefaultModelId();
      
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
  }, [user, setConversations, setCurrentRoom, resetChat, localModel.isLocal]);

  const contextValue = useMemo(() => {
    // Temporarily disabled to investigate crash
    // if (__DEV__) {
    //   console.log('[useChat] Context value updated - isSending:', isSending, 'effectiveIsSending:', effectiveIsSending, 'hasIntermediate:', !!intermediate, 'streamLength:', stream?.length || 0);
    // }
    
    return {
      isChatLoading,
      setChatLoading,
      messages,
      conversations,
      currentConversationId,
      isLoading,
      isSending: effectiveIsSending, // Use effectiveIsSending to keep it true during streaming/intermediate
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
      clearAllConversations,
      resetChat,
      createNewConversation,
      streamWorking,
      intermediate,
      appendToMessageHistory,
      handleSendLocalMessage: localModel.handleSendLocalMessage,
      isLocal: localModel.isLocal,
      setIsLocal: localModel.setIsLocal,
      isLocalLLMSupported: localModel.isLocalLLMSupported,
      localModelDownloadProgress: localModel.localModelDownloadProgress,
      isLocalModelReady: localModel.isLocalModelReady,
      clearLocalModel: localModel.clearLocalModel,
      chatError,
      clearChatError
    };
  }, [
    isChatLoading,
    setChatLoading,
    intermediate,
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isSending,
    effectiveIsSending,
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
    clearAllConversations,
    resetChat,
    createNewConversation,
    streamWorking,
    appendToMessageHistory,
    localModel,
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
