/**
 * StreamManager - Centralized stream lifecycle management
 * 
 * Purpose:
 * - Track active streams across conversations
 * - Prevent race conditions from overlapping streams
 * - Ensure proper cleanup before starting new streams
 * - Manage stream state transitions
 * - Queue streams if needed
 * 
 * Features:
 * - Single active stream guarantee
 * - Automatic cleanup on stream switch
 * - Graceful cancellation handling
 * - State transition tracking
 * - Debug logging for troubleshooting
 * 
 * Usage:
 * ```typescript
 * const streamManager = new StreamManager();
 * 
 * // Start a new stream (automatically cancels previous)
 * const stream = await streamManager.startStream(
 *   conversationId,
 *   async (controller) => {
 *     // Your streaming logic here
 *     const response = await fetch(url, { signal: controller.signal });
 *     return processStream(response.body);
 *   }
 * );
 * 
 * // Check if a stream is active
 * if (streamManager.hasActiveStream(conversationId)) {
 *   console.log('Stream already running');
 * }
 * 
 * // Cancel current stream
 * await streamManager.cancelStream(conversationId);
 * ```
 */

export enum StreamState {
  IDLE = 'idle',
  STARTING = 'starting',
  STREAMING = 'streaming',
  CANCELLING = 'cancelling',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface ActiveStream {
  conversationId: string;
  controller: AbortController;
  state: StreamState;
  startTime: number;
  messageId?: string;
  bytesReceived?: number;
}

export interface StreamManagerOptions {
  /**
   * Maximum time to wait for cleanup before forcing new stream (ms)
   */
  maxCleanupWaitTime?: number;
  
  /**
   * Enable queue mode (queue streams instead of cancelling)
   */
  enableQueueing?: boolean;
  
  /**
   * Maximum queue size (prevents memory issues)
   */
  maxQueueSize?: number;
  
  /**
   * Enable debug logging
   */
  enableDebugLogging?: boolean;
  
  /**
   * Grace period after cancellation before allowing new stream (ms)
   */
  gracePeriod?: number;
}

export interface StreamQueueItem {
  conversationId: string;
  executor: (controller: AbortController) => Promise<any>;
  priority: number;
  timestamp: number;
}

export class StreamManager {
  private activeStreams: Map<string, ActiveStream> = new Map();
  private streamQueue: StreamQueueItem[] = [];
  private options: Required<StreamManagerOptions>;
  private stateChangeListeners: Map<string, Set<(state: StreamState) => void>> = new Map();
  private cleanupPromises: Map<string, Promise<void>> = new Map();
  
  constructor(options: StreamManagerOptions = {}) {
    this.options = {
      maxCleanupWaitTime: options.maxCleanupWaitTime ?? 500,
      enableQueueing: options.enableQueueing ?? false,
      maxQueueSize: options.maxQueueSize ?? 3,
      enableDebugLogging: options.enableDebugLogging ?? __DEV__,
      gracePeriod: options.gracePeriod ?? 100,
    };
  }
  
  /**
   * Start a new stream for a conversation
   * Automatically cancels any existing stream for this conversation
   */
  async startStream<T>(
    conversationId: string,
    executor: (controller: AbortController) => Promise<T>,
    messageId?: string
  ): Promise<T | null> {
    this.log(`[StreamManager] Starting stream for conversation: ${conversationId}`);
    
    // Cancel any existing stream for this conversation
    if (this.hasActiveStream(conversationId)) {
      this.log(`[StreamManager] Existing stream found, cancelling...`);
      await this.cancelStream(conversationId);
      
      // Wait for cleanup to complete
      const cleanupPromise = this.cleanupPromises.get(conversationId);
      if (cleanupPromise) {
        try {
          await Promise.race([
            cleanupPromise,
            this.timeout(this.options.maxCleanupWaitTime, 'Cleanup timeout')
          ]);
        } catch (error) {
          this.log(`[StreamManager] Cleanup wait timeout, proceeding anyway`);
        }
      }
      
      // Grace period to ensure state is fully cleared
      await this.sleep(this.options.gracePeriod);
    }
    
    // Create new abort controller
    const controller = new AbortController();
    
    // Register the stream
    const stream: ActiveStream = {
      conversationId,
      controller,
      state: StreamState.STARTING,
      startTime: Date.now(),
      messageId,
      bytesReceived: 0,
    };
    
    this.activeStreams.set(conversationId, stream);
    this.notifyStateChange(conversationId, StreamState.STARTING);
    
    try {
      // Update state to streaming
      this.updateStreamState(conversationId, StreamState.STREAMING);
      
      // Execute the stream
      this.log(`[StreamManager] Executing stream for: ${conversationId}`);
      const result = await executor(controller);
      
      // Mark as completed
      this.updateStreamState(conversationId, StreamState.COMPLETED);
      this.log(`[StreamManager] Stream completed for: ${conversationId}`);
      
      // Cleanup after short delay
      setTimeout(() => this.cleanup(conversationId), 100);
      
      return result;
    } catch (error: any) {
      // Check if this was an abort
      if (error?.name === 'AbortError' || controller.signal.aborted) {
        this.log(`[StreamManager] Stream cancelled for: ${conversationId}`);
        this.updateStreamState(conversationId, StreamState.CANCELLING);
      } else {
        this.log(`[StreamManager] Stream failed for: ${conversationId}`, error);
        this.updateStreamState(conversationId, StreamState.FAILED);
      }
      
      // Cleanup
      await this.cleanup(conversationId);
      
      // Re-throw non-abort errors
      if (error?.name !== 'AbortError') {
        throw error;
      }
      
      return null;
    }
  }
  
  /**
   * Cancel an active stream
   */
  async cancelStream(conversationId: string): Promise<void> {
    const stream = this.activeStreams.get(conversationId);
    
    if (!stream) {
      this.log(`[StreamManager] No active stream to cancel for: ${conversationId}`);
      return;
    }
    
    this.log(`[StreamManager] Cancelling stream for: ${conversationId}`);
    this.updateStreamState(conversationId, StreamState.CANCELLING);
    
    // Create cleanup promise
    const cleanupPromise = this.performCleanup(conversationId, stream);
    this.cleanupPromises.set(conversationId, cleanupPromise);
    
    await cleanupPromise;
  }
  
  /**
   * Perform the actual cleanup
   */
  private async performCleanup(conversationId: string, stream: ActiveStream): Promise<void> {
    try {
      // Abort the stream
      stream.controller.abort();
      
      // Wait for abort to propagate
      await this.sleep(50);
      
      // Remove from active streams
      this.activeStreams.delete(conversationId);
      
      // Notify listeners
      this.notifyStateChange(conversationId, StreamState.IDLE);
      
      // Clear cleanup promise
      this.cleanupPromises.delete(conversationId);
      
      this.log(`[StreamManager] Cleanup complete for: ${conversationId}`);
    } catch (error) {
      this.log(`[StreamManager] Error during cleanup for: ${conversationId}`, error);
    }
  }
  
  /**
   * Cancel all active streams
   */
  async cancelAllStreams(): Promise<void> {
    this.log(`[StreamManager] Cancelling all active streams (${this.activeStreams.size})`);
    
    const cancelPromises = Array.from(this.activeStreams.keys()).map(id =>
      this.cancelStream(id)
    );
    
    await Promise.all(cancelPromises);
  }
  
  /**
   * Check if a conversation has an active stream
   */
  hasActiveStream(conversationId: string): boolean {
    const stream = this.activeStreams.get(conversationId);
    return stream !== undefined && 
           stream.state !== StreamState.COMPLETED &&
           stream.state !== StreamState.FAILED &&
           stream.state !== StreamState.IDLE;
  }
  
  /**
   * Get the current state of a stream
   */
  getStreamState(conversationId: string): StreamState {
    return this.activeStreams.get(conversationId)?.state ?? StreamState.IDLE;
  }
  
  /**
   * Get active stream info
   */
  getActiveStream(conversationId: string): ActiveStream | undefined {
    return this.activeStreams.get(conversationId);
  }
  
  /**
   * Get all active streams
   */
  getAllActiveStreams(): ActiveStream[] {
    return Array.from(this.activeStreams.values());
  }
  
  /**
   * Update stream state
   */
  private updateStreamState(conversationId: string, state: StreamState): void {
    const stream = this.activeStreams.get(conversationId);
    if (stream) {
      stream.state = state;
      this.notifyStateChange(conversationId, state);
    }
  }
  
  /**
   * Update bytes received (for progress tracking)
   */
  updateBytesReceived(conversationId: string, bytes: number): void {
    const stream = this.activeStreams.get(conversationId);
    if (stream) {
      stream.bytesReceived = bytes;
    }
  }
  
  /**
   * Subscribe to state changes
   */
  onStateChange(conversationId: string, listener: (state: StreamState) => void): () => void {
    if (!this.stateChangeListeners.has(conversationId)) {
      this.stateChangeListeners.set(conversationId, new Set());
    }
    
    this.stateChangeListeners.get(conversationId)!.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.stateChangeListeners.get(conversationId)?.delete(listener);
    };
  }
  
  /**
   * Notify state change listeners
   */
  private notifyStateChange(conversationId: string, state: StreamState): void {
    const listeners = this.stateChangeListeners.get(conversationId);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(state);
        } catch (error) {
          this.log(`[StreamManager] Error in state change listener`, error);
        }
      });
    }
  }
  
  /**
   * Queue a stream for later execution
   */
  queueStream(
    conversationId: string,
    executor: (controller: AbortController) => Promise<any>,
    priority: number = 0
  ): void {
    if (!this.options.enableQueueing) {
      this.log(`[StreamManager] Queueing disabled, ignoring queue request`);
      return;
    }
    
    if (this.streamQueue.length >= this.options.maxQueueSize) {
      this.log(`[StreamManager] Queue full, rejecting stream for: ${conversationId}`);
      return;
    }
    
    this.streamQueue.push({
      conversationId,
      executor,
      priority,
      timestamp: Date.now(),
    });
    
    // Sort by priority (higher first) then timestamp (older first)
    this.streamQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp - b.timestamp;
    });
    
    this.log(`[StreamManager] Stream queued for: ${conversationId}, queue size: ${this.streamQueue.length}`);
  }
  
  /**
   * Process next item in queue
   */
  async processQueue(): Promise<void> {
    if (this.streamQueue.length === 0) return;
    
    const item = this.streamQueue.shift();
    if (!item) return;
    
    this.log(`[StreamManager] Processing queued stream for: ${item.conversationId}`);
    
    try {
      await this.startStream(item.conversationId, item.executor);
    } catch (error) {
      this.log(`[StreamManager] Error processing queued stream`, error);
    }
  }
  
  /**
   * Clear the queue
   */
  clearQueue(): void {
    this.streamQueue = [];
    this.log(`[StreamManager] Queue cleared`);
  }
  
  /**
   * Cleanup a specific stream
   */
  private async cleanup(conversationId: string): Promise<void> {
    const stream = this.activeStreams.get(conversationId);
    if (stream) {
      await this.performCleanup(conversationId, stream);
    }
  }
  
  /**
   * Get stream statistics
   */
  getStatistics(conversationId: string): {
    state: StreamState;
    duration: number;
    bytesReceived: number;
  } | null {
    const stream = this.activeStreams.get(conversationId);
    if (!stream) return null;
    
    return {
      state: stream.state,
      duration: Date.now() - stream.startTime,
      bytesReceived: stream.bytesReceived ?? 0,
    };
  }
  
  /**
   * Reset the manager (for testing)
   */
  reset(): void {
    this.log(`[StreamManager] Resetting manager`);
    this.cancelAllStreams();
    this.clearQueue();
    this.stateChangeListeners.clear();
    this.cleanupPromises.clear();
  }
  
  /**
   * Helper: Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Helper: Timeout utility
   */
  private timeout<T>(ms: number, message: string): Promise<T> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    });
  }
  
  /**
   * Helper: Logging
   */
  private log(message: string, data?: any): void {
    if (this.options.enableDebugLogging) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
}

/**
 * Global singleton instance for app-wide stream management
 * Use this for most cases unless you need isolated managers
 */
export const globalStreamManager = new StreamManager({
  enableDebugLogging: __DEV__,
  maxCleanupWaitTime: 500,
  gracePeriod: 100,
});

/**
 * React hook for stream manager
 * Automatically cleans up on unmount
 */
export function useStreamManager(conversationId: string | null) {
  const [streamState, setStreamState] = React.useState<StreamState>(StreamState.IDLE);
  
  React.useEffect(() => {
    if (!conversationId) return;
    
    // Subscribe to state changes
    const unsubscribe = globalStreamManager.onStateChange(conversationId, setStreamState);
    
    // Set initial state
    setStreamState(globalStreamManager.getStreamState(conversationId));
    
    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, [conversationId]);
  
  const startStream = React.useCallback(
    async <T,>(executor: (controller: AbortController) => Promise<T>, messageId?: string) => {
      if (!conversationId) return null;
      return globalStreamManager.startStream(conversationId, executor, messageId);
    },
    [conversationId]
  );
  
  const cancelStream = React.useCallback(async () => {
    if (!conversationId) return;
    await globalStreamManager.cancelStream(conversationId);
  }, [conversationId]);
  
  const hasActiveStream = React.useCallback(() => {
    if (!conversationId) return false;
    return globalStreamManager.hasActiveStream(conversationId);
  }, [conversationId]);
  
  return {
    streamState,
    startStream,
    cancelStream,
    hasActiveStream,
  };
}

// React import for the hook
import React from 'react';

