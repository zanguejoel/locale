/**
 * Integrations Context
 * 
 * Global state management for integrations
 * Provides integration data, connection status, and actions to all components
 */

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import IntegrationService from '@/utils/IntegrationService';
import NangoService from '@/utils/NangoService';
import { Integration, NangoIntegration, CrmSettings } from '@/types/integrations';
import { storage } from '@/hooks/useMMKVStorage';

interface IntegrationsContextType {
  // State
  integrations: Integration[];
  nangoIntegrations: NangoIntegration[];
  userConnections: string[];
  crmSettings: CrmSettings;
  loading: boolean;
  error: string | null;
  initialized: boolean;
  
  // Actions
  loadIntegrations: (teamId?: number) => Promise<void>;
  connectIntegration: (integration: Integration, teamId?: number) => Promise<void>;
  disconnectIntegration: (integrationId: number, teamId?: number) => Promise<void>;
  configureIntegration: (integrationId: number, settings: any, teamId?: number) => Promise<void>;
  toggleIntegration: (integrationId: number, teamId?: number) => Promise<void>;
  refreshConnections: (teamId?: number) => Promise<void>;
  loadCrmSettings: (teamId?: number) => Promise<void>;
  
  // Helpers
  isIntegrationConnected: (strId: string) => boolean;
  getIntegrationByStrId: (strId: string) => Integration | null;
  getConnectedIntegrations: () => Integration[];
  getIntegrationsByCategory: (category: string) => Integration[];
}

const IntegrationsContext = createContext<IntegrationsContextType | null>(null);

interface IntegrationsProviderProps {
  children: ReactNode;
}

export function IntegrationsProvider({ children }: IntegrationsProviderProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [nangoIntegrations, setNangoIntegrations] = useState<NangoIntegration[]>([]);
  const [userConnections, setUserConnections] = useState<string[]>([]);
  const [crmSettings, setCrmSettings] = useState<CrmSettings>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  /**
   * Load all integrations and connections
   * Matches web app logic - fetches from /nango/integrations and /nango/list-connections
   */
  const loadIntegrations = useCallback(async (teamId?: number) => {
    if (loading) return; // Prevent concurrent loads
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('[IntegrationsContext] Loading integrations...');
      
      // Fetch Nango integrations (matches web app)
      const nangoData = await NangoService.getNangoIntegrations();
      setNangoIntegrations(nangoData);
      console.log('[IntegrationsContext] Loaded Nango integrations:', nangoData.length);
      
      // Fetch user connections (matches web app)
      const connections = await IntegrationService.getUserConnections(teamId);
      setUserConnections(connections);
      console.log('[IntegrationsContext] Loaded connections:', connections.length);
      
      // Also load full integrations list (for additional data if needed)
      const integrationsData = await IntegrationService.getAllIntegrations(teamId);
      setIntegrations(integrationsData);
      console.log('[IntegrationsContext] Loaded integrations:', integrationsData.length);
      
      setInitialized(true);
    } catch (err: any) {
      console.error('[IntegrationsContext] loadIntegrations error:', err);
      setError(err.message || 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * Refresh user connections only (lighter weight)
   */
  const refreshConnections = useCallback(async (teamId?: number) => {
    try {
      console.log('[IntegrationsContext] Refreshing connections...');
      const connections = await IntegrationService.getUserConnections(teamId);
      setUserConnections(connections);
      console.log('[IntegrationsContext] Connections refreshed:', connections.length);
    } catch (err: any) {
      console.error('[IntegrationsContext] refreshConnections error:', err);
    }
  }, []);

  /**
   * Load CRM settings
   */
  const loadCrmSettings = useCallback(async (teamId?: number) => {
    try {
      console.log('[IntegrationsContext] Loading CRM settings...');
      const settings = await NangoService.getCrmSettings(teamId);
      setCrmSettings(settings);
      console.log('[IntegrationsContext] CRM settings loaded');
    } catch (err: any) {
      console.error('[IntegrationsContext] loadCrmSettings error:', err);
    }
  }, []);

  /**
   * Connect an integration (placeholder - actual OAuth handled by components)
   */
  const connectIntegration = useCallback(async (
    integration: Integration,
    teamId?: number
  ) => {
    // This is a placeholder - actual OAuth flow handled by UI components
    // After successful OAuth, they call refreshConnections()
    console.log('[IntegrationsContext] Connect integration triggered:', integration.str_id);
    await refreshConnections(teamId);
  }, [refreshConnections]);

  /**
   * Disconnect an integration
   */
  const disconnectIntegration = useCallback(async (
    integrationId: number,
    teamId?: number
  ) => {
    try {
      console.log('[IntegrationsContext] Disconnecting integration:', integrationId);
      await IntegrationService.disconnectIntegration(integrationId, teamId);
      await refreshConnections(teamId);
      console.log('[IntegrationsContext] Integration disconnected successfully');
    } catch (err: any) {
      console.error('[IntegrationsContext] disconnectIntegration error:', err);
      throw err;
    }
  }, [refreshConnections]);

  /**
   * Configure integration settings
   */
  const configureIntegration = useCallback(async (
    integrationId: number,
    settings: any,
    teamId?: number
  ) => {
    try {
      console.log('[IntegrationsContext] Configuring integration:', integrationId);
      await IntegrationService.configureIntegration(integrationId, settings, teamId);
      console.log('[IntegrationsContext] Integration configured successfully');
      // Optionally reload integrations to get updated config
      // await loadIntegrations(teamId);
    } catch (err: any) {
      console.error('[IntegrationsContext] configureIntegration error:', err);
      throw err;
    }
  }, []);

  /**
   * Toggle integration enabled/disabled
   */
  const toggleIntegration = useCallback(async (
    integrationId: number,
    teamId?: number
  ) => {
    try {
      console.log('[IntegrationsContext] Toggling integration:', integrationId);
      const newStatus = await IntegrationService.toggleIntegration(integrationId, teamId);
      
      // Update local state optimistically
      setIntegrations(prev => prev.map(int => 
        int.id === integrationId 
          ? { ...int, is_active: newStatus }
          : int
      ));
      
      console.log('[IntegrationsContext] Integration toggled:', newStatus);
    } catch (err: any) {
      console.error('[IntegrationsContext] toggleIntegration error:', err);
      throw err;
    }
  }, []);

  /**
   * Check if integration is connected
   */
  const isIntegrationConnected = useCallback((strId: string): boolean => {
    return userConnections.includes(strId);
  }, [userConnections]);

  /**
   * Get integration by str_id
   */
  const getIntegrationByStrId = useCallback((strId: string): Integration | null => {
    return integrations.find(int => int.str_id === strId) || null;
  }, [integrations]);

  /**
   * Get all connected integrations
   */
  const getConnectedIntegrations = useCallback((): Integration[] => {
    return integrations.filter(int => userConnections.includes(int.str_id));
  }, [integrations, userConnections]);

  /**
   * Get integrations by category (helper for filtering)
   */
  const getIntegrationsByCategory = useCallback((category: string): Integration[] => {
    if (category === 'all') {
      return integrations;
    }
    if (category === 'connected') {
      return getConnectedIntegrations();
    }
    
    // TODO: Implement category filtering based on integration str_id patterns
    // For now, return all
    return integrations;
  }, [integrations, getConnectedIntegrations]);

  // Initialize on mount
  useEffect(() => {
    // Get team ID from storage
    const teamIdStr = storage.getString('selectedTeamId');
    const teamId = teamIdStr ? parseInt(teamIdStr) : undefined;
    
    console.log('[IntegrationsContext] Initializing with teamId:', teamId);
    loadIntegrations(teamId);
  }, []); // Only run once on mount

  const value: IntegrationsContextType = {
    // State
    integrations,
    nangoIntegrations,
    userConnections,
    crmSettings,
    loading,
    error,
    initialized,
    
    // Actions
    loadIntegrations,
    connectIntegration,
    disconnectIntegration,
    configureIntegration,
    toggleIntegration,
    refreshConnections,
    loadCrmSettings,
    
    // Helpers
    isIntegrationConnected,
    getIntegrationByStrId,
    getConnectedIntegrations,
    getIntegrationsByCategory,
  };

  return (
    <IntegrationsContext.Provider value={value}>
      {children}
    </IntegrationsContext.Provider>
  );
}

/**
 * Hook to use integrations context
 * Must be used within IntegrationsProvider
 */
export function useIntegrations() {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw new Error('useIntegrations must be used within IntegrationsProvider');
  }
  return context;
}

export default IntegrationsContext;

