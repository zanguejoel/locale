/**
 * useConversationStream - Access stream state for a specific conversation
 * 
 * Purpose:
 * - Provide convenient access to streaming state for a single conversation
 * - Only trigger re-renders when THIS conversation's stream updates
 * - Isolate stream state from navigation and other UI components
 * 
 * Usage:
 * ```typescript
 * const ChatPage = () => {
 *   const { id } = useParams();
 *   const { content, intermediate, reasoning, isStreaming, progress } = useConversationStream(id);
 *   
 *   // Component only re-renders when THIS conversation's stream updates
 *   // Navigation components won't re-render during streaming
 * };
 * ```
 * 
 * Performance Impact:
 * - Only components subscribed to a specific conversation re-render
 * - Prevents navigation UI from re-rendering during streaming
 * - Enables 60 FPS scrolling and instant drawer opening
 */

import { useMemo } from 'react';
import { useStreamingState } from '@/contexts/StreamingStateContext';

/**
 * Return type for useConversationStream hook
 */
export interface ConversationStreamState {
  // Content and state
  content: string;
  intermediate: string;
  reasoning: string;
  
  // Status
  isStreaming: boolean;
  isActive: boolean; // True if this is the currently visible conversation
  
  // Metrics
  progress: number; // Character count or other progress indicator
  
  // Helpers
  hasContent: boolean;
  hasIntermediate: boolean;
  hasReasoning: boolean;
}

/**
 * Hook to access stream state for a specific conversation
 * 
 * @param conversationId - The ID of the conversation to monitor
 * @returns Stream state for the conversation, or default empty state if not streaming
 */
export const useConversationStream = (
  conversationId: string | null | undefined
): ConversationStreamState => {
  const streamingState = useStreamingState();
  
  // Get stream state for this conversation
  // Use useMemo to prevent unnecessary re-renders when parent re-renders
  // but stream state hasn't changed
  const streamState = useMemo(() => {
    if (!conversationId) {
      return null;
    }
    return streamingState.getStream(conversationId);
  }, [conversationId, streamingState]);
  
  // Return computed state
  // This will cause re-renders only when the stream content actually changes
  return useMemo(() => {
    if (!streamState) {
      // No active stream for this conversation
      return {
        content: '',
        intermediate: '',
        reasoning: '',
        isStreaming: false,
        isActive: false,
        progress: 0,
        hasContent: false,
        hasIntermediate: false,
        hasReasoning: false,
      };
    }
    
    return {
      content: streamState.content,
      intermediate: streamState.intermediate,
      reasoning: streamState.reasoningText,
      isStreaming: streamState.isStreaming,
      isActive: streamState.isActive,
      progress: streamState.progress,
      hasContent: streamState.content.length > 0,
      hasIntermediate: streamState.intermediate.length > 0,
      hasReasoning: streamState.reasoningText.length > 0,
    };
  }, [streamState]);
};

/**
 * Hook to check if a conversation is currently streaming
 * Lightweight version that only returns boolean
 * 
 * @param conversationId - The ID of the conversation to check
 * @returns True if the conversation is currently streaming
 */
export const useIsConversationStreaming = (
  conversationId: string | null | undefined
): boolean => {
  const streamingState = useStreamingState();
  
  return useMemo(() => {
    if (!conversationId) return false;
    return streamingState.isConversationStreaming(conversationId);
  }, [conversationId, streamingState]);
};

/**
 * Hook to get streaming status across all conversations
 * Useful for global UI indicators (e.g., header badge)
 * 
 * @returns Object with streaming statistics
 */
export const useGlobalStreamingStatus = () => {
  const streamingState = useStreamingState();
  
  return useMemo(() => {
    const streams = streamingState.getActiveStreams();
    const streamArray = Array.from(streams.values());
    
    return {
      hasAnyStreams: streamArray.length > 0,
      activeStreamCount: streamArray.filter(s => s.isStreaming).length,
      totalStreamCount: streamArray.length,
      activeConversations: streamArray
        .filter(s => s.isStreaming)
        .map(s => s.conversationId),
    };
  }, [streamingState]);
};

