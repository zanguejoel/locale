/**
 * useIAPCredits Hook
 * 
 * Hook for purchasing credits using In-App Purchase
 */

import { useState, useCallback, useMemo } from 'react';
import { useIAP } from '@/providers/IAPProvider';
import { useCredits } from './useCredits';
import { CREDIT_PRODUCTS, CREDIT_PRODUCT_METADATA, getCreditsFromProductId } from '@/constants/IAPProducts';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { CreditEvent } from '@/types/mixpanel';
import { Alert } from 'react-native';

export interface CreditPackage {
  productId: string;
  credits: number;
  price: string;
  priceAmount: number;
  displayName: string;
  description: string;
  popular?: boolean;
}

export interface PurchaseCreditResult {
  success: boolean;
  credits?: number;
  error?: string;
  cancelled?: boolean;
}

export const useIAPCredits = () => {
  const { creditProducts, purchaseProduct, isLoading: isIAPLoading } = useIAP();
  const { fetchCredits } = useCredits();
  const [isPurchasing, setIsPurchasing] = useState(false);

  /**
   * Get available credit packages
   */
  const creditPackages = useMemo((): CreditPackage[] => {
    return creditProducts.map((product) => {
      const metadata = CREDIT_PRODUCT_METADATA[product.productId];
      const credits = getCreditsFromProductId(product.productId) || 0;

      return {
        productId: product.productId,
        credits,
        price: product.price,
        priceAmount: product.priceAmount,
        displayName: metadata?.displayName || product.title,
        description: metadata?.description || product.description,
        popular: metadata?.popular,
      };
    }).sort((a, b) => a.credits - b.credits); // Sort by credit amount
  }, [creditProducts]);

  /**
   * Get packages for specific tier
   */
  const getPackagesForTier = useCallback((tier: 'BASIC' | 'PROFESSIONAL'): CreditPackage[] => {
    return creditPackages.filter((pkg) => {
      const metadata = CREDIT_PRODUCT_METADATA[pkg.productId];
      return metadata?.tier === tier;
    });
  }, [creditPackages]);

  /**
   * Purchase credits
   */
  const purchaseCredits = useCallback(async (
    productId: string,
    source?: string
  ): Promise<PurchaseCreditResult> => {
    setIsPurchasing(true);

    try {
      const credits = getCreditsFromProductId(productId);
      const product = creditPackages.find((p) => p.productId === productId);

      console.log('[useIAPCredits] Purchasing credits:', { productId, credits });

      // Track purchase initiated
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_INITIATED, {
        product_id: productId,
        credits: credits,
        source: source || 'unknown',
        payment_method: 'iap',
      });

      // Make purchase
      const result = await purchaseProduct(productId);

      if (!result.success) {
        if (result.cancelled) {
          console.log('[useIAPCredits] Purchase cancelled');
          
          // Track cancellation
          mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_CANCELLED, {
            product_id: productId,
            credits: credits,
            source: source || 'unknown',
          });

          return {
            success: false,
            cancelled: true,
          };
        }

        throw new Error(result.error || 'Purchase failed');
      }

      console.log('[useIAPCredits] Purchase successful');

      // Track purchase success
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_SUCCESS, {
        product_id: productId,
        credits: credits,
        amount: product?.priceAmount,
        source: source || 'unknown',
        payment_method: 'iap',
      });

      // Refresh credits to get updated balance
      await fetchCredits();

      // Show success message
      Alert.alert(
        'Purchase Successful',
        `${credits?.toLocaleString()} credits have been added to your account!`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        credits: credits,
      };
    } catch (err: any) {
      console.error('[useIAPCredits] Purchase error:', err);

      // Track purchase error
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_FAILED, {
        product_id: productId,
        error: err.message,
        source: source || 'unknown',
      });

      // Show error message
      Alert.alert(
        'Purchase Failed',
        err.message || 'Unable to complete purchase. Please try again.',
        [{ text: 'OK' }]
      );

      return {
        success: false,
        error: err.message || 'Purchase failed',
      };
    } finally {
      setIsPurchasing(false);
    }
  }, [creditPackages, purchaseProduct, fetchCredits]);

  /**
   * Get package by credits amount
   */
  const getPackageByCredits = useCallback((credits: number): CreditPackage | undefined => {
    return creditPackages.find((pkg) => pkg.credits === credits);
  }, [creditPackages]);

  /**
   * Get package by product ID
   */
  const getPackageById = useCallback((productId: string): CreditPackage | undefined => {
    return creditPackages.find((pkg) => pkg.productId === productId);
  }, [creditPackages]);

  return {
    creditPackages,
    isPurchasing: isPurchasing || isIAPLoading,
    purchaseCredits,
    getPackagesForTier,
    getPackageByCredits,
    getPackageById,
  };
};

export default useIAPCredits;

