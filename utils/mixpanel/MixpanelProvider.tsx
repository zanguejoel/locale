/**
 * Mixpanel Provider
 * 
 * Initializes Mixpanel on app load and provides tracking context.
 */

import React, { createContext, useContext, useEffect, PropsWithChildren, useState } from 'react';
import { usePathname } from 'expo-router';
import { mixpanelService } from './MixpanelService';

interface MixpanelContextType {
  isInitialized: boolean;
}

const MixpanelContext = createContext<MixpanelContextType>({ isInitialized: false });

export function MixpanelProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Mixpanel on mount
  useEffect(() => {
    mixpanelService.init().then(() => {
      setIsInitialized(true);
    });
  }, []);

  // Track screen views on route changes
  useEffect(() => {
    if (pathname && isInitialized) {
      const screenName = pathname.replace(/^\//, '') || 'home';
      mixpanelService.trackScreenView(screenName, {
        screen_path: pathname,
      });
    }
  }, [pathname, isInitialized]);

  return (
    <MixpanelContext.Provider value={{ isInitialized }}>
      {children}
    </MixpanelContext.Provider>
  );
}

export const useMixpanelContext = () => useContext(MixpanelContext);

