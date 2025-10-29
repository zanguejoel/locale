/**
 * StreamManager Tests
 * 
 * Priority: P0 (Critical)
 * Tests for centralized stream lifecycle management
 */

import { StreamManager, StreamState } from '@/utils/StreamManager';

describe('StreamManager', () => {
  let streamManager: StreamManager;
  
  beforeEach(() => {
    // Use real timers for StreamManager tests
    jest.useRealTimers();
    
    streamManager = new StreamManager({
      enableDebugLogging: false,
      gracePeriod: 0, // Disable grace period for tests
    });
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    streamManager.reset();
    jest.useFakeTimers(); // Restore fake timers for other tests
  });
  
  describe('Basic Lifecycle', () => {
    describe('startStream', () => {
      it('should start a stream successfully', async () => {
        const conversationId = 'test-123';
        let executorCalled = false;
        
        const result = await streamManager.startStream(
          conversationId,
          async (controller) => {
            executorCalled = true;
            expect(controller.signal).toBeDefined();
            return 'success';
          }
        );
        
        expect(executorCalled).toBe(true);
        expect(result).toBe('success');
        expect(streamManager.getStreamState(conversationId)).toBe(StreamState.COMPLETED);
      });
      
      it('should track stream state transitions', async () => {
        const conversationId = 'test-123';
        const states: StreamState[] = [];
        
        streamManager.onStateChange(conversationId, (state) => {
          states.push(state);
        });
        
        await streamManager.startStream(conversationId, async () => {
          // Quick async work
          return 'done';
        });
        
        // Should have transitioned through states
        expect(states).toContain(StreamState.STARTING);
        expect(states[states.length - 1]).toBe(StreamState.COMPLETED);
      });
      
      it('should abort previous stream when starting new one', async () => {
        const conversationId = 'test-123';
        let firstStreamAborted = false;
        let firstStreamCompleted = false;
        
        // Start first stream
        const promise1 = streamManager.startStream(
          conversationId,
          async (controller) => {
            controller.signal.addEventListener('abort', () => {
              firstStreamAborted = true;
            });
            
            // Simulate long-running task
            await new Promise(resolve => setTimeout(resolve, 100));
            firstStreamCompleted = true;
            return 'first';
          }
        );
        
        // Wait a bit then start second stream
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const promise2 = streamManager.startStream(
          conversationId,
          async () => 'second'
        );
        
        const result2 = await promise2;
        
        expect(firstStreamAborted).toBe(true);
        expect(firstStreamCompleted).toBe(false);
        expect(result2).toBe('second');
      });
      
      it('should handle multiple conversations independently', async () => {
        const conv1 = 'conversation-1';
        const conv2 = 'conversation-2';
        
        const result1Promise = streamManager.startStream(
          conv1,
          async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'result-1';
          }
        );
        
        const result2Promise = streamManager.startStream(
          conv2,
          async () => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'result-2';
          }
        );
        
        const [result1, result2] = await Promise.all([result1Promise, result2Promise]);
        
        expect(result1).toBe('result-1');
        expect(result2).toBe('result-2');
      });
    });
    
    describe('cancelStream', () => {
      it('should cancel active stream', async () => {
        const conversationId = 'test-123';
        let streamCancelled = false;
        
        const streamPromise = streamManager.startStream(
          conversationId,
          async (controller) => {
            controller.signal.addEventListener('abort', () => {
              streamCancelled = true;
            });
            
            // Check if aborted during execution
            if (!controller.signal.aborted) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
            
            // Return null if aborted
            if (controller.signal.aborted) {
              return null;
            }
            return 'done';
          }
        );
        
        // Cancel after starting
        await new Promise(resolve => setTimeout(resolve, 20));
        await streamManager.cancelStream(conversationId);
        
        const result = await streamPromise;
        
        // Cancellation should have been triggered
        expect(streamCancelled).toBe(true);
        
        // Stream should no longer be active
        expect(streamManager.hasActiveStream(conversationId)).toBe(false);
      });
      
      it('should handle cancelling non-existent stream gracefully', async () => {
        await expect(
          streamManager.cancelStream('non-existent')
        ).resolves.not.toThrow();
      });
      
      it('should transition state to CANCELLING', async () => {
        const conversationId = 'test-123';
        const states: StreamState[] = [];
        
        streamManager.onStateChange(conversationId, (state) => {
          states.push(state);
        });
        
        streamManager.startStream(
          conversationId,
          async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return 'done';
          }
        );
        
        // Wait for stream to start
        await new Promise(resolve => setTimeout(resolve, 10));
        
        await streamManager.cancelStream(conversationId);
        
        expect(states).toContain(StreamState.CANCELLING);
      });
    });
    
    describe('hasActiveStream', () => {
      it('should return true for active stream', async () => {
        const conversationId = 'test-123';
        
        const streamPromise = streamManager.startStream(
          conversationId,
          async () => {
            await new Promise(resolve => setTimeout(resolve, 50));
            return 'done';
          }
        );
        
        // Wait a tiny bit for stream to start
        await new Promise(resolve => setTimeout(resolve, 5));
        
        // Should be active while running
        expect(streamManager.hasActiveStream(conversationId)).toBe(true);
        
        await streamPromise;
        
        // Should not be active after completion
        expect(streamManager.hasActiveStream(conversationId)).toBe(false);
      });
      
      it('should return false for completed stream', async () => {
        const conversationId = 'test-123';
        
        await streamManager.startStream(conversationId, async () => 'done');
        
        expect(streamManager.hasActiveStream(conversationId)).toBe(false);
      });
      
      it('should return false initially', () => {
        expect(streamManager.hasActiveStream('any-id')).toBe(false);
      });
    });
  });
  
  describe('Error Handling', () => {
    it('should handle executor errors', async () => {
      const conversationId = 'test-123';
      
      try {
        await streamManager.startStream(conversationId, async () => {
          throw new Error('Test error');
        });
        // Should not reach here
        expect(true).toBe(false);
      } catch (error: any) {
        expect(error.message).toBe('Test error');
      }
      
      // State should be FAILED after error
      const state = streamManager.getStreamState(conversationId);
      expect([StreamState.FAILED, StreamState.IDLE]).toContain(state);
    });
    
    it('should not re-throw AbortError', async () => {
      const conversationId = 'test-123';
      
      const result = await streamManager.startStream(
        conversationId,
        async (controller) => {
          controller.abort();
          const error = new Error('Aborted');
          error.name = 'AbortError';
          throw error;
        }
      );
      
      // Abort errors should return null
      expect(result).toBeNull();
      
      // State should be CANCELLING or IDLE after abort
      const state = streamManager.getStreamState(conversationId);
      expect([StreamState.CANCELLING, StreamState.IDLE]).toContain(state);
    });
    
    it('should handle network errors', async () => {
      const conversationId = 'test-123';
      
      await expect(
        streamManager.startStream(conversationId, async () => {
          const error = new Error('Network request failed');
          error.name = 'NetworkError';
          throw error;
        })
      ).rejects.toThrow('Network request failed');
    });
    
    it('should clean up after error', async () => {
      const conversationId = 'test-123';
      
      try {
        await streamManager.startStream(conversationId, async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // Expected
      }
      
      // Should not have active stream after error
      expect(streamManager.hasActiveStream(conversationId)).toBe(false);
    });
  });
  
  describe('State Management', () => {
    it('should provide correct state at each point', async () => {
      const conversationId = 'test-123';
      
      // Initial state
      expect(streamManager.getStreamState(conversationId)).toBe(StreamState.IDLE);
      
      // Start stream
      const promise = streamManager.startStream(conversationId, async () => {
        await new Promise(resolve => setTimeout(resolve, 20));
        return 'done';
      });
      
      // Wait a tiny bit
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Should be starting or streaming
      const activeState = streamManager.getStreamState(conversationId);
      expect([StreamState.STARTING, StreamState.STREAMING]).toContain(activeState);
      
      await promise;
      
      // Should be completed
      expect(streamManager.getStreamState(conversationId)).toBe(StreamState.COMPLETED);
    });
    
    it('should trigger state change listeners', async () => {
      const conversationId = 'test-123';
      const listener = jest.fn();
      
      streamManager.onStateChange(conversationId, listener);
      
      await streamManager.startStream(conversationId, async () => 'done');
      
      expect(listener).toHaveBeenCalled();
      expect(listener.mock.calls[0][0]).toBe(StreamState.STARTING);
    });
    
    it('should remove state change listeners', async () => {
      const conversationId = 'test-123';
      const listener = jest.fn();
      
      const unsubscribe = streamManager.onStateChange(conversationId, listener);
      unsubscribe();
      
      await streamManager.startStream(conversationId, async () => 'done');
      
      expect(listener).not.toHaveBeenCalled();
    });
  });
  
  describe('Cleanup and Reset', () => {
    it('should reset all active streams', async () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';
      
      const promise1 = streamManager.startStream(conv1, async (controller) => {
        // Respect abort signal
        if (!controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return controller.signal.aborted ? null : 'done';
      });
      
      const promise2 = streamManager.startStream(conv2, async (controller) => {
        // Respect abort signal
        if (!controller.signal.aborted) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        return controller.signal.aborted ? null : 'done';
      });
      
      // Wait for streams to start
      await new Promise(resolve => setTimeout(resolve, 20));
      
      // Reset should cancel all streams
      streamManager.reset();
      
      // Wait for promises to settle
      await Promise.allSettled([promise1, promise2]);
      
      // After reset and settling, streams should not be active
      expect(streamManager.hasActiveStream(conv1)).toBe(false);
      expect(streamManager.hasActiveStream(conv2)).toBe(false);
    });
    
    it('should clear state after reset', async () => {
      const conversationId = 'test-123';
      
      streamManager.startStream(conversationId, async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return 'done';
      });
      
      await new Promise(resolve => setTimeout(resolve, 10));
      
      streamManager.reset();
      
      // After reset, state should be cleaned up
      const state = streamManager.getStreamState(conversationId);
      expect([StreamState.IDLE, StreamState.CANCELLING]).toContain(state);
    });
  });
  
  describe('Race Conditions', () => {
    it('should prevent concurrent streams for same conversation', async () => {
      const conversationId = 'test-123';
      
      const promise1 = streamManager.startStream(
        conversationId,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'stream1';
        }
      );
      
      // Wait a bit, then start second stream
      await new Promise(resolve => setTimeout(resolve, 5));
      
      const promise2 = streamManager.startStream(
        conversationId,
        async () => {
          await new Promise(resolve => setTimeout(resolve, 20));
          return 'stream2';
        }
      );
      
      const result2 = await promise2;
      
      // First stream should be cancelled, second should complete
      expect(result2).toBe('stream2');
    });
    
    it('should handle rapid stream starts', async () => {
      const conversationId = 'test-123';
      
      // Start 5 streams rapidly (reduced from 10 for speed)
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          streamManager.startStream(conversationId, async () => `result-${i}`)
        );
      }
      
      const results = await Promise.all(promises);
      
      // Last non-null result should be from the last stream
      const nonNullResults = results.filter(r => r !== null);
      expect(nonNullResults.length).toBeGreaterThan(0);
      expect(nonNullResults[nonNullResults.length - 1]).toBe('result-4');
    });
  });
  
  describe('Performance', () => {
    it('should handle stream start/stop cycles efficiently', async () => {
      const conversationId = 'test-123';
      
      const startTime = Date.now();
      
      // Run 20 quick streams
      for (let i = 0; i < 20; i++) {
        await streamManager.startStream(conversationId, async () => `result-${i}`);
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete reasonably fast (< 1 second for 20 streams)
      expect(duration).toBeLessThan(1000);
    });
    
    it('should not leak memory with many streams', async () => {
      // This is a basic check - real memory testing would need more sophisticated tools
      const conversationId = 'test-123';
      
      for (let i = 0; i < 50; i++) {
        await streamManager.startStream(conversationId, async () => `result-${i}`);
      }
      
      // If we got here without crashing, basic memory management is working
      expect(streamManager.hasActiveStream(conversationId)).toBe(false);
    });
  });
});

