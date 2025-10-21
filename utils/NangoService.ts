/**
 * Nango Service
 * 
 * Service layer for Nango OAuth integration management
 * Handles OAuth flows for third-party services
 */

import apiClient from './ApiClient';
import { 
  NangoIntegration, 
  NangoSessionResponse,
  CrmSettings,
  CrmSettingType
} from '@/types/integrations';

class NangoService {
  /**
   * Get all integrations available through Nango
   */
  async getNangoIntegrations(): Promise<NangoIntegration[]> {
    try {
      const response = await apiClient.get<{ success: boolean; data: NangoIntegration[] }>(
        '/nango/integrations'
      );
      
      if (response.ok && response.data?.data) {
        console.log('[NangoService] Fetched Nango integrations:', response.data.data.length);
        return response.data.data;
      }
      
      return [];
    } catch (error: any) {
      console.error('[NangoService] getNangoIntegrations error:', error);
      return [];
    }
  }

  /**
   * Create Nango connect session (get OAuth URL)
   */
  async createConnectSession(
    providerId: string,
    teamId?: number
  ): Promise<NangoSessionResponse> {
    try {
      const body: any = {
        integration_id: providerId
      };
      
      if (teamId !== undefined && teamId !== null) {
        body.team_id = teamId;
      }

      const response = await apiClient.post<NangoSessionResponse>(
        '/nango/connect-session',
        body
      );
      
      if (response.ok && response.data) {
        console.log('[NangoService] Connect session created for:', providerId);
        return response.data;
      }
      
      return {
        success: false,
        error: 'Failed to create connect session'
      };
    } catch (error: any) {
      console.error('[NangoService] createConnectSession error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create connect session'
      };
    }
  }

  /**
   * List Nango connections for user
   */
  async listNangoConnections(teamId?: number): Promise<any[]> {
    try {
      const params: any = {};
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.get('/nango/list-connections', params);
      
      if (response.ok && response.data) {
        return response.data as any[];
      }
      
      return [];
    } catch (error: any) {
      console.error('[NangoService] listNangoConnections error:', error);
      return [];
    }
  }

  /**
   * Store Nango connection ID after successful OAuth
   */
  async storeConnectionId(
    connectionId: string,
    providerId: string,
    teamId?: number
  ): Promise<boolean> {
    try {
      const body: any = {
        connection_id: connectionId,
        provider_id: providerId
      };
      
      if (teamId !== undefined && teamId !== null) {
        body.team_id = teamId;
      }

      const response = await apiClient.post('/nango/store-nango-id', body);
      
      if (response.ok) {
        console.log('[NangoService] Connection stored successfully');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('[NangoService] storeConnectionId error:', error);
      return false;
    }
  }

  /**
   * Delete Nango connection
   */
  async deleteConnection(connectionId: string, teamId?: number): Promise<boolean> {
    try {
      const response = await apiClient.delete(`/nango/connection/${connectionId}`, {
        params: {
          team_id: teamId !== undefined && teamId !== null ? teamId : null
        }
      });
      
      if (response.ok) {
        console.log('[NangoService] Connection deleted successfully');
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('[NangoService] deleteConnection error:', error);
      return false;
    }
  }

  /**
   * Update CRM integration settings (contacts/tasks sync)
   */
  async updateCrmSettings(
    strId: string,
    settingType: CrmSettingType,
    isActive: boolean,
    teamId?: number
  ): Promise<boolean> {
    try {
      const params: any = {
        str_id: strId,
        setting_type: settingType,
        is_active: isActive
      };
      
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.patch(
        '/nango/integrations/update-settings',
        {},
        { params }
      );
      
      if (response.ok) {
        console.log('[NangoService] CRM settings updated:', { strId, settingType, isActive });
        return true;
      }
      
      return false;
    } catch (error: any) {
      console.error('[NangoService] updateCrmSettings error:', error);
      return false;
    }
  }

  /**
   * Get CRM integration settings
   */
  async getCrmSettings(teamId?: number): Promise<CrmSettings> {
    try {
      const params: any = {};
      if (teamId !== undefined && teamId !== null) {
        params.team_id = teamId;
      }

      const response = await apiClient.get<CrmSettings>(
        '/nango/integrations/settings',
        params
      );
      
      if (response.ok && response.data) {
        return response.data;
      }
      
      return {};
    } catch (error: any) {
      console.error('[NangoService] getCrmSettings error:', error);
      return {};
    }
  }

  /**
   * Helper: Build OAuth redirect URL for mobile
   */
  buildOAuthRedirectUrl(): string {
    return 'odyssey://integrations/callback';
  }

  /**
   * Helper: Parse OAuth callback URL parameters
   */
  parseOAuthCallback(url: string): {
    status?: string;
    connection_id?: string;
    error?: string;
    provider?: string;
  } {
    try {
      const urlObj = new URL(url);
      const params = urlObj.searchParams;
      
      return {
        status: params.get('status') || undefined,
        connection_id: params.get('connection_id') || undefined,
        error: params.get('error') || undefined,
        provider: params.get('provider') || undefined
      };
    } catch (error) {
      console.error('[NangoService] Failed to parse callback URL:', error);
      return {};
    }
  }
}

// Export singleton instance
export default new NangoService();

