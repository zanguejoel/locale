/**
 * StreamingStateContext - Isolated streaming state per conversation
 * 
 * Purpose:
 * - Manage streaming state for multiple conversations independently
 * - Allow background streaming (streams continue when user navigates away)
 * - Prevent streaming state from causing navigation UI to re-render
 * - Enforce limits on concurrent streams (1 active + 2 background max)
 * 
 * Key Features:
 * - Per-conversation stream isolation
 * - Background stream support
 * - Automatic cleanup of old streams
 * - Stream limit enforcement
 * 
 * Performance Impact:
 * - Dramatically reduces re-renders in navigation components
 * - Allows smooth drawer/navigation during streaming
 * - Enables free navigation without interrupting streams
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import * as Haptics from 'expo-haptics';
import { useNotification } from './NotificationContext';
import api from '@/utils/ApiClient';

/**
 * State for a single conversation's stream
 */
export interface StreamState {
  conversationId: string;
  content: string;
  intermediate: string;
  reasoningText: string;
  isActive: boolean; // True if this is the currently visible conversation
  isStreaming: boolean; // True if stream is currently active
  controller: AbortController | null;
  timestamp: number; // When stream started
  progress: number; // Character count or progress indicator
}

/**
 * Context interface
 */
interface StreamingStateContextType {
  // Get stream state for a conversation
  getStream: (conversationId: string) => StreamState | null;
  
  // Check if a conversation is streaming
  isConversationStreaming: (conversationId: string) => boolean;
  
  // Add or update a stream
  addStream: (conversationId: string, controller: AbortController) => void;
  updateStreamContent: (conversationId: string, content: string) => void;
  updateStreamIntermediate: (conversationId: string, intermediate: string) => void;
  updateStreamReasoning: (conversationId: string, reasoning: string) => void;
  
  // Stream lifecycle
  startStream: (conversationId: string, controller: AbortController) => void;
  completeStream: (conversationId: string, metadata?: { chatTitle?: string }) => void;
  abortStream: (conversationId: string) => void;
  
  // Set which conversation is active (visible)
  setActiveConversation: (conversationId: string | null) => void;
  
  // Get all active streams (for UI indicators)
  getActiveStreams: () => Map<string, StreamState>;
  
  // Get streaming status summary
  hasAnyActiveStreams: () => boolean;
  
  // Show notification (for error messages, save failures, etc)
  showNotification: (options: { chatTitle: string; message: string; conversationId: string }) => void;
}

const StreamingStateContext = createContext<StreamingStateContextType | undefined>(undefined);

/**
 * Configuration
 */
const MAX_ACTIVE_STREAMS = 1; // Only 1 active (visible) stream at a time
const MAX_BACKGROUND_STREAMS = 2; // Up to 2 background streams allowed
const STREAM_TIMEOUT = 5 * 60 * 1000; // 5 minutes - auto-cleanup old streams

/**
 * Provider component
 */
export const StreamingStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Map of conversationId -> StreamState
  const [activeStreams, setActiveStreams] = useState<Map<string, StreamState>>(new Map());
  const activeStreamsRef = useRef(activeStreams);
  
  // Track which conversation is currently visible/active
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  
  // Use custom notification system
  const notification = useNotification();
  
  // Conversation title cache (conversationId -> { title, timestamp })
  const titleCacheRef = useRef<Map<string, { title: string; timestamp: number }>>(new Map());
  const TITLE_CACHE_TTL = 60000; // 1 minute cache
  
  // Update ref when state changes
  useEffect(() => {
    activeStreamsRef.current = activeStreams;
  }, [activeStreams]);
  
  /**
   * Get stream state for a specific conversation
   */
  const getStream = useCallback((conversationId: string): StreamState | null => {
    return activeStreamsRef.current.get(conversationId) || null;
  }, []);
  
  /**
   * Check if a conversation is currently streaming
   */
  const isConversationStreaming = useCallback((conversationId: string): boolean => {
    const stream = activeStreamsRef.current.get(conversationId);
    return stream?.isStreaming || false;
  }, []);
  
  /**
   * Enforce stream limits - abort oldest background stream if needed
   */
  const enforceStreamLimits = useCallback((newConversationId: string) => {
    const streams = Array.from(activeStreamsRef.current.entries());
    
    // Separate active and background streams
    // Use ref for synchronous access
    const activeStream = streams.find(([id]) => id === activeConversationIdRef.current);
    const backgroundStreams = streams.filter(([id]) => 
      id !== activeConversationIdRef.current && id !== newConversationId
    );
    
    // If we have too many background streams, abort the oldest
    if (backgroundStreams.length >= MAX_BACKGROUND_STREAMS) {
      // Sort by timestamp (oldest first)
      backgroundStreams.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      // Abort the oldest background stream
      const [oldestId, oldestStream] = backgroundStreams[0];
      console.log('[StreamingState] ⚠️ Stream limit reached, aborting oldest background stream:', oldestId);
      
      if (oldestStream.controller) {
        oldestStream.controller.abort();
      }
      
      // Remove from map
      setActiveStreams(prev => {
        const next = new Map(prev);
        next.delete(oldestId);
        return next;
      });
    }
  }, []); // No dependencies needed - uses refs only
  
  /**
   * Add a new stream
   */
  const addStream = useCallback((conversationId: string, controller: AbortController) => {
    console.log('[StreamingState] ➕ Adding stream for conversation:', conversationId);
    
    // Enforce limits before adding
    enforceStreamLimits(conversationId);
    
    const newStream: StreamState = {
      conversationId,
      content: '',
      intermediate: '',
      reasoningText: '',
      // IMPORTANT: Use ref instead of state to get synchronous value
      // State updates are async, so we'd read stale value if we used activeConversationId
      isActive: conversationId === activeConversationIdRef.current,
      isStreaming: true,
      controller,
      timestamp: Date.now(),
      progress: 0,
    };
    
    setActiveStreams(prev => {
      const next = new Map(prev);
      next.set(conversationId, newStream);
      return next;
    });
  }, [activeConversationId, enforceStreamLimits]);
  
  /**
   * Update stream content
   */
  const updateStreamContent = useCallback((conversationId: string, content: string) => {
    setActiveStreams(prev => {
      const stream = prev.get(conversationId);
      if (!stream) return prev;
      
      const next = new Map(prev);
      next.set(conversationId, {
        ...stream,
        content,
        progress: content.length,
      });
      return next;
    });
  }, []);
  
  /**
   * Update stream intermediate state
   */
  const updateStreamIntermediate = useCallback((conversationId: string, intermediate: string) => {
    setActiveStreams(prev => {
      const stream = prev.get(conversationId);
      if (!stream) return prev;
      
      const next = new Map(prev);
      next.set(conversationId, {
        ...stream,
        intermediate,
      });
      return next;
    });
  }, []);
  
  /**
   * Update stream reasoning text
   */
  const updateStreamReasoning = useCallback((conversationId: string, reasoning: string) => {
    setActiveStreams(prev => {
      const stream = prev.get(conversationId);
      if (!stream) return prev;
      
      const next = new Map(prev);
      next.set(conversationId, {
        ...stream,
        reasoningText: reasoning,
      });
      return next;
    });
  }, []);
  
  /**
   * Start a stream (same as addStream for now)
   */
  const startStream = useCallback((conversationId: string, controller: AbortController) => {
    addStream(conversationId, controller);
  }, [addStream]);
  
  /**
   * Fetch fresh conversation title from backend
   */
  const fetchConversationTitle = useCallback(async (conversationId: string, fallbackTitle?: string): Promise<string> => {
    // Check cache first
    const cached = titleCacheRef.current.get(conversationId);
    const now = Date.now();
    
    if (cached && (now - cached.timestamp) < TITLE_CACHE_TTL) {
      console.log('[StreamingState] 📦 Using cached title:', cached.title);
      return cached.title;
    }
    
    // Fetch fresh title
    try {
      console.log('[StreamingState] 🔄 Fetching fresh conversation title for:', conversationId);
      
      const response = await api.get<any>(`/conversation/${conversationId}`);
      
      if (response.ok && response.data) {
        const title = response.data.title || response.data.content_summary || fallbackTitle || 'Chat';
        
        // Update cache
        titleCacheRef.current.set(conversationId, {
          title,
          timestamp: now,
        });
        
        console.log('[StreamingState] ✅ Fetched fresh title:', title);
        return title;
      }
    } catch (error) {
      console.warn('[StreamingState] ⚠️ Failed to fetch conversation title:', error);
    }
    
    // Fallback to provided title or default
    return fallbackTitle || 'Chat';
  }, []);
  
  /**
   * Complete a stream
   */
  const completeStream = useCallback(async (conversationId: string, metadata?: { chatTitle?: string }) => {
    console.log('[StreamingState] ✅ Completing stream for conversation:', conversationId);
    console.log('[StreamingState] 🔍 Active streams:', Array.from(activeStreamsRef.current.keys()));
    
    // Handle edge case: new chats might have empty conversationId temporarily
    // Convert to string in case it's a number
    const idString = String(conversationId);
    const hasValidId = conversationId && idString.trim() !== '';
    
    // Special handling for streams without valid ID (new chats)
    if (!hasValidId) {
      console.log('[StreamingState] ⚠️ Stream completing without valid conversationId (new chat)');
      console.log('[StreamingState] 🔍 Skipping notification for new chat - cannot reliably determine if active or background');
      
      // For new chats without a valid ID, we cannot reliably determine if they're
      // active or in the background, so we skip showing notifications entirely.
      // This prevents unwanted notifications on the first message of new chats
      // when the user is actively viewing the chat.
      
      return; // Exit early - no stream state to update, no notification shown
    }
    
    setActiveStreams(prev => {
      console.log('[StreamingState] 🔍 Looking for stream in activeStreams, size:', prev.size);
      console.log('[StreamingState] 🔍 All stream IDs:', Array.from(prev.keys()));
      
      const stream = prev.get(conversationId);
      
      // If no stream found, warn and exit
      if (!stream) {
        console.warn('[StreamingState] ⚠️ No stream found for conversation:', conversationId);
        console.warn('[StreamingState] ⚠️ Available streams:', Array.from(prev.keys()));
        return prev;
      }
      
      console.log('[StreamingState] 🔍 Found stream! State:', {
        conversationId,
        isActive: stream.isActive,
        isStreaming: stream.isStreaming,
        shouldShowNotification: !stream.isActive && stream.isStreaming,
        chatTitle: metadata?.chatTitle
      });
      
      // Show notification if this stream completed in the background (unfocused)
      if (!stream.isActive && stream.isStreaming) {
        console.log('[StreamingState] 📬 Stream completed in background, showing notification');
        
        // Provide haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch((err) => {
          console.warn('[StreamingState] Haptic feedback failed:', err);
        });
        
        // Fetch fresh conversation title (async, non-blocking)
        fetchConversationTitle(conversationId, metadata?.chatTitle).then(freshTitle => {
          console.log('[StreamingState] 🎉 Showing notification with fresh title:', freshTitle);
          notification.showNotification({
            message: 'Tap to view response',
            chatTitle: freshTitle,
            conversationId: conversationId,
          });
          console.log('[StreamingState] ✅ Notification triggered');
        }).catch(err => {
          console.error('[StreamingState] Error showing notification:', err);
          // Fallback to provided title
          notification.showNotification({
            message: 'Tap to view response',
            chatTitle: metadata?.chatTitle || 'Chat',
            conversationId: conversationId,
          });
        });
      }
      
      const next = new Map(prev);
      next.set(conversationId, {
        ...stream,
        isStreaming: false,
      });
      
      // Auto-cleanup after a delay (keep final state briefly for UI)
      setTimeout(() => {
        setActiveStreams(current => {
          const updated = new Map(current);
          updated.delete(conversationId);
          return updated;
        });
      }, 2000); // 2 second grace period
      
      return next;
    });
  }, []);
  
  /**
   * Abort a stream
   */
  const abortStream = useCallback((conversationId: string) => {
    console.log('[StreamingState] 🛑 Aborting stream for conversation:', conversationId);
    
    const stream = activeStreamsRef.current.get(conversationId);
    if (stream?.controller) {
      try {
        stream.controller.abort();
      } catch (err) {
        console.warn('[StreamingState] Error aborting stream:', err);
      }
    }
    
    // Remove from active streams
    setActiveStreams(prev => {
      const next = new Map(prev);
      next.delete(conversationId);
      return next;
    });
  }, []);
  
  /**
   * Set which conversation is active
   */
  const setActiveConversation = useCallback((conversationId: string | null) => {
    console.log('[StreamingState] 🎯 Setting active conversation:', conversationId);
    
    // IMPORTANT: Update ref SYNCHRONOUSLY first
    // This ensures addStream can immediately see the correct active conversation
    // when checking isActive = conversationId === activeConversationId
    activeConversationIdRef.current = conversationId;
    
    // Then update state for UI (async)
    setActiveConversationId(conversationId);
    
    // Update isActive flag on all streams
    setActiveStreams(prev => {
      const next = new Map(prev);
      prev.forEach((stream, id) => {
        next.set(id, {
          ...stream,
          isActive: id === conversationId,
        });
      });
      return next;
    });
  }, []);
  
  /**
   * Get all active streams
   */
  const getActiveStreams = useCallback((): Map<string, StreamState> => {
    return new Map(activeStreamsRef.current);
  }, []);
  
  /**
   * Check if any streams are active
   */
  const hasAnyActiveStreams = useCallback((): boolean => {
    return Array.from(activeStreamsRef.current.values()).some(stream => stream.isStreaming);
  }, []);
  
  /**
   * Show notification (for errors, save failures, etc)
   */
  const showNotification = useCallback((options: { chatTitle: string; message: string; conversationId: string }) => {
    console.log('[StreamingState] Showing notification:', options.chatTitle);
    
    // Show notification via notification context
    notification.showNotification({
      chatTitle: options.chatTitle,
      message: options.message,
      conversationId: options.conversationId,
    });
  }, [notification]);
  
  /**
   * Cleanup old streams periodically
   */
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      setActiveStreams(prev => {
        const next = new Map(prev);
        let cleaned = false;
        
        prev.forEach((stream, id) => {
          // Remove streams older than timeout that aren't active
          if (now - stream.timestamp > STREAM_TIMEOUT && !stream.isStreaming) {
            console.log('[StreamingState] 🧹 Cleaning up old stream:', id);
            next.delete(id);
            cleaned = true;
          }
        });
        
        return cleaned ? next : prev;
      });
    }, 60000); // Check every minute
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  // Memoize the context value to prevent infinite re-renders
  // This is critical when the context is used in dependency arrays
  const value: StreamingStateContextType = useMemo(() => ({
    getStream,
    isConversationStreaming,
    addStream,
    updateStreamContent,
    updateStreamIntermediate,
    updateStreamReasoning,
    startStream,
    completeStream,
    abortStream,
    setActiveConversation,
    getActiveStreams,
    hasAnyActiveStreams,
    showNotification,
  }), [
    getStream,
    isConversationStreaming,
    addStream,
    updateStreamContent,
    updateStreamIntermediate,
    updateStreamReasoning,
    startStream,
    completeStream,
    abortStream,
    setActiveConversation,
    getActiveStreams,
    hasAnyActiveStreams,
    showNotification,
  ]);
  
  return (
    <StreamingStateContext.Provider value={value}>
      {children}
    </StreamingStateContext.Provider>
  );
};

/**
 * Hook to use the StreamingStateContext
 */
export const useStreamingState = (): StreamingStateContextType => {
  const context = useContext(StreamingStateContext);
  if (!context) {
    throw new Error('useStreamingState must be used within StreamingStateProvider');
  }
  return context;
};

