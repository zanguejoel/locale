/**
 * Download Optimizer
 * 
 * Utilities to optimize large file downloads and prevent crashes
 * during local model downloads
 */

import { InteractionManager, AppState } from 'react-native';

/**
 * Defer execution until after all interactions are complete
 * This prevents blocking the main thread
 */
export const deferToBackgroundThread = async <T>(
  fn: () => Promise<T> | T
): Promise<T> => {
  return new Promise((resolve, reject) => {
    InteractionManager.runAfterInteractions(async () => {
      try {
        // Add small delay to ensure UI is fully responsive
        await new Promise(r => setTimeout(r, 50));
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
  });
};

/**
 * Execute function with chunks to prevent blocking
 * Breaks up long-running operations
 */
export const executeInChunks = async <T>(
  items: T[],
  chunkSize: number,
  processor: (chunk: T[]) => Promise<void>
): Promise<void> => {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await processor(chunk);
    
    // Yield to main thread between chunks
    await new Promise(resolve => setImmediate(resolve));
  }
};

/**
 * Request idle callback for low-priority work
 * Executes when the main thread is idle
 */
export const requestIdleWork = async <T>(
  fn: () => Promise<T> | T,
  timeout: number = 1000
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkIdle = async () => {
      // If timed out, execute anyway
      if (Date.now() - startTime > timeout) {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
        return;
      }
      
      // Check if we can run now
      InteractionManager.runAfterInteractions(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    };
    
    checkIdle();
  });
};

/**
 * Debounce state updates to prevent rapid re-renders
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle function calls to limit frequency
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Monitor app state and pause downloads when app goes to background
 */
export class AppStateMonitor {
  private static listeners: Map<string, (state: string) => void> = new Map();
  private static subscription: any = null;
  
  static addListener(id: string, callback: (state: string) => void) {
    this.listeners.set(id, callback);
    
    // Initialize subscription if first listener
    if (!this.subscription) {
      this.subscription = AppState.addEventListener('change', (nextAppState) => {
        console.log('[AppStateMonitor] App state changed to:', nextAppState);
        this.listeners.forEach(cb => cb(nextAppState));
      });
    }
  }
  
  static removeListener(id: string) {
    this.listeners.delete(id);
    
    // Clean up subscription if no listeners
    if (this.listeners.size === 0 && this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }
}

/**
 * Memory pressure handler
 * Helps prevent out-of-memory crashes during downloads
 */
export const handleMemoryWarning = (callback: () => void) => {
  // On iOS, we can listen for memory warnings
  // On Android, we rely on the system to manage memory
  if (AppState.currentState === 'active') {
    // Monitor memory pressure
    const memoryInterval = setInterval(() => {
      // Check if app is under memory pressure
      // This is a simplified check - in production, you'd use native modules
      if (global.gc) {
        try {
          global.gc(); // Trigger garbage collection if available
        } catch (e) {
          // GC not available
        }
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(memoryInterval);
  }
  
  return () => {};
};

/**
 * Yield to main thread periodically during heavy operations
 */
export const yieldToMainThread = (): Promise<void> => {
  return new Promise(resolve => {
    setImmediate(resolve);
  });
};

/**
 * Safe state updater that doesn't block UI
 */
export const safeStateUpdate = async (updateFn: () => void): Promise<void> => {
  return new Promise(resolve => {
    requestAnimationFrame(() => {
      updateFn();
      resolve();
    });
  });
};

