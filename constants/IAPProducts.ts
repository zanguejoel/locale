/**
 * In-App Purchase Product Identifiers (iOS Only)
 * 
 * These must match the product IDs configured in App Store Connect
 * 
 * Note: Currently iOS only. Android support will be added in the future.
 */

// ========================================
// SUBSCRIPTION PRODUCTS
// ========================================

export const SUBSCRIPTION_PRODUCTS = {
  BASIC_MONTHLY: 'basic_monthly',
  BASIC_YEARLY: 'basic_yearly',
  PROFESSIONAL_MONTHLY: 'professional_monthly',
  PROFESSIONAL_YEARLY: 'professional_yearly',
} as const;

// ========================================
// CREDIT PRODUCTS (Consumables)
// ========================================

export const CREDIT_PRODUCTS = {
  // Basic tier credits
  CREDITS_500: 'credits_500',
  CREDITS_1500: 'credits_1500',
  CREDITS_2500: 'credits_2500',
  CREDITS_5000: 'credits_5000',
  
  // Professional tier credits
  CREDITS_10000: 'credits_10000',
  CREDITS_15000: 'credits_15000',
} as const;

// ========================================
// INTEGRATION SUBSCRIPTION PRODUCTS
// ========================================

export const INTEGRATION_PRODUCTS = {
  // Individual integrations - adjust based on your needs
  INTEGRATION_GOOGLE_DRIVE: 'integration_google_drive',
  INTEGRATION_SLACK: 'integration_slack',
  // Add more integrations as needed
} as const;

// ========================================
// ALL PRODUCTS (for connection)
// ========================================

export const ALL_SUBSCRIPTION_PRODUCT_IDS = Object.values(SUBSCRIPTION_PRODUCTS) as string[];
export const ALL_CREDIT_PRODUCT_IDS = Object.values(CREDIT_PRODUCTS) as string[];
export const ALL_INTEGRATION_PRODUCT_IDS = Object.values(INTEGRATION_PRODUCTS) as string[];

export const ALL_PRODUCT_IDS = [
  ...ALL_SUBSCRIPTION_PRODUCT_IDS,
  ...ALL_CREDIT_PRODUCT_IDS,
  // Integration products not yet implemented on backend
  // ...ALL_INTEGRATION_PRODUCT_IDS,
];

// ========================================
// PRODUCT METADATA
// ========================================

export interface ProductMetadata {
  id: string;
  credits?: number;
  displayName: string;
  description: string;
  popular?: boolean;
  tier?: 'BASIC' | 'PROFESSIONAL';
}

export const CREDIT_PRODUCT_METADATA: Record<string, ProductMetadata> = {
  'credits_500': {
    id: 'credits_500',
    credits: 500,
    displayName: '500 Credits',
    description: 'Perfect for occasional use',
    tier: 'BASIC',
  },
  'credits_1500': {
    id: 'credits_1500',
    credits: 1500,
    displayName: '1,500 Credits',
    description: 'Most popular choice',
    popular: true,
    tier: 'BASIC',
  },
  'credits_2500': {
    id: 'credits_2500',
    credits: 2500,
    displayName: '2,500 Credits',
    description: 'Great value for power users',
    tier: 'BASIC',
  },
  'credits_5000': {
    id: 'credits_5000',
    credits: 5000,
    displayName: '5,000 Credits',
    description: 'Maximum savings',
    tier: 'BASIC',
  },
  'credits_10000': {
    id: 'credits_10000',
    credits: 10000,
    displayName: '10,000 Credits',
    description: 'Professional scale',
    tier: 'PROFESSIONAL',
  },
  'credits_15000': {
    id: 'credits_15000',
    credits: 15000,
    displayName: '15,000 Credits',
    description: 'Enterprise level',
    tier: 'PROFESSIONAL',
  },
};

export const SUBSCRIPTION_PRODUCT_METADATA: Record<string, ProductMetadata> = {
  'basic_monthly': {
    id: 'basic_monthly',
    displayName: 'Basic Monthly',
    description: '1000 credits per month + advanced features',
    tier: 'BASIC',
  },
  'basic_yearly': {
    id: 'basic_yearly',
    displayName: 'Basic Yearly',
    description: 'Save 20% with annual billing',
    popular: true,
    tier: 'BASIC',
  },
  'professional_monthly': {
    id: 'professional_monthly',
    displayName: 'Professional Monthly',
    description: '1250 credits per user + team features',
    tier: 'PROFESSIONAL',
  },
  'professional_yearly': {
    id: 'professional_yearly',
    displayName: 'Professional Yearly',
    description: 'Best value for teams',
    tier: 'PROFESSIONAL',
  },
};

// ========================================
// HELPERS
// ========================================

export function getProductMetadata(productId: string): ProductMetadata | undefined {
  return CREDIT_PRODUCT_METADATA[productId] || SUBSCRIPTION_PRODUCT_METADATA[productId];
}

export function isSubscriptionProduct(productId: string): boolean {
  return ALL_SUBSCRIPTION_PRODUCT_IDS.includes(productId);
}

export function isCreditProduct(productId: string): boolean {
  return ALL_CREDIT_PRODUCT_IDS.includes(productId);
}

export function getCreditsFromProductId(productId: string): number | undefined {
  return CREDIT_PRODUCT_METADATA[productId]?.credits;
}

