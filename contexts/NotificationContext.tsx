/**
 * NotificationContext - Global notification system with queue management
 * 
 * Features:
 * - Queue notifications if one is already showing
 * - Sequential display with proper spacing
 * - Smart combining of multiple notifications
 * - Priority system for urgent notifications
 * 
 * Usage:
 *   showNotification({ chatTitle: 'Chat A', message: '...', conversationId: '123' })
 *   showNotification({ chatTitle: 'Chat B', message: '...', conversationId: '456' })
 *   -> Displays one at a time with 1s spacing
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface NotificationData {
  message: string;
  chatTitle: string;
  conversationId: string;
  priority?: 'normal' | 'high'; // High priority shows immediately
  timestamp?: number; // Auto-added when queued
}

interface NotificationContextType {
  showNotification: (data: NotificationData) => void;
  hideNotification: () => void;
  notificationVisible: boolean;
  notificationData: NotificationData | null;
  queueSize: number; // Number of pending notifications
  clearQueue: () => void; // Clear all pending notifications
}

// Configuration
const CONFIG = {
  DISPLAY_DURATION: 6000, // 6 seconds per notification
  SPACING_DELAY: 1000, // 1 second between notifications
  COMBINE_THRESHOLD: 3, // Combine if 3+ notifications queued
  COMBINE_WINDOW: 2000, // 2 second window to combine notifications
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const [queue, setQueue] = useState<NotificationData[]>([]);
  
  // Track if we're currently processing the queue
  const processingRef = useRef(false);
  const displayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Show a notification (adds to queue if one is already showing)
   */
  const showNotification = useCallback((data: NotificationData) => {
    const timestampedData = {
      ...data,
      timestamp: Date.now(),
      priority: data.priority || 'normal',
    };
    
    console.log('[NotificationQueue] 📬 Adding notification to queue:', {
      chatTitle: data.chatTitle,
      currentQueue: queue.length,
    });
    
    // If high priority and nothing showing, show immediately
    if (data.priority === 'high' && !notificationVisible) {
      setNotificationData(timestampedData);
      setNotificationVisible(true);
      return;
    }
    
    // Add to queue
    setQueue(prev => [...prev, timestampedData]);
  }, [notificationVisible, queue.length]);

  /**
   * Hide current notification
   */
  const hideNotification = useCallback(() => {
    console.log('[NotificationQueue] 🔕 Hiding notification');
    setNotificationVisible(false);
    
    // Clear display timeout if exists
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
    
    // Clear data after animation completes
    setTimeout(() => {
      setNotificationData(null);
      processingRef.current = false; // Allow processing next item
    }, 300);
  }, []);

  /**
   * Clear all pending notifications
   */
  const clearQueue = useCallback(() => {
    console.log('[NotificationQueue] 🗑️ Clearing queue');
    setQueue([]);
  }, []);

  /**
   * Check if we should combine multiple notifications
   */
  const shouldCombineNotifications = useCallback((notifications: NotificationData[]): boolean => {
    if (notifications.length < CONFIG.COMBINE_THRESHOLD) {
      return false;
    }
    
    // Check if notifications are within combine window
    const now = Date.now();
    const recentNotifications = notifications.filter(
      n => n.timestamp && (now - n.timestamp) < CONFIG.COMBINE_WINDOW
    );
    
    return recentNotifications.length >= CONFIG.COMBINE_THRESHOLD;
  }, []);

  /**
   * Create combined notification for multiple completions
   */
  const createCombinedNotification = useCallback((notifications: NotificationData[]): NotificationData => {
    const count = notifications.length;
    const conversationIds = notifications.map(n => n.conversationId).join(',');
    
    return {
      chatTitle: `${count} Conversations`,
      message: `${count} responses completed. Tap to view.`,
      conversationId: conversationIds, // Comma-separated for later use
      priority: 'normal',
      timestamp: Date.now(),
    };
  }, []);

  /**
   * Process the notification queue
   */
  const processQueue = useCallback(() => {
    // Don't process if already processing or something is showing
    if (processingRef.current || notificationVisible || queue.length === 0) {
      return;
    }
    
    console.log('[NotificationQueue] 🔄 Processing queue, size:', queue.length);
    processingRef.current = true;
    
    // Check if we should combine notifications
    if (shouldCombineNotifications(queue)) {
      console.log('[NotificationQueue] 🔗 Combining', queue.length, 'notifications');
      
      const combinedNotif = createCombinedNotification(queue);
      setNotificationData(combinedNotif);
      setNotificationVisible(true);
      setQueue([]); // Clear queue since we combined them
      
      // Auto-hide after display duration
      displayTimeoutRef.current = setTimeout(() => {
        hideNotification();
      }, CONFIG.DISPLAY_DURATION);
      
      return;
    }
    
    // Show next notification in queue
    const [nextNotif, ...restQueue] = queue;
    
    console.log('[NotificationQueue] 📤 Showing next notification:', nextNotif.chatTitle);
    setNotificationData(nextNotif);
    setNotificationVisible(true);
    setQueue(restQueue);
    
    // Auto-hide after display duration
    displayTimeoutRef.current = setTimeout(() => {
      hideNotification();
    }, CONFIG.DISPLAY_DURATION);
  }, [queue, notificationVisible, shouldCombineNotifications, createCombinedNotification, hideNotification]);

  /**
   * Process queue when visibility changes or queue updates
   */
  useEffect(() => {
    if (!notificationVisible && queue.length > 0 && !processingRef.current) {
      // Add spacing delay before showing next notification
      const timer = setTimeout(() => {
        processQueue();
      }, CONFIG.SPACING_DELAY);
      
      return () => clearTimeout(timer);
    }
  }, [notificationVisible, queue.length, processQueue]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
    };
  }, []);

  const value = {
    showNotification,
    hideNotification,
    notificationVisible,
    notificationData,
    queueSize: queue.length,
    clearQueue,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
};

