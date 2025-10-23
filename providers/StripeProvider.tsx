import React, { useEffect } from 'react';
import { StripeProvider as StripeReactNativeProvider } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

interface StripeProviderProps {
  children: React.ReactNode;
}

// Get Stripe publishable key from environment
const STRIPE_PUBLISHABLE_KEY = Constants.expoConfig?.extra?.stripePublishableKey || 
  __DEV__ 
    ? 'pk_test_51R5CPCCo1wmkddwdYXKvZpOjQh4s5SQAYQjwKFYPNYuKhVQzQPKhIFLAKJKGJ8cVQiKpGjKFGjKGFjKGFjKGFjKGFjKGF' // Test key for development
    : 'pk_live_your_production_key_here'; // Production key

// Merchant identifier for Apple Pay
const MERCHANT_IDENTIFIER = 'merchant.com.neptunetech.odyssey';

/**
 * Stripe Provider Component
 * 
 * Initializes Stripe with the correct configuration for Apple Pay support.
 * This provider should wrap the entire app or at least the parts that need payment functionality.
 */
export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  useEffect(() => {
    console.log('[StripeProvider] Initializing with key:', STRIPE_PUBLISHABLE_KEY?.substring(0, 20) + '...');
    console.log('[StripeProvider] Merchant ID:', MERCHANT_IDENTIFIER);
    console.log('[StripeProvider] Platform:', Platform.OS);
  }, []);

  return (
    <StripeReactNativeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier={MERCHANT_IDENTIFIER} // Required for Apple Pay
      urlScheme="odyssey" // Should match your app's URL scheme
    >
      {children}
    </StripeReactNativeProvider>
  );
};

export default StripeProvider;

