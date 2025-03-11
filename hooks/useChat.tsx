import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { polyfill as polyfillURL } from 'react-native-polyfill-globals/src/url';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
import { Message, Role } from '@/utils/Interfaces';

import { processStream } from '@/utils/ChatStream';
import { Keyboard, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from './useAuth';

polyfillURL();
polyfillFetch();
polyfillEncoding();
polyfillReadableStream();

const BASE_URL = 'https://jaiime-dev.app.neptunetech.io';

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
  sendMessage: (message: string, messageType?: string, operation?: string | null) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  fetchConversation: (q?: string) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<string>;
  markAsRead: (conversationId: string) => Promise<void>;
  setCurrentRoom: (conversationId: string) => void;
  clearChat: (conversationId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<boolean>;
  renameConversation: (conversationId: string, newTitle: string) => Promise<boolean>;
  resetChat: () => void;
  createNewConversation: () => Promise<string>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([])
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [stream, setStream] = useState('');
  const [intermediate, setIntermediate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [pastedActive, setPastedActive] = useState(false);
  const [streamWorking, setStreamWorking] = useState(false);

  useEffect(() => {
    fetchConversation(null, null, setCurrentRoom);
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    setMessages(prev => updateLastItem(prev, message => ({
      ...message,
      content: stream,
    })));
  }, [stream]);


  const optimizeImage = useCallback(async (imagePath: string): Promise<string> => {
    try {
      console.log(`Optimizing image at path: ${imagePath}`);
      const fileInfo = await FileSystem.getInfoAsync(imagePath, { size: true });
      console.log(`Original image size: ${fileInfo.size} bytes`);

      if (!fileInfo.exists) {
        throw new Error(`File does not exist at path: ${imagePath}`);
      }
      if (fileInfo.size && fileInfo.size <= MAX_IMAGE_SIZE) {
        console.log('Image already optimized (size within limits)');
        return imagePath;
      }

      let actions = [];
      if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE * 1.5) {
        actions.push({ resize: { width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION } });
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

      if (optimizedInfo.size && optimizedInfo.size > MAX_IMAGE_SIZE) {
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
      console.log('Saving base64 data to file:', path);
      if (!base64 || base64.length < 10) {
        throw new Error('Invalid base64 data');
      }
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileInfo = await FileSystem.getInfoAsync(path);
      console.log('File saved successfully:', fileInfo);
      return path;
    } catch (error) {
      console.error('Error saving file: ', error);
      throw error;
    }
  }, []);

  // ---------------- Chat Operations ----------------

  const sendMessage = useCallback(async (message: string, messageType = 'text', operation: string | null = null) => {
    setError('');
    setStream('');
    setIntermediate('');
    setIsSending(true);

    setMessages(prev => [
      ...prev,
      { role: Role.User, content: message || '' },
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
          console.log('Processing file at path:', filePath);
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
            });
          } else if (messageType === 'image') {
            try {
              const optimizedImagePath = await optimizeImage(filePath);
              const mimeType = getFileType(optimizedImagePath);
              const extension = mimeType.split('/')[1];
              formData.append('image', {
                uri: optimizedImagePath,
                type: mimeType,
                name: `image.${extension}`,
              });
            } catch (imageError) {
              const fileData = await RNFS.readFile(filePath, 'base64');
              const savedFilePath = await saveBase64ToFile(fileData, 'image.png');
              formData.append('image', {
                uri: savedFilePath,
                type: 'image/png',
                name: 'image.png',
              });
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
    const conversationId = currentConversationId || '';

    if (conversationId) {
      formData.append('conversation_id', conversationId);
    } else {
      setIsSending(false);
      setInputDisabled(false);
      return;
    }

    const _controller = new AbortController();
    try {
      for (let [key, value] of formData.entries()) {
        console.log(`FormData: ${key} =`, value);
      }

      const _response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          Authorization: ' ' + user?.token,
        },
        body: formData,
        reactNative: { textStreaming: true },
        signal: _controller.signal,
      });
      if (!_response.ok) {
        const errorMessage = await _response.text();
        throw new Error(`Error: ${_response.status} - ${errorMessage}`);
      }
      await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate,
        setStreamWorking,
      );
      setInputDisabled(false);
      setPastedActive(false);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
      setInputDisabled(false);
    }
  }, [files, currentConversationId, user, checkFileExists, saveBase64ToFile, optimizeImage, getFileType, handleError]);

  const fetchConversation = useCallback(async (q?: string, limitValue?: number, updateCurrentRoom?: (a: string) => void) => {
    const effectiveLimit = limitValue || 20;
    try {
      await api.setAuthToken(user?.token || '');

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
          const unique = combined.filter((item, index, self) =>
            index === self.findIndex(t => t.id === item.id)
          );
          return unique;
        });
      } else {
        setConversations(response.data);
        if (response.data.length > 0 && response.data[0].id) {
          updateCurrentRoom?.(response.data[0].id);
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

  const fetchMessages = useCallback(async (conversationId: string) => {
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
    setCurrentConversationId(conversationId);
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
      await api.setAuthToken(user?.token || '');
      const response = await api.delete(`/conversation/${conversationId}`);
      if (!response.ok) {
        console.log(JSON.stringify(response.problem));
        return false;
      }
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
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
      await api.setAuthToken(user?.token || '');
      const response = await api.put(`/conversation/${conversationId}`, { title: newTitle });
      if (!response.ok) {
        console.log(JSON.stringify(response.problem));
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
      await api.setAuthToken(user?.token || '');
      const response = await api.post('/conversation', { title: 'New Chat' });
      if (!response.ok || !response.data) {
        throw new Error('Failed to create new conversation');
      }
      const newConversation = response.data;
      setConversations(prev => [newConversation, ...prev]);
      setCurrentRoom(newConversation.id);
      resetChat();
      return newConversation.id;
    } catch (error) {
      console.error('Create new conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, setConversations, setCurrentRoom, resetChat]);

  const handleError = useCallback((error: string) => {
    console.log({
      title: 'We encountered an error.',
      description: error,
      variant: 'destructive',
      position: 'top-right'
    });
  }, []);

  const contextValue = useMemo(() => ({
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
  }), [
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
