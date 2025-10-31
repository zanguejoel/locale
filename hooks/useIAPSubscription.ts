/**
 * useIAPSubscription Hook
 * 
 * Hook for managing subscriptions using In-App Purchase
 */

import { useState, useCallback, useMemo } from 'react';
import { useIAP } from '@/providers/IAPProvider';
import { SUBSCRIPTION_PRODUCTS, SUBSCRIPTION_PRODUCT_METADATA } from '@/constants/IAPProducts';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { SubscriptionEvent } from '@/types/mixpanel';
import { Alert } from 'react-native';
import { useSubscription } from './useSubscription';

export interface SubscriptionPackage {
  productId: string;
  title: string;
  description: string;
  price: string;
  priceAmount: number;
  tier: 'BASIC' | 'PROFESSIONAL';
  period: 'monthly' | 'yearly';
  popular?: boolean;
}

export interface PurchaseSubscriptionResult {
  success: boolean;
  error?: string;
  cancelled?: boolean;
}

export const useIAPSubscription = () => {
  const { subscriptionProducts, purchaseProduct, restorePurchases, isLoading: isIAPLoading } = useIAP();
  const { refreshSubscription } = useSubscription();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  /**
   * Get available subscription packages
   */
  const subscriptionPackages = useMemo((): SubscriptionPackage[] => {
    return subscriptionProducts.map((product) => {
      const metadata = SUBSCRIPTION_PRODUCT_METADATA[product.productId];
      
      // Determine tier and period from product ID
      const tier = product.productId.includes('business') ? 'PROFESSIONAL' : 'BASIC';
      const period = product.productId.includes('yearly') ? 'yearly' : 'monthly';

      return {
        productId: product.productId,
        title: metadata?.displayName || product.title,
        description: metadata?.description || product.description,
        price: product.price,
        priceAmount: product.priceAmount,
        tier,
        period,
        popular: metadata?.popular,
      };
    });
  }, [subscriptionProducts]);

  /**
   * Get subscriptions for specific tier
   */
  const getSubscriptionsForTier = useCallback((tier: 'BASIC' | 'PROFESSIONAL'): SubscriptionPackage[] => {
    return subscriptionPackages.filter((pkg) => pkg.tier === tier);
  }, [subscriptionPackages]);

  /**
   * Purchase subscription
   */
  const purchaseSubscription = useCallback(async (
    productId: string,
    source?: string
  ): Promise<PurchaseSubscriptionResult> => {
    setIsPurchasing(true);

    try {
      const subscription = subscriptionPackages.find((p) => p.productId === productId);

      console.log('[useIAPSubscription] Purchasing subscription:', { productId });

      // Track subscription initiated
      mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_PURCHASE_INITIATED, {
        product_id: productId,
        tier: subscription?.tier,
        period: subscription?.period,
        source: source || 'unknown',
      });

      // Make purchase
      const result = await purchaseProduct(productId);

      if (!result.success) {
        if (result.cancelled) {
          console.log('[useIAPSubscription] Purchase cancelled');
          
          // Track cancellation
          mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_PURCHASE_CANCELLED, {
            product_id: productId,
            source: source || 'unknown',
          });

          return {
            success: false,
            cancelled: true,
          };
        }

        throw new Error(result.error || 'Purchase failed');
      }

      console.log('[useIAPSubscription] Purchase successful');

      // Track subscription success
      mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_PURCHASE_SUCCESS, {
        product_id: productId,
        tier: subscription?.tier,
        period: subscription?.period,
        amount: subscription?.priceAmount,
        source: source || 'unknown',
      });

      // Refresh subscription status
      await refreshSubscription();

      // Show success message
      Alert.alert(
        'Subscription Activated',
        `Your ${subscription?.tier} subscription is now active!`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
      };
    } catch (err: any) {
      console.error('[useIAPSubscription] Purchase error:', err);

      // Track subscription error
      mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_PURCHASE_FAILED, {
        product_id: productId,
        error: err.message,
        source: source || 'unknown',
      });

      // Show error message
      Alert.alert(
        'Subscription Failed',
        err.message || 'Unable to complete subscription. Please try again.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: err.message || 'Purchase failed',
      };
    } finally {
      setIsPurchasing(false);
    }
  }, [subscriptionPackages, purchaseProduct, refreshSubscription]);

  /**
   * Restore previous subscriptions
   */
  const restoreSubscriptions = useCallback(async (): Promise<boolean> => {
    setIsRestoring(true);

    try {
      console.log('[useIAPSubscription] Restoring subscriptions...');

      // Track restore initiated
      mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_RESTORE_INITIATED, {});

      await restorePurchases();

      // Refresh subscription status
      await refreshSubscription();

      // Track restore success
      mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_RESTORE_SUCCESS, {});

      // Show success message
      Alert.alert(
        'Restore Successful',
        'Your subscriptions have been restored.',
        [{ text: 'OK' }]
      );

      return true;
    } catch (err: any) {
      console.error('[useIAPSubscription] Restore error:', err);

      // Track restore error
      mixpanelService.trackSubscription(SubscriptionEvent.SUBSCRIPTION_RESTORE_FAILED, {
        error: err.message,
      });

      // Show error message
      Alert.alert(
        'Restore Failed',
        err.message || 'Unable to restore subscriptions. Please try again.',
        [{ text: 'OK' }]
      );

      return false;
    } finally {
      setIsRestoring(false);
    }
  }, [restorePurchases, refreshSubscription]);

  /**
   * Get package by product ID
   */
  const getPackageById = useCallback((productId: string): SubscriptionPackage | undefined => {
    return subscriptionPackages.find((pkg) => pkg.productId === productId);
  }, [subscriptionPackages]);

  return {
    subscriptionPackages,
    isPurchasing: isPurchasing || isIAPLoading,
    isRestoring,
    purchaseSubscription,
    restoreSubscriptions,
    getSubscriptionsForTier,
    getPackageById,
  };
};

export default useIAPSubscription;

