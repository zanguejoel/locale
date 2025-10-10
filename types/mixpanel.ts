/**
 * Mixpanel Event Types and Interfaces
 * 
 * Mobile-specific event types based on web version
 */

// ============================================
// EVENT ENUMS
// ============================================

export enum AuthEvent {
  // Sign Up Events
  SIGN_UP_STARTED = 'Sign Up Started',
  SIGN_UP_COMPLETED = 'Sign Up Completed',
  SIGN_UP_FAILED = 'Sign Up Failed',
  EMAIL_VERIFIED = 'Email Verified',
  
  // Login Events
  LOGIN_STARTED = 'Login Started',
  LOGIN_COMPLETED = 'Login Completed',
  LOGIN_FAILED = 'Login Failed',
  LOGOUT = 'Logout',
  
  // Password Management
  PASSWORD_RESET_REQUESTED = 'Password Reset Requested',
  PASSWORD_RESET_COMPLETED = 'Password Reset Completed',
  PASSWORD_CHANGED = 'Password Changed',
}

export enum AIEvent {
  // Chat
  CHAT_MESSAGE_SENT = 'AI Chat Message Sent',
  CHAT_RESPONSE_RECEIVED = 'AI Chat Response Received',
  CHAT_RESPONSE_FAILED = 'AI Chat Response Failed',
  
  // Message Actions
  MESSAGE_COPIED = 'Message Copied',
  MESSAGE_DELETED = 'Message Deleted',
  MESSAGE_REGENERATED = 'Message Regenerated',
  
  // Image Generation
  IMAGE_GENERATION_REQUESTED = 'Image Generation Requested',
  IMAGE_GENERATION_COMPLETED = 'Image Generation Completed',
  IMAGE_GENERATION_FAILED = 'Image Generation Failed',
  
  // Voice
  VOICE_MESSAGE_SENT = 'Voice Message Sent',
  VOICE_MESSAGE_PLAYED = 'Voice Message Played',
  
  // Conversation Management
  CONVERSATION_STARTED = 'Conversation Started',
  CONVERSATION_DELETED = 'Conversation Deleted',
  CONVERSATION_RENAMED = 'Conversation Renamed',
}

export enum ModelEvent {
  // Model Selection
  MODEL_SELECTED = 'Model Selected',
  MODEL_SWITCHED = 'Model Switched',
  
  // Local Model Management
  LOCAL_MODEL_DOWNLOAD_STARTED = 'Local Model Download Started',
  LOCAL_MODEL_DOWNLOAD_COMPLETED = 'Local Model Download Completed',
  LOCAL_MODEL_DOWNLOAD_FAILED = 'Local Model Download Failed',
  LOCAL_MODEL_DOWNLOAD_CANCELLED = 'Local Model Download Cancelled',
  LOCAL_MODEL_DELETED = 'Local Model Deleted',
  
  // Local Model Usage
  LOCAL_MODEL_LOADED = 'Local Model Loaded',
  LOCAL_MODEL_UNLOADED = 'Local Model Unloaded',
  LOCAL_MODEL_INFERENCE_STARTED = 'Local Model Inference Started',
  LOCAL_MODEL_INFERENCE_COMPLETED = 'Local Model Inference Completed',
  
  // Model Manager
  MODEL_MANAGER_OPENED = 'Model Manager Opened',
  MODEL_INFO_VIEWED = 'Model Info Viewed',
}

export enum SettingsEvent {
  // Settings Access
  SETTINGS_OPENED = 'Settings Opened',
  SETTINGS_SECTION_VIEWED = 'Settings Section Viewed',
  
  // Profile
  PROFILE_VIEWED = 'Profile Viewed',
  PROFILE_UPDATED = 'Profile Updated',
  
  // Preferences
  DEFAULT_MODEL_CHANGED = 'Default Model Changed',
  THEME_CHANGED = 'Theme Changed',
}

export enum SubscriptionEvent {
  // Plan Views
  PLAN_VIEWED = 'Subscription Plan Viewed',
  PLANS_PAGE_OPENED = 'Plans Page Opened',
  WEB_DASHBOARD_OPENED = 'Web Dashboard Opened for Subscription',
  
  // User has upgraded (detected from backend)
  SUBSCRIPTION_ACTIVE = 'Subscription Active Detected',
}

export enum CreditEvent {
  // Credit Purchase Flow
  CREDIT_PURCHASE_MODAL_OPENED = 'Credit Purchase Modal Opened',
  CREDIT_PACKAGE_SELECTED = 'Credit Package Selected',
  CREDIT_CUSTOM_AMOUNT_ENTERED = 'Credit Custom Amount Entered',
  CREDIT_PURCHASE_INITIATED = 'Credit Purchase Initiated',
  CREDIT_PURCHASE_COMPLETED = 'Credit Purchase Completed',
  CREDIT_PURCHASE_FAILED = 'Credit Purchase Failed',
  
  // Credit Balance
  CREDIT_BALANCE_VIEWED = 'Credit Balance Viewed',
  CREDIT_LOW_WARNING_SHOWN = 'Credit Low Warning Shown',
  CREDIT_DEPLETED_ERROR_SHOWN = 'Credit Depleted Error Shown',
}

// ============================================
// EVENT PROPERTY INTERFACES
// ============================================

export interface AuthEventProperties {
  method?: 'email';
  error_message?: string;
  user_id?: string;
}

export interface AIEventProperties {
  message_type?: 'text' | 'image' | 'audio';
  message_length?: number;
  response_time?: number;
  model_used?: string;
  is_local_model?: boolean;
  conversation_id?: string;
  error_message?: string;
  
  // Image generation
  image_provider?: string;
  image_model?: string;
  
  // Voice
  voice_duration_ms?: number;
  
  // Additional features
  has_web_search?: boolean;
  has_image_generation?: boolean;
  has_files?: boolean;
  response_length?: number;
}

export interface ModelEventProperties {
  model_id?: string;
  model_name?: string;
  model_type?: 'cloud' | 'local';
  previous_model_id?: string;
  
  // Local model specific
  model_size_mb?: number;
  download_duration_ms?: number;
  storage_available_mb?: number;
  error_message?: string;
  
  // Inference performance
  inference_time_ms?: number;
  tokens_per_second?: number;
}

export interface SettingsEventProperties {
  section?: string;
  setting_name?: string;
  old_value?: string | number | boolean;
  new_value?: string | number | boolean;
  fields_updated?: string[];
}

export interface SubscriptionEventProperties {
  plan_name?: string;
  source?: 'settings' | 'chat_limit' | 'feature_gate';
}

export interface CreditEventProperties {
  // Purchase details
  credit_amount?: number;
  purchase_cost?: number;
  package_type?: 'preset' | 'custom';
  package_name?: string;
  account_type?: 'PRO' | 'BUSINESS';
  
  // Transaction details
  payment_method?: 'saved' | 'checkout';
  transaction_completed?: boolean;
  checkout_url?: string;
  
  // Balance info
  credits_before?: number;
  credits_after?: number;
  credits_remaining?: number;
  
  // User context
  source?: 'header_badge' | 'settings' | 'error_banner' | 'empty_state';
  error_message?: string;
  
  // UI interaction
  tab_used?: 'packages' | 'custom';
}

// ============================================
// USER PROFILE INTERFACE
// ============================================

export interface MixpanelUserProfile {
  // Mixpanel reserved properties
  $email?: string;
  $name?: string;
  $created?: string;
  
  // Account Info
  user_id: string;
  account_created_date: string;
  membership_tier: string;
  
  // Platform Usage
  total_messages_sent?: number;
  total_conversations?: number;
  local_models_downloaded?: number;
  
  // Engagement
  last_login_date: string;
  login_count?: number;
  days_since_signup?: number;
  
  // Device Info
  device_platform?: 'ios' | 'android';
  app_version?: string;
  
  // Preferences
  default_model?: string;
}

// ============================================
// GENERAL EVENT PROPERTIES
// ============================================

export interface BaseEventProperties {
  timestamp?: number;
  session_id?: string;
  screen_name?: string;
  screen_path?: string;
  session_duration?: number;
}

// Combined event properties type
export type EventProperties = 
  | AuthEventProperties
  | AIEventProperties
  | ModelEventProperties
  | SettingsEventProperties
  | SubscriptionEventProperties
  | CreditEventProperties
  | BaseEventProperties
  | Record<string, any>;

