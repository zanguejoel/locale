/**
 * IAP Provider
 * 
 * Manages In-App Purchase state across the app using react-native-iap
 * Automatically uses mock service on simulator
 * 
 * Supports both iOS (App Store) and Android (Google Play)
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import { iapService, IAPProduct, PurchaseResult } from '@/utils/IAPService';
import api from '@/utils/ApiClient';
import { getToken } from '@/utils/SecureTokenManager';
import { isSubscriptionProduct } from '@/constants/IAPProducts';

export interface IAPContextValue {
  // State
  isInitialized: boolean;
  isLoading: boolean;
  products: IAPProduct[];
  subscriptionProducts: IAPProduct[];
  creditProducts: IAPProduct[];
  error: string | null;

  // Methods
  purchaseProduct: (productId: string) => Promise<PurchaseResult>;
  restorePurchases: () => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const IAPContext = createContext<IAPContextValue | null>(null);

export const useIAP = () => {
  const context = useContext(IAPContext);
  if (!context) {
    throw new Error('useIAP must be used within IAPProvider');
  }
  return context;
};

interface IAPProviderProps {
  children: React.ReactNode;
}

export const IAPProvider: React.FC<IAPProviderProps> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<IAPProduct[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Initialize IAP on mount (iOS only)
  useEffect(() => {
    // Only initialize on iOS for now
    if (Platform.OS !== 'ios') {
      console.log('[IAPProvider] IAP currently supports iOS only');
      setError('In-App Purchases are currently only available on iOS');
      setIsInitialized(false);
      setIsLoading(false);
      return;
    }

    initializeIAP();
    
    return () => {
      // Cleanup on unmount
      iapService.disconnect();
    };
  }, []);

  /**
   * Initialize IAP service
   */
  const initializeIAP = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[IAPProvider] Initializing IAP...');
      const success = await iapService.initialize();

      if (success) {
        const fetchedProducts = iapService.getProducts();
        setProducts(fetchedProducts);
        setIsInitialized(true);
        console.log('[IAPProvider] IAP initialized successfully');
        console.log('[IAPProvider] Products available:', fetchedProducts.length);
      } else {
        throw new Error('IAP initialization returned false');
      }
    } catch (err: any) {
      console.error('[IAPProvider] Initialization error:', err);
      
      // Set user-friendly error message
      let errorMessage = err.message || 'Failed to initialize In-App Purchases';
      
      // Add helpful context based on error
      if (errorMessage.includes('simulator')) {
        errorMessage = 'Simulator detected - IAP requires physical device';
      } else if (errorMessage.includes('connect')) {
        errorMessage = 'Cannot connect to App Store - Check network and Sandbox account';
      } else if (errorMessage.includes('products')) {
        errorMessage = 'Products not available - Check App Store Connect configuration';
      } else if (errorMessage.includes('module')) {
        errorMessage = 'IAP module not loaded - Rebuild required';
      }
      
      setError(errorMessage);
      setIsInitialized(false);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify purchase with backend
   */
  const verifyPurchaseWithBackend = useCallback(async (
    productId: string,
    transactionReceipt?: string,
    purchaseToken?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      await api.setAuthToken(token);

      const payload = {
        product_id: productId,
        platform: 'ios', // iOS only for now
        transaction_receipt: transactionReceipt,
      };

      // Determine if this is a subscription or credit purchase using proper helper
      const isSubscription = isSubscriptionProduct(productId);
      const endpoint = isSubscription ? '/iap/verify-subscription' : '/iap/verify-purchase';

      console.log(`[IAPProvider] Verifying ${isSubscription ? 'subscription' : 'purchase'} with backend (iOS):`, payload);

      const response = await api.post(endpoint, payload);

      if (!response.ok || !response.data) {
        // Extract error message from response if available
        const errorMessage = response.data?.message || response.data?.detail || 'Backend verification failed';
        throw new Error(errorMessage);
      }

      // Log successful verification with details
      if (isSubscriptionProduct(productId)) {
        const { tier, expires_at } = response.data;
        console.log('[IAPProvider] Subscription verified:', { tier, expires_at });
      } else {
        const { credits_added, new_balance } = response.data;
        console.log('[IAPProvider] Credits verified:', { credits_added, new_balance });
      }

      return { 
        success: true,
        data: response.data  // Return backend data for caller to use
      };
    } catch (err: any) {
      console.error('[IAPProvider] Backend verification error:', err);
      return {
        success: false,
        error: err.message || 'Verification failed',
      };
    }
  }, []);

  /**
   * Refresh products from store
   */
  const refreshProducts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fetchedProducts = await iapService.fetchProducts();
      setProducts(fetchedProducts);
      
      console.log('[IAPProvider] Products refreshed');
    } catch (err: any) {
      console.error('[IAPProvider] Error refreshing products:', err);
      setError(err.message || 'Failed to refresh products');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Purchase a product
   */
  const purchaseProduct = useCallback(async (productId: string): Promise<PurchaseResult> => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[IAPProvider] Purchasing product:', productId);

      // Make purchase through IAP service
      const purchaseResult = await iapService.purchaseProduct(productId);

      if (!purchaseResult.success) {
        if (purchaseResult.cancelled) {
          console.log('[IAPProvider] Purchase cancelled by user');
          return purchaseResult;
        }
        throw new Error(purchaseResult.error || 'Purchase failed');
      }

      console.log('[IAPProvider] Purchase successful, verifying with backend...');

      // Verify purchase with backend
      const verificationResult = await verifyPurchaseWithBackend(
        productId,
        purchaseResult.transactionReceipt,
        purchaseResult.purchaseToken
      );

      if (!verificationResult.success) {
        throw new Error('Purchase verification failed');
      }

      console.log('[IAPProvider] Purchase verified successfully');

      return {
        ...purchaseResult,
        success: true,
      };
    } catch (err: any) {
      console.error('[IAPProvider] Purchase error:', err);
      setError(err.message || 'Purchase failed');
      return {
        success: false,
        error: err.message || 'Purchase failed',
      };
    } finally {
      setIsLoading(false);
    }
  }, [verifyPurchaseWithBackend]);

  /**
   * Restore previous purchases
   */
  const restorePurchases = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('[IAPProvider] Restoring purchases...');

      const restoreResult = await iapService.restorePurchases();

      if (!restoreResult.success) {
        throw new Error(restoreResult.error || 'Failed to restore purchases');
      }

      // Verify restored purchases with backend
      if (restoreResult.purchases && restoreResult.purchases.length > 0) {
        for (const purchase of restoreResult.purchases) {
          await verifyPurchaseWithBackend(
            purchase.productId,
            Platform.OS === 'ios' ? purchase.transactionReceipt : undefined,
            Platform.OS === 'android' ? purchase.purchaseToken : undefined
          );
        }
      }

      console.log('[IAPProvider] Purchases restored successfully');
    } catch (err: any) {
      console.error('[IAPProvider] Restore error:', err);
      setError(err.message || 'Failed to restore purchases');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [verifyPurchaseWithBackend]);

  // Derived state
  const subscriptionProducts = products.filter((p) => p.type === 'subscription');
  const creditProducts = products.filter((p) => p.type === 'consumable');

  const value: IAPContextValue = {
    isInitialized,
    isLoading,
    products,
    subscriptionProducts,
    creditProducts,
    error,
    purchaseProduct,
    restorePurchases,
    refreshProducts,
  };

  return <IAPContext.Provider value={value}>{children}</IAPContext.Provider>;
};

export default IAPProvider;

