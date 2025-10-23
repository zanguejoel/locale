import { ApplePay } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';

export interface ApplePayRequest {
  amount: number;
  currency: string;
  description: string;
  merchantIdentifier: string;
}

export interface ApplePayResult {
  success: boolean;
  paymentMethod?: any;
  error?: string;
}

/**
 * Apple Pay Service for handling Apple Pay payments
 * Provides a unified interface for Apple Pay functionality
 */
class ApplePayService {
  private merchantIdentifier = 'merchant.com.neptunetech.odyssey';

  /**
   * Check if Apple Pay is supported on the current device
   */
  async isApplePaySupported(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('[ApplePay] Not iOS platform');
      return false;
    }
    
    try {
      const isSupported = await ApplePay.isApplePaySupported();
      console.log('[ApplePay] Support check result:', isSupported);
      return isSupported;
    } catch (error) {
      console.error('[ApplePay] Support check failed:', error);
      return false;
    }
  }

  /**
   * Check if the user can make Apple Pay payments
   */
  async canMakePayments(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('[ApplePay] Not iOS platform');
      return false;
    }
    
    try {
      // Check if user has payment methods set up
      const canMake = await ApplePay.canAddCardToWallet();
      console.log('[ApplePay] Can make payments:', canMake);
      return canMake;
    } catch (error) {
      console.error('[ApplePay] Payment capability check failed:', error);
      return false;
    }
  }

  /**
   * Present the Apple Pay payment sheet
   */
  async presentApplePay(request: ApplePayRequest): Promise<ApplePayResult> {
    console.log('[ApplePay] Presenting Apple Pay with request:', request);
    
    try {
      const { error, paymentMethod } = await ApplePay.presentApplePay({
        cartItems: [
          {
            label: request.description,
            amount: request.amount.toString(),
            paymentType: 'Immediate',
          },
        ],
        country: 'US',
        currency: request.currency,
        merchantIdentifier: this.merchantIdentifier,
        requiredShippingAddressFields: [],
        requiredBillingContactFields: [],
      });

      if (error) {
        console.error('[ApplePay] Presentation failed:', error);
        return { success: false, error: error.message };
      }

      console.log('[ApplePay] Payment method obtained:', paymentMethod?.id);
      return { success: true, paymentMethod };
    } catch (error) {
      console.error('[ApplePay] Presentation exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Confirm Apple Pay payment with Stripe
   */
  async confirmApplePayPayment(
    clientSecret: string, 
    paymentMethod: any
  ): Promise<ApplePayResult> {
    console.log('[ApplePay] Confirming payment with client secret:', clientSecret);
    
    try {
      const { error, paymentIntent } = await ApplePay.confirmApplePayPayment(
        clientSecret
      );

      if (error) {
        console.error('[ApplePay] Confirmation failed:', error);
        return { success: false, error: error.message };
      }

      console.log('[ApplePay] Payment confirmed successfully:', paymentIntent?.id);
      return { success: true, paymentMethod: paymentIntent };
    } catch (error) {
      console.error('[ApplePay] Confirmation exception:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Check Apple Pay availability and capabilities
   */
  async checkAvailability(): Promise<{
    isSupported: boolean;
    canMakePayments: boolean;
    isAvailable: boolean;
  }> {
    const isSupported = await this.isApplePaySupported();
    const canMakePayments = isSupported ? await this.canMakePayments() : false;
    
    return {
      isSupported,
      canMakePayments,
      isAvailable: isSupported && canMakePayments,
    };
  }

  /**
   * Get merchant identifier
   */
  getMerchantIdentifier(): string {
    return this.merchantIdentifier;
  }
}

// Export singleton instance
export const applePayService = new ApplePayService();
export default applePayService;

