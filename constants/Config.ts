import { API_URL_PROD } from "@/utils/ApiClient";

/**
 * Application Configuration Constants
 * Centralized configuration for the entire application
 */

/**
 * File Upload Configuration
 */
export const FILE_UPLOAD = {
  MAX_IMAGE_SIZE: 4 * 1024 * 1024, // 2MB
  MAX_IMAGE_DIMENSION: 1200,
  MAX_FILE_SIZE: 20 * 1024 * 1024, // 10MB
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'heic', 'heif'],
  SUPPORTED_AUDIO_FORMATS: ['m4a', 'mp3', 'wav'],
  SUPPORTED_DOCUMENT_FORMATS: ['pdf', 'doc', 'docx', 'txt'],
} as const;

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: API_URL_PROD,
  TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

/**
 * Cache Configuration
 */
export const CACHE_CONFIG = {
  SIZE: 100,
  CLEANUP_INTERVAL: 60 * 1000, // 1 minute
  DEFAULT_DURATION: 60 * 60 * 1000, // 1 hour
  SHORT_TERM: 15 * 60 * 1000, // 15 minutes
  MEDIUM_TERM: 30 * 60 * 1000, // 30 minutes
  LONG_TERM: 12 * 60 * 60 * 1000, // 12 hours
  VERY_LONG_TERM: 24 * 60 * 60 * 1000, // 24 hours
} as const;

/**
 * Validation Rules
 */
export const VALIDATION = {
  EMAIL_REGEX: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  MAX_NAME_LENGTH: 50,
  MIN_NAME_LENGTH: 1,
  MIN_PHONE_DIGITS: 10,
  MAX_PHONE_DIGITS: 15,
  MAX_EMAIL_LENGTH: 254,
  VERIFICATION_CODE_LENGTH: 6,
} as const;

/**
 * Animation Configuration
 */
export const ANIMATION = {
  SCROLL_DELAY: 300,
  FADE_DURATION: 600,
  LOGO_DURATION: 400,
  SLIDE_DURATION: 400,
  BOUNCE_DURATION: 500,
} as const;

/**
 * Session Configuration
 */
export const SESSION = {
  EXPIRY_MS: 10 * 60 * 1000, // 10 minutes
  WARNING_MS: 9 * 60 * 1000, // Warn at 9 minutes
} as const;

/**
 * Chat Configuration
 */
export const CHAT = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_MESSAGES_PER_REQUEST: 50,
  DEFAULT_CONVERSATION_LIMIT: 20,
  LOAD_MORE_THRESHOLD: 20,
  TYPING_INDICATOR_DELAY: 300,
} as const;

/**
 * UI Configuration
 */
export const UI = {
  MIN_INPUT_HEIGHT: 40,
  MAX_INPUT_HEIGHT: 120,
  KEYBOARD_VERTICAL_OFFSET: 110,
  IMAGE_PREVIEW_SIZE: 240,
  BORDER_RADIUS: 15,
  SMALL_BORDER_RADIUS: 12,
} as const;

/**
 * Feature Flags
 */
export const FEATURES = {
  LOCAL_LLM_ENABLED: false, // Disabled for this release - will be enabled in next version
  AUDIO_MESSAGES_ENABLED: true,
  IMAGE_UPLOAD_ENABLED: true,
  DOCUMENT_UPLOAD_ENABLED: true,
  DARK_MODE_ENABLED: true,
} as const;

/**
 * Environment Configuration
 * Can be overridden by environment variables
 */
export const ENV = {
  isDevelopment: __DEV__,
  isProduction: !__DEV__,
} as const;

