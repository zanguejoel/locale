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
import { Keyboard } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';

polyfillURL();
polyfillFetch();
polyfillEncoding();
polyfillReadableStream();

const BASE_URL = 'https://jaiime-dev.app.neptunetech.io';

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
      //laoding: isSending
    }))
    setMessages(_messages);
  }, [stream]);



  const saveBase64ToFile = async (base64: string, filename: string) => {
    const path = FileSystem.documentDirectory + filename;
    try {
      await FileSystem.writeAsStringAsync(path, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return path;
    } catch (error) {
      console.error('Error saving file: ', error);
      throw error;
    }
  };
  const sendMessage = async (message: string, messageType = 'text', operation = null) => {
    setError('');
    setStream('');
    setIntermediate('');
    setIsSending(true);

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
          const fileExists = await checkFileExists(filePath);

          if (!fileExists) {
            console.error('File does not exist at the specified path');
            return;
          }

          const fileData = await RNFS.readFile(filePath, 'base64');

          if (messageType === 'audio') {
            const savedFilePath = await saveBase64ToFile(fileData, 'audio.m4a');
            formData.append('audio', {
              uri: savedFilePath,
              type: 'audio/x-m4a',
              name: 'audio.m4a',
            });
          }
          else if (messageType === 'image') {
            const savedFilePath = await saveBase64ToFile(fileData, 'image.png');
            formData.append('image', {
              uri: savedFilePath,
              type: 'image/png',
              name: 'image.png',
            });
          }

        } catch (error) {
          console.error('Error fetching the file:', error);
          return;
        }
      } else {
        if (files && files.length > 0) {
          file = files[0];
        } else {
          console.error('No files found in `files` array');
          return;
        }

        if (file && file instanceof File) {
          if (messageType === 'audio') {
            formData.append('audio', file, file.name);
          }
          else if (messageType === 'image') {
            formData.append('image', file, file.name);
          }
        } else {
          console.error('Invalid file object:', file);
          return;
        }
      }
      setFiles([]);
    }

    if (operation) {
      formData.append('operations', JSON.stringify(operation));
    }

    const conversationId = currentConversationId || '';
    if (conversationId) {
      formData.append('conversation_id', conversationId);
    } else {
      console.error('No conversation ID provided!');
      return;
    }

    const _controller = new AbortController();

    try {
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

      const response = await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate
      );

      console.log('update message', response);

      setInputDisabled(false);
      setPastedActive(false)

    } catch (e) {
      console.error('Error in sendMessage:', e);
      console.log({
        title: 'We encountered an error.',
        description: 'Please try again',
        variant: 'destructive',
        position: 'top-right'
      });
    } finally {
      setIsSending(false);
      setInputDisabled(false);
    }
  };


  const checkFileExists = async (filePath) => {
    try {
      const stats = await RNFS.stat(filePath);
      console.log('File exists, file stats:', stats);
      return true;
    } catch (error) {
      console.error('Error checking file existence:', error);
      return false;
    }
  };


  const fetchConversation = async (q?: string) => {
    try {
      setIsLoading(true);
      await api.setAuthToken(user?.token || '');
      const response = await api.get<Conversations[]>(`/conversation/search?limit=500${q ? `&q=${q}` : ""}`);

      if (!response.ok || !response.data) {
        console.log(JSON.stringify(response.problem));
        // throw new Error(response.problem);
      }
      setConversations(response.data || []);
      if (response.data?.length && response.data[0].id) {
        setCurrentRoom(response.data[0].id);
      }
    } catch (error) {
      console.error('Fetch conversations messages error:', error);
      // throw error;
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

  const handleError = (error: string) => {
    console.log({
      title: 'We encounted an error.',
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
