/**
 * Mixpanel React Hooks
 * 
 * Custom hooks for easy Mixpanel integration in React components.
 */

import { useCallback } from 'react';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import {
  AuthEvent,
  AIEvent,
  ModelEvent,
  SettingsEvent,
  SubscriptionEvent,
  EventProperties,
  MixpanelUserProfile,
} from '@/types/mixpanel';

/**
 * Main hook for Mixpanel tracking
 */
export function useMixpanel() {
  return {
    // Core methods
    track: useCallback((eventName: string, properties?: EventProperties) => {
      mixpanelService.track(eventName, properties);
    }, []),
    
    // Category-specific tracking
    trackAuth: useCallback((event: AuthEvent, properties?: EventProperties) => {
      mixpanelService.trackAuth(event, properties);
    }, []),
    
    trackAI: useCallback((event: AIEvent, properties?: EventProperties) => {
      mixpanelService.trackAI(event, properties);
    }, []),
    
    trackModel: useCallback((event: ModelEvent, properties?: EventProperties) => {
      mixpanelService.trackModel(event, properties);
    }, []),
    
    trackSettings: useCallback((event: SettingsEvent, properties?: EventProperties) => {
      mixpanelService.trackSettings(event, properties);
    }, []),
    
    trackSubscription: useCallback((event: SubscriptionEvent, properties?: EventProperties) => {
      mixpanelService.trackSubscription(event, properties);
    }, []),
    
    trackScreenView: useCallback((screenName: string, properties?: EventProperties) => {
      mixpanelService.trackScreenView(screenName, properties);
    }, []),
    
    trackError: useCallback((error: Error | string, context?: EventProperties) => {
      mixpanelService.trackError(error, context);
    }, []),
    
    // User management
    identify: useCallback((userId: string) => {
      mixpanelService.identify(userId);
    }, []),
    
    setUserProfile: useCallback((properties: Partial<MixpanelUserProfile>) => {
      mixpanelService.setUserProfile(properties);
    }, []),
    
    incrementUserProperty: useCallback((property: string, value?: number) => {
      mixpanelService.incrementUserProperty(property, value);
    }, []),
    
    reset: useCallback(() => {
      mixpanelService.reset();
    }, []),
    
    // Timing
    startTiming: useCallback((timingName: string) => {
      return mixpanelService.startTiming(timingName);
    }, []),
  };
}

