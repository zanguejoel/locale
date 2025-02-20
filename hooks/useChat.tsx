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
    if(currentConversationId) {
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

  const sendMessage = async (
    message: string,
    messageType = 'text',
    operation = null,
  ) => {
    setError('');
    setStream('');
    setIntermediate('');
    setIsSending(true);
    

    setMessages((state) => [
      ...state,
      { role: Role.User, content: message || '' },
      { role: Role.Bot, content: '', /* loading: true  */}
    ]);

    const formData = new FormData();
    let file = null;
    formData.append(
      'text',
      ['text', 'phone'].includes(messageType) && typeof message === 'string'
        ? message
        : ''
    );
    if (files?.length || messageType === 'audio') {
      file = ['phone', 'audio'].includes(messageType)
        ? [
            new File([message], `recorded-audio.wav`, {
              type: message?.type || 'audio/wav',
              lastModified: new Date().getTime()
            })
          ]
        : [...files];

      file.forEach((_file, i) => {
        formData.append(
          ['phone', 'audio'].includes(messageType) ? 'audio' : `files`,
          _file,
          _file.name
        );
      });
      setFiles([]);
    }

    try {
      formData.append('operations', JSON.stringify(operation));
     
      formData.append('conversation_id', currentConversationId || '');
      const _controller = new AbortController();
      const _response = await fetch(`${BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          Authorization: ' ' + user?.token,
          'Content-Type': 'application/json',
        },
        body: formData,
        reactNative: { textStreaming: true },
        signal: _controller.signal,
        
      });
      // console.log("API response--",  _response);

      if (!_response.ok) {
        const errorMessage = await _response.text();
        throw new Error(`Error: ${_response.status} - ${errorMessage}`);
      }
      // const respBody = await _response.formData();
      // console.log("API response--",  await _response.formData());
      const response = await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate
      );
      
      try {
        
        console.log('update message', response);
      } catch (parseError) {
        console.error('Error parsing chat history:', parseError);
        // console.log('Raw history data:', history);
      }

      setInputDisabled(false);
      setPastedActive(false)
      
      // updateHistory((state) => state + 1); // update messages
      // console.log('Full response:', JSON.stringify(response));
    } catch (e) {
      console.error('Error in sendMessageJaiime:', e);
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
      if(response.data?.length && response.data[0].id) {
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
      const messages = response.data.map(m => ({...m, role: `${m.role}` === "assistant" ? Role.Bot : Role.User}))
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
