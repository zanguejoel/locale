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
} from 'react';
import {
  LLAMA3_2_1B,
  LLAMA3_2_1B_TOKENIZER,
  useLLM,
} from 'react-native-executorch';

import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { Message, Role } from '@/utils/Interfaces';


import { processStream, filterSpecialTokens } from '@/utils/ChatStream';
import { Keyboard, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from './useAuth';
import { getDefaultModelId } from './useDefaultModel';
import { getDefaultLocalModelId } from './useDefaultLocalModel';
import { isLocalLLMSupported, getLocalLLMUnsupportedMessage } from '@/utils/DeviceCapabilities';
import { getToken } from '@/utils/SecureTokenManager';
import { formatAuthHeader } from '@/utils/AuthHelpers';
import { getLocalModelById } from '@/constants/LocalModels';

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
}

export interface ChatRoom {
  id: string;
  participants: string[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

interface ChatContextType {
  messages: Message[];
  conversations: Conversations[];
  currentConversationId: string | null;
  isLoading: boolean;
  isSending: boolean;
  stream: string;
  sendMessage: (message: string, messageType?: string, operation?: string | null, additionalData?: string) => Promise<void>;
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
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversations[]>([])
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
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
  
  // Check if device supports local LLM
  const deviceSupportsLocalLLM = useMemo(() => isLocalLLMSupported(), []);
  
  // Always call the hook (Rules of Hooks), but only on supported devices
  // The hook itself will handle lazy loading
  const llm = deviceSupportsLocalLLM ? useLLM({
    modelSource: LLAMA3_2_1B,
    tokenizerSource: LLAMA3_2_1B_TOKENIZER
  }) : null;


  useEffect(() => {
    fetchConversation(undefined, undefined, setCurrentRoom);
    Keyboard.dismiss();
  }, []);


  useEffect(() => {
    setMessages(prev => updateLastItem(prev, message => ({
      ...message,
      content: stream,
      files: additionalData
    })));
  }, [stream, additionalData]);

  useEffect(() => {
    if(llm && llm.response) {
      // Filter out special tokens like <|python_tag|>, <|end|>, etc.
      const filteredResponse = filterSpecialTokens(llm.response);
      setStream(filteredResponse);
    }
  }, [llm?.response]);
  
  // Log LLM state changes for debugging
  useEffect(() => {
    if (llm && isLocal) {
      console.log('[Local] LLM state update:', {
        isModelReady: (llm as any).isModelReady,
        downloadProgress: (llm as any).downloadProgress,
        isGenerating: llm.isGenerating,
        error: llm.error,
        allProps: Object.keys(llm)
      });
    }
  }, [llm, isLocal, (llm as any)?.isModelReady, (llm as any)?.downloadProgress, llm?.isGenerating]);

 
  const handleSendLocalMessage = async (message: string) => {
    console.log('[Local] Starting local message send:', message);
    
    // Check if device supports local LLM
    if (!deviceSupportsLocalLLM) {
      console.error('[Local] Device does not support local LLM');
      Alert.alert(
        'Local LLM Not Supported',
        getLocalLLMUnsupportedMessage(),
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Check if LLM hasn't been initialized yet (shouldn't happen but safety check)
    if (!llm) {
      console.error('[Local] LLM not initialized');
      Alert.alert(
        'Model Initializing',
        'The local model is being initialized. Please wait a moment and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Log LLM state for debugging
    console.log('[Local] LLM state:', { 
      isModelReady: (llm as any).isModelReady,
      isGenerating: llm.isGenerating,
      downloadProgress: (llm as any).downloadProgress,
      response: llm.response?.substring(0, 50),
    });
    
    // Check if model is ready
    if (!(llm as any).isModelReady) {
      const progress = (llm as any).downloadProgress || 0;
      console.error('[Local] Model not ready. Download progress:', progress);
      
      Alert.alert(
        'Model Not Ready',
        progress > 0 && progress < 1
          ? `The local model is downloading: ${Math.round(progress * 100)}% complete. Please wait for the download to finish.`
          : 'The local model is not ready. It may be downloading (1.2GB). Please wait and try again.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Add user message to chat
    appendToMessageHistory(message, Role.User);
    appendToMessageHistory('...', Role.Bot);
    
    try {
      console.log('[Local] Calling llm.generate...');
      const result = await llm.generate(message);
      console.log('[Local] Generation result:', result);
      return result;
    } catch (error) {
      console.error('[Local] LLM generation error:', error);
      
      // Check if error is due to model still loading
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('still loading') || errorMessage.includes('not loaded')) {
        Alert.alert(
          'Model Loading',
          'The local model is still downloading (1.2GB). This may take several minutes. Please wait and try again, or use cloud models instead.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to generate response with local LLM. Please try again or switch to cloud models.',
          [{ text: 'OK' }]
        );
      }
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
      console.error('Error optimizing image:', error);
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
        console.warn('File exists but has 0 bytes size');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error checking file existence:', error);
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
      console.error('Error saving file: ', error);
      throw error;
    }
  }, []);
  const appendToMessageHistory = useCallback((message: string, role: Role) => {
    setMessages(prev => [...prev, { role, content: message }]);
  }, []);

  const handleError = useCallback((error: string) => {
    console.error({
      title: 'We encountered an error.',
      description: error,
      variant: 'destructive',
      position: 'top-right'
    });
  }, []);

  // ---------------- Chat Operations ----------------

  const sendMessage = useCallback(async (message: string, messageType = 'text', operation: string | null = null, additionalData: string = '') => {
    console.log('[Cloud] Starting cloud message send:', { message, messageType, operation });
    
    setChatLoading(true)
    setError('');
    setStream('');
    setIntermediate('');
    setIsSending(true);

    setMessages(prev => [
      ...prev,
      { role: Role.User, content: messageType === 'image' ? additionalData : message || '', imageData: message },
      { role: Role.Bot, content: '' },
    ]);

    const formData = new FormData();

    if (messageType !== 'audio' && messageType !== 'image' && message) {
      formData.append('text', message);
    }

    if (files?.length || messageType === 'audio' || messageType === 'image') {
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

    const _controller = new AbortController();
    try {
      // Get token from secure storage
      const token = await getToken();
      console.log('[Cloud] Token exists:', !!token);
      
      if (!token) {
        console.error('[Cloud] No token found');
        Alert.alert('Error', 'Authentication required. Please sign in again.');
        setIsSending(false);
        setInputDisabled(false);
        setChatLoading(false);
        return;
      }
      
      // Log token info (first/last 10 chars for debugging without exposing full token)
      console.log('[Cloud] Token preview:', token.substring(0, 10) + '...' + token.substring(token.length - 10));
      console.log('[Cloud] Token length:', token.length);

      console.log('[Cloud] Sending fetch request to:', `${BASE_URL}/chat`);
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
        signal: _controller.signal,
        // Ensure streaming is enabled
        cache: 'no-cache',
      });
      console.log('[Cloud] Fetch response status:', _response.status, 'ok:', _response.ok);
      console.log('[Cloud] Response headers:', Object.fromEntries(_response.headers.entries()));
      console.log('[Cloud] Response body exists:', !!_response.body);
      
      if (!_response.ok) {
        const errorMessage = await _response.text();
        console.error('[Cloud] Error response:', errorMessage);
        
        // Handle authentication errors specifically
        if (_response.status === 401) {
          Alert.alert(
            'Authentication Error',
            'Your session has expired. Please sign in again.',
            [{ text: 'OK' }]
          );
          // Optionally: navigate to login screen
          // router.replace('/login');
        } else {
          Alert.alert('Error', `Server error: ${_response.status}`);
        }
        
        setIsSending(false);
        setInputDisabled(false);
        setChatLoading(false);
        return;
      }
      
      console.log('[Cloud] Starting processStream...');
      await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate,
        setStreamWorking,
        setAdditionalData
      );
      console.log('[Cloud] processStream completed');
      setInputDisabled(false);
      setPastedActive(false);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
      setInputDisabled(false);
      setChatLoading(false)
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
        console.error(JSON.stringify(response.problem));
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
      console.error('Fetch conversations error:', error);
      return [];
    } finally {
      if (effectiveLimit === 20) {
        setIsLoading(false);
      }
    }
  }, [user]);

  const fetchMessages = useCallback(async (conversationId?: string) => {
    if (!conversationId) return;
    try {
      setIsLoading(true);
      const response = await api.get<Message[]>(`/conversation/${conversationId}/logs`, {
        params: { conversation_id: conversationId, limit: 50 },
      });
      if (response.ok && response.data) {
        const msgs = response.data.map(m => ({
          ...m,
          role: `${m.role}` === "assistant" ? Role.Bot : Role.User,
        }));
        setMessages(msgs || []);
      }
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
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
      console.error('Create conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (conversationId: string) => {
    try {
    } catch (error) {
      console.error('Mark as read error:', error);
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
      console.error('Clear chat error:', error);
      throw error;
    }
  }, []);

  const resetChat = useCallback(() => {
    setMessages([]);
    setStream('');
    setIntermediate('');
  }, []);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const token = await getToken();
      await api.setAuthToken(token || '');
      const response = await api.delete(`/conversation/${conversationId}`);
      if (!response.ok) {
        console.error(JSON.stringify(response.problem));
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
      console.error('Delete conversation error:', error);
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
        console.error(JSON.stringify(response.problem));
        return false;
      }
      setConversations(prev =>
        prev.map(conv => conv.id === conversationId ? { ...conv, title: newTitle } : conv)
      );
      return true;
    } catch (error) {
      console.error('Rename conversation error:', error);
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
      const response = await api.post<Conversations>('/conversation', { title: 'New Chat' });
      if (!response.ok || !response.data) {
        throw new Error('Failed to create new conversation');
      }
      const newConversation = response.data;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentRoom(newConversation.id || '');
      resetChat();
      return newConversation.id || '';
    } catch (error) {
      console.error('Create new conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, setConversations, setCurrentRoom, resetChat]);

  // Get local model state
  const localModelDownloadProgress = useMemo(() => {
    if (!llm) return 0;
    return (llm as any).downloadProgress || 0;
  }, [llm, (llm as any)?.downloadProgress]);
  
  const isLocalModelReady = useMemo(() => {
    if (!llm) return false;
    return (llm as any).isModelReady || false;
  }, [llm, (llm as any)?.isModelReady]);
  
  const clearLocalModel = useCallback(() => {
    // Get current local model info
    const currentLocalModel = getLocalModelById(getDefaultLocalModelId());
    const modelSize = currentLocalModel?.size || '~80MB';
    const modelName = currentLocalModel?.displayName || 'local model';
    
    // This would need to be implemented in react-native-executorch
    // For now, just show a message
    Alert.alert(
      'Clear Downloaded Models',
      `To clear the ${modelName} (${modelSize}), you need to clear the app data or reinstall the app. This will free up the storage space used by downloaded models.`,
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
    clearLocalModel
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
    clearLocalModel
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
