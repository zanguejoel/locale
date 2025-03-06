import React, { createContext, useContext, useState, useEffect } from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { polyfill as polyfillURL } from 'react-native-polyfill-globals/src/url';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
import { Message, Role } from '@/utils/Interfaces';
import { User } from '@/constants/Types';
import { processStream } from '@/utils/ChatStream';
import { Keyboard, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';

polyfillURL();
polyfillFetch();
polyfillEncoding();
polyfillReadableStream();

const BASE_URL = 'https://jaiime-dev.app.neptunetech.io';

// Constants for image optimization
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB max file size
const MAX_IMAGE_DIMENSION = 1200; // Maximum width/height dimension

function updateLastItem<T>(
  array: T[],
  updateFn: (item: T) => T
): T[] {
  if (array.length === 0) {
    return array;
  }

  return [
    ...array.slice(0, -1),
    updateFn(array[array.length - 1])
  ];
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
  const [user] = useMMKVStorage<User | null>('user', null);
  const [conversations, setConversations] = useMMKVStorage<Conversations[]>('chat_conversations', []);
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

  useEffect(() => {
    fetchConversation();
    Keyboard.dismiss();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      fetchMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    const _messages = updateLastItem(messages || [], message => ({
      ...message,
      content: stream,
    }));
    setMessages(_messages);
  }, [stream]);

  // Function to optimize image size and quality
  const optimizeImage = async (imagePath: string): Promise<string> => {
    try {
      console.log(`Optimizing image at path: ${imagePath}`);

      // Get file info to check size
      const fileInfo = await FileSystem.getInfoAsync(imagePath, { size: true });
      console.log(`Original image size: ${fileInfo.size} bytes`);

      if (!fileInfo.exists) {
        throw new Error(`File does not exist at path: ${imagePath}`);
      }

      // If file is already small enough, return as is
      if (fileInfo.size && fileInfo.size <= MAX_IMAGE_SIZE) {
        console.log('Image already optimized (size within limits)');
        return imagePath;
      }

      // First resize the image if needed
      let actions = [];
      if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE * 1.5) {
        actions.push({ resize: { width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION } });
      }

      // Apply compression based on original file size
      let compression = 0.8; // Default compression
      if (fileInfo.size && fileInfo.size > MAX_IMAGE_SIZE * 3) {
        compression = 0.6; // Higher compression for very large files
      }

      // Use ImageManipulator to optimize
      const result = await ImageManipulator.manipulateAsync(
        imagePath,
        actions,
        { compress: compression, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Check the optimized size
      const optimizedInfo = await FileSystem.getInfoAsync(result.uri, { size: true });
      console.log(`Optimized image size: ${optimizedInfo.size} bytes`);

      // Further compress if still too large
      if (optimizedInfo.size && optimizedInfo.size > MAX_IMAGE_SIZE) {
        console.log('Additional compression needed');
        const finalResult = await ImageManipulator.manipulateAsync(
          result.uri,
          [],
          { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
        );

        const finalInfo = await FileSystem.getInfoAsync(finalResult.uri, { size: true });
        console.log(`Final image size after extra compression: ${finalInfo.size} bytes`);

        return finalResult.uri;
      }

      return result.uri;
    } catch (error) {
      console.error('Error optimizing image:', error);
      return imagePath; // Return original path on error
    }
  };

  // Function to determine file type from path
  const getFileType = (filePath: string): string => {
    const extension = filePath.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'heic', 'heif'].includes(extension)) {
      return extension === 'png' ? 'image/png' : 'image/jpeg';
    }

    // Default to jpeg if unknown
    return 'image/jpeg';
  };

  const sendMessage = async (message: string, messageType = 'text', operation = null) => {
    setError('');
    setStream('');
    setIntermediate('');
    setIsSending(true);

    console.log(`Sending message: Type=${messageType}, Has content=${!!message}`);

    setMessages((state) => [
      ...state,
      { role: Role.User, content: message || '' },
      { role: Role.Bot, content: '' },
    ]);

    const formData = new FormData();

    if (messageType !== 'audio' && messageType !== 'image' && message && typeof message === 'string') {
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
            console.error('File does not exist at the specified path:', filePath);
            setIsSending(false);
            setInputDisabled(false);
            Alert.alert('Error', 'The selected file could not be found.');
            return;
          }

          console.log('File exists, processing content');

          if (messageType === 'audio') {
            const fileData = await RNFS.readFile(filePath, 'base64');
            console.log('Audio data length:', fileData.length);

            const savedFilePath = await saveBase64ToFile(fileData, 'audio.m4a');
            console.log('Saved audio file to:', savedFilePath);
            formData.append('audio', {
              uri: savedFilePath,
              type: 'audio/x-m4a',
              name: 'audio.m4a',
            });
          }
          else if (messageType === 'image') {
            try {
              // First optimize the image
              const optimizedImagePath = await optimizeImage(filePath);
              console.log('Optimized image path:', optimizedImagePath);

              // Get the appropriate mime type
              const mimeType = getFileType(optimizedImagePath);
              const extension = mimeType.split('/')[1];

              // Append to form data with correct name and type
              formData.append('image', {
                uri: optimizedImagePath,
                type: mimeType,
                name: `image.${extension}`,
              });

              console.log('Image added to form data:', {
                uri: optimizedImagePath,
                type: mimeType,
                name: `image.${extension}`,
              });
            } catch (imageError) {
              console.error('Error processing image:', imageError);

              // Fallback to original method if optimization fails
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
          console.error('Error fetching the file:', error);
          setIsSending(false);
          setInputDisabled(false);
          Alert.alert('Error', 'There was a problem processing your file.');
          return;
        }
      } else {
        if (files && files.length > 0) {
          file = files[0];
          console.log('Using file from files array:', file?.name);
        } else {
          console.error('No files found in `files` array');
          setIsSending(false);
          setInputDisabled(false);
          return;
        }

        if (file && file instanceof File) {
          if (messageType === 'audio') {
            formData.append('audio', file, file.name);
            console.log('Added audio file to formData:', file.name);
          }
          else if (messageType === 'image') {
            formData.append('image', file, file.name);
            console.log('Added image file to formData:', file.name);
          }
        } else {
          console.error('Invalid file object:', file);
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
      console.error('No conversation ID provided!');
      setIsSending(false);
      setInputDisabled(false);
      return;
    }

    const _controller = new AbortController();

    try {
     //  console.log('Sending request to API:', `${BASE_URL}/chat`);

      // Log the formData contents before sending
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
        console.error(`API error: ${_response.status} - ${errorMessage}`);
        throw new Error(`Error: ${_response.status} - ${errorMessage}`);
      }

      console.log('API response received, processing stream');
      const response = await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate
      );

      console.log('Stream processing complete:', response);

      setInputDisabled(false);
      setPastedActive(false);

    } catch (e) {
      console.error('Error in sendMessage:', e);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSending(false);
      setInputDisabled(false);
    }
  };

  // Enhanced file existence check
  const checkFileExists = async (filePath) => {
    try {
      console.log('Checking file existence at:', filePath);

      // Handle file:// prefix for iOS
      let path = filePath;
      if (Platform.OS === 'ios' && !path.startsWith('file://')) {
        path = `file://${path}`;
      }

      const stats = await RNFS.stat(path);
      console.log('File exists, file stats:', stats);

      // Additional validation - check file size is greater than 0
      if (stats.size === 0) {
        console.warn('File exists but has 0 bytes size');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  };

  // Improved base64 to file saving
  const saveBase64ToFile = async (base64: string, filename: string) => {
    const path = FileSystem.documentDirectory + filename;
    try {
      console.log('Saving base64 data to file:', path);
      console.log('Base64 data length:', base64.length);

      // Make sure base64 data is valid
      if (!base64 || base64.length < 10) {
        console.error('Invalid base64 data, too short');
        throw new Error('Invalid base64 data');
      }

      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Verify file was created
      const fileInfo = await FileSystem.getInfoAsync(path);
      console.log('File saved successfully:', fileInfo);

      return path;
    } catch (error) {
      console.error('Error saving file: ', error);
      throw error;
    }
  };


  const fetchConversation = async (q?: string) => {
    try {
      setIsLoading(true);
      await api.setAuthToken(user?.token || '');
      const response = await api.get<Conversations[]>(`/conversation/search?limit=20${q ? `&q=${q}` : ""}`);

      if (!response.ok || !response.data) {
        console.log(JSON.stringify(response.problem));
      }
      setConversations(response.data || []);
      if (response.data?.length && response.data[0].id) {
        setCurrentRoom(response.data[0].id);
      }
    } catch (error) {
      console.error('Fetch conversations messages error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      setIsLoading(true);
      const response = await api.get<Message[]>(`/conversation/${conversationId}/logs`, {
        params: {
          conversation_id: conversationId,
          limit: 50,
        },
      });

      if (!response.ok || !response.data) {
        //throw new Error('Failed to fetch messages');
      }
      const messages = response.data.map(m => ({ ...m, role: `${m.role}` === "assistant" ? Role.Bot : Role.User }))
      setMessages(messages || []);
    } catch (error) {
      console.error('Fetch messages error:', error);
      // throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const createConversation = async (participantIds: string[]): Promise<string> => {
    try {
      setIsLoading(true);
      const response = await api.post<ChatRoom>('/chat/rooms', {
        participants: participantIds
      });

      if (!response.ok || !response.data) {
        throw new Error('Failed to create chat room');
      }

      const newRoom = response.data;
      setConversations(prev => [...prev, newRoom]);
      await setCurrentRoom(newRoom.id);
      return newRoom.id;
    } catch (error) {
      console.error('Create chat room error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (conversationId: string) => {
    try {
      //  console.log('Handle set read');
    } catch (error) {
      console.error('Mark as read error:', error);
      throw error;
    }
  };

  const setCurrentRoom = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    markAsRead(conversationId);
  };

  const clearChat = async (conversationId: string) => {
    try {
      await api.delete(`/chat/rooms/${conversationId}/messages`);
      setMessages(prev => {
        const newMessages = { ...prev };
        delete newMessages[conversationId];
        return newMessages;
      });
    } catch (error) {
      console.error('Clear chat error:', error);
      throw error;
    }
  };
  const resetChat = () => {
    setMessages([]);
    setStream('');
    setIntermediate('');
  };

  const deleteConversation = async (conversationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await api.setAuthToken(user?.token || '');
      const response = await api.delete(`/conversation/${conversationId}`);

      if (!response.ok) {
        console.log(JSON.stringify(response.problem));
        return false;
      }

      // Update the conversations list by removing the deleted conversation
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));

      // If the current conversation was deleted, reset to the first available conversation or clear
      if (currentConversationId === conversationId) {
        if (conversations.length > 1) {
          const nextConversation = conversations.find(c => c.id !== conversationId);
          if (nextConversation?.id) {
            setCurrentRoom(nextConversation.id);
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
  };

  const renameConversation = async (conversationId: string, newTitle: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      await api.setAuthToken(user?.token || '');
      const response = await api.put(`/conversation/${conversationId}`, {
        title: newTitle
      });

      if (!response.ok) {
        console.log(JSON.stringify(response.problem));
        return false;
      }

      // Update the conversations list with the new title
      setConversations(prev =>
        prev.map(conv =>
          conv.id === conversationId
            ? { ...conv, title: newTitle }
            : conv
        )
      );

      return true;
    } catch (error) {
      console.error('Rename conversation error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const createNewConversation = async (): Promise<string> => {
    try {
      setIsLoading(true);
      await api.setAuthToken(user?.token || '');
      const response = await api.post('/conversation', {
        title: 'New Chat'
      });

      if (!response.ok || !response.data) {
        console.log(JSON.stringify(response.problem));
        throw new Error('Failed to create new conversation');
      }

      const newConversation = response.data;

      // Add the new conversation to the list
      setConversations(prev => [newConversation, ...prev]);

      // Set as current conversation
      setCurrentRoom(newConversation.id);
      resetChat();

      return newConversation.id;
    } catch (error) {
      console.error('Create new conversation error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = (error: string) => {
    console.log({
      title: 'We encountered an error.',
      description: error,
      variant: 'destructive',
      position: 'top-right'
    });
  };

  return (
    <ChatContext.Provider
      value={{
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
      }}
    >
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