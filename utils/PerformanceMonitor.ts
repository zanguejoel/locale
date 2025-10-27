/**
 * Performance Monitoring Utility
 * 
 * Tracks key performance metrics for streaming chat:
 * - Re-render counts
 * - Navigation response times
 * - Memory usage
 * - Frame rates
 * 
 * Usage:
 * ```typescript
 * import { performanceMonitor } from '@/utils/PerformanceMonitor';
 * 
 * // Track component renders
 * performanceMonitor.trackRender('ChatMessage');
 * 
 * // Track navigation timing
 * const start = Date.now();
 * // ... perform navigation
 * performanceMonitor.trackNavigation(Date.now() - start);
 * 
 * // Get stats
 * const stats = performanceMonitor.getStats();
 * console.log(stats);
 * ```
 */

interface PerformanceMetrics {
  renderCounts: Map<string, number>;
  navigationTimes: number[];
  frameDrops: number;
  totalFrames: number;
  memorySnapshots: number[];
  streamingUpdateCount: number;
  lastResetTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private enabled: boolean;
  private lastFrameTime: number;
  
  constructor() {
    // Only enable in development mode
    this.enabled = __DEV__;
    
    this.metrics = {
      renderCounts: new Map(),
      navigationTimes: [],
      frameDrops: 0,
      totalFrames: 0,
      memorySnapshots: [],
      streamingUpdateCount: 0,
      lastResetTime: Date.now(),
    };
    
    this.lastFrameTime = Date.now();
    
    if (this.enabled) {
      this.startFrameMonitoring();
    }
  }
  
  /**
   * Track a component render
   */
  trackRender(componentName: string): void {
    if (!this.enabled) return;
    
    const currentCount = this.metrics.renderCounts.get(componentName) || 0;
    this.metrics.renderCounts.set(componentName, currentCount + 1);
  }
  
  /**
   * Track navigation timing
   */
  trackNavigation(durationMs: number): void {
    if (!this.enabled) return;
    
    this.metrics.navigationTimes.push(durationMs);
    
    // Keep only last 50 measurements
    if (this.metrics.navigationTimes.length > 50) {
      this.metrics.navigationTimes.shift();
    }
    
    // Log slow navigations
    if (durationMs > 200) {
      console.warn(`[PerformanceMonitor] Slow navigation: ${durationMs.toFixed(0)}ms`);
    }
  }
  
  /**
   * Track streaming update
   */
  trackStreamingUpdate(): void {
    if (!this.enabled) return;
    
    this.metrics.streamingUpdateCount++;
  }
  
  /**
   * Take a memory snapshot (if available)
   */
  trackMemory(): void {
    if (!this.enabled) return;
    
    // React Native doesn't expose memory APIs directly
    // This would need native module integration
    // For now, we'll track timestamp as placeholder
    this.metrics.memorySnapshots.push(Date.now());
    
    // Keep only last 20 snapshots
    if (this.metrics.memorySnapshots.length > 20) {
      this.metrics.memorySnapshots.shift();
    }
  }
  
  /**
   * Start monitoring frame rate
   */
  private startFrameMonitoring(): void {
    const checkFrame = () => {
      const now = Date.now();
      const frameDuration = now - this.lastFrameTime;
      
      this.metrics.totalFrames++;
      
      // If frame took longer than 16.67ms (60 FPS threshold), count as dropped
      if (frameDuration > 16.67) {
        this.metrics.frameDrops++;
      }
      
      this.lastFrameTime = now;
      
      // Check again on next frame
      requestAnimationFrame(checkFrame);
    };
    
    requestAnimationFrame(checkFrame);
  }
  
  /**
   * Get current performance statistics
   */
  getStats() {
    if (!this.enabled) {
      return null;
    }
    
    const sessionDuration = (Date.now() - this.metrics.lastResetTime) / 1000; // seconds
    const avgNavigationTime = this.metrics.navigationTimes.length > 0
      ? this.metrics.navigationTimes.reduce((a, b) => a + b, 0) / this.metrics.navigationTimes.length
      : 0;
    
    const frameDropRate = this.metrics.totalFrames > 0
      ? (this.metrics.frameDrops / this.metrics.totalFrames) * 100
      : 0;
    
    const avgFPS = this.metrics.totalFrames > 0 && sessionDuration > 0
      ? this.metrics.totalFrames / sessionDuration
      : 0;
    
    return {
      session: {
        duration: sessionDuration.toFixed(1) + 's',
        startTime: new Date(this.metrics.lastResetTime).toISOString(),
      },
      renders: {
        total: Array.from(this.metrics.renderCounts.values()).reduce((a, b) => a + b, 0),
        perSecond: sessionDuration > 0 
          ? (Array.from(this.metrics.renderCounts.values()).reduce((a, b) => a + b, 0) / sessionDuration).toFixed(1)
          : '0',
        byComponent: Object.fromEntries(this.metrics.renderCounts),
      },
      navigation: {
        average: avgNavigationTime.toFixed(1) + 'ms',
        measurements: this.metrics.navigationTimes.length,
        slowNavigations: this.metrics.navigationTimes.filter(t => t > 200).length,
      },
      frames: {
        total: this.metrics.totalFrames,
        dropped: this.metrics.frameDrops,
        dropRate: frameDropRate.toFixed(2) + '%',
        avgFPS: avgFPS.toFixed(1),
      },
      streaming: {
        updates: this.metrics.streamingUpdateCount,
        updatesPerSecond: sessionDuration > 0
          ? (this.metrics.streamingUpdateCount / sessionDuration).toFixed(1)
          : '0',
      },
    };
  }
  
  /**
   * Log statistics to console
   */
  logStats(): void {
    if (!this.enabled) return;
    
    const stats = this.getStats();
    
    console.log('\n📊 Performance Statistics:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Session:', stats?.session);
    console.log('Renders:', stats?.renders);
    console.log('Navigation:', stats?.navigation);
    console.log('Frames:', stats?.frames);
    console.log('Streaming:', stats?.streaming);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  /**
   * Reset all metrics
   */
  reset(): void {
    if (!this.enabled) return;
    
    this.metrics = {
      renderCounts: new Map(),
      navigationTimes: [],
      frameDrops: 0,
      totalFrames: 0,
      memorySnapshots: [],
      streamingUpdateCount: 0,
      lastResetTime: Date.now(),
    };
    
    this.lastFrameTime = Date.now();
    
    console.log('[PerformanceMonitor] Metrics reset');
  }
  
  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    if (!this.enabled) return null;
    
    return {
      ...this.getStats(),
      raw: {
        renderCounts: Object.fromEntries(this.metrics.renderCounts),
        navigationTimes: [...this.metrics.navigationTimes],
        frameDrops: this.metrics.frameDrops,
        totalFrames: this.metrics.totalFrames,
        streamingUpdateCount: this.metrics.streamingUpdateCount,
      },
    };
  }
  
  /**
   * Check if monitoring is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for performance monitoring in components
 * 
 * Usage:
 * ```typescript
 * const ChatMessage = () => {
 *   usePerformanceMonitor('ChatMessage');
 *   // ... component code
 * };
 * ```
 */
export const usePerformanceMonitor = (componentName: string) => {
  if (performanceMonitor.isEnabled()) {
    performanceMonitor.trackRender(componentName);
  }
};

export default performanceMonitor;

