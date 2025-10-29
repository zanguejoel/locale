/**
 * PerformanceMonitor - Real-time performance tracking for streaming
 * 
 * Purpose:
 * - Monitor streaming performance metrics
 * - Track memory usage and CPU load
 * - Detect performance bottlenecks
 * - Provide actionable insights
 * - Export metrics for analysis
 * 
 * Metrics Tracked:
 * - Chunk processing time
 * - UI update frequency (FPS)
 * - Memory usage
 * - Stream latency
 * - Error rates
 * - Content velocity
 * 
 * Usage:
 * ```typescript
 * const monitor = new PerformanceMonitor();
 * 
 * // Start monitoring a stream
 * monitor.startStream('conversation-123');
 * 
 * // Track chunk processing
 * monitor.trackChunk('conversation-123', chunkSize, processingTime);
 * 
 * // Track UI updates
 * monitor.trackUIUpdate('conversation-123');
 * 
 * // End monitoring
 * const stats = monitor.endStream('conversation-123');
 * console.log(stats);
 * ```
 */

export interface StreamMetrics {
  conversationId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  
  // Chunk metrics
  totalChunks: number;
  totalBytes: number;
  averageChunkSize: number;
  averageChunkProcessingTime: number;
  maxChunkProcessingTime: number;
  minChunkProcessingTime: number;
  
  // UI metrics
  totalUIUpdates: number;
  averageFPS: number;
  minFPS: number;
  maxFPS: number;
  droppedFrames: number;
  
  // Content metrics
  totalCharacters: number;
  averageVelocity: number; // chars/sec
  peakVelocity: number;
  
  // Performance metrics
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  
  // Error metrics
  errors: number;
  warnings: number;
  
  // Memory metrics
  peakMemoryUsage?: number;
  averageMemoryUsage?: number;
}

interface ChunkData {
  size: number;
  processingTime: number;
  timestamp: number;
}

interface UIUpdateData {
  timestamp: number;
  timeSinceLastUpdate: number;
}

interface StreamSession {
  conversationId: string;
  startTime: number;
  chunks: ChunkData[];
  uiUpdates: UIUpdateData[];
  errors: number;
  warnings: number;
  lastUpdateTime: number;
  memorySnapshots: number[];
}

export interface PerformanceReport {
  summary: {
    totalStreams: number;
    totalDuration: number;
    totalChunks: number;
    totalBytes: number;
    averageFPS: number;
    errorRate: number;
  };
  streams: StreamMetrics[];
  recommendations: string[];
}

export class PerformanceMonitor {
  private activeSessions: Map<string, StreamSession> = new Map();
  private completedSessions: StreamMetrics[] = [];
  private maxHistorySize: number;
  private enableMemoryTracking: boolean;
  private enableLogging: boolean;
  
  constructor(options: {
    maxHistorySize?: number;
    enableMemoryTracking?: boolean;
    enableLogging?: boolean;
  } = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100;
    this.enableMemoryTracking = options.enableMemoryTracking ?? true;
    this.enableLogging = options.enableLogging ?? __DEV__;
  }
  
  /**
   * Start monitoring a stream
   */
  startStream(conversationId: string): void {
    if (this.activeSessions.has(conversationId)) {
      this.log(`[PerformanceMonitor] Warning: Stream ${conversationId} already active, restarting...`);
      this.endStream(conversationId);
    }
    
    const session: StreamSession = {
      conversationId,
      startTime: Date.now(),
      chunks: [],
      uiUpdates: [],
      errors: 0,
      warnings: 0,
      lastUpdateTime: Date.now(),
      memorySnapshots: [],
    };
    
    this.activeSessions.set(conversationId, session);
    this.log(`[PerformanceMonitor] Started monitoring stream: ${conversationId}`);
    
    // Take initial memory snapshot
    if (this.enableMemoryTracking) {
      this.captureMemorySnapshot(conversationId);
    }
  }
  
  /**
   * Track a processed chunk
   */
  trackChunk(conversationId: string, chunkSize: number, processingTime: number): void {
    const session = this.activeSessions.get(conversationId);
    if (!session) {
      this.log(`[PerformanceMonitor] Warning: No active session for ${conversationId}`);
      return;
    }
    
    session.chunks.push({
      size: chunkSize,
      processingTime,
      timestamp: Date.now(),
    });
    
    // Periodic memory snapshot (every 10 chunks)
    if (this.enableMemoryTracking && session.chunks.length % 10 === 0) {
      this.captureMemorySnapshot(conversationId);
    }
  }
  
  /**
   * Track a UI update
   */
  trackUIUpdate(conversationId: string): void {
    const session = this.activeSessions.get(conversationId);
    if (!session) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - session.lastUpdateTime;
    
    session.uiUpdates.push({
      timestamp: now,
      timeSinceLastUpdate,
    });
    
    session.lastUpdateTime = now;
  }
  
  /**
   * Track an error
   */
  trackError(conversationId: string): void {
    const session = this.activeSessions.get(conversationId);
    if (session) {
      session.errors++;
    }
  }
  
  /**
   * Track a warning
   */
  trackWarning(conversationId: string): void {
    const session = this.activeSessions.get(conversationId);
    if (session) {
      session.warnings++;
    }
  }
  
  /**
   * Capture memory snapshot
   */
  private captureMemorySnapshot(conversationId: string): void {
    const session = this.activeSessions.get(conversationId);
    if (!session) return;
    
    // Note: React Native doesn't expose performance.memory like web browsers
    // This is a placeholder for native memory tracking
    // You would need to use a native module or alternative method
    if (__DEV__ && typeof (performance as any).memory !== 'undefined') {
      const memory = (performance as any).memory;
      session.memorySnapshots.push(memory.usedJSHeapSize);
    }
  }
  
  /**
   * End monitoring and calculate metrics
   */
  endStream(conversationId: string): StreamMetrics | null {
    const session = this.activeSessions.get(conversationId);
    if (!session) {
      this.log(`[PerformanceMonitor] Warning: No active session to end for ${conversationId}`);
      return null;
    }
    
    const endTime = Date.now();
    const duration = endTime - session.startTime;
    
    // Calculate chunk metrics
    const totalChunks = session.chunks.length;
    const totalBytes = session.chunks.reduce((sum, chunk) => sum + chunk.size, 0);
    const averageChunkSize = totalChunks > 0 ? totalBytes / totalChunks : 0;
    
    const processingTimes = session.chunks.map(c => c.processingTime);
    const averageChunkProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;
    const maxChunkProcessingTime = processingTimes.length > 0 ? Math.max(...processingTimes) : 0;
    const minChunkProcessingTime = processingTimes.length > 0 ? Math.min(...processingTimes) : 0;
    
    // Calculate UI metrics
    const totalUIUpdates = session.uiUpdates.length;
    const updateIntervals = session.uiUpdates.map(u => u.timeSinceLastUpdate).filter(t => t > 0);
    
    const fps = updateIntervals.map(interval => 1000 / interval);
    const averageFPS = fps.length > 0 ? fps.reduce((a, b) => a + b, 0) / fps.length : 0;
    const minFPS = fps.length > 0 ? Math.min(...fps) : 0;
    const maxFPS = fps.length > 0 ? Math.max(...fps) : 0;
    const droppedFrames = updateIntervals.filter(interval => interval > 16.67).length;
    
    // Calculate content metrics
    const totalCharacters = totalBytes; // Assuming UTF-8
    const averageVelocity = duration > 0 ? (totalCharacters / duration) * 1000 : 0; // chars/sec
    
    // Calculate chunk velocities
    const chunkVelocities: number[] = [];
    for (let i = 1; i < session.chunks.length; i++) {
      const timeDelta = session.chunks[i].timestamp - session.chunks[i - 1].timestamp;
      if (timeDelta > 0) {
        const velocity = (session.chunks[i].size / timeDelta) * 1000;
        chunkVelocities.push(velocity);
      }
    }
    const peakVelocity = chunkVelocities.length > 0 ? Math.max(...chunkVelocities) : 0;
    
    // Calculate latency metrics
    const latencies = session.chunks.map(c => c.timestamp - session.startTime);
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const averageLatency = latencies.length > 0
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length
      : 0;
    const p95Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] || 0;
    const p99Latency = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)] || 0;
    
    // Calculate memory metrics
    const peakMemoryUsage = session.memorySnapshots.length > 0
      ? Math.max(...session.memorySnapshots)
      : undefined;
    const averageMemoryUsage = session.memorySnapshots.length > 0
      ? session.memorySnapshots.reduce((a, b) => a + b, 0) / session.memorySnapshots.length
      : undefined;
    
    const metrics: StreamMetrics = {
      conversationId,
      startTime: session.startTime,
      endTime,
      duration,
      totalChunks,
      totalBytes,
      averageChunkSize,
      averageChunkProcessingTime,
      maxChunkProcessingTime,
      minChunkProcessingTime,
      totalUIUpdates,
      averageFPS,
      minFPS,
      maxFPS,
      droppedFrames,
      totalCharacters,
      averageVelocity,
      peakVelocity,
      averageLatency,
      p95Latency,
      p99Latency,
      errors: session.errors,
      warnings: session.warnings,
      peakMemoryUsage,
      averageMemoryUsage,
    };
    
    // Store in history
    this.completedSessions.push(metrics);
    
    // Limit history size
    if (this.completedSessions.length > this.maxHistorySize) {
      this.completedSessions.shift();
    }
    
    // Remove from active sessions
    this.activeSessions.delete(conversationId);
    
    // Log summary
    this.log(`[PerformanceMonitor] Stream ${conversationId} completed:`, {
      duration: `${duration}ms`,
      chunks: totalChunks,
      fps: averageFPS.toFixed(1),
      velocity: `${averageVelocity.toFixed(0)} chars/sec`,
      droppedFrames,
    });
    
    return metrics;
  }
  
  /**
   * Get metrics for a specific stream
   */
  getMetrics(conversationId: string): StreamMetrics | undefined {
    return this.completedSessions.find(s => s.conversationId === conversationId);
  }
  
  /**
   * Get all completed sessions
   */
  getAllMetrics(): StreamMetrics[] {
    return [...this.completedSessions];
  }
  
  /**
   * Generate performance report
   */
  generateReport(): PerformanceReport {
    const streams = this.completedSessions;
    
    const summary = {
      totalStreams: streams.length,
      totalDuration: streams.reduce((sum, s) => sum + (s.duration || 0), 0),
      totalChunks: streams.reduce((sum, s) => sum + s.totalChunks, 0),
      totalBytes: streams.reduce((sum, s) => sum + s.totalBytes, 0),
      averageFPS: streams.length > 0
        ? streams.reduce((sum, s) => sum + s.averageFPS, 0) / streams.length
        : 0,
      errorRate: streams.length > 0
        ? streams.reduce((sum, s) => sum + s.errors, 0) / streams.length
        : 0,
    };
    
    const recommendations: string[] = [];
    
    // Analyze performance and generate recommendations
    const avgFPS = summary.averageFPS;
    if (avgFPS < 45) {
      recommendations.push(`⚠️ Low FPS detected (${avgFPS.toFixed(1)}). Consider increasing RAF batching interval.`);
    }
    
    const avgDroppedFrames = streams.length > 0
      ? streams.reduce((sum, s) => sum + s.droppedFrames, 0) / streams.length
      : 0;
    if (avgDroppedFrames > 10) {
      recommendations.push(`⚠️ High dropped frame rate (${avgDroppedFrames.toFixed(0)} avg). UI updates may be too frequent.`);
    }
    
    const avgVelocity = streams.length > 0
      ? streams.reduce((sum, s) => sum + s.averageVelocity, 0) / streams.length
      : 0;
    if (avgVelocity > 500) {
      recommendations.push(`⚠️ High content velocity (${avgVelocity.toFixed(0)} chars/sec). Consider adaptive throttling.`);
    }
    
    const avgProcessingTime = streams.length > 0
      ? streams.reduce((sum, s) => sum + s.averageChunkProcessingTime, 0) / streams.length
      : 0;
    if (avgProcessingTime > 10) {
      recommendations.push(`⚠️ Slow chunk processing (${avgProcessingTime.toFixed(1)}ms avg). Check for blocking operations.`);
    }
    
    if (summary.errorRate > 0.5) {
      recommendations.push(`❌ High error rate (${summary.errorRate.toFixed(1)} per stream). Investigate error causes.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Performance is optimal!');
    }
    
    return {
      summary,
      streams,
      recommendations,
    };
  }
  
  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      report: this.generateReport(),
    }, null, 2);
  }
  
  /**
   * Clear all metrics
   */
  clear(): void {
    this.activeSessions.clear();
    this.completedSessions = [];
    this.log('[PerformanceMonitor] Metrics cleared');
  }
  
  /**
   * Helper: Logging
   */
  private log(message: string, data?: any): void {
    if (this.enableLogging) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }
}

/**
 * Global performance monitor instance
 */
export const globalPerformanceMonitor = new PerformanceMonitor({
  maxHistorySize: 50,
  enableMemoryTracking: true,
  enableLogging: __DEV__,
});

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitoring(conversationId: string | null, enabled: boolean = __DEV__) {
  React.useEffect(() => {
    if (!enabled || !conversationId) return;
    
    // Start monitoring when conversation changes
    globalPerformanceMonitor.startStream(conversationId);
    
    return () => {
      // End monitoring on unmount or conversation change
      globalPerformanceMonitor.endStream(conversationId);
    };
  }, [conversationId, enabled]);
  
  const trackChunk = React.useCallback((size: number, time: number) => {
    if (!conversationId || !enabled) return;
    globalPerformanceMonitor.trackChunk(conversationId, size, time);
  }, [conversationId, enabled]);
  
  const trackUIUpdate = React.useCallback(() => {
    if (!conversationId || !enabled) return;
    globalPerformanceMonitor.trackUIUpdate(conversationId);
  }, [conversationId, enabled]);
  
  return {
    trackChunk,
    trackUIUpdate,
    getReport: () => globalPerformanceMonitor.generateReport(),
    exportMetrics: () => globalPerformanceMonitor.exportMetrics(),
  };
}

// React import for hooks
import React from 'react';
