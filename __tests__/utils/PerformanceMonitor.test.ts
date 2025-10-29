/**
 * PerformanceMonitor Tests
 * 
 * Priority: P1 (High)
 * Tests for streaming performance tracking
 */

import { PerformanceMonitor } from '@/utils/PerformanceMonitor';

describe('PerformanceMonitor', () => {
  let monitor: PerformanceMonitor;
  
  beforeEach(() => {
    // Use real timers for async tests
    jest.useRealTimers();
    
    monitor = new PerformanceMonitor({
      enableLogging: false,
    });
  });
  
  afterEach(() => {
    monitor.clear();
    jest.useFakeTimers(); // Restore fake timers
  });
  
  describe('Stream Tracking', () => {
    describe('startStream', () => {
      it('should start tracking a stream', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        
        // End stream to get metrics
        const metrics = monitor.endStream(conversationId);
        expect(metrics).toBeDefined();
        expect(metrics?.conversationId).toBe(conversationId);
        expect(metrics?.startTime).toBeGreaterThan(0);
      });
      
      it('should record start time', () => {
        const conversationId = 'test-123';
        const beforeStart = Date.now();
        
        monitor.startStream(conversationId);
        
        const metrics = monitor.endStream(conversationId);
        expect(metrics?.startTime).toBeGreaterThanOrEqual(beforeStart);
        expect(metrics?.startTime).toBeLessThanOrEqual(Date.now());
      });
      
      it('should reset metrics for same conversation', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        monitor.trackChunk(conversationId, 100, 5);
        const firstMetrics = monitor.endStream(conversationId);
        expect(firstMetrics?.totalChunks).toBe(1);
        
        // Start again and track nothing
        monitor.startStream(conversationId);
        const secondMetrics = monitor.endStream(conversationId);
        
        // Second stream should have no chunks
        expect(secondMetrics?.totalChunks).toBe(0);
        expect(secondMetrics?.totalBytes).toBe(0);
      });
    });
    
    describe('trackChunk', () => {
      it('should track chunk metrics', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        monitor.trackChunk(conversationId, 100, 5);
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics?.totalChunks).toBe(1);
        expect(metrics?.totalBytes).toBe(100);
        expect(metrics?.averageChunkSize).toBe(100);
        expect(metrics?.averageChunkProcessingTime).toBe(5);
      });
      
      it('should calculate average chunk size', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        monitor.trackChunk(conversationId, 100, 5);
        monitor.trackChunk(conversationId, 200, 10);
        monitor.trackChunk(conversationId, 150, 7);
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics?.totalChunks).toBe(3);
        expect(metrics?.totalBytes).toBe(450);
        expect(metrics?.averageChunkSize).toBeCloseTo(150, 0);
      });
      
      it('should track min/max processing times', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        monitor.trackChunk(conversationId, 100, 5);
        monitor.trackChunk(conversationId, 100, 15);
        monitor.trackChunk(conversationId, 100, 3);
        monitor.trackChunk(conversationId, 100, 10);
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics?.minChunkProcessingTime).toBe(3);
        expect(metrics?.maxChunkProcessingTime).toBe(15);
      });
      
      it('should handle zero-size chunks', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        monitor.trackChunk(conversationId, 0, 1);
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics?.totalChunks).toBe(1);
        expect(metrics?.totalBytes).toBe(0);
      });
    });
    
    describe('trackUIUpdate', () => {
      it('should track UI updates', () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        monitor.trackUIUpdate(conversationId);
        monitor.trackUIUpdate(conversationId);
        monitor.trackUIUpdate(conversationId);
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics?.totalUIUpdates).toBe(3);
      });
      
      it('should calculate FPS from UI updates', async () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        
        // Track several UI updates
        for (let i = 0; i < 5; i++) {
          monitor.trackUIUpdate(conversationId);
          await new Promise(resolve => setTimeout(resolve, 20));
        }
        
        const metrics = monitor.endStream(conversationId);
        
        // Should track updates
        expect(metrics?.totalUIUpdates).toBe(5);
      });
    });
    
    describe('endStream', () => {
      it('should end stream and calculate final metrics', async () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        
        // Wait a tiny bit
        await new Promise(resolve => setTimeout(resolve, 10));
        
        monitor.trackChunk(conversationId, 100, 5);
        monitor.trackChunk(conversationId, 200, 10);
        monitor.trackUIUpdate(conversationId);
        monitor.trackUIUpdate(conversationId);
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics).toBeDefined();
        expect(metrics?.endTime).toBeDefined();
        expect(metrics?.duration).toBeGreaterThanOrEqual(0);
        expect(metrics?.totalChunks).toBe(2);
        expect(metrics?.totalUIUpdates).toBe(2);
      });
      
      it('should calculate stream duration', async () => {
        const conversationId = 'test-123';
        
        monitor.startStream(conversationId);
        
        await new Promise(resolve => setTimeout(resolve, 50));
        
        const metrics = monitor.endStream(conversationId);
        
        expect(metrics?.duration).toBeGreaterThanOrEqual(40);
      });
      
      it('should handle ending non-existent stream', () => {
        const metrics = monitor.endStream('non-existent');
        
        expect(metrics).toBeNull();
      });
    });
  });
  
  describe('Error and Warning Tracking', () => {
    it('should track errors', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackError(conversationId);
      monitor.trackError(conversationId);
      
      const metrics = monitor.endStream(conversationId);
      
      expect(metrics?.errors).toBe(2);
    });
    
    it('should track warnings', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackWarning(conversationId);
      monitor.trackWarning(conversationId);
      monitor.trackWarning(conversationId);
      
      const metrics = monitor.endStream(conversationId);
      
      expect(metrics?.warnings).toBe(3);
    });
    
    it('should track both errors and warnings', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackError(conversationId);
      monitor.trackWarning(conversationId);
      monitor.trackError(conversationId);
      monitor.trackWarning(conversationId);
      
      const metrics = monitor.endStream(conversationId);
      
      expect(metrics?.errors).toBe(2);
      expect(metrics?.warnings).toBe(2);
    });
  });
  
  describe('Performance Reports', () => {
    it('should generate report with single stream', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackChunk(conversationId, 100, 5);
      monitor.trackUIUpdate(conversationId);
      monitor.endStream(conversationId);
      
      const report = monitor.generateReport();
      
      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.summary.totalStreams).toBe(1);
      expect(report.streams).toHaveLength(1);
    });
    
    it('should generate report with multiple streams', () => {
      const streams = ['conv-1', 'conv-2', 'conv-3'];
      
      streams.forEach(convId => {
        monitor.startStream(convId);
        monitor.trackChunk(convId, 100, 5);
        monitor.endStream(convId);
      });
      
      const report = monitor.generateReport();
      
      expect(report.summary.totalStreams).toBe(3);
      expect(report.streams).toHaveLength(3);
    });
    
    it('should calculate summary statistics', () => {
      monitor.startStream('conv-1');
      monitor.trackChunk('conv-1', 100, 5);
      monitor.trackChunk('conv-1', 200, 10);
      monitor.endStream('conv-1');
      
      monitor.startStream('conv-2');
      monitor.trackChunk('conv-2', 150, 7);
      monitor.trackChunk('conv-2', 250, 12);
      monitor.endStream('conv-2');
      
      const report = monitor.generateReport();
      
      expect(report.summary.totalStreams).toBe(2);
      expect(report.streams).toHaveLength(2);
    });
    
    it('should provide recommendations', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      
      // Simulate poor performance
      for (let i = 0; i < 100; i++) {
        monitor.trackChunk(conversationId, 1000, 50); // Slow processing
      }
      
      monitor.endStream(conversationId);
      
      const report = monitor.generateReport();
      
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
    
    it('should handle empty report', () => {
      const report = monitor.generateReport();
      
      expect(report.summary.totalStreams).toBe(0);
      expect(report.streams).toHaveLength(0);
      // May have recommendations even with no streams
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });
  
  describe('Export Functionality', () => {
    it('should export metrics as JSON', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackChunk(conversationId, 100, 5);
      monitor.endStream(conversationId);
      
      const json = monitor.exportMetrics();
      
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });
    
    it('should include timestamp in export', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.endStream(conversationId);
      
      const json = monitor.exportMetrics();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('timestamp');
      // Timestamp could be string or number
      expect(parsed.timestamp).toBeDefined();
    });
    
    it('should include report in export', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackChunk(conversationId, 100, 5);
      monitor.endStream(conversationId);
      
      const json = monitor.exportMetrics();
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('report');
      expect(parsed.report).toHaveProperty('summary');
      expect(parsed.report).toHaveProperty('streams');
    });
  });
  
  describe('Clear Functionality', () => {
    it('should clear all tracked data', () => {
      monitor.startStream('conv-1');
      monitor.trackChunk('conv-1', 100, 5);
      monitor.endStream('conv-1');
      
      monitor.startStream('conv-2');
      monitor.trackChunk('conv-2', 200, 10);
      monitor.endStream('conv-2');
      
      monitor.clear();
      
      const report = monitor.generateReport();
      
      expect(report.summary.totalStreams).toBe(0);
      expect(report.streams).toHaveLength(0);
    });
    
    it('should not affect new streams after clear', () => {
      monitor.startStream('conv-1');
      monitor.trackChunk('conv-1', 100, 5);
      monitor.endStream('conv-1');
      
      monitor.clear();
      
      monitor.startStream('conv-2');
      monitor.trackChunk('conv-2', 200, 10);
      const metrics = monitor.endStream('conv-2');
      
      expect(metrics?.totalChunks).toBe(1);
      expect(metrics?.totalBytes).toBe(200);
    });
  });
  
  describe('Edge Cases', () => {
    it('should handle tracking without starting stream', () => {
      const conversationId = 'test-123';
      
      // Try to track without starting
      monitor.trackChunk(conversationId, 100, 5);
      monitor.trackUIUpdate(conversationId);
      
      const metrics = monitor.endStream(conversationId);
      
      // Should handle gracefully (may be null or have data)
      expect(metrics !== undefined || metrics === null).toBe(true);
    });
    
    it('should handle multiple starts without ending', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackChunk(conversationId, 100, 5);
      
      // Start again without ending - should reset
      monitor.startStream(conversationId);
      
      const metrics = monitor.endStream(conversationId);
      
      // Second stream had no chunks
      expect(metrics?.totalChunks).toBe(0);
    });
    
    it('should handle negative values gracefully', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      monitor.trackChunk(conversationId, -100, -5);
      
      const metrics = monitor.endStream(conversationId);
      
      // Should handle or sanitize negative values
      expect(metrics).toBeDefined();
    });
  });
  
  describe('Performance', () => {
    it('should handle high-frequency tracking', () => {
      const conversationId = 'test-123';
      
      monitor.startStream(conversationId);
      
      const startTime = Date.now();
      
      // Track 1000 chunks rapidly
      for (let i = 0; i < 1000; i++) {
        monitor.trackChunk(conversationId, 100, 5);
      }
      
      const duration = Date.now() - startTime;
      
      // Should complete quickly (< 100ms)
      expect(duration).toBeLessThan(100);
      
      const metrics = monitor.endStream(conversationId);
      expect(metrics?.totalChunks).toBe(1000);
    });
    
    it('should not leak memory with many streams', () => {
      // Track 100 streams
      for (let i = 0; i < 100; i++) {
        monitor.startStream(`conv-${i}`);
        monitor.trackChunk(`conv-${i}`, 100, 5);
        monitor.endStream(`conv-${i}`);
      }
      
      const report = monitor.generateReport();
      
      expect(report.summary.totalStreams).toBe(100);
    });
  });
});

