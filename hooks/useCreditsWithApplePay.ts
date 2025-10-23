import { useState, useCallback, useEffect } from 'react';
import { Alert, Platform } from 'react-native';
import { applePayService } from '../utils/ApplePayService';
import { useCredits } from './useCredits';
import apiClient from '../utils/ApiClient';

export interface ApplePayPurchaseOptions {
  creditAmount: number;
  cost: number;
  useApplePay?: boolean;
}

export interface ApplePayPurchaseResult {
  success: boolean;
  completed: boolean;
  message: string;
  checkoutUrl?: string;
}

/**
 * Enhanced credits hook with Apple Pay support
 * Extends the base useCredits hook with Apple Pay functionality
 */
export const useCreditsWithApplePay = () => {
  const baseCredits = useCredits();
  const [isApplePaySupported, setIsApplePaySupported] = useState<boolean>(false);
  const [isProcessingApplePay, setIsProcessingApplePay] = useState<boolean>(false);
  const [applePayAvailability, setApplePayAvailability] = useState({
    isSupported: false,
    canMakePayments: false,
    isAvailable: false,
  });

  // Check Apple Pay support on hook initialization
  useEffect(() => {
    const checkApplePaySupport = async () => {
      if (Platform.OS === 'ios') {
        try {
          const availability = await applePayService.checkAvailability();
          setApplePayAvailability(availability);
          setIsApplePaySupported(availability.isAvailable);
          
          console.log('[useCreditsWithApplePay] Apple Pay availability:', availability);
        } catch (error) {
          console.error('[useCreditsWithApplePay] Failed to check Apple Pay availability:', error);
          setIsApplePaySupported(false);
        }
      }
    };
    
    checkApplePaySupport();
  }, []);

  /**
   * Purchase credits with Apple Pay integration
   */
  const purchaseCreditsWithApplePay = useCallback(async (
    options: ApplePayPurchaseOptions
  ): Promise<ApplePayPurchaseResult> => {
    const { creditAmount, cost, useApplePay = true } = options;

    console.log('[useCreditsWithApplePay] Purchase request:', {
      creditAmount,
      cost,
      useApplePay,
      isApplePaySupported,
    });

    // Fall back to regular purchase if Apple Pay not requested/supported
    if (!useApplePay || !isApplePaySupported) {
      console.log('[useCreditsWithApplePay] Using regular purchase flow');
      const result = await baseCredits.purchaseCredits(creditAmount, cost);
      return {
        success: result.success,
        completed: result.completed,
        message: result.message,
        checkoutUrl: result.checkoutUrl,
      };
    }

    setIsProcessingApplePay(true);

    try {
      console.log('[useCreditsWithApplePay] Starting Apple Pay flow');

      // Step 1: Create payment intent on backend
      const response = await apiClient.post('/apple-pay/purchase-custom-credit-init', {
        credits: creditAmount,
        credit_cost: cost,
        payment_method_type: 'apple_pay',
      });

      if (!response.ok || !response.data) {
        throw new Error('Failed to initialize Apple Pay payment');
      }

      const { client_secret, payment_intent_id } = response.data as any;
      console.log('[useCreditsWithApplePay] Payment intent created:', payment_intent_id);

      // Step 2: Present Apple Pay sheet
      const applePayResult = await applePayService.presentApplePay({
        amount: cost,
        currency: 'USD',
        description: `${creditAmount} Credits`,
        merchantIdentifier: applePayService.getMerchantIdentifier(),
      });

      if (!applePayResult.success) {
        if (applePayResult.error?.includes('cancelled') || applePayResult.error?.includes('cancel')) {
          console.log('[useCreditsWithApplePay] User cancelled Apple Pay');
          return {
            success: false,
            completed: false,
            message: 'Payment cancelled',
          };
        }
        throw new Error(applePayResult.error || 'Apple Pay failed');
      }

      console.log('[useCreditsWithApplePay] Apple Pay sheet completed');

      // Step 3: Confirm payment with Stripe
      const confirmResult = await applePayService.confirmApplePayPayment(
        client_secret,
        applePayResult.paymentMethod
      );

      if (!confirmResult.success) {
        throw new Error(confirmResult.error || 'Payment confirmation failed');
      }

      console.log('[useCreditsWithApplePay] Payment confirmed with Stripe');

      // Step 4: Verify payment completion on backend
      const verifyResponse = await apiClient.post('/apple-pay/verify-payment', {
        payment_intent_id,
        credits: creditAmount,
      });

      if (!verifyResponse.ok) {
        throw new Error('Payment verification failed');
      }

      console.log('[useCreditsWithApplePay] Payment verified on backend');

      // Step 5: Refresh credit balance
      await baseCredits.fetchCredits();

      // Show success alert
      Alert.alert(
        'Success! 🎉',
        `${creditAmount} credits have been added to your account.`,
        [{ text: 'OK' }]
      );

      return {
        success: true,
        completed: true,
        message: 'Credits purchased successfully with Apple Pay',
      };

    } catch (error) {
      console.error('[useCreditsWithApplePay] Purchase failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      // Don't show alert for cancellation
      if (!errorMessage.toLowerCase().includes('cancel')) {
        Alert.alert(
          'Payment Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      }

      return {
        success: false,
        completed: false,
        message: errorMessage,
      };

    } finally {
      setIsProcessingApplePay(false);
    }
  }, [baseCredits, isApplePaySupported]);

  /**
   * Check if Apple Pay is available for the given amount
   */
  const canUseApplePayForAmount = useCallback((amount: number): boolean => {
    // Apple Pay typically has limits, but for our use case (max $300), it should be fine
    return isApplePaySupported && amount <= 1000; // $1000 limit for safety
  }, [isApplePaySupported]);

  /**
   * Get Apple Pay availability status with detailed info
   */
  const getApplePayStatus = useCallback(() => {
    return {
      ...applePayAvailability,
      isProcessing: isProcessingApplePay,
      merchantId: applePayService.getMerchantIdentifier(),
    };
  }, [applePayAvailability, isProcessingApplePay]);

  return {
    // Base credits functionality
    ...baseCredits,
    
    // Apple Pay specific functionality
    isApplePaySupported,
    isProcessingApplePay,
    applePayAvailability,
    purchaseCreditsWithApplePay,
    canUseApplePayForAmount,
    getApplePayStatus,
  };
};

export default useCreditsWithApplePay;

