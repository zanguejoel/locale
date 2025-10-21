/**
 * Integration Service
 * 
 * Service layer for managing third-party integrations
 * Handles all API calls related to integrations
 */

import apiClient from './ApiClient';
import { 
  Integration, 
  IntegrationConnection,
  IntegrationPaymentResponse,
  IntegrationError 
} from '@/types/integrations';

class IntegrationService {
  /**
   * Get all available integrations for the user/team
   */
  async getAllIntegrations(teamId?: number): Promise<Integration[]> {
    try {
      const params: any = {};
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.get<Integration[]>('/integrations/all', params);
      
      if (response.ok && response.data) {
        console.log('[IntegrationService] Fetched integrations:', response.data.length);
        return response.data;
      }
      
      throw new Error('Failed to fetch integrations');
    } catch (error: any) {
      console.error('[IntegrationService] getAllIntegrations error:', error);
      throw error;
    }
  }

  /**
   * Get a specific integration by ID
   */
  async getIntegrationById(integrationId: number, teamId?: number): Promise<Integration | null> {
    try {
      const params: any = {};
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.get<Integration>(
        `/integrations/${integrationId}`,
        params
      );
      
      if (response.ok && response.data) {
        return response.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('[IntegrationService] getIntegrationById error:', error);
      return null;
    }
  }

  /**
   * Get user's connected integrations (returns array of str_ids)
   */
  async getUserConnections(teamId?: number): Promise<string[]> {
    try {
      const params: any = {};
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.get<string[]>(
        '/nango/user-integration/connections',
        params
      );
      
      if (response.ok && response.data) {
        console.log('[IntegrationService] Fetched connections:', response.data.length);
        return response.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('[IntegrationService] getUserConnections error:', error);
      return [];
    }
  }

  /**
   * Configure integration settings (API keys, URLs, etc.)
   */
  async configureIntegration(
    integrationId: number,
    settings: any,
    teamId?: number
  ): Promise<void> {
    try {
      const response = await apiClient.post(
        `/integrations/${integrationId}/settings`,
        { settings },
        { 
          params: { 
            team_id: teamId !== undefined && teamId !== null ? teamId : null 
          } 
        }
      );
      
      if (!response.ok) {
        const errorData = response.data as any;
        throw new Error(errorData?.detail || 'Failed to configure integration');
      }
      
      console.log('[IntegrationService] Integration configured successfully');
    } catch (error: any) {
      console.error('[IntegrationService] configureIntegration error:', error);
      throw error;
    }
  }

  /**
   * Toggle integration enabled/disabled status
   */
  async toggleIntegration(integrationId: number, teamId?: number): Promise<boolean> {
    try {
      const params: any = { 
        integration_id: integrationId
      };
      
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.get(
        `/integrations/${integrationId}/switch-activation`,
        params
      );
      
      if (response.ok && response.data) {
        const data = response.data as any;
        console.log('[IntegrationService] Integration toggled:', data.is_active);
        return data.is_active || false;
      }
      
      throw new Error('Failed to toggle integration');
    } catch (error: any) {
      console.error('[IntegrationService] toggleIntegration error:', error);
      throw error;
    }
  }

  /**
   * Disconnect integration (remove credentials)
   */
  async disconnectIntegration(integrationId: number, teamId?: number): Promise<void> {
    try {
      const response = await apiClient.delete(
        `/integrations/${integrationId}/credentials`,
        { 
          params: { 
            team_id: teamId !== undefined && teamId !== null ? teamId : null 
          } 
        }
      );
      
      if (!response.ok) {
        const errorData = response.data as any;
        throw new Error(errorData?.detail || 'Failed to disconnect integration');
      }
      
      console.log('[IntegrationService] Integration disconnected successfully');
    } catch (error: any) {
      console.error('[IntegrationService] disconnectIntegration error:', error);
      throw error;
    }
  }

  /**
   * Initiate integration subscription payment (Stripe)
   */
  async initiateIntegrationPayment(
    integrationIds: number[],
    teamId?: number
  ): Promise<IntegrationPaymentResponse> {
    try {
      const response = await apiClient.post<IntegrationPaymentResponse>(
        '/subscription/initiate-integration-payment',
        {
          integration_ids: integrationIds,
          team_id: teamId !== undefined && teamId !== null ? teamId : null
        }
      );
      
      if (response.ok && response.data) {
        console.log('[IntegrationService] Payment initiated');
        return response.data;
      }
      
      throw new Error('Failed to initiate payment');
    } catch (error: any) {
      console.error('[IntegrationService] initiateIntegrationPayment error:', error);
      throw error;
    }
  }

  /**
   * Cancel integration subscription
   */
  async cancelIntegrationSubscription(
    integrationIds: number[],
    reason?: string,
    teamId?: number
  ): Promise<void> {
    try {
      const response = await apiClient.post(
        '/subscription/cancel-integration-subscription',
        {
          integration_ids: integrationIds,
          team_id: teamId !== undefined && teamId !== null ? teamId : null,
          cancellation_reason: reason || ''
        }
      );
      
      if (!response.ok) {
        const errorData = response.data as any;
        throw new Error(errorData?.detail || 'Failed to cancel subscription');
      }
      
      console.log('[IntegrationService] Subscription cancelled successfully');
    } catch (error: any) {
      console.error('[IntegrationService] cancelIntegrationSubscription error:', error);
      throw error;
    }
  }

  /**
   * Helper: Check if integration is OAuth type
   */
  isOAuthIntegration(integration: Integration): boolean {
    return integration.authType === 'oauth';
  }

  /**
   * Helper: Check if integration is API key type
   */
  isApiKeyIntegration(integration: Integration): boolean {
    return integration.authType === 'apiKey';
  }

  /**
   * Helper: Get integration display name
   */
  getIntegrationDisplayName(integration: Integration): string {
    return integration.integration_name || integration.str_id;
  }
}

// Export singleton instance
export default new IntegrationService();

