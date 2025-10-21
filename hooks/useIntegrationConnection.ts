/**
 * useIntegrationConnection Hook
 * 
 * Hook for connecting OAuth integrations
 * Handles OAuth flow with Nango
 */

import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import NangoService from '@/utils/NangoService';
import { Integration } from '@/types/integrations';
import { useIntegrations } from '@/contexts/IntegrationsContext';

export interface UseIntegrationConnectionResult {
  connecting: boolean;
  error: string | null;
  connectOAuthIntegration: (integration: Integration, teamId?: number) => Promise<boolean>;
  clearError: () => void;
}

/**
 * Hook for managing integration connections
 */
export function useIntegrationConnection(): UseIntegrationConnectionResult {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshConnections } = useIntegrations();

  /**
   * Connect an OAuth integration
   * Opens browser for OAuth flow
   */
  const connectOAuthIntegration = async (
    integration: Integration,
    teamId?: number
  ): Promise<boolean> => {
    setConnecting(true);
    setError(null);
    
    try {
      console.log('[useIntegrationConnection] Starting OAuth for:', integration.str_id);
      
      // Step 1: Create Nango connect session
      const session = await NangoService.createConnectSession(
        integration.str_id,
        teamId
      );

      if (!session.success || !session.authorization_url) {
        const errorMsg = session.error || 'Failed to create connection session';
        console.error('[useIntegrationConnection] Session creation failed:', errorMsg);
        setError(errorMsg);
        return false;
      }

      console.log('[useIntegrationConnection] Opening OAuth URL...');
      
      // Step 2: Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        session.authorization_url,
        NangoService.buildOAuthRedirectUrl()
      );

      console.log('[useIntegrationConnection] OAuth result type:', result.type);

      if (result.type === 'success' && result.url) {
        // Step 3: Parse callback URL
        const params = NangoService.parseOAuthCallback(result.url);
        console.log('[useIntegrationConnection] Callback params:', params);

        if (params.status === 'success' && params.connection_id) {
          // Step 4: Store connection
          console.log('[useIntegrationConnection] Storing connection...');
          const stored = await NangoService.storeConnectionId(
            params.connection_id,
            integration.str_id,
            teamId
          );

          if (stored) {
            // Step 5: Refresh connections
            console.log('[useIntegrationConnection] Connection successful, refreshing...');
            await refreshConnections(teamId);
            return true;
          } else {
            setError('Failed to store connection');
            return false;
          }
        } else {
          const errorMsg = params.error || 'Connection failed or was cancelled';
          console.error('[useIntegrationConnection] OAuth callback error:', errorMsg);
          setError(errorMsg);
          return false;
        }
      } else if (result.type === 'cancel') {
        console.log('[useIntegrationConnection] User cancelled OAuth');
        setError('Connection cancelled');
        return false;
      } else if (result.type === 'dismiss') {
        console.log('[useIntegrationConnection] OAuth dismissed');
        setError('Connection dismissed');
        return false;
      }

      return false;
    } catch (err: any) {
      console.error('[useIntegrationConnection] Error:', err);
      setError(err.message || 'Failed to connect integration');
      return false;
    } finally {
      setConnecting(false);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  return {
    connecting,
    error,
    connectOAuthIntegration,
    clearError,
  };
}

export default useIntegrationConnection;

