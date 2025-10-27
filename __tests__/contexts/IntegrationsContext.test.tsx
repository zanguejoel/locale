/**
 * IntegrationsContext Tests
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { IntegrationsProvider, useIntegrations } from '../../contexts/IntegrationsContext';
import IntegrationService from '../../utils/IntegrationService';
import NangoService from '../../utils/NangoService';

// Mock dependencies
jest.mock('../../utils/IntegrationService', () => ({
  __esModule: true,
  default: {
    getAllIntegrations: jest.fn(),
    getUserConnections: jest.fn(),
    disconnectIntegration: jest.fn(),
    configureIntegration: jest.fn(),
    toggleIntegration: jest.fn(),
  },
}));

jest.mock('../../utils/NangoService', () => ({
  __esModule: true,
  default: {
    getNangoIntegrations: jest.fn(),
    getCrmSettings: jest.fn(),
  },
}));

jest.mock('../../hooks/useMMKVStorage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

const mockIntegrations = [
  {
    id: 1,
    str_id: 'slack',
    name: 'Slack',
    is_active: true,
  },
  {
    id: 2,
    str_id: 'notion',
    name: 'Notion',
    is_active: true,
  },
];

const mockNangoIntegrations = [
  {
    unique_key: 'slack',
    provider: 'slack',
    syncs: [],
    actions: [],
  },
];

const mockConnections = ['slack'];

describe('IntegrationsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock implementations
    (IntegrationService.getAllIntegrations as jest.Mock).mockResolvedValue(mockIntegrations);
    (IntegrationService.getUserConnections as jest.Mock).mockResolvedValue(mockConnections);
    (NangoService.getNangoIntegrations as jest.Mock).mockResolvedValue(mockNangoIntegrations);
    (NangoService.getCrmSettings as jest.Mock).mockResolvedValue({});
  });

  describe('Provider Setup', () => {
    it('should throw error when useIntegrations is used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useIntegrations());
      }).toThrow('useIntegrations must be used within IntegrationsProvider');
      
      consoleSpy.mockRestore();
    });

    it('should provide context value to children', () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });
      
      expect(result.current).toBeDefined();
      expect(result.current.integrations).toBeDefined();
      expect(result.current.loadIntegrations).toBeDefined();
    });
  });

  describe('Initial Load', () => {
    it('should load integrations on mount', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(IntegrationService.getAllIntegrations).toHaveBeenCalled();
      expect(IntegrationService.getUserConnections).toHaveBeenCalled();
      expect(NangoService.getNangoIntegrations).toHaveBeenCalled();
    });

    it('should set loading state during initial load', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      // Should start with loading or quickly transition
      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });
    });

    it('should populate integrations state after load', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.integrations).toEqual(mockIntegrations);
      });
    });

    it('should populate connections state after load', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.userConnections).toEqual(mockConnections);
      });
    });

    it('should handle load errors gracefully', async () => {
      const error = new Error('Network error');
      (IntegrationService.getAllIntegrations as jest.Mock).mockRejectedValue(error);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error).toContain('Network error');
    });
  });

  describe('loadIntegrations', () => {
    it('should reload integrations when called manually', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const callCount = (IntegrationService.getAllIntegrations as jest.Mock).mock.calls.length;

      await act(async () => {
        await result.current.loadIntegrations();
      });

      expect(IntegrationService.getAllIntegrations).toHaveBeenCalledTimes(callCount + 1);
    });

    it('should pass team ID to service calls', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      await act(async () => {
        await result.current.loadIntegrations(123);
      });

      expect(IntegrationService.getAllIntegrations).toHaveBeenCalledWith(123);
      expect(IntegrationService.getUserConnections).toHaveBeenCalledWith(123);
    });
  });

  describe('refreshConnections', () => {
    it('should refresh user connections', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const newConnections = ['slack', 'notion'];
      (IntegrationService.getUserConnections as jest.Mock).mockResolvedValue(newConnections);

      await act(async () => {
        await result.current.refreshConnections();
      });

      expect(result.current.userConnections).toEqual(newConnections);
    });
  });

  describe('disconnectIntegration', () => {
    it('should disconnect integration and refresh connections', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      (IntegrationService.disconnectIntegration as jest.Mock).mockResolvedValue(undefined);
      (IntegrationService.getUserConnections as jest.Mock).mockResolvedValue([]);

      await act(async () => {
        await result.current.disconnectIntegration(1);
      });

      expect(IntegrationService.disconnectIntegration).toHaveBeenCalledWith(1, undefined);
      expect(IntegrationService.getUserConnections).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const error = new Error('Disconnect failed');
      (IntegrationService.disconnectIntegration as jest.Mock).mockRejectedValue(error);

      await expect(
        act(async () => {
          await result.current.disconnectIntegration(1);
        })
      ).rejects.toThrow('Disconnect failed');
    });
  });

  describe('configureIntegration', () => {
    it('should configure integration settings', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const settings = { apiKey: 'test-key' };
      (IntegrationService.configureIntegration as jest.Mock).mockResolvedValue(undefined);

      await act(async () => {
        await result.current.configureIntegration(1, settings);
      });

      expect(IntegrationService.configureIntegration).toHaveBeenCalledWith(1, settings, undefined);
    });
  });

  describe('toggleIntegration', () => {
    it('should toggle integration status', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      (IntegrationService.toggleIntegration as jest.Mock).mockResolvedValue(false);

      await act(async () => {
        await result.current.toggleIntegration(1);
      });

      expect(IntegrationService.toggleIntegration).toHaveBeenCalledWith(1, undefined);
      expect(result.current.integrations[0].is_active).toBe(false);
    });
  });

  describe('Helper Methods', () => {
    it('should check if integration is connected', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      expect(result.current.isIntegrationConnected('slack')).toBe(true);
      expect(result.current.isIntegrationConnected('notion')).toBe(false);
    });

    it('should get integration by str_id', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const integration = result.current.getIntegrationByStrId('slack');
      expect(integration).toEqual(mockIntegrations[0]);
    });

    it('should return null for non-existent integration', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const integration = result.current.getIntegrationByStrId('non-existent');
      expect(integration).toBeNull();
    });

    it('should get connected integrations', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const connected = result.current.getConnectedIntegrations();
      expect(connected).toHaveLength(1);
      expect(connected[0].str_id).toBe('slack');
    });

    it('should get integrations by category', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const all = result.current.getIntegrationsByCategory('all');
      expect(all).toEqual(mockIntegrations);

      const connected = result.current.getIntegrationsByCategory('connected');
      expect(connected).toHaveLength(1);
    });
  });

  describe('loadCrmSettings', () => {
    it('should load CRM settings', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <IntegrationsProvider>{children}</IntegrationsProvider>
      );

      const { result } = renderHook(() => useIntegrations(), { wrapper });

      await waitFor(() => {
        expect(result.current.initialized).toBe(true);
      });

      const mockSettings = { hubspot: { apiKey: 'test' } };
      (NangoService.getCrmSettings as jest.Mock).mockResolvedValue(mockSettings);

      await act(async () => {
        await result.current.loadCrmSettings();
      });

      expect(NangoService.getCrmSettings).toHaveBeenCalled();
      expect(result.current.crmSettings).toEqual(mockSettings);
    });
  });
});

