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
  PRO_MONTHLY: 'pro_monthly',
  PRO_YEARLY: 'pro_yearly',
  BUSINESS_MONTHLY: 'business_monthly',
  BUSINESS_YEARLY: 'business_yearly',
} as const;

// ========================================
// CREDIT PRODUCTS (Consumables)
// ========================================

export const CREDIT_PRODUCTS = {
  // Pro tier credits
  CREDITS_500: 'credits_500',
  CREDITS_1500: 'credits_1500',
  CREDITS_2500: 'credits_2500',
  CREDITS_5000: 'credits_5000',
  
  // Business tier credits
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
  ...ALL_INTEGRATION_PRODUCT_IDS,
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
  tier?: 'PRO' | 'BUSINESS';
}

export const CREDIT_PRODUCT_METADATA: Record<string, ProductMetadata> = {
  'credits_500': {
    id: 'credits_500',
    credits: 500,
    displayName: '500 Credits',
    description: 'Perfect for occasional use',
    tier: 'PRO',
  },
  'credits_1500': {
    id: 'credits_1500',
    credits: 1500,
    displayName: '1,500 Credits',
    description: 'Most popular choice',
    popular: true,
    tier: 'PRO',
  },
  'credits_2500': {
    id: 'credits_2500',
    credits: 2500,
    displayName: '2,500 Credits',
    description: 'Great value for power users',
    tier: 'PRO',
  },
  'credits_5000': {
    id: 'credits_5000',
    credits: 5000,
    displayName: '5,000 Credits',
    description: 'Maximum savings',
    tier: 'PRO',
  },
  'credits_10000': {
    id: 'credits_10000',
    credits: 10000,
    displayName: '10,000 Credits',
    description: 'Business scale',
    tier: 'BUSINESS',
  },
  'credits_15000': {
    id: 'credits_15000',
    credits: 15000,
    displayName: '15,000 Credits',
    description: 'Enterprise level',
    tier: 'BUSINESS',
  },
};

export const SUBSCRIPTION_PRODUCT_METADATA: Record<string, ProductMetadata> = {
  'pro_monthly': {
    id: 'pro_monthly',
    displayName: 'Pro Monthly',
    description: '1000 credits per month + advanced features',
    tier: 'PRO',
  },
  'pro_yearly': {
    id: 'pro_yearly',
    displayName: 'Pro Yearly',
    description: 'Save 20% with annual billing',
    popular: true,
    tier: 'PRO',
  },
  'business_monthly': {
    id: 'business_monthly',
    displayName: 'Business Monthly',
    description: '1250 credits per user + team features',
    tier: 'BUSINESS',
  },
  'business_yearly': {
    id: 'business_yearly',
    displayName: 'Business Yearly',
    description: 'Best value for teams',
    tier: 'BUSINESS',
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

