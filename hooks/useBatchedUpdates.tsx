import { useCallback, useRef } from 'react';

/**
 * Hook to batch multiple state updates into a single render cycle
 * Improves performance by reducing unnecessary re-renders
 */
export function useBatchedUpdates() {
  const pendingUpdatesRef = useRef<(() => void)[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const batchUpdate = useCallback((updateFn: () => void) => {
    pendingUpdatesRef.current.push(updateFn);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Schedule batched execution
    timeoutRef.current = setTimeout(() => {
      const updates = pendingUpdatesRef.current;
      pendingUpdatesRef.current = [];
      
      // Execute all pending updates in one go
      updates.forEach(fn => fn());
    }, 0);
  }, []);

  const flushUpdates = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const updates = pendingUpdatesRef.current;
    pendingUpdatesRef.current = [];
    updates.forEach(fn => fn());
  }, []);

  return { batchUpdate, flushUpdates };
}

