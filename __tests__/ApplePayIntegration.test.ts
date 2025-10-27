/**
 * Apple Pay Integration Tests
 * 
 * This test suite covers the Apple Pay functionality including:
 * - Apple Pay service functionality
 * - Credits hook with Apple Pay
 * - Payment flow integration
 * - Error handling scenarios
 */

import { jest } from '@jest/globals';
import { Platform } from 'react-native';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { applePayService } from '../utils/ApplePayService';
import { useCreditsWithApplePay } from '../hooks/useCreditsWithApplePay';

// Mock dependencies
jest.mock('@stripe/stripe-react-native', () => ({
  ApplePay: {
    isApplePaySupported: jest.fn(),
    canAddCardToWallet: jest.fn(),
    presentApplePay: jest.fn(),
    confirmApplePayPayment: jest.fn(),
  },
  ApplePayButton: jest.fn(),
  ApplePayButtonType: {
    Buy: 'buy',
    Subscribe: 'subscribe',
  },
  ApplePayButtonStyle: {
    Black: 'black',
    White: 'white',
  },
}));

jest.mock('../utils/ApiClient', () => ({
  post: jest.fn(),
  setAuthToken: jest.fn(),
}));

jest.mock('../hooks/useCredits', () => ({
  useCredits: jest.fn(),
}));

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
  Alert: {
    alert: jest.fn(),
  },
}));

// Import mocked modules
import { ApplePay } from '@stripe/stripe-react-native';
import apiClient from '../utils/ApiClient';
import { useCredits } from '../hooks/useCredits';
import { Alert } from 'react-native';

describe('ApplePayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isApplePaySupported', () => {
    it('should return true when Apple Pay is supported on iOS', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      
      const result = await applePayService.isApplePaySupported();
      
      expect(result).toBe(true);
      expect(ApplePay.isApplePaySupported).toHaveBeenCalled();
    });

    it('should return false on non-iOS platforms', async () => {
      (Platform as any).OS = 'android';
      
      const result = await applePayService.isApplePaySupported();
      
      expect(result).toBe(false);
      expect(ApplePay.isApplePaySupported).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockRejectedValue(new Error('Test error'));
      
      const result = await applePayService.isApplePaySupported();
      
      expect(result).toBe(false);
    });
  });

  describe('canMakePayments', () => {
    it('should return true when user can make payments', async () => {
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);
      
      const result = await applePayService.canMakePayments();
      
      expect(result).toBe(true);
      expect(ApplePay.canAddCardToWallet).toHaveBeenCalled();
    });

    it('should return false when user cannot make payments', async () => {
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(false);
      
      const result = await applePayService.canMakePayments();
      
      expect(result).toBe(false);
    });
  });

  describe('presentApplePay', () => {
    const mockRequest = {
      amount: 25.0,
      currency: 'USD',
      description: '1500 Credits',
      merchantIdentifier: 'merchant.com.neptunetech.odyssey',
    };

    it('should successfully present Apple Pay sheet', async () => {
      const mockPaymentMethod = { id: 'pm_test_123' };
      (ApplePay.presentApplePay as jest.Mock).mockResolvedValue({
        error: null,
        paymentMethod: mockPaymentMethod,
      });

      const result = await applePayService.presentApplePay(mockRequest);

      expect(result.success).toBe(true);
      expect(result.paymentMethod).toEqual(mockPaymentMethod);
      expect(ApplePay.presentApplePay).toHaveBeenCalledWith({
        cartItems: [
          {
            label: '1500 Credits',
            amount: '25',
            paymentType: 'Immediate',
          },
        ],
        country: 'US',
        currency: 'USD',
        merchantIdentifier: 'merchant.com.neptunetech.odyssey',
        requiredShippingAddressFields: [],
        requiredBillingContactFields: [],
      });
    });

    it('should handle Apple Pay errors', async () => {
      (ApplePay.presentApplePay as jest.Mock).mockResolvedValue({
        error: { message: 'User cancelled' },
        paymentMethod: null,
      });

      const result = await applePayService.presentApplePay(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User cancelled');
    });

    it('should handle exceptions', async () => {
      (ApplePay.presentApplePay as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await applePayService.presentApplePay(mockRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('confirmApplePayPayment', () => {
    const mockClientSecret = 'pi_test_123_secret';
    const mockPaymentMethod = { id: 'pm_test_123' };

    it('should successfully confirm payment', async () => {
      const mockPaymentIntent = { id: 'pi_test_123', status: 'succeeded' };
      (ApplePay.confirmApplePayPayment as jest.Mock).mockResolvedValue({
        error: null,
        paymentIntent: mockPaymentIntent,
      });

      const result = await applePayService.confirmApplePayPayment(mockClientSecret, mockPaymentMethod);

      expect(result.success).toBe(true);
      expect(result.paymentMethod).toEqual(mockPaymentIntent);
      expect(ApplePay.confirmApplePayPayment).toHaveBeenCalledWith(mockClientSecret);
    });

    it('should handle confirmation errors', async () => {
      (ApplePay.confirmApplePayPayment as jest.Mock).mockResolvedValue({
        error: { message: 'Payment failed' },
        paymentIntent: null,
      });

      const result = await applePayService.confirmApplePayPayment(mockClientSecret, mockPaymentMethod);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Payment failed');
    });
  });

  describe('checkAvailability', () => {
    it('should return full availability status', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);

      const result = await applePayService.checkAvailability();

      expect(result).toEqual({
        isSupported: true,
        canMakePayments: true,
        isAvailable: true,
      });
    });

    it('should handle partial availability', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(false);

      const result = await applePayService.checkAvailability();

      expect(result).toEqual({
        isSupported: true,
        canMakePayments: false,
        isAvailable: false,
      });
    });
  });
});

describe('useCreditsWithApplePay', () => {
  const mockBaseCredits = {
    credits: { remaining_credits: 100, subscription_credits: 50, custom_credits: 50 },
    isLoading: false,
    error: null,
    isPurchasing: false,
    fetchCredits: jest.fn(),
    purchaseCredits: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useCredits as jest.Mock).mockReturnValue(mockBaseCredits);
    (Platform as any).OS = 'ios';
  });

  it('should initialize with Apple Pay availability check', async () => {
    (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
    (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);

    const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());

    await waitForNextUpdate();

    expect(result.current.isApplePaySupported).toBe(true);
    expect(result.current.applePayAvailability.isAvailable).toBe(true);
  });

  it('should handle Apple Pay not supported', async () => {
    (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(false);

    const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());

    await waitForNextUpdate();

    expect(result.current.isApplePaySupported).toBe(false);
    expect(result.current.applePayAvailability.isAvailable).toBe(false);
  });

  describe('purchaseCreditsWithApplePay', () => {
    it('should successfully complete Apple Pay purchase', async () => {
      // Setup mocks
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);
      
      (apiClient.post as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          data: {
            client_secret: 'pi_test_123_secret',
            payment_intent_id: 'pi_test_123',
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          data: { status: 'success' },
        });

      (ApplePay.presentApplePay as jest.Mock).mockResolvedValue({
        error: null,
        paymentMethod: { id: 'pm_test_123' },
      });

      (ApplePay.confirmApplePayPayment as jest.Mock).mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
      });

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate(); // Wait for Apple Pay availability check

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchaseCreditsWithApplePay({
          creditAmount: 1500,
          cost: 25.0,
          useApplePay: true,
        });
      });

      expect(purchaseResult).toEqual({
        success: true,
        completed: true,
        message: 'Credits purchased successfully with Apple Pay',
      });

      expect(apiClient.post).toHaveBeenCalledWith('/apple-pay/purchase-custom-credit-init', {
        credits: 1500,
        credit_cost: 25.0,
        payment_method_type: 'apple_pay',
      });

      expect(mockBaseCredits.fetchCredits).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success! 🎉',
        '1500 credits have been added to your account.',
        [{ text: 'OK' }]
      );
    });

    it('should handle user cancellation gracefully', async () => {
      // Setup mocks
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);
      
      (apiClient.post as jest.Mock).mockResolvedValue({
        ok: true,
        data: {
          client_secret: 'pi_test_123_secret',
          payment_intent_id: 'pi_test_123',
        },
      });

      (ApplePay.presentApplePay as jest.Mock).mockResolvedValue({
        error: { message: 'User cancelled' },
        paymentMethod: null,
      });

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate();

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchaseCreditsWithApplePay({
          creditAmount: 1500,
          cost: 25.0,
          useApplePay: true,
        });
      });

      expect(purchaseResult).toEqual({
        success: false,
        completed: false,
        message: 'Payment cancelled',
      });

      // Should not show error alert for cancellation
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('should fallback to regular purchase when Apple Pay not supported', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(false);
      
      const mockRegularResult = {
        success: true,
        completed: false,
        message: 'Redirecting to checkout',
        checkoutUrl: 'https://checkout.stripe.com/...',
      };
      
      mockBaseCredits.purchaseCredits.mockResolvedValue(mockRegularResult);

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate();

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchaseCreditsWithApplePay({
          creditAmount: 1500,
          cost: 25.0,
          useApplePay: true,
        });
      });

      expect(purchaseResult).toEqual(mockRegularResult);
      expect(mockBaseCredits.purchaseCredits).toHaveBeenCalledWith(1500, 25.0);
    });

    it('should handle payment verification failure', async () => {
      // Setup mocks
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);
      
      (apiClient.post as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          data: {
            client_secret: 'pi_test_123_secret',
            payment_intent_id: 'pi_test_123',
          },
        })
        .mockResolvedValueOnce({
          ok: false,
        });

      (ApplePay.presentApplePay as jest.Mock).mockResolvedValue({
        error: null,
        paymentMethod: { id: 'pm_test_123' },
      });

      (ApplePay.confirmApplePayPayment as jest.Mock).mockResolvedValue({
        error: null,
        paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
      });

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate();

      let purchaseResult;
      await act(async () => {
        purchaseResult = await result.current.purchaseCreditsWithApplePay({
          creditAmount: 1500,
          cost: 25.0,
          useApplePay: true,
        });
      });

      expect(purchaseResult.success).toBe(false);
      expect(purchaseResult.message).toBe('Payment verification failed');
      expect(Alert.alert).toHaveBeenCalledWith(
        'Payment Failed',
        'Payment verification failed',
        [{ text: 'OK' }]
      );
    });
  });

  describe('canUseApplePayForAmount', () => {
    it('should return true for amounts within limit', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate();

      expect(result.current.canUseApplePayForAmount(100)).toBe(true);
      expect(result.current.canUseApplePayForAmount(500)).toBe(true);
    });

    it('should return false for amounts over limit', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
      (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate();

      expect(result.current.canUseApplePayForAmount(1500)).toBe(false);
    });

    it('should return false when Apple Pay not supported', async () => {
      (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(false);

      const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
      
      await waitForNextUpdate();

      expect(result.current.canUseApplePayForAmount(100)).toBe(false);
    });
  });
});

describe('Apple Pay Integration E2E', () => {
  it('should complete full purchase flow', async () => {
    // This would be an integration test that covers the entire flow
    // from modal opening to payment completion
    
    // Mock all dependencies
    (ApplePay.isApplePaySupported as jest.Mock).mockResolvedValue(true);
    (ApplePay.canAddCardToWallet as jest.Mock).mockResolvedValue(true);
    
    // Mock successful API responses
    (apiClient.post as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        data: {
          client_secret: 'pi_test_123_secret',
          payment_intent_id: 'pi_test_123',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        data: { status: 'success', credits_added: 1500 },
      });

    // Mock successful Apple Pay flow
    (ApplePay.presentApplePay as jest.Mock).mockResolvedValue({
      error: null,
      paymentMethod: { id: 'pm_test_123' },
    });

    (ApplePay.confirmApplePayPayment as jest.Mock).mockResolvedValue({
      error: null,
      paymentIntent: { id: 'pi_test_123', status: 'succeeded' },
    });

    const { result, waitForNextUpdate } = renderHook(() => useCreditsWithApplePay());
    
    await waitForNextUpdate();

    // Execute purchase
    let purchaseResult;
    await act(async () => {
      purchaseResult = await result.current.purchaseCreditsWithApplePay({
        creditAmount: 1500,
        cost: 25.0,
        useApplePay: true,
      });
    });

    // Verify successful completion
    expect(purchaseResult.success).toBe(true);
    expect(purchaseResult.completed).toBe(true);
    
    // Verify all API calls were made
    expect(apiClient.post).toHaveBeenCalledTimes(2);
    expect(ApplePay.presentApplePay).toHaveBeenCalledTimes(1);
    expect(ApplePay.confirmApplePayPayment).toHaveBeenCalledTimes(1);
    
    // Verify credit balance was refreshed
    expect(mockBaseCredits.fetchCredits).toHaveBeenCalled();
    
    // Verify success alert was shown
    expect(Alert.alert).toHaveBeenCalledWith(
      'Success! 🎉',
      '1500 credits have been added to your account.',
      [{ text: 'OK' }]
    );
  });
});

