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
import {
  listConversations as listSupabaseConversations,
  createConversation as createSupabaseConversation,
  renameConversation as renameSupabaseConversation,
  deleteConversation as deleteSupabaseConversation,
  touchConversation as touchSupabaseConversation,
} from '@/lib/chatdb/conversations';
import {
  listMessages as listSupabaseMessages,
  insertMessage as insertSupabaseMessage,
  updateMessageContent as updateSupabaseMessageContent,
} from '@/lib/chatdb/messages';
import { Message, Role } from '@/utils/Interfaces';
import { processStream } from '@/utils/ChatStream';
import { Keyboard, Alert, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from './useAuth';
import { getDefaultModelId } from './useDefaultModel';
import { getToken } from '@/utils/SecureTokenManager';
import { formatAuthHeader } from '@/utils/AuthHelpers';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AIEvent } from '@/types/mixpanel';
import { Artifact } from '@/utils/ArtifactTypes';
import { extractArtifactFromStream, extractArtifactsFromMessage } from '@/utils/ArtifactParser';
import { DocumentBlock } from '@/utils/DocumentTypes';
import { extractDocumentFromStream, extractDocumentsFromMessage } from '@/utils/DocumentParser';
import { StreamBatcher } from '@/utils/StreamBatcher';
import { getUserTimezone } from '@/utils/timezone';
import { globalStreamManager, StreamState } from '@/utils/StreamManager';
import { useStreamingState } from '@/contexts/StreamingStateContext';
import { 
  messagePersistenceManager, 
  trackMessageSave,
  verifyAndRetryMessageSave,
  MessageSaveStatus as PersistenceStatus 
} from '@/utils/MessagePersistenceManager';
import { MessageSaveStatus } from '@/utils/Interfaces';
import { useLocalModelGlobal } from './useLocalModelGlobal';

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
  sendMessage: (message: string, messageType?: string, operation?: string | null, additionalData?: string, options?: {
    webSearch?: boolean;
    generateImage?: string;
    imageProvider?: string;
    imageModel?: string;
    generateVideo?: string;
    enableArtifacts?: boolean;
    modelId?: string;
    audio_duration?: number; // Audio recording duration in seconds
    files?: Array<{
      uri: string;
      type: string;
      name: string;
      size?: number;
    }>;
  }) => Promise<void>;
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
  stopStreaming: () => Promise<void>;
  intermediate: string;
  reasoningText: string;
  setChatLoading?: (a: boolean) => void;
  isChatLoading?: boolean;
  appendToMessageHistory: (message: string, role: Role) => void;
  chatError: ChatError | null;
  clearChatError: () => void;
  artifacts: Artifact[];
  currentStreamingArtifact: Artifact | null;
  getArtifactsForMessage: (messageId: string) => Artifact[];
  documents: DocumentBlock[];
  currentStreamingDocument: DocumentBlock | null;
  getDocumentsForMessage: (messageId: string) => DocumentBlock[];
  updateMessageReaction: (messageId: string, reaction: 'like' | 'dislike' | null) => void;
  streamingForConversationId: string | null; // Track which conversation the stream belongs to

  // ===== Local persistence (Supabase) helpers, used by the local-model send path =====
  saveLocalMessage: (input: { conversationId: string; role: Role; content: string }) => Promise<Message>;
  updateLocalMessageContent: (messageId: string, content: string) => Promise<void>;
  touchLocalConversation: (conversationId: string) => Promise<void>;

  // ===== Local Model Properties =====
  isLocal: boolean;
  setIsLocal: (value: boolean) => void;
  isLocalModelReady: boolean;
  isLocalModelGenerating: boolean;
  localModelDownloadProgress: number;
  isLocalModelDownloading: boolean;
  localModelError: string | null;
  isLocalModelSupported: boolean;
  canSafelyUnmount: boolean;
  handleSendLocalMessage: (text: string) => Promise<void>;
  interruptLocalGeneration: () => void;
  clearLocalModel: () => void;
  currentLocalModel: any;
  updateLocalModelReady: (ready: boolean) => void;
  updateLocalModelGenerating: (generating: boolean) => void;
  llm: any; // Global LLM instance
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ============ Debugging & Lifecycle Management ============
  const mountTimeRef = useRef(Date.now());
  
  
  const { user } = useAuth();
  
  // ============ Streaming State Management ============
  const streamingState = useStreamingState();
  
  // ============ Message Persistence Management ============
  // Set up callbacks for persistence manager to show notifications
  useEffect(() => {
    messagePersistenceManager.setCallbacks(
      // On error callback - show notification when message save fails
      (error: string, conversationId: string) => {
        console.error('[Chat] Message save failed:', error, 'for conversation:', conversationId);
        
        // Show notification via StreamingStateContext
        streamingState.showNotification({
          chatTitle: 'Save Failed',
          message: 'Message failed to save. Will retry automatically.',
          conversationId,
        });
      },
      // On success callback - called when retry succeeds
      (messageId: string, conversationId: string) => {
        console.log('[Chat] Message save verified:', messageId);
        
        // Update message save status in state
        setMessages(prev => prev.map(msg => 
          (msg.chat_id === messageId || msg.id === messageId) 
            ? { ...msg, saveStatus: MessageSaveStatus.SAVED }
            : msg
        ));
      }
    );
    
    return () => {
      // Clean up on unmount
      messagePersistenceManager.destroy();
    };
  }, [streamingState]);
  
  // ============ Conversation State ============
  const [conversations, setConversations] = useState<Conversations[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);
  
  // ============ Message State ============
  const [messages, setMessages] = useState<Message[]>([]);
  const [additionalData, setAdditionalData] = useState<any[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  
  // ============ Loading & Sending State ============
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isChatLoading, setChatLoading] = useState(false);
  const isSendingRef = useRef(isSending);
  
  // ============ Streaming State ============
  const [stream, setStream] = useState('');
  const [intermediate, setIntermediate] = useState('');
  const [reasoningText, setReasoningText] = useState('');
  const [streamWorking, setStreamWorking] = useState(false);
  const streamWorkingRef = useRef(streamWorking);
  const intermediateRef = useRef(intermediate);
  const reasoningTextRef = useRef(reasoningText);
  const streamRef = useRef(stream);
  
  // Track which conversation the current stream belongs to
  // This prevents background streams from appearing in the wrong conversation
  const [streamingForConversationId, setStreamingForConversationId] = useState<string | null>(null);
  const streamingForConversationIdRef = useRef<string | null>(null);
  
  // Per-conversation stream content storage
  // This allows each stream to accumulate its content independently
  const conversationStreamRefs = useRef<Map<string, {
    stream: string;
    reasoning: string;
    intermediate: string;
  }>>(new Map());
  
  // Sync streaming conversation ID ref
  useEffect(() => {
    streamingForConversationIdRef.current = streamingForConversationId;
  }, [streamingForConversationId]);
  
  // ============ Local Model State (Global) ============
  // Initialize at provider level so ready state is available immediately
  const globalLocalModel = useLocalModelGlobal();

  // Local-only app: on-device mode is always on.
  const [isLocal, setIsLocal] = useState(true);
  const [isLocalModelGenerating, setIsLocalModelGenerating] = useState(false);

  // Real readiness / download / error state from the single shared instance
  const isLocalModelReady = globalLocalModel.isReady;
  const localModelDownloadProgress = globalLocalModel.downloadProgress;
  const isLocalModelDownloading = globalLocalModel.isDownloading;
  const localModelError = globalLocalModel.error;
  const isLocalModelSupported = globalLocalModel.isSupported;

  const updateLocalModelReady = useCallback((ready: boolean) => {
    console.log('[Chat] updateLocalModelReady called:', ready, '(using global state)');
  }, []);

  const updateLocalModelGenerating = useCallback((generating: boolean) => {
    console.log('[Chat] updateLocalModelGenerating called:', generating);
    setIsLocalModelGenerating(generating);
  }, []);

  const localModel = useMemo(() => ({
    isLocal,
    setIsLocal,
    isLocalModelReady,
    isLocalModelGenerating,
    canSafelyUnmount: !isLocalModelGenerating,
    llm: globalLocalModel.llm,
    handleSendLocalMessage: async (text: string) => {
      console.log('[Chat] handleSendLocalMessage called - should be handled in ChatPage');
    },
    interruptLocalGeneration: () => {
      console.log('[Chat] interruptLocalGeneration called - should be handled in ChatPage');
      if (globalLocalModel.llm?.interrupt) {
        globalLocalModel.llm.interrupt();
      }
    },
    clearLocalModel: () => {},
    currentLocalModel: null,
    updateLocalModelReady,
    updateLocalModelGenerating,
  }), [isLocal, isLocalModelReady, isLocalModelGenerating, updateLocalModelReady, updateLocalModelGenerating, globalLocalModel.llm]);

  // Cap the number of cached conversation stream refs to prevent unbounded
  // memory growth. Map preserves insertion order, so we evict the oldest
  // entries first (never the currently-streaming conversation).
  const MAX_CONVERSATION_REFS = 5; // Keep only last 5 conversations in memory

  const cleanupOldStreamRefs = useCallback(() => {
    if (conversationStreamRefs.current.size <= MAX_CONVERSATION_REFS) return;

    const evictable = Array.from(conversationStreamRefs.current.keys())
      .filter((id) => id !== streamingForConversationIdRef.current);

    const excess = conversationStreamRefs.current.size - MAX_CONVERSATION_REFS;
    evictable.slice(0, excess).forEach((id) => {
      conversationStreamRefs.current.delete(id);
      console.log('[Chat] 🧹 Cleaned up excess stream ref:', id);
    });
  }, []);
  
  // Run cleanup periodically during streaming (every 10 seconds)
  useEffect(() => {
    if (isSending) {
      const interval = setInterval(cleanupOldStreamRefs, 10000);
      return () => clearInterval(interval);
    }
  }, [isSending, cleanupOldStreamRefs]);
  
  // ============ Computed Streaming State ============
  // isStreaming: True when content is actively being streamed (stream has content)
  // This is more specific than isSending, which can be true during initial setup
  const isStreaming = useMemo(() => {
    return isSending && (stream.length > 0 || intermediate.length > 0);
  }, [isSending, stream, intermediate]);

  // ============ Stream Batching for Performance ============
  // RAF-based batching to prevent excessive re-renders during streaming
  // Limits updates to maximum 60 per second (1 per frame) for smoother UX
  const streamBatcherRef = useRef<StreamBatcher | null>(null);
  
  // Initialize batcher on mount
  if (!streamBatcherRef.current) {
    streamBatcherRef.current = new StreamBatcher();
  }
  
  // Batched version of setStream for use in streaming
  // Accumulates content in a ref and schedules RAF-batched UI updates
  const accumulatedStreamRef = useRef('');
  
  const setBatchedStream = useCallback((value: string | ((prev: string) => string)) => {
    const currentConvId = currentConversationIdRef.current;
    const streamingConvId = streamingForConversationIdRef.current;
    
    if (!streamingConvId) return; // No stream active
    
    // Get or create per-conversation storage
    let conversationData = conversationStreamRefs.current.get(streamingConvId);
    if (!conversationData) {
      conversationData = { stream: '', reasoning: '', intermediate: '' };
      conversationStreamRefs.current.set(streamingConvId, conversationData);
    }
    
    // Calculate new value
    let newValue: string;
    if (typeof value === 'function') {
      newValue = value(conversationData.stream);
    } else {
      newValue = value;
    }
    
    // Always update per-conversation ref (for backend saving)
    conversationData.stream = newValue;
    
    // Only update global ref and UI if this is the active conversation
    if (currentConvId === streamingConvId) {
      accumulatedStreamRef.current = newValue;
      
      // Schedule batched UI update
      if (streamBatcherRef.current) {
        streamBatcherRef.current.schedule(newValue, setStream);
      }
    } else {
      console.log('[Chat] 📦 Background stream - accumulating in per-conversation ref (no UI update)');
    }
  }, []);
  
  // Protected setters that check conversation ownership before updating
  // This prevents background streams from polluting the UI
  const setIntermediateProtected = useCallback((value: string) => {
    const currentConvId = currentConversationIdRef.current;
    const streamingConvId = streamingForConversationIdRef.current;
    
    if (!streamingConvId) return;
    
    // Get or create per-conversation storage
    let conversationData = conversationStreamRefs.current.get(streamingConvId);
    if (!conversationData) {
      conversationData = { stream: '', reasoning: '', intermediate: '' };
      conversationStreamRefs.current.set(streamingConvId, conversationData);
    }
    
    // Always update per-conversation ref
    conversationData.intermediate = value;
    
    // Only update UI if this is the active conversation
    if (currentConvId === streamingConvId) {
      setIntermediate(value);
    }
  }, []);
  
  const setReasoningTextProtected = useCallback((value: string | ((prev: string) => string)) => {
    const currentConvId = currentConversationIdRef.current;
    const streamingConvId = streamingForConversationIdRef.current;
    
    if (!streamingConvId) return;
    
    // Get or create per-conversation storage
    let conversationData = conversationStreamRefs.current.get(streamingConvId);
    if (!conversationData) {
      conversationData = { stream: '', reasoning: '', intermediate: '' };
      conversationStreamRefs.current.set(streamingConvId, conversationData);
    }
    
    // Calculate new value
    let newValue: string;
    if (typeof value === 'function') {
      newValue = value(conversationData.reasoning);
    } else {
      newValue = value;
    }
    
    // Always update per-conversation ref
    conversationData.reasoning = newValue;
    
    // Only update UI if this is the active conversation
    if (currentConvId === streamingConvId) {
      setReasoningText(value);
    }
  }, []);
  
  // ============ Error State ============
  const [error, setError] = useState('');
  const [chatError, setChatError] = useState<ChatError | null>(null);
  
  // ============ Artifact State ============
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [currentStreamingArtifact, setCurrentStreamingArtifact] = useState<Artifact | null>(null);
  
  // Track last successful artifact extraction for recovery
  const lastStreamingArtifactRef = useRef<Artifact | null>(null);
  
  // ============ Document State ============
  const [documents, setDocuments] = useState<DocumentBlock[]>([]);
  const [currentStreamingDocument, setCurrentStreamingDocument] = useState<DocumentBlock | null>(null);
  
  // Track last successful document extraction for recovery
  const lastStreamingDocumentRef = useRef<DocumentBlock | null>(null);
  
  // ============ File Handling State ============
  const [files, setFiles] = useState<any[]>([]);
  const [pastedActive, setPastedActive] = useState(false);
  
  // ============ Request Management ============
  const streamControllerRef = useRef<AbortController | null>(null);
  const fetchControllerRef = useRef<AbortController | null>(null);
  
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
  
  // ============ Local Model Integration Removed ============
  // Local model functionality has been removed from the app
  
  // ============ Update Refs When State Changes ============
  useEffect(() => {
    isSendingRef.current = isSending;
    streamWorkingRef.current = streamWorking;
    intermediateRef.current = intermediate;
    reasoningTextRef.current = reasoningText;
    streamRef.current = stream;
    
    // Debug log for intermediate state changes
    if (__DEV__ && intermediate) {
      console.log('[useChat] 📝 Intermediate state updated:', intermediate);
    }
  }, [isSending, streamWorking, intermediate, reasoningText, stream]);
  
 
  
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
      
      // Cancel all active streams via StreamManager
      // This ensures proper cleanup and prevents resource leaks
      if (currentConversationIdRef.current) {
        console.log('[ChatProvider] ⚠️ Cancelling active streams via StreamManager on unmount!');
        globalStreamManager.cancelStream(currentConversationIdRef.current).catch(e => {
          console.warn('[ChatProvider] Error cancelling stream via StreamManager:', e);
        });
      }
      
      // Clean up legacy abort controllers (for backward compatibility)
      if (streamControllerRef.current) {
        console.log('[ChatProvider] ⚠️ Aborting legacy stream controller on unmount!');
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

  // ============ Message Update Handler ============
  useEffect(() => {
    // CRITICAL: Only run this effect if we're actively sending/streaming
    // This prevents stray updates after streaming completes
    if (!isSending && !streamWorking) {
      return;
    }
    
    // CRITICAL: Don't update if there's no content to show
    // This prevents clearing actions from emptying the last message
    if (!stream && (!additionalData || additionalData.length === 0) && !currentChatId) {
      console.log('[Chat] 🚫 Skipping update - no content to display');
      return;
    }
    
    // CRITICAL: Only update messages if this stream belongs to the current conversation
    // This prevents background streams from emptying the visible conversation's messages
    if (streamingForConversationId && currentConversationId !== streamingForConversationId) {
      console.log('[Chat] 🚫 Background stream detected in message update effect - skipping update');
      return;
    }
    
    console.log('[Chat] 📝 Updating last message with stream content:', {
      streamLength: stream.length,
      additionalDataCount: additionalData?.length || 0,
      hasChatId: !!currentChatId,
      isSending,
      streamWorking
    });
    
    setMessages(prev => updateLastItem(prev, message => {
      const updatedMessage = {
        ...message,
        content: stream,
      };
      
      // Update additional_data if we have new data, otherwise preserve existing
      if (additionalData?.length > 0) {
        updatedMessage.additional_data = additionalData;
      } else if (message.additional_data) {
        // Preserve existing additional_data
        updatedMessage.additional_data = message.additional_data;
      }
      
      // Update chat_id if we have one from the meta event
      if (currentChatId) {
        updatedMessage.chat_id = currentChatId;
      }
      
      return updatedMessage;
    }));
  }, [stream, additionalData, currentChatId, streamingForConversationId, currentConversationId, isSending, streamWorking]);

  // ============ Artifact Stream Processing ============
  // Throttle utility to reduce expensive artifact extraction calls
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    let lastRun = 0;

    return (...args: Parameters<T>) => {
      const now = Date.now();
      const remaining = wait - (now - lastRun);

      if (remaining <= 0) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        lastRun = now;
        func(...args);
      } else if (!timeout) {
        timeout = setTimeout(() => {
          lastRun = Date.now();
          timeout = null;
          func(...args);
        }, remaining);
      }
    };
  }, []);

  // Throttled artifact extraction (max every 200ms to reduce CPU usage by 80%)
  const extractArtifactThrottled = useRef(
    throttle((streamContent: string, setArtifact: (a: Artifact | null) => void) => {
      const artifact = extractArtifactFromStream(streamContent);
      setArtifact(artifact);
    }, 200) // Extract at most every 200ms
  ).current;

  // Extract artifacts from stream with throttling for better performance
  useEffect(() => {
    if (stream) {
      // Use throttled extraction to avoid expensive regex on every word update
      extractArtifactThrottled(stream, (artifact) => {
        setCurrentStreamingArtifact(artifact);
        // Save successful extraction for potential recovery
        if (artifact && artifact.content) {
          lastStreamingArtifactRef.current = artifact;
        }
      });
    } else {
      setCurrentStreamingArtifact(null);
    }
  }, [stream, extractArtifactThrottled]);

  // Throttled document extraction (max every 200ms to reduce CPU usage)
  const extractDocumentThrottled = useRef(
    throttle((streamContent: string, messageId: string, setDocument: (d: DocumentBlock | null) => void) => {
      const document = extractDocumentFromStream(streamContent, messageId);
      setDocument(document);
    }, 200) // Extract at most every 200ms
  ).current;

  // Extract documents from stream with throttling for better performance
  useEffect(() => {
    if (stream) {
      // Use throttled extraction to avoid expensive regex on every word update
      const messageId = currentChatId || 'streaming';
      extractDocumentThrottled(stream, messageId, (document) => {
        setCurrentStreamingDocument(document);
        // Save successful extraction for potential recovery
        if (document && document.content) {
          lastStreamingDocumentRef.current = document;
        }
      });
    } else {
      setCurrentStreamingDocument(null);
    }
  }, [stream, extractDocumentThrottled, currentChatId]);

  // Helper function to abort current stream and wait for cleanup
  // Uses StreamManager for centralized stream lifecycle management
  const abortCurrentStream = useCallback(async () => {
    if (!currentConversationIdRef.current) {
      console.log('[Chat] No conversation ID, skipping abort');
      return;
    }
    
    console.log('[Chat] Aborting current stream via StreamManager...');
    
    try {
      // Use StreamManager to cancel the stream
      // This ensures proper cleanup and prevents race conditions
      await globalStreamManager.cancelStream(currentConversationIdRef.current);
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (e) {
      console.warn('[Chat] Error aborting stream:', e);
    }
    
    // Clear all loading states immediately when aborting
    console.log('[Chat] Clearing loading states after abort');
    isSendingRef.current = false;
    setIsSending(false);
    setStreamWorking(false);
    setChatLoading(false);
    setIntermediate('');
    
    // Clear legacy controller ref if it exists
    if (streamControllerRef.current) {
      streamControllerRef.current = null;
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

  // ============ Artifact Management ============
  
  // Finalize artifacts when streaming completes
  const finalizeArtifacts = useCallback((messageContent: string, messageId: string) => {
    const extractedArtifacts = extractArtifactsFromMessage(messageContent, messageId);
    
    if (extractedArtifacts.length > 0) {
      setArtifacts(prev => [...prev, ...extractedArtifacts]);
      console.log(`[Chat] Finalized ${extractedArtifacts.length} artifacts for message ${messageId}`);
    }
  }, []);

  // Get artifacts for a specific message
  const getArtifactsForMessage = useCallback((messageId: string): Artifact[] => {
    return artifacts.filter(artifact => artifact.messageId === messageId);
  }, [artifacts]);

  // ============ Document Management ============
  
  // Finalize documents when streaming completes
  const finalizeDocuments = useCallback((messageContent: string, messageId: string) => {
    const extractedDocuments = extractDocumentsFromMessage(messageContent, messageId);
    
    if (extractedDocuments.length > 0) {
      setDocuments(prev => [...prev, ...extractedDocuments]);
      console.log(`[Chat] Finalized ${extractedDocuments.length} documents for message ${messageId}`);
    }
  }, []);

  // Get documents for a specific message
  const getDocumentsForMessage = useCallback((messageId: string): DocumentBlock[] => {
    return documents.filter(document => document.messageId === messageId);
  }, [documents]);

  // Update a specific message's reaction (optimistic update)
  const updateMessageReaction = useCallback((messageId: string, reaction: 'like' | 'dislike' | null) => {
    setMessages(prev => prev.map(msg => {
      if ((msg.chat_id || msg.id) === messageId) {
        return { ...msg, reaction };
      }
      return msg;
    }));
  }, []);

  // ---------------- Chat Operations ----------------
  
  // Extract streaming state functions to avoid dependency issues
  const { startStream: startStreamFn, completeStream: completeStreamFn, setActiveConversation: setActiveConversationFn } = streamingState;

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
      enableArtifacts?: boolean;
      modelId?: string; // Add modelId to options
      audio_duration?: number; // Audio recording duration in seconds
      files?: Array<{
        uri: string;
        type: string;
        name: string;
        size?: number;
      }>;
    }
  ) => {
    // Start timing for response
    const responseStartTime = Date.now();
    
    // Set sending state FIRST (both state and ref for immediate UI update)
    isSendingRef.current = true;
    setIsSending(true);
    
    // Reset all streaming states
    setChatLoading(true);
    setError('');
    setChatError(null); // Clear any previous errors
    
    // Flush any pending batched stream updates before starting new message
    if (streamBatcherRef.current) {
      streamBatcherRef.current.flush();
    }
    accumulatedStreamRef.current = '';
    
    setStream('');
    setIntermediate(''); // Clear intermediate initially - will be set by stream or remain empty for loading dots
    setReasoningText(''); // Clear reasoning text from previous message
    setAdditionalData([]); // Reset additional data for new message
    setStreamWorking(false); // Reset stream working state
    setCurrentChatId(null); // Clear chat_id for new message

    setMessages(prev => [
      ...prev,
      { 
        role: Role.User, 
        content: ['image', 'video', 'audio', 'file'].includes(messageType) ? additionalData : message || '', 
        imageData: ['image', 'video', 'audio', 'file'].includes(messageType) ? message : undefined,
        prompt: additionalData || undefined, // Store the prompt text for display
      },
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
    
    // Add the model ID to the request
    // Use provided modelId from options, or fall back to default from storage
    const modelId = options?.modelId || getDefaultModelId();
    formData.append('model', modelId);
    console.log('[sendMessage] Using model:', modelId);
    
    // Add timezone information for time-aware backend processing
    const userTimezone = getUserTimezone();
    const params = {
      timezone: userTimezone,
    };
    formData.append('params', JSON.stringify(params));
    console.log('[sendMessage] Sending timezone:', userTimezone);
    
    // Use let so we can update it if a new conversation is created
    let conversationId = currentConversationId || '';

    formData.append('is_mobile', 'true');
    
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
        // Update conversationId for use in stream registration
        conversationId = conv;
      } else {
        isSendingRef.current = false;
        setIsSending(false);
        throw new Error('Failed to create new conversation');
      }
    }

    // Add generation options if provided
    // Always send explicit value to match web frontend implementation
    if (options?.webSearch) {
      formData.append('web_search', 'true');
    } else {
      formData.append('web_search', 'false');
    }
    
    if (options?.generateVideo && options.generateVideo !== 'none') {
      formData.append('generate_video', options.generateVideo);
    }
    
    if (options?.generateImage && options.generateImage !== 'none') {
      formData.append('generate_image', options.generateImage);
      if (options.imageProvider) {
        formData.append('image_provider', options.imageProvider);
      }
      if (options.imageModel) {
        formData.append('image_model', options.imageModel);
      }
    }
    
    // Add artifact generation control
    if (options?.enableArtifacts !== undefined) {
      formData.append('need_artifact', options.enableArtifacts ? 'true' : 'false');
    } else {
      // Default to enabled if not specified
      formData.append('need_artifact', 'true');
    }
    
    // Add audio duration for audio messages (same as web app)
    if (options?.audio_duration !== undefined && options.audio_duration !== null) {
      formData.append('audio_duration', String(options.audio_duration));
      console.log('[sendMessage] Adding audio duration:', options.audio_duration, 'seconds');
    }

    // Abort any previous stream with proper synchronization
    await abortCurrentStream();
    
    // Use StreamManager to handle the stream lifecycle
    // This prevents race conditions and ensures proper cleanup
    // Note: conversationId already declared above for form data
    
    try {
      // Start the stream with StreamManager
      // IMPORTANT: Keep the entire stream processing inside the callback
      // so StreamManager knows the stream is still active
      const result = await globalStreamManager.startStream(
        conversationId,
        async (controller) => {
          // Store controller ref for legacy compatibility
          streamControllerRef.current = controller;
          
          // IMPORTANT: Mark conversation as active BEFORE registering stream
          // This prevents the stream from being incorrectly marked as "background"
          setActiveConversationFn(conversationId);
          
          // Track which conversation this stream belongs to
          // This prevents background streams from appearing in the wrong conversation UI
          setStreamingForConversationId(conversationId);
          streamingForConversationIdRef.current = conversationId;
          
          // Register stream with StreamingStateContext for background notifications
          startStreamFn(conversationId, controller);
          
          // Get token from secure storage
          const token = await getToken();
          
          if (!token) {
            Alert.alert('Error', 'Authentication required. Please sign in again.');
            isSendingRef.current = false;
            setIsSending(false);
            setChatLoading(false);
            throw new Error('Authentication required');
          }
          
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
            signal: controller.signal,
            // Ensure streaming is enabled
            cache: 'no-cache',
          });
          
          if (!_response || !_response.ok) {
            const errorMessage = await _response.text();
            console.log('[Cloud] Error response:', errorMessage, 'Status:', _response.status);
            
            // Parse the error and set it in state
            const parsedError = parseErrorResponse(errorMessage, _response.status);
            setChatError(parsedError);
            
            // CRITICAL: Only update messages if this is the current conversation
            const isCurrentConv = currentConversationIdRef.current === conversationId;
            if (isCurrentConv) {
              // Save error as a permanent bot message in chat history
              const httpErrorContent = `⚠️ **Unable to Complete Request**\n\n${parsedError.message}\n\n*Please try again or contact support if the issue persists.*`;
              
              setMessages(prev => updateLastItem(prev, message => ({
                ...message,
                content: httpErrorContent,
                timestamp: new Date().toISOString(),
              })));
            } else {
              console.log('[Chat] 🚫 Background stream error - skipping message update');
            }
            
            // Track failed response
            await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
              model_used: modelId,
              is_local_model: false,
              conversation_id: conversationId,
              error_message: parsedError.message,
              status_code: _response.status,
            });
            
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
            return null;
          }
          
          // Process the stream - KEEP THIS INSIDE THE CALLBACK
          const res = await processStream(
            _response.body,
            setBatchedStream, // Use batched version for smooth 60 FPS updates
            handleError,
            setIntermediateProtected, // Use protected version
            setStreamWorking,
            setAdditionalData,
            setReasoningTextProtected, // Use protected version
            setCurrentChatId
          );
          
          // Check if the stream returned an error
          if (res?.type === 'error') {
            console.log('[Cloud] Stream returned error, saving as permanent message');
            
            // CRITICAL: Only update messages if this is the current conversation
            const isCurrentConv = currentConversationIdRef.current === conversationId;
            if (isCurrentConv) {
              // Save error as a permanent bot message in chat history
              // This ensures the error persists and is saved in the conversation
              const errorMessageContent = stream || `⚠️ **Unable to Complete Request**\n\n${res.error}\n\n*You can try again in a moment or adjust your request.*`;
              
              setMessages(prev => updateLastItem(prev, message => ({
                ...message,
                content: errorMessageContent,
                timestamp: new Date().toISOString(),
                chat_id: currentChatId || message.chat_id, // Include chat_id even on error
              })));
            } else {
              console.log('[Chat] 🚫 Background stream error - skipping message update');
            }
            
            // Track as failed response
            await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
              model_used: modelId,
              is_local_model: false,
              conversation_id: conversationId,
              error_message: res.error || 'Stream error',
            });
            
            // Don't track as successful or process additional_data
            setPastedActive(false);
            return null;
          }
          
          // Handle additional_data after streaming completes
          if (res?.data?.additional_data) {
            // CRITICAL: Only update if this stream belongs to current conversation
            const isCurrentConv = currentConversationIdRef.current === conversationId;
            if (isCurrentConv) {
              console.log('[Chat] 📎 Updating additional_data for current conversation');
              // Update last message with additional_data and chat_id
              // DON'T create separate messages for videos - they're already in files[]
              setMessages(prev => updateLastItem(prev, message => ({
                ...message,
                additional_data: res?.data?.additional_data || [],
                chat_id: currentChatId || message.chat_id, // Ensure chat_id is included
              })));
            } else {
              console.log('[Chat] 🚫 Background stream - skipping additional_data UI update');
            }
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
          
          // Return the result to indicate success
          return res;
        }
      );
      
      // Check if stream was cancelled (result will be null)
      if (!result) {
        console.log('[Cloud] Stream cancelled by StreamManager');
        isSendingRef.current = false;
        setIsSending(false);
        setChatLoading(false);
        setStreamWorking(false);
        setIntermediate('');
        return;
      }
    } catch (e: any) {
      // Check if request was aborted (user cancelled or switched conversations)
      if (e.name === 'AbortError') {
        console.log('[Cloud] Request cancelled/aborted');
        console.log('[Cloud] Abort reason:', e.message);
        // Reset streaming states on abort
        isSendingRef.current = false;
        setIsSending(false);
        setStreamWorking(false);
        setIntermediate('');
        setChatLoading(false);
        return;
      }
      
      console.error('[Cloud] Unexpected error during message send:', e);
      
      // CRITICAL: Reset all streaming states immediately on error
      // This prevents the UI from being stuck in loading state
      isSendingRef.current = false;
      setIsSending(false);
      setChatLoading(false);
      setStreamWorking(false);
      setIntermediate('');
      
      // Determine error message based on error type
      let errorMessage = 'Something went wrong. Please try again.';
      let errorType: 'network' | 'generic' = 'generic';
      
      if (e.message?.toLowerCase().includes('network') || 
          e.message?.toLowerCase().includes('fetch') ||
          e.message?.toLowerCase().includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.';
        errorType = 'network';
      } else if (e instanceof Error) {
        errorMessage = e.message;
      }
      
      // CRITICAL: Only update messages if this is the current conversation
      const isCurrentConv = currentConversationIdRef.current === conversationId;
      if (isCurrentConv) {
        // Save error as a permanent bot message in chat history
        const errorMessageContent = `⚠️ **Unable to Complete Request**\n\n${errorMessage}\n\n*Please try again or contact support if the issue persists.*`;
        
        setMessages(prev => updateLastItem(prev, message => ({
          ...message,
          content: errorMessageContent,
          timestamp: new Date().toISOString(),
          chat_id: currentChatId || message.chat_id, // Include chat_id even on error
        })));
      } else {
        console.log('[Chat] 🚫 Background stream error - skipping message update');
      }
      
      // Set chat error for banner display
      setChatError({
        type: errorType,
        message: errorMessage,
        statusCode: 0,
      });
      
      // Track failed response
      const modelId = getDefaultModelId();
      const convId = conversationId || currentConversationId || ''; // Use existing conversationId from outer scope
      await mixpanelService.trackAI(AIEvent.CHAT_RESPONSE_FAILED, {
        model_used: modelId,
        is_local_model: false,
        conversation_id: convId,
        error_message: errorMessage,
      });
    } finally {
      // IMPORTANT: Capture stream content from per-conversation refs
      // This prevents race conditions where another stream might overwrite the refs
      const conversationData = conversationStreamRefs.current.get(conversationId);
      const finalStreamContent = conversationData?.stream || '';
      const finalReasoningContent = conversationData?.reasoning || '';
      const finalChatId = currentChatId;
      
      console.log('[Chat] 📸 Captured stream content from per-conversation ref:', {
        conversationId,
        streamLength: finalStreamContent.length,
        reasoningLength: finalReasoningContent.length,
        hasChatId: !!finalChatId,
        source: conversationData ? 'per-conversation-ref' : 'none'
      });
      
      // Always clean up streaming state
      streamControllerRef.current = null;
      isSendingRef.current = false;
      setIsSending(false);
      setChatLoading(false);
      setStreamWorking(false); // Reset stream working state
      
      // Only clear UI states if this stream belongs to the currently active conversation
      // This prevents background stream cleanup from affecting the visible conversation
      const isCurrentConversation = currentConversationIdRef.current === conversationId;
      if (isCurrentConversation) {
        console.log('[Chat] 🧹 Clearing UI states for active conversation:', conversationId);
        setIntermediate(''); // Clear intermediate state to stop loading indicator
      } else {
        console.log('[Chat] 🔕 Background stream completed, not clearing UI:', {
          backgroundStream: conversationId,
          activeConversation: currentConversationIdRef.current
        });
      }
      
      // Clear streaming conversation tracking BEFORE calling completeStream
      // This ensures the stream is marked as complete before notification check
      const wasBackgroundStream = !isCurrentConversation;
      setStreamingForConversationId(null);
      streamingForConversationIdRef.current = null;
      
      // Notify StreamingStateContext that the stream is complete
      // This will show a toast if the stream completed in the background
      console.log('[Chat] 🔔 Calling completeStream for:', conversationId, 'Background?', wasBackgroundStream);
      
      // Get conversation title for notification
      const conversation = conversations.find(c => c.id === conversationId);
      const chatTitle = conversation?.title || conversation?.content_summary || 'Chat';
      
      completeStreamFn(conversationId, { chatTitle });
      
      // Update messages for ALL streams (both foreground and background)
      // But only update the UI for foreground streams
      if (finalStreamContent) {
        console.log('[Chat] 💾 Finalizing message content:', {
          conversationId,
          isCurrentConversation,
          contentLength: finalStreamContent.length
        });
        
        // Combine reasoning if present
        let finalContent = finalStreamContent;
        if (finalReasoningContent && finalReasoningContent.trim()) {
          finalContent = finalStreamContent + (finalStreamContent ? '\n\n' : '') + `<jmeReasoning>${finalReasoningContent}</jmeReasoning>`;
          console.log('[Chat] 🧠 Combined reasoning into final content');
        }
        
        // For foreground streams: Update the UI immediately
        // For background streams: The message is already in the messages array (added at sendMessage start)
        //                         We just need to update its content when user is viewing it
        if (isCurrentConversation) {
          console.log('[Chat] 💾 Updating UI for foreground stream');
          setMessages(prev => updateLastItem(prev, message => ({
            ...message,
            content: finalContent,
            chat_id: finalChatId || message.chat_id,
          })));
        } else {
          console.log('[Chat] 🔕 Background stream - content saved in per-conversation ref');
          console.log('[Chat] ↩️  Will update UI when user returns to conversation:', conversationId);
          // Content is captured, will be used when fetchMessages loads this conversation
        }
        
        console.log('[Chat] ✅ Message finalized');
        
        // ============ Message Persistence Verification ============
        // Track message for backend save verification
        // This ensures messages aren't lost due to network errors or backend issues
        if (finalChatId) {
          console.log('[Chat] 💾 Tracking message for persistence verification:', finalChatId);
          
          // Track the message (synchronous with MMKV)
          trackMessageSave(
            finalChatId,
            conversationId,
            finalContent,
            'assistant',
            additionalData,
            finalChatId
          );
          
          // Mark message as saving
          if (isCurrentConversation) {
            setMessages(prev => prev.map(msg =>
              (msg.chat_id === finalChatId || msg.id === finalChatId)
                ? { ...msg, saveStatus: MessageSaveStatus.SAVING }
                : msg
            ));
          }
          
          // Verify save after a short delay (non-blocking)
          setTimeout(async () => {
            console.log('[Chat] 🔍 Verifying message was saved to backend');
            
            const result = await verifyAndRetryMessageSave(conversationId, finalChatId);
            
            if (result.success) {
              console.log('[Chat] ✅ Message save verified successfully');
              
              // Update save status in UI
              setMessages(prev => prev.map(msg =>
                (msg.chat_id === finalChatId || msg.id === finalChatId)
                  ? { ...msg, saveStatus: MessageSaveStatus.SAVED, saveError: undefined }
                  : msg
              ));
            } else {
              console.error('[Chat] ❌ Message save verification failed:', result.error);
              
              // Update save status with error
              setMessages(prev => prev.map(msg =>
                (msg.chat_id === finalChatId || msg.id === finalChatId)
                  ? { 
                      ...msg, 
                      saveStatus: result.shouldRetry ? MessageSaveStatus.RETRYING : MessageSaveStatus.FAILED,
                      saveError: result.error 
                    }
                  : msg
              ));
              
              // Show notification if not retrying
              if (!result.shouldRetry) {
                streamingState.showNotification({
                  chatTitle: 'Save Failed',
                  message: 'Message could not be saved. Please check your connection.',
                  conversationId,
                });
              }
            }
          }, 2000); // Wait 2 seconds before verifying
        } else {
          console.warn('[Chat] ⚠️ No chat_id available for persistence tracking');
        }
      }
      
      // Clean up per-conversation refs after a delay
      setTimeout(() => {
        conversationStreamRefs.current.delete(conversationId);
        console.log('[Chat] 🧹 Cleaned up per-conversation ref for:', conversationId);
      }, 5000); // 5 second grace period for UI transitions
      
      // Finalize artifacts after streaming completes (with error recovery)
      // Only finalize artifacts for the currently active conversation
      if (isCurrentConversation && stream && currentConversationId) {
        console.log('[Chat] 🎨 Finalizing artifacts for active conversation');
        const messageId = `${currentConversationId}-${Date.now()}`;
        
        try {
          // Try to finalize artifacts normally
          finalizeArtifacts(stream, messageId);
        } catch (error) {
          console.error('[Chat] Error finalizing artifacts:', error);
          
          // Attempt to recover partial artifact from last known good state
          if (lastStreamingArtifactRef.current && lastStreamingArtifactRef.current.content) {
            const partialArtifact: Artifact = {
              ...lastStreamingArtifactRef.current,
              id: `${messageId}-recovered`,
              messageId,
              isStreaming: false,
              wasStreaming: true, // Mark as recovered
              content: lastStreamingArtifactRef.current.content + '\n\n[⚠️ Generation interrupted]',
            };
            
            setArtifacts(prev => [...prev, partialArtifact]);
            console.log('[Chat] ✅ Recovered partial artifact:', partialArtifact.title, '- Content length:', partialArtifact.content.length);
          }
        } finally {
          // Clear the recovery reference
          lastStreamingArtifactRef.current = null;
        }
        
        // Finalize documents after streaming completes (with error recovery)
        try {
          // Try to finalize documents normally
          finalizeDocuments(stream, messageId);
        } catch (error) {
          console.error('[Chat] Error finalizing documents:', error);
          
          // Attempt to recover partial document from last known good state
          if (lastStreamingDocumentRef.current && lastStreamingDocumentRef.current.content) {
            const partialDocument: DocumentBlock = {
              ...lastStreamingDocumentRef.current,
              id: `${messageId}-recovered`,
              messageId,
              isStreaming: false,
            };
            
            setDocuments(prev => [...prev, partialDocument]);
            console.log('[Chat] ✅ Recovered partial document:', partialDocument.name, '- Content length:', partialDocument.content.length);
          }
        } finally {
          // Clear the recovery reference
          lastStreamingDocumentRef.current = null;
        }
      }
      
      // Don't reset additionalData here - it needs to persist in the message
      // Don't reset stream here - it's used for display and doesn't affect input state
    }
    
  }, [files, currentConversationId, user, checkFileExists, saveBase64ToFile, optimizeImage, getFileType, handleError, abortCurrentStream, stream, reasoningText, finalizeArtifacts, finalizeDocuments, startStreamFn, completeStreamFn, setActiveConversationFn]);

  const fetchConversation = useCallback(async (q?: string, limitValue?: number, updateCurrentRoom?: (a: string) => void) => {
    const effectiveLimit = limitValue || 20;
    if (isLocal) {
      try {
        const data = await listSupabaseConversations(effectiveLimit, q);
        setConversations(data);
        return data;
      } catch (error) {
        console.error('[Chat] Fetch local conversations error:', error);
        return [];
      } finally {
        setIsLoading(false);
      }
    }
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
  }, [user, isLocal]);

  const fetchMessages = useCallback(async (conversationId?: string) => {
    if (!conversationId) return;

    // Update active conversation in StreamingStateContext
    // This ensures we track which conversation is currently focused
    setActiveConversationFn(conversationId);

    if (isLocal) {
      try {
        setIsLoading(true);
        const msgs = await listSupabaseMessages(conversationId);
        if (currentConversationIdRef.current === conversationId || !currentConversationIdRef.current) {
          setMessages(msgs);
        }
      } catch (error) {
        console.error('[Chat] Fetch local messages error:', error);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Clear streaming UI states if they belong to a different conversation
    // This prevents background streams from appearing in the wrong conversation
    if (streamingForConversationIdRef.current && streamingForConversationIdRef.current !== conversationId) {
      console.log('[Chat] Clearing streaming UI for different conversation:', {
        streamingFor: streamingForConversationIdRef.current,
        switchingTo: conversationId
      });
      setStream('');
      setIntermediate('');
      setReasoningText('');
      // Don't clear streamingForConversationId - background stream still running
    }
    
    // Abort any previous fetch
    if (fetchControllerRef.current) {
      fetchControllerRef.current.abort();
      fetchControllerRef.current = null;
    }
    
    // ⚠️ REMOVED: No longer aborting ongoing streams when switching conversations
    // This allows streaming to continue in the background
    // await abortCurrentStream();
    
    // ⚠️ REMOVED: No longer resetting streaming states when switching conversations
    // This allows background streams to complete and update their messages
    // Only reset the UI states for the current conversation
    
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
  }, [setActiveConversationFn, isLocal]);

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
    
    // Flush any pending batched stream updates
    if (streamBatcherRef.current) {
      streamBatcherRef.current.flush();
    }
    accumulatedStreamRef.current = '';
    
    setMessages([]);
    setStream('');
    setIntermediate('');
    setReasoningText(''); // Clear reasoning text when resetting chat
    setStreamWorking(false);
    isSendingRef.current = false;
    setIsSending(false);
    setAdditionalData([]); // Reset additional data when clearing chat
    setChatError(null); // Clear any errors
    setCurrentConversationId(null); // Clear conversation ID to prevent refetch
    setCurrentChatId(null); // Clear chat_id when resetting
    
    // Clear artifacts
    setArtifacts([]);
    setCurrentStreamingArtifact(null);
    
    // Clear active conversation in StreamingState
    // This ensures no conversation is marked as active when we're on a new/empty chat
    setActiveConversationFn(null);
  }, [abortCurrentStream, setActiveConversationFn]);

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (isLocal) {
        await deleteSupabaseConversation(conversationId);
      } else {
        const token = await getToken();
        await api.setAuthToken(token || '');
        const response = await api.delete(`/conversation/${conversationId}`);
        if (!response.ok) {
          return false;
        }
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
  }, [user, isLocal, currentConversationId, conversations, setCurrentRoom, resetChat]);

  const renameConversation = useCallback(async (conversationId: string, newTitle: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (isLocal) {
        await renameSupabaseConversation(conversationId, newTitle);
      } else {
        const token = await getToken();
        await api.setAuthToken(token || '');
        const response = await api.put(`/conversation/${conversationId}`, { title: newTitle });
        if (!response.ok) {
          return false;
        }
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
  }, [user, isLocal]);

  const clearAllConversations = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (isLocal) {
        await Promise.all(conversations.map(conv => conv.id ? deleteSupabaseConversation(conv.id) : Promise.resolve()));
        setConversations([]);
        setMessages([]);
        setCurrentConversationId(null);
        resetChat();
        return true;
      }

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
  }, [conversations, resetChat, isLocal]);

  const createNewConversation = useCallback(async (): Promise<string> => {
    try {
      setIsLoading(true);

      if (isLocal) {
        const newConversation = await createSupabaseConversation({ title: 'New Chat' });
        setConversations(prev => [newConversation, ...prev]);
        setCurrentRoom(newConversation.id || '');
        resetChat();
        return newConversation.id || '';
      }

      const token = await getToken();
      await api.setAuthToken(token || '');

      // Get default model (local models removed)
      const defaultModelId = getDefaultModelId();

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
  }, [user, isLocal, setConversations, setCurrentRoom, resetChat]);

  const saveLocalMessage = useCallback(async (input: { conversationId: string; role: Role; content: string }): Promise<Message> => {
    return insertSupabaseMessage(input);
  }, []);

  const updateLocalMessageContent = useCallback(async (messageId: string, content: string): Promise<void> => {
    await updateSupabaseMessageContent(messageId, content);
  }, []);

  const touchLocalConversation = useCallback(async (conversationId: string): Promise<void> => {
    await touchSupabaseConversation(conversationId);
  }, []);

  const contextValue = useMemo(() => {
    // Log context updates for debugging intermediate state
    if (__DEV__) {
      console.log('[useChat] 🔄 Context value updated:', {
        isSending,
        effectiveIsSending,
        hasIntermediate: !!intermediate,
        intermediateValue: intermediate,
        streamLength: stream?.length || 0
      });
    }
    
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
      stopStreaming: abortCurrentStream,
      streamWorking,
      intermediate,
      reasoningText,
      appendToMessageHistory,
      chatError,
      clearChatError,
      artifacts,
      currentStreamingArtifact,
      getArtifactsForMessage,
      documents,
      currentStreamingDocument,
      getDocumentsForMessage,
      updateMessageReaction,
      streamingForConversationId,
      isStreaming,

      saveLocalMessage,
      updateLocalMessageContent,
      touchLocalConversation,

      // ===== Local Model Functionality =====
      isLocal: localModel.isLocal,
      setIsLocal: localModel.setIsLocal,
      isLocalModelReady: localModel.isLocalModelReady,
      isLocalModelGenerating: localModel.isLocalModelGenerating,
      localModelDownloadProgress,
      isLocalModelDownloading,
      localModelError,
      isLocalModelSupported,
      canSafelyUnmount: localModel.canSafelyUnmount,
      handleSendLocalMessage: localModel.handleSendLocalMessage,
      interruptLocalGeneration: localModel.interruptLocalGeneration,
      clearLocalModel: localModel.clearLocalModel,
      currentLocalModel: localModel.currentLocalModel,
      llm: localModel.llm,
      updateLocalModelReady: localModel.updateLocalModelReady,
      updateLocalModelGenerating: localModel.updateLocalModelGenerating,
    };
  }, [
    isChatLoading,
    setChatLoading,
    intermediate,
    reasoningText,
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
    abortCurrentStream,
    streamWorking,
    appendToMessageHistory,
    chatError,
    clearChatError,
    artifacts,
    currentStreamingArtifact,
    getArtifactsForMessage,
    documents,
    currentStreamingDocument,
    getDocumentsForMessage,
    updateMessageReaction,
    streamingForConversationId,
    isStreaming,
    saveLocalMessage,
    updateLocalMessageContent,
    touchLocalConversation,
    localModel.isLocal,
    localModel.isLocalModelReady,
    localModel.isLocalModelGenerating,
    localModelDownloadProgress,
    isLocalModelDownloading,
    localModelError,
    isLocalModelSupported,
    localModel.llm,
    localModel.updateLocalModelReady,
    localModel.updateLocalModelGenerating,
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
