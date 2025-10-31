/**
 * Crash Reporter & Prevention
 * 
 * Utilities to prevent crashes and report issues during local model operations
 */

import { Alert, Platform } from 'react-native';
import { storage } from '@/hooks/useMMKVStorage';

interface CrashReport {
  timestamp: string;
  error: string;
  context: string;
  modelId?: string;
  deviceInfo?: any;
}

export class CrashReporter {
  private static crashes: CrashReport[] = [];
  private static MAX_CRASHES = 3;
  private static CRASH_WINDOW = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Report a crash or error
   */
  static report(error: Error | string, context: string, metadata?: any) {
    const crashReport: CrashReport = {
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : error,
      context,
      ...metadata
    };
    
    this.crashes.push(crashReport);
    
    // Keep only recent crashes
    const now = Date.now();
    this.crashes = this.crashes.filter(crash => {
      const crashTime = new Date(crash.timestamp).getTime();
      return now - crashTime < this.CRASH_WINDOW;
    });
    
    console.error('[CrashReporter] Crash reported:', crashReport);
    
    // Store in persistent storage for debugging
    try {
      const storedCrashes = JSON.parse(storage.getString('crash_reports') || '[]');
      storedCrashes.push(crashReport);
      // Keep only last 10 crashes
      const recentCrashes = storedCrashes.slice(-10);
      storage.set('crash_reports', JSON.stringify(recentCrashes));
    } catch (e) {
      console.error('[CrashReporter] Failed to store crash report:', e);
    }
    
    // Check if we're in a crash loop
    if (this.crashes.length >= this.MAX_CRASHES) {
      this.handleCrashLoop(context);
    }
  }
  
  /**
   * Handle crash loop - disable feature temporarily
   */
  private static handleCrashLoop(context: string) {
    console.error('[CrashReporter] Crash loop detected! Disabling local models temporarily.');
    
    // Mark local models as temporarily disabled
    storage.set('local_models_disabled_until', Date.now() + 30 * 60 * 1000); // 30 minutes
    
    Alert.alert(
      'Local Models Temporarily Disabled',
      `We've detected ${this.MAX_CRASHES} crashes in the last 5 minutes while trying to use local models.\n\n` +
      `Local models have been temporarily disabled for 30 minutes to prevent further crashes.\n\n` +
      `You can use cloud models in the meantime. We apologize for the inconvenience.`,
      [
        { text: 'Use Cloud Models', onPress: () => {
          // Force switch to cloud mode
          storage.set('force_cloud_mode', 'true');
        }}
      ]
    );
  }
  
  /**
   * Check if local models are temporarily disabled
   * NOTE: Local models have been removed from the app. This method is kept for backwards compatibility.
   */
  static isLocalModelsDisabled(): boolean {
    return true; // Always return true since local models are removed
  }
  
  /**
   * Re-enable local models
   * NOTE: Local models have been removed from the app. This method is a no-op.
   */
  static reenableLocalModels() {
    // No-op: Local models have been removed
    console.log('[CrashReporter] Local models have been removed from the app');
  }
  
  /**
   * Get crash history
   */
  static getCrashHistory(): CrashReport[] {
    try {
      const stored = storage.getString('crash_reports');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }
  
  /**
   * Clear crash history
   */
  static clearCrashHistory() {
    storage.delete('crash_reports');
    this.crashes = [];
  }
  
  /**
   * Check if we're seeing repeated undefined results from a model
   */
  static hasRepeatedUndefinedResults(modelId: string): boolean {
    const recentCrashes = this.crashes.filter(crash => {
      const isUndefinedError = crash.error.toLowerCase().includes('undefined') || 
                              crash.error.toLowerCase().includes('returned no response');
      return isUndefinedError && crash.modelId === modelId;
    });
    
    return recentCrashes.length >= 2;
  }
  
  /**
   * Get diagnostic info for debugging
   */
  static getDiagnosticInfo(): string {
    const history = this.getCrashHistory();
    const recentCrashes = this.crashes;
    
    let info = `=== Crash Diagnostic Info ===\n`;
    info += `Recent crashes in window: ${recentCrashes.length}\n`;
    info += `Total crash history: ${history.length}\n`;
    info += `Local models disabled: ${this.isLocalModelsDisabled()}\n\n`;
    
    if (recentCrashes.length > 0) {
      info += `Recent crashes:\n`;
      recentCrashes.forEach((crash, i) => {
        info += `${i + 1}. [${crash.timestamp}] ${crash.context}: ${crash.error}\n`;
        if (crash.modelId) info += `   Model: ${crash.modelId}\n`;
      });
    }
    
    return info;
  }
}

/**
 * Safe wrapper for async operations that might crash
 */
export const safeAsync = async <T>(
  fn: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch (error) {
    console.error(`[SafeAsync] Error in ${context}:`, error);
    CrashReporter.report(error as Error, context);
    
    if (fallback !== undefined) {
      return fallback;
    }
    
    return undefined;
  }
};

/**
 * Wrap component rendering in error boundary
 */
export const safeRender = (
  renderFn: () => React.ReactElement,
  fallback: React.ReactElement
): React.ReactElement => {
  try {
    return renderFn();
  } catch (error) {
    console.error('[SafeRender] Render error:', error);
    CrashReporter.report(error as Error, 'render');
    return fallback;
  }
};

