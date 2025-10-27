/**
 * StreamBatcher Tests
 * 
 * Tests for RAF-based update batching utility
 */

import { StreamBatcher, createStreamBatcher } from '@/utils/StreamBatcher';

// Mock requestAnimationFrame and cancelAnimationFrame
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // Simulate 60 FPS (16ms per frame)
  return 1;
}) as any;

global.cancelAnimationFrame = jest.fn();

describe('StreamBatcher', () => {
  let batcher: StreamBatcher;
  
  beforeEach(() => {
    batcher = new StreamBatcher();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    batcher.flush();
  });
  
  describe('schedule()', () => {
    it('should schedule a callback to be called with content', (done) => {
      const content = 'Hello, world!';
      const callback = jest.fn((receivedContent) => {
        expect(receivedContent).toBe(content);
        done();
      });
      
      batcher.schedule(content, callback);
    });
    
    it('should only call callback once per frame for multiple rapid updates', (done) => {
      const callback = jest.fn();
      
      // Schedule multiple updates rapidly
      batcher.schedule('update1', callback);
      batcher.schedule('update2', callback);
      batcher.schedule('update3', callback);
      batcher.schedule('update4', callback);
      
      // Wait for RAF to complete
      setTimeout(() => {
        // Callback should only be called once with the latest content
        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith('update4');
        done();
      }, 50);
    });
    
    it('should deliver the most recent content', (done) => {
      const callback = jest.fn();
      
      batcher.schedule('first', callback);
      batcher.schedule('second', callback);
      batcher.schedule('final', callback);
      
      setTimeout(() => {
        expect(callback).toHaveBeenCalledWith('final');
        done();
      }, 50);
    });
    
    it('should handle errors in callback gracefully', (done) => {
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      batcher.schedule('test', errorCallback);
      
      setTimeout(() => {
        expect(errorCallback).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      }, 50);
    });
  });
  
  describe('flush()', () => {
    it('should cancel pending RAF', () => {
      batcher.schedule('test', jest.fn());
      batcher.flush();
      
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
    
    it('should clear pending update without delivering', (done) => {
      const callback = jest.fn();
      
      batcher.schedule('test', callback);
      batcher.flush();
      
      // Wait to ensure callback is not called
      setTimeout(() => {
        expect(callback).not.toHaveBeenCalled();
        done();
      }, 50);
    });
    
    it('should reset update count', (done) => {
      const callback = jest.fn();
      
      batcher.schedule('test1', callback);
      
      setTimeout(() => {
        const countBefore = batcher.getUpdateCount();
        expect(countBefore).toBe(1);
        
        batcher.flush();
        
        const countAfter = batcher.getUpdateCount();
        expect(countAfter).toBe(0);
        done();
      }, 50);
    });
  });
  
  describe('hasPending()', () => {
    it('should return true when update is pending', () => {
      batcher.schedule('test', jest.fn());
      expect(batcher.hasPending()).toBe(true);
    });
    
    it('should return false after flush', () => {
      batcher.schedule('test', jest.fn());
      batcher.flush();
      expect(batcher.hasPending()).toBe(false);
    });
    
    it('should return false initially', () => {
      expect(batcher.hasPending()).toBe(false);
    });
  });
  
  describe('getUpdateCount()', () => {
    it('should return 0 initially', () => {
      expect(batcher.getUpdateCount()).toBe(0);
    });
    
    it('should increment after each delivered update', (done) => {
      const callback = jest.fn();
      
      batcher.schedule('test1', callback);
      
      setTimeout(() => {
        expect(batcher.getUpdateCount()).toBe(1);
        
        batcher.schedule('test2', callback);
        
        setTimeout(() => {
          expect(batcher.getUpdateCount()).toBe(2);
          done();
        }, 50);
      }, 50);
    });
  });
  
  describe('Performance', () => {
    it('should batch 100 updates into significantly fewer callbacks', (done) => {
      const callback = jest.fn();
      
      // Schedule 100 updates as fast as possible
      for (let i = 0; i < 100; i++) {
        batcher.schedule(`update${i}`, callback);
      }
      
      // Wait for all updates to settle
      setTimeout(() => {
        // Should be called far fewer times than 100
        // Exact number depends on timing, but should be < 10
        expect(callback.mock.calls.length).toBeLessThan(10);
        
        // Last call should have the final content
        const lastCall = callback.mock.calls[callback.mock.calls.length - 1];
        expect(lastCall[0]).toBe('update99');
        
        done();
      }, 200);
    }, 10000); // Give it time to process
  });
  
  describe('createStreamBatcher()', () => {
    it('should create a new StreamBatcher instance', () => {
      const newBatcher = createStreamBatcher();
      expect(newBatcher).toBeInstanceOf(StreamBatcher);
    });
    
    it('should create independent instances', () => {
      const batcher1 = createStreamBatcher();
      const batcher2 = createStreamBatcher();
      
      expect(batcher1).not.toBe(batcher2);
    });
  });
  
  describe('Multiple batchers', () => {
    it('should allow multiple batchers to work independently', (done) => {
      const batcher1 = new StreamBatcher();
      const batcher2 = new StreamBatcher();
      
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      batcher1.schedule('batcher1-data', callback1);
      batcher2.schedule('batcher2-data', callback2);
      
      setTimeout(() => {
        expect(callback1).toHaveBeenCalledWith('batcher1-data');
        expect(callback2).toHaveBeenCalledWith('batcher2-data');
        
        batcher1.flush();
        batcher2.flush();
        done();
      }, 50);
    });
  });
});

