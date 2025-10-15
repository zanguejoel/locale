/**
 * Chat Component Constants
 * Centralized configuration for chat-related components
 */

/**
 * Chat Input Constants
 */
export const CHAT_INPUT = {
  /** Minimum height for the input field in pixels */
  MIN_HEIGHT: 40,
  
  /** Maximum height for multiline input in pixels */
  MAX_HEIGHT: 75,
  
  /** Width of the expand/collapse button in pixels */
  BUTTON_WIDTH: 30,
  
  /** Button view width when expanded (with 3 buttons for local mode) */
  BUTTON_VIEW_WIDTH_LOCAL: 100,
  
  /** Button view width when expanded (with 4 buttons for cloud mode) */
  BUTTON_VIEW_WIDTH_CLOUD: 130,
  
  /** Animation duration for expand/collapse in milliseconds */
  ANIMATION_DURATION: 400,
  
  /** Audio recording settings */
  AUDIO: {
    SAMPLE_RATE: 44100,
    BIT_RATE: 128000,
    NUMBER_OF_CHANNELS: 2,
  },
} as const;

/**
 * Chat Message Constants
 */
export const CHAT_MESSAGE = {
  /** Size of image previews in pixels */
  IMAGE_PREVIEW_SIZE: 240,
  
  /** Border radius for images and messages in pixels */
  BORDER_RADIUS: 15,
  
  /** Message bubble border radius in pixels */
  MESSAGE_BORDER_RADIUS: 18,
  
  /** Tail effect border radius in pixels */
  TAIL_BORDER_RADIUS: 6,
  
  /** Maximum image retry attempts */
  MAX_IMAGE_RETRY_ATTEMPTS: 3,
  
  /** Delay before retrying image load in milliseconds */
  IMAGE_RETRY_DELAY: 1500,
  
  /** Video dimensions */
  VIDEO: {
    WIDTH: 260,
    HEIGHT: 145,
  },
  
  /** Generated content dimensions */
  GENERATED: {
    VIDEO_WIDTH: 280,
    VIDEO_HEIGHT: 160,
  },
  
  /** Animation durations in milliseconds */
  ANIMATION: {
    FADE_IN: 300,
    PULSE: 800,
    LOADING_DOT: 300,
    LOADING_DOT_DELAY: 150,
  },
  
  /** Loading dots configuration */
  LOADING_DOTS: {
    SIZE: 10,
    SPACING: 3,
    TRANSLATE_Y: -8,
  },
} as const;

/**
 * Chat Page Constants
 */
export const CHAT_PAGE = {
  /** Scroll behavior thresholds */
  SCROLL: {
    /** Distance from bottom to be considered "at bottom" in pixels */
    BOTTOM_THRESHOLD: 20,
    
    /** Default scroll delay in milliseconds */
    DEFAULT_DELAY: 300,
    
    /** Immediate scroll delay in milliseconds */
    IMMEDIATE_DELAY: 0,
    
    /** Scroll event throttle in milliseconds */
    THROTTLE: 16,
    
    /** Content height change threshold to detect manual scroll in pixels */
    MANUAL_SCROLL_THRESHOLD: 10,
  },
  
  /** Animation durations in milliseconds */
  ANIMATION: {
    ENTRANCE: 600,
    LOGO_FADE: 400,
  },
  
  /** Estimated item size for FlashList in pixels */
  ESTIMATED_ITEM_SIZE: 100,
  
  /** Keyboard offset for iOS in pixels */
  KEYBOARD_VERTICAL_OFFSET: 110,
  
  /** Logo dimensions */
  LOGO: {
    WIDTH: 180,
    HEIGHT: 30,
  },
  
  /** Preview image dimensions */
  PREVIEW_IMAGE: {
    WIDTH: 40,
    HEIGHT: 40,
    BORDER_RADIUS: 12,
  },
} as const;

/**
 * File Upload Constants
 */
export const FILE_UPLOAD = {
  /** Maximum image size in bytes (2MB) */
  MAX_IMAGE_SIZE: 2 * 1024 * 1024,
  
  /** Maximum image dimension in pixels */
  MAX_IMAGE_DIMENSION: 1200,
  
  /** Image quality for compression (0-1) */
  IMAGE_QUALITY: 0.8,
} as const;

/**
 * Timeout Constants
 */
export const TIMEOUTS = {
  /** Default timeout for API requests in milliseconds */
  API_REQUEST: 30000,
  
  /** Timeout for stream connections in milliseconds */
  STREAM: 60000,
  
  /** Debounce delay for typing indicators in milliseconds */
  TYPING_INDICATOR: 1000,
} as const;

/**
 * Export all constants as a single object for convenience
 */
export const CHAT_CONSTANTS = {
  INPUT: CHAT_INPUT,
  MESSAGE: CHAT_MESSAGE,
  PAGE: CHAT_PAGE,
  FILE_UPLOAD,
  TIMEOUTS,
} as const;

