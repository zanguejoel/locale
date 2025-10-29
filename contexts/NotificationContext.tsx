/**
 * NotificationContext - Global notification system for in-app notifications
 * 
 * Manages display of notifications that appear on top of all content
 */

import React, { createContext, useContext, useState, useCallback } from 'react';

interface NotificationData {
  message: string;
  chatTitle: string;
  conversationId: string;
}

interface NotificationContextType {
  showNotification: (data: NotificationData) => void;
  hideNotification: () => void;
  notificationVisible: boolean;
  notificationData: NotificationData | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);

  const showNotification = useCallback((data: NotificationData) => {
    console.log('[NotificationContext] 📬 Showing notification:', data);
    setNotificationData(data);
    setNotificationVisible(true);
  }, []);

  const hideNotification = useCallback(() => {
    console.log('[NotificationContext] 🔕 Hiding notification');
    setNotificationVisible(false);
    // Clear data after animation completes
    setTimeout(() => {
      setNotificationData(null);
    }, 300);
  }, []);

  const value = {
    showNotification,
    hideNotification,
    notificationVisible,
    notificationData,
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

