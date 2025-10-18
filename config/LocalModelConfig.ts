/**
 * Configuration for Local Model functionality
 * Centralized settings for performance tuning and behavior customization
 */

export const LocalModelConfig = {
  // Debug settings
  DEBUG_MODE: __DEV__, // Only log in development
  VERBOSE_LOGGING: false, // Set to true for detailed logs
  
  // Performance settings
  GENERATION_STATE_POLL_INTERVAL: 500, // ms - how often to check if model is generating
  GENERATION_STATE_POLL_INTERVAL_IDLE: 2000, // ms - slower polling when not active
  DOWNLOAD_PROGRESS_POLL_INTERVAL: 5000, // ms - how often to check download progress
  READY_STATE_POLL_INTERVAL: 3000, // ms - how often to check if model is ready
  PROGRESS_UPDATE_THRESHOLD: 0.05, // Only update UI if progress changed by 5%
  
  // Timeout settings
  CLEANUP_STATE_TIMEOUT: 3000, // ms - force reset cleanup state after this time
  INTERRUPT_COMPLETION_DELAY: 500, // ms - wait after interrupt before resetting state
  INITIALIZATION_DELAY: 150, // ms - delay before starting model initialization
  NAVIGATION_DELAY_AFTER_INTERRUPT: 300, // ms - wait after interrupt before navigation
  MODEL_READY_TEST_DELAY: 1000, // ms - delay before testing model readiness
  
  // Context settings
  MAX_CONTEXT_MESSAGES: 20, // Maximum number of messages to include in context
  
  // UI settings
  SHOW_DETAILED_ERRORS: __DEV__, // Show detailed error messages in development
  AUTO_DISMISS_CLEANUP_INDICATOR: true, // Auto-hide cleanup indicator when done
  
  // Model switching
  CLEAR_HISTORY_ON_SWITCH: true, // Clear conversation when switching models
} as const;

/**
 * Helper to log only in debug mode
 */
export const debugLog = (message: string, ...args: any[]) => {
  if (LocalModelConfig.DEBUG_MODE && LocalModelConfig.VERBOSE_LOGGING) {
    console.log(message, ...args);
  }
};

/**
 * Helper to log important events even in production
 */
export const infoLog = (message: string, ...args: any[]) => {
  if (LocalModelConfig.DEBUG_MODE) {
    console.log(message, ...args);
  }
};

/**
 * Always log warnings
 */
export const warnLog = (message: string, ...args: any[]) => {
  console.warn(message, ...args);
};

/**
 * Always log errors
 */
export const errorLog = (message: string, ...args: any[]) => {
  console.error(message, ...args);
};

export type LocalModelConfigType = typeof LocalModelConfig;

