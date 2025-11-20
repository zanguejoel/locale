/**
 * Credits Context Provider
 * 
 * Provides global credit state management across the app.
 * This ensures all components see the same, up-to-date credit balance.
 * 
 * Key Features:
 * - Single source of truth for credit balance
 * - Automatic refresh after operations
 * - Shared state across all components
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import api from '@/utils/ApiClient';
import { getToken } from '@/utils/SecureTokenManager';
import { useAuth } from '@/hooks/useAuth';
import { storage } from '@/hooks/useMMKVStorage';

export interface CreditBalance {
  remaining_credits: number;
  subscription_credits: number;
  custom_credits: number;
  total_allowed: number;
  interval_days: number;
  limit_reset_time: string;
  credits_limit: number;
}

interface CreditsContextType {
  credits: CreditBalance | null;
  isLoading: boolean;
  error: string | null;
  fetchCredits: () => Promise<void>;
  refetchCredits: () => Promise<void>; // Alias for fetchCredits
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track the current team ID to detect changes
  const currentTeamIdRef = useRef<string | null>(null);

  /**
   * Fetch credits balance from the API
   * 
   * Configured to always fetch fresh data (equivalent to React Query's staleTime: 0)
   * This ensures credit balance is always accurate when checking after operations.
   */
  const fetchCredits = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token');
      }

      await api.setAuthToken(token);
      
      const response = await api.get<CreditBalance>(`/remaining-chat-limit${ storage.getString('selectedTeamId') && storage.getString('selectedTeamId') !== 'personal-account' ? `?team_id=${storage.getString('selectedTeamId')}` : ''}`);
      
      if (response.ok && response.data) {
        setCredits(response.data);
        console.log('[CreditsContext] Credits updated:', response.data.remaining_credits);
      } else {
        throw new Error(response.problem || 'Failed to fetch credits');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch credits';
      setError(errorMessage);
      console.error('[CreditsContext] Error fetching credits:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Alias for backward compatibility
  const refetchCredits = fetchCredits;

  // Reset credits state when user logs out
  useEffect(() => {
    if (!user) {
      console.log('[CreditsContext] User logged out - clearing credits state');
      setCredits(null);
      setError(null);
    }
  }, [user]);

  // Auto-fetch on mount or when user logs in
  useEffect(() => {
    if (user) {
      fetchCredits();
    }
  }, [user, fetchCredits]);

  // Monitor team changes and refetch credits automatically
  useEffect(() => {
    if (!user) return;

    // Set up an interval to check for team changes
    const checkTeamChange = () => {
      const currentTeamId = storage.getString('selectedTeamId');
      
      if (currentTeamId != currentTeamIdRef.current) {
        console.log('[CreditsContext] Team changed from', currentTeamIdRef.current, 'to', currentTeamId);
        currentTeamIdRef.current = currentTeamId || null;
        
        // Refetch credits for the new team
        fetchCredits();
      }
    };

    // Initialize with current team
    currentTeamIdRef.current = storage.getString('selectedTeamId') || null;

    // Check for team changes every 500ms (fast enough to feel instant)
    const intervalId = setInterval(checkTeamChange, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [user, fetchCredits]);

  const value = {
    credits,
    isLoading,
    error,
    fetchCredits,
    refetchCredits,
  };

  return (
    <CreditsContext.Provider value={value}>
      {children}
    </CreditsContext.Provider>
  );
};

/**
 * Hook to access credits from any component
 * 
 * Returns the global credit state that's shared across all components.
 * All components using this hook will see the same credit balance.
 */
export const useCreditsContext = () => {
  const context = useContext(CreditsContext);
  if (context === undefined) {
    throw new Error('useCreditsContext must be used within a CreditsProvider');
  }
  return context;
};

