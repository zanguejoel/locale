import React, { createContext, useContext, ReactNode } from 'react';
import { GlobalDownloadManager } from '@/components/GlobalDownloadManager';
import { useChat } from '@/hooks/useChat';

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
 */
export const DownloadManagerProvider: React.FC<DownloadManagerProviderProps> = ({ children }) => {
  const chat = useChat();
  const [showDetails, setShowDetails] = React.useState(false);

  const value: DownloadManagerContextValue = {
    showDownloadDetails: () => setShowDetails(true),
  };

  return (
    <DownloadManagerContext.Provider value={value}>
      {children}
      
      {/* Global floating download manager */}
      <GlobalDownloadManager
        progress={chat.localModelDownloadProgress || 0}
        isDownloading={chat.isLocal && !chat.isLocalModelReady && chat.localModelDownloadProgress > 0}
        isReady={chat.isLocalModelReady}
        onViewDetails={() => {
          // Navigate to settings/local models page
          // You can use router.push here if needed
          console.log('[Download] View details requested');
        }}
        onCancel={() => {
          // Optionally implement cancel download
          console.log('[Download] Cancel requested');
        }}
      />
    </DownloadManagerContext.Provider>
  );
};

