/**
 * Integration Types
 * 
 * TypeScript type definitions for third-party integrations
 * Used across the mobile app for type safety
 */

/**
 * Configuration field for integration settings
 */
export interface ConfigField {
  label: string;
  value: string;
  inputType: 'text' | 'password' | 'textarea' | 'select' | 'switch';
  required?: boolean;
  placeholder?: string;
  default?: string;
  options?: { label: string; value: string }[];
  canOverwrite?: string;
  isTitle?: boolean;
}

/**
 * Integration logo configuration
 */
export interface IntegrationLogo {
  light?: string;
  dark?: string;
  type?: 'icon' | 'image';
}

/**
 * Main integration interface
 * Represents a third-party service integration
 */
export interface Integration {
  id: number;
  str_id: string;
  integration_name: string;
  description: string;
  logo?: IntegrationLogo;
  authType: 'oauth' | 'apiKey';
  configFields: ConfigField[];
  is_subscribed: boolean;
  is_enabled: boolean;
  is_active: boolean;
  price?: string;
  subscription_status?: string;
  allowSubscribe?: string;
  allowEnable?: string;
  time_created?: string;
  time_updated?: string;
}

/**
 * Nango integration (OAuth provider)
 */
export interface NangoIntegration {
  unique_key: string;
  provider: string;
  display_name: string;
  logo_url?: string;
  categories: string[];
  auth_mode?: string;
  docs?: string;
}

/**
 * User's integration connection
 */
export interface IntegrationConnection {
  id: number;
  integration_id: number;
  str_id: string;
  provider: string;
  connection_id?: string;
  is_active: boolean;
  connected_at: string;
  settings?: any;
  last_synced?: string;
}

/**
 * Nango session response
 */
export interface NangoSessionResponse {
  success: boolean;
  authorization_url?: string;
  state?: string;
  error?: string;
  message?: string;
}

/**
 * Integration category types
 */
export type IntegrationCategory = 
  | 'all'
  | 'connected'
  | 'google'
  | 'microsoft'
  | 'crm'
  | 'communication'
  | 'storage'
  | 'business';

/**
 * Integration filter options
 */
export interface IntegrationFilter {
  category: IntegrationCategory;
  searchQuery: string;
  showConnectedOnly: boolean;
}

/**
 * CRM settings types
 */
export type CrmSettingType = 'contacts' | 'tasks';

export interface CrmSettings {
  [integration: string]: {
    contacts?: {
      is_active: boolean;
      last_synced?: string;
    };
    tasks?: {
      is_active: boolean;
      last_synced?: string;
    };
  };
}

/**
 * Integration subscription payment response
 */
export interface IntegrationPaymentResponse {
  status: number;
  checkout_url?: string;
  message?: string;
}

/**
 * Integration API error
 */
export interface IntegrationError {
  detail: string;
  error?: string;
  status: number;
}

/**
 * Integration names mapping (for display)
 */
export const INTEGRATION_NAMES: Record<string, string> = {
  'web-search': 'Web Search',
  'HITL': 'Human in the Loop',
  'google-mail': 'Gmail',
  'google-calendar': 'Google Calendar',
  'google-drive': 'Google Drive',
  'google-sheet': 'Google Sheets',
  'google-docs': 'Google Docs',
  'slack': 'Slack',
  'box': 'Box',
  'monday': 'Monday.com',
  'wealthbox': 'Wealthbox',
  'salesforce': 'Salesforce',
  'dropbox': 'Dropbox',
  'linkedin': 'LinkedIn',
  'docusign': 'DocuSign',
  'github': 'GitHub',
  'twilio': 'Twilio',
  'microsoft': 'Microsoft 365',
  'office365': 'Microsoft 365'
};

/**
 * Integration categories mapping
 */
export const INTEGRATION_CATEGORIES: Record<IntegrationCategory, string> = {
  all: 'All Integrations',
  connected: 'Connected',
  google: 'Google Services',
  microsoft: 'Microsoft Services',
  crm: 'CRM & Sales',
  communication: 'Communication',
  storage: 'Storage & Files',
  business: 'Business Tools'
};

/**
 * Category for each integration
 */
export const INTEGRATION_TO_CATEGORY: Record<string, IntegrationCategory[]> = {
  'google-mail': ['google'],
  'google-calendar': ['google'],
  'google-drive': ['google', 'storage'],
  'google-sheet': ['google', 'business'],
  'google-docs': ['google', 'business'],
  'office365': ['microsoft', 'business'],
  'microsoft': ['microsoft', 'business'],
  'salesforce': ['crm'],
  'wealthbox': ['crm'],
  'slack': ['communication'],
  'twilio': ['communication'],
  'box': ['storage'],
  'dropbox': ['storage'],
  'monday': ['business'],
  'docusign': ['business'],
  'github': ['business'],
  'linkedin': ['business'],
  'web-search': ['business'],
  'HITL': ['business']
};

