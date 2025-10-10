import { useState, useEffect, useCallback } from 'react';
import api from '@/utils/ApiClient';
import { getToken } from '@/utils/SecureTokenManager';

export type SubscriptionTier = 
  | 'FREE' 
  | 'PRO' 
  | 'PERSONAL' 
  | 'BUSINESS' 
  | 'TEAM' 
  | 'AIIME_FREE' 
  | 'AIIME_PRO' 
  | 'AIIME_ELITE';

export interface Subscription {
  tier: SubscriptionTier;
  next_tier?: SubscriptionTier | null;
  starts_at?: string | null;
  expires_at?: string | null;
  quantity?: number;
}

export const useSubscription = () => {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      await api.setAuthToken(token);
      
      const response = await api.get<Subscription>('/subscription/current-subscription');
      
      if (response.ok && response.data) {
        setSubscription(response.data);
      } else {
        throw new Error(response.problem || 'Failed to fetch subscription');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch subscription';
      setError(errorMessage);
      console.error('[useSubscription] Error fetching subscription:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    subscription,
    isLoading,
    error,
    refetchSubscription: fetchSubscription,
  };
};

