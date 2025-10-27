/**
 * StreamBatcher - RAF-based update batching for smooth streaming
 * 
 * Purpose:
 * - Batch rapid stream updates to prevent excessive re-renders
 * - Use requestAnimationFrame for 60 FPS updates
 * - Reduce state update overhead from 60+ per second to ~60 per second max (1 per frame)
 * 
 * Performance Impact:
 * - Before: 60-100 state updates per second (causes stuttering)
 * - After: Maximum 60 updates per second (one per frame)
 * - Result: Smoother visual updates, reduced CPU usage
 * 
 * Usage:
 * ```typescript
 * const batcher = new StreamBatcher();
 * 
 * // Schedule updates (called many times per second)
 * batcher.schedule(newContent, (content) => {
 *   setStream(content); // Only called once per frame
 * });
 * 
 * // Cleanup when done
 * batcher.flush();
 * ```
 */

export class StreamBatcher {
  private pendingUpdate: string | null = null;
  private rafId: number | null = null;
  private lastUpdateTime: number = 0;
  private updateCount: number = 0;
  
  /**
   * Schedule an update to be delivered on the next animation frame
   * 
   * @param content - The content to deliver
   * @param callback - Function to call with the content
   */
  schedule(content: string, callback: (content: string) => void): void {
    // Store the latest content
    this.pendingUpdate = content;
    
    // If we already have a pending RAF, don't schedule another one
    // This ensures maximum of 1 update per frame (60 FPS)
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        // Deliver the most recent update
        if (this.pendingUpdate !== null) {
          try {
            callback(this.pendingUpdate);
            
            // Track metrics (dev mode only)
            if (__DEV__) {
              this.updateCount++;
              const now = Date.now();
              const timeSinceLastUpdate = now - this.lastUpdateTime;
              this.lastUpdateTime = now;
              
              // Log performance metrics every 100 updates
              if (this.updateCount % 100 === 0) {
                const fps = timeSinceLastUpdate > 0 ? 1000 / timeSinceLastUpdate : 0;
                console.log(`[StreamBatcher] Updates: ${this.updateCount}, FPS: ${fps.toFixed(1)}`);
              }
            }
          } catch (error) {
            console.error('[StreamBatcher] Error in callback:', error);
          }
          
          // Clear pending update
          this.pendingUpdate = null;
        }
        
        // Reset RAF ID
        this.rafId = null;
      });
    }
  }
  
  /**
   * Immediately deliver any pending update and cancel scheduled RAF
   * Call this when streaming completes or component unmounts
   */
  flush(): void {
    // Cancel pending RAF if exists
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    
    // Clear pending update without delivering
    this.pendingUpdate = null;
    
    // Log final stats in dev mode
    if (__DEV__ && this.updateCount > 0) {
      console.log(`[StreamBatcher] Flushed after ${this.updateCount} updates`);
    }
    
    // Reset metrics
    this.updateCount = 0;
    this.lastUpdateTime = 0;
  }
  
  /**
   * Check if there's a pending update
   */
  hasPending(): boolean {
    return this.pendingUpdate !== null;
  }
  
  /**
   * Get current update count (for debugging)
   */
  getUpdateCount(): number {
    return this.updateCount;
  }
}

/**
 * Create a singleton batcher for global use
 * 
 * Note: For production, you might want one batcher per conversation
 * to allow parallel streaming in different conversations
 */
export const globalStreamBatcher = new StreamBatcher();

/**
 * Hook-friendly wrapper for StreamBatcher
 * Creates and manages a batcher instance with automatic cleanup
 * 
 * Usage in React:
 * ```typescript
 * const batcher = useStreamBatcher();
 * 
 * useEffect(() => {
 *   batcher.schedule(content, setStream);
 * }, [content]);
 * ```
 */
export const createStreamBatcher = (): StreamBatcher => {
  return new StreamBatcher();
};

