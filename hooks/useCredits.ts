import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/ApiClient';
import { getToken } from '@/utils/SecureTokenManager';
import { formatAuthHeader } from '@/utils/AuthHelpers';

export interface CreditBalance {
  remaining_credits: number;
  subscription_credits: number;
  custom_credits: number;
  total_allowed: number;
  interval_days: number;
  limit_reset_time: string;
  credits_limit: number;
}

export interface CreditPurchasePackage {
  amount: number;
  cost: number;
  label: string;
  popular?: boolean;
}

export const CREDITS_PER_DOLLAR = 50;

// Credit packages based on account type (following web implementation)
export const CREDIT_PACKAGES = {
  BASIC: [
    { amount: 500, cost: 10, label: '$10 = 500 Credits' },
    { amount: 1500, cost: 25, label: '$25 = 1,500 Credits', popular: true },
    { amount: 2500, cost: 50, label: '$50 = 2,500 Credits' },
    { amount: 5000, cost: 100, label: '$100 = 5,000 Credits' },
  ],
  PROFESSIONAL: [
    { amount: 2500, cost: 50, label: '$50 = 2,500 Credits' },
    { amount: 5000, cost: 100, label: '$100 = 5,000 Credits', popular: true },
    { amount: 10000, cost: 200, label: '$200 = 10,000 Credits' },
    { amount: 15000, cost: 300, label: '$300 = 15,000 Credits' },
  ]
} as const;

export type AccountType = 'BASIC' | 'PROFESSIONAL';

export const useCredits = () => {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      await api.setAuthToken(token);
      
      const response = await api.get<CreditBalance>('/remaining-chat-limit');
      
      if (response.ok && response.data) {
        setCredits(response.data);
      } else {
        throw new Error(response.problem || 'Failed to fetch credits');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch credits';
      setError(errorMessage);
      console.error('[useCredits] Error fetching credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const purchaseCredits = useCallback(async (creditAmount: number, cost: number) => {
    setIsPurchasing(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      await api.setAuthToken(token);

      const response = await api.post('/purchase-custom-credit-init', {
        credits: creditAmount,
        credit_cost: cost,
      });

      if (response.ok && response.data) {
        const data = response.data as any;
        
        // If completed (user has default payment method), refetch credits
        if (data.completed) {
          await fetchCredits();
          return {
            success: true,
            completed: true,
            message: 'Credits purchased successfully',
          };
        }
        
        // If checkout URL is provided, user needs to complete payment on web
        if (data.checkout_url) {
          return {
            success: true,
            completed: false,
            checkoutUrl: data.checkout_url,
            message: 'Redirecting to payment...',
          };
        }

        throw new Error('Unexpected response from server');
      } else {
        throw new Error(response.problem || 'Failed to purchase credits');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to purchase credits';
      setError(errorMessage);
      console.error('[useCredits] Error purchasing credits:', err);
      return {
        success: false,
        completed: false,
        message: errorMessage,
      };
    } finally {
      setIsPurchasing(false);
    }
  }, [fetchCredits]);

  // Auto-fetch on mount
  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  return {
    credits,
    isLoading,
    error,
    isPurchasing,
    fetchCredits,
    purchaseCredits,
  };
};

