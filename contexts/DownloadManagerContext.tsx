import React, { createContext, useContext, ReactNode } from 'react';

interface DownloadManagerContextValue {
  // Could add methods here if needed
  showDownloadDetails: () => void;
}

const DownloadManagerContext = createContext<DownloadManagerContextValue | undefined>(undefined);

export const useDownloadManager = () => {
  const context = useContext(DownloadManagerContext);
  if (!context) {
    throw new Error('useDownloadManager must be used within DownloadManagerProvider');
  }
  return context;
};

interface DownloadManagerProviderProps {
  children: ReactNode;
}

/**
 * Provider that renders the global download manager overlay
 * Should be placed near the root of the app to persist across navigation
 * 
 * NOTE: Local model downloads have been removed from the app.
 * This context is kept for backwards compatibility but no longer displays download UI.
 */
export const DownloadManagerProvider: React.FC<DownloadManagerProviderProps> = ({ children }) => {
  const value: DownloadManagerContextValue = {
    showDownloadDetails: () => {
      console.log('[Download] Local model downloads have been removed');
    },
  };

  return (
    <DownloadManagerContext.Provider value={value}>
      {children}
      {/* Local model download manager removed */}
    </DownloadManagerContext.Provider>
  );
};

