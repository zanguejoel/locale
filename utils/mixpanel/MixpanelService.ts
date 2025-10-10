/**
 * Mixpanel Service for React Native
 * 
 * Centralized service for Mixpanel analytics tracking in Odyssey mobile app.
 * Based on web version implementation with mobile-specific adaptations.
 */

import { Mixpanel } from 'mixpanel-react-native';
import Constants from 'expo-constants';
import { 
  MixpanelUserProfile, 
  EventProperties,
  AuthEvent,
  AIEvent,
  ModelEvent,
  SettingsEvent,
  SubscriptionEvent,
  CreditEvent,
} from '@/types/mixpanel';

// ============================================
// CONFIGURATION
// ============================================

const MIXPANEL_TOKEN = Constants.expoConfig?.extra?.mixpanelToken || process.env.EXPO_PUBLIC_MIXPANEL_TOKEN || '';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const IS_DEVELOPMENT = __DEV__;

// Enable debug mode in development
const DEBUG_MODE = IS_DEVELOPMENT;

// ============================================
// MIXPANEL SERVICE CLASS
// ============================================

class MixpanelService {
  private static instance: MixpanelService;
  private mixpanel: Mixpanel | null = null;
  private initialized: boolean = false;
  private sessionId: string | null = null;
  private sessionStartTime: number | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): MixpanelService {
    if (!MixpanelService.instance) {
      MixpanelService.instance = new MixpanelService();
    }
    return MixpanelService.instance;
  }

  /**
   * Initialize Mixpanel
   */
  public async init(): Promise<void> {
    if (this.initialized) {
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] Already initialized');
      }
      return;
    }

    if (!MIXPANEL_TOKEN) {
      // console.warn('[Mixpanel] Token not provided. Analytics will be disabled.');
      return;
    }

    try {
      this.mixpanel = new Mixpanel(MIXPANEL_TOKEN, !IS_PRODUCTION);
      await this.mixpanel.init();

      // Set super properties (sent with every event)
      await this.mixpanel.registerSuperProperties({
        app_version: Constants.expoConfig?.version || '1.0.0',
        platform: 'mobile',
        environment: IS_PRODUCTION ? 'production' : 'development',
      });

      this.initialized = true;
      this.startSession();
      
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] Successfully initialized');
      }
    } catch (error) {
      // console.error('[Mixpanel] Initialization error:', error);
    }
  }

  /**
   * Check if Mixpanel is initialized
   */
  public isInitialized(): boolean {
    return this.initialized && this.mixpanel !== null;
  }

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * Start a new session
   */
  private startSession(): void {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionStartTime = Date.now();
    
    if (DEBUG_MODE) {
      // console.log('[Mixpanel] Session started:', this.sessionId);
    }
  }

  /**
   * Get current session ID
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Get session duration in seconds
   */
  public getSessionDuration(): number {
    if (!this.sessionStartTime) return 0;
    return Math.floor((Date.now() - this.sessionStartTime) / 1000);
  }

  // ============================================
  // USER IDENTIFICATION
  // ============================================

  /**
   * Identify user
   */
  public async identify(userId: string): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) {
      // console.warn('[Mixpanel] Not initialized. Call init() first.');
      return;
    }

    try {
      await this.mixpanel.identify(userId);
      
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] User identified:', userId);
      }
    } catch (error) {
      // console.error('[Mixpanel] Error identifying user:', error);
    }
  }

  /**
   * Set user profile properties
   */
  public async setUserProfile(properties: Partial<MixpanelUserProfile>): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) {
      // console.warn('[Mixpanel] Not initialized. Call init() first.');
      return;
    }

    try {
      await this.mixpanel.getPeople().set(properties);
      
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] User profile updated:', properties);
      }
    } catch (error) {
      // console.error('[Mixpanel] Error setting user profile:', error);
    }
  }

  /**
   * Increment user profile property
   */
  public async incrementUserProperty(property: string, value: number = 1): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) return;

    try {
      await this.mixpanel.getPeople().increment(property, value);
    } catch (error) {
      // console.error('[Mixpanel] Error incrementing property:', error);
    }
  }

  /**
   * Reset user (for logout)
   */
  public async reset(): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) return;

    try {
      await this.mixpanel.reset();
      this.startSession(); // Start new session
      
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] User reset');
      }
    } catch (error) {
      // console.error('[Mixpanel] Error resetting user:', error);
    }
  }

  // ============================================
  // EVENT TRACKING
  // ============================================

  /**
   * Track generic event
   */
  public async track(eventName: string, properties?: EventProperties): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) {
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] Would track:', eventName, properties);
      }
      return;
    }

    try {
      const enrichedProperties = {
        ...properties,
        session_id: this.sessionId,
        session_duration: this.getSessionDuration(),
        timestamp: Date.now(),
      };

      await this.mixpanel.track(eventName, enrichedProperties);
      
      if (DEBUG_MODE) {
        // console.log('[Mixpanel] Event tracked:', eventName, enrichedProperties);
      }
    } catch (error) {
      // console.error('[Mixpanel] Error tracking event:', error);
    }
  }

  /**
   * Track authentication events
   */
  public async trackAuth(event: AuthEvent, properties?: EventProperties): Promise<void> {
    await this.track(event, properties);
  }

  /**
   * Track AI events
   */
  public async trackAI(event: AIEvent, properties?: EventProperties): Promise<void> {
    await this.track(event, properties);
  }

  /**
   * Track model events
   */
  public async trackModel(event: ModelEvent, properties?: EventProperties): Promise<void> {
    await this.track(event, properties);
  }

  /**
   * Track settings events
   */
  public async trackSettings(event: SettingsEvent, properties?: EventProperties): Promise<void> {
    await this.track(event, properties);
  }

  /**
   * Track subscription events
   */
  public async trackSubscription(event: SubscriptionEvent, properties?: EventProperties): Promise<void> {
    await this.track(event, properties);
  }

  /**
   * Track credit events
   */
  public async trackCredit(event: CreditEvent, properties?: EventProperties): Promise<void> {
    await this.track(event, properties);
  }

  /**
   * Track screen view
   */
  public async trackScreenView(screenName: string, properties?: EventProperties): Promise<void> {
    await this.track('Screen Viewed', {
      ...properties,
      screen_name: screenName,
    });
  }

  /**
   * Track error
   */
  public async trackError(error: Error | string, context?: EventProperties): Promise<void> {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;

    await this.track('Error Occurred', {
      ...context,
      error_message: errorMessage,
      error_stack: errorStack,
    });
  }

  // ============================================
  // TIMING UTILITIES
  // ============================================

  private timers: Map<string, number> = new Map();

  /**
   * Start timing an action
   */
  public startTiming(timingName: string): () => Promise<number> {
    const startTime = Date.now();
    this.timers.set(timingName, startTime);

    return async () => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.timers.delete(timingName);
      
      await this.track(`${timingName} Completed`, {
        duration_ms: duration,
        duration_seconds: Math.round(duration / 1000),
      });

      return duration;
    };
  }

  // ============================================
  // UTILITIES
  // ============================================

  /**
   * Get distinct ID (Mixpanel's user identifier)
   */
  public async getDistinctId(): Promise<string | undefined> {
    if (!this.isInitialized() || !this.mixpanel) return undefined;
    return await this.mixpanel.getDistinctId();
  }

  /**
   * Opt user out of tracking
   */
  public async optOut(): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) return;
    await this.mixpanel.optOutTracking();
  }

  /**
   * Opt user in to tracking
   */
  public async optIn(): Promise<void> {
    if (!this.isInitialized() || !this.mixpanel) return;
    await this.mixpanel.optInTracking();
  }

  /**
   * Check if user has opted out
   */
  public async hasOptedOut(): Promise<boolean> {
    if (!this.isInitialized() || !this.mixpanel) return false;
    return await this.mixpanel.hasOptedOutTracking();
  }
}

// ============================================
// EXPORTS
// ============================================

// Export singleton instance
export const mixpanelService = MixpanelService.getInstance();

// Export class for testing
export { MixpanelService };

