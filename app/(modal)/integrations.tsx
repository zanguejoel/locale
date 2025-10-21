/**
 * Integrations Screen
 * 
 * Matches web app IntegrationsSection.tsx logic exactly
 * Shows Nango integrations with search and connect flow
 * Accessible from Settings → Integrations
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { GradientBackground } from '@/components/GradientBackground';
import apiClient from '@/utils/ApiClient';
import { storage } from '@/hooks/useMMKVStorage';
import * as WebBrowser from 'expo-web-browser';

interface NangoIntegration {
  unique_key: string;
  display_name: string;
  logo?: string;
  provider: string;
}

interface UserConnection {
  provider: string;
  connection_id: string;
  end_user_id: string;
  settings: any;
  is_active: boolean;
  str_id: string;
  integration_name: string;
}

const IntegrationsScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme, theme.isDark || false);
  
  // State matching web app IntegrationsSection.tsx
  const [availableIntegrations, setAvailableIntegrations] = useState<NangoIntegration[]>([]);
  const [userConnections, setUserConnections] = useState<UserConnection[]>([]);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [activeIntegrations, setActiveIntegrations] = useState<Record<string, boolean>>({});
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const savedTeamId = storage.getString('selectedTeamId');
  const userString = storage.getString('user');
  const user = userString ? JSON.parse(userString) : null;

  // Load integrations and connections on mount (matches web app useEffect)
  useEffect(() => {
    fetchAvailableIntegrations();
    fetchUserConnections();
  }, []);

  // Filter integrations based on search (matches web app logic)
  const filteredIntegrations = useMemo(() => {
    if (!searchQuery.trim()) return availableIntegrations;
    
    const query = searchQuery.toLowerCase();
    return availableIntegrations.filter(integration =>
      integration.display_name.toLowerCase().includes(query)
    );
  }, [availableIntegrations, searchQuery]);

  // Get connected integrations only
  const connectedIntegrations = useMemo(() => {
    return availableIntegrations.filter(integration =>
      Boolean(activeIntegrations[integration.unique_key])
    );
  }, [availableIntegrations, activeIntegrations]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAvailableIntegrations(),
      fetchUserConnections()
    ]);
    setRefreshing(false);
  };

  /**
   * Fetch user's connected integrations
   * Matches web app fetchUserConnections()
   */
  const fetchUserConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const params: any = {};
      if (savedTeamId && savedTeamId !== 'personal-account') {
        params.team_id = savedTeamId;
      }

      const response = await apiClient.get<{ success: boolean; connections: UserConnection[] }>(
        '/nango/list-connections',
        params
      );
      
      if (response.ok && response.data?.success) {
        const connections = response.data.connections || [];
        setUserConnections(connections);
        
        // Update active integrations based on connections
        const activeIntegrationsMap: Record<string, boolean> = {};
        connections.forEach((connection: UserConnection) => {
          activeIntegrationsMap[connection.str_id] = true;
        });
        
        setActiveIntegrations(activeIntegrationsMap);
        console.log('[Integrations] Loaded connections:', connections.length);
        return connections;
      }
      return [];
    } catch (error) {
      console.error('[Integrations] Error fetching connections:', error);
      return [];
    } finally {
      setIsLoadingConnections(false);
    }
  };

  /**
   * Fetch available integrations from Nango
   * Matches web app fetchAvailableIntegrations()
   */
  const fetchAvailableIntegrations = async () => {
    setIsLoadingIntegrations(true);
    try {
      const response = await apiClient.get<{ success: boolean; data: NangoIntegration[] }>(
        '/nango/integrations'
      );
      
      if (response.ok && response.data?.success) {
        const nangoIntegrations = response.data.data || [];
        
        // Initialize loading states for each integration
        const loadingMap: Record<string, boolean> = {};
        nangoIntegrations.forEach((integration: NangoIntegration) => {
          loadingMap[integration.unique_key] = false;
        });
        setLoadingStates(loadingMap);
        
        setAvailableIntegrations(nangoIntegrations);
        console.log('[Integrations] Loaded integrations:', nangoIntegrations.length);
      } else {
        throw new Error('Failed to fetch integrations');
      }
    } catch (error) {
      console.error('[Integrations] Error fetching integrations:', error);
      Alert.alert('Error', 'Failed to load integrations. Please try again.');
    } finally {
      setIsLoadingIntegrations(false);
    }
  };

  /**
   * Connect integration using Nango OAuth (direct URL approach - more reliable)
   * Uses same backend endpoints as web app
   */
  const handleConnectIntegration = async (integrationId: string) => {
    try {
      const integration = availableIntegrations.find(i => i.unique_key === integrationId);
      if (!integration) {
        throw new Error(`Integration ${integrationId} not found`);
      }
      
      // Update loading state
      setLoadingStates(prev => ({ ...prev, [integrationId]: true }));
      
      console.log('[Integrations] Connecting to:', integration.display_name);
      
      // Get full user name (matches web app getFullName)
      const displayName = user?.first_name && user?.last_name 
        ? `${user.first_name} ${user.last_name}`.trim()
        : user?.first_name || user?.email;
      
      // Get organization ID (matches web app user.user_teams structure)
      const orgId = (user?.user_teams && user.user_teams[0]?.team?.id)
        ? `org_${user.user_teams[0].team.id}`
        : `user_${user?.user_id}`;
      
      const orgName = (user?.user_teams && user.user_teams[0]?.team?.team_name)
        ? user.user_teams[0].team.team_name
        : displayName;

      console.log('[Integrations] Session request:', {
        user_id: user?.user_id,
        org_id: orgId,
        integration: integrationId
      });

      // Get session token from backend (matches web app exactly)
      const sessionResponse = await apiClient.post<{ 
        success: boolean; 
        response: { data: { token: string } } 
      }>('/nango/connect-session', {
        end_user: {
          id: `user_${user?.user_id}`,
          email: user?.email,
          display_name: displayName
        },
        organization: {
          id: orgId,
          display_name: orgName
        },
        allowed_integrations: [integrationId]
      }, {
        params: {
          team_id: savedTeamId && savedTeamId !== 'personal-account' ? savedTeamId : null
        }
      });

      if (!sessionResponse.ok || !sessionResponse.data?.success || !sessionResponse.data?.response?.data?.token) {
        throw new Error('Failed to get session token');
      }

      const sessionToken = sessionResponse.data.response.data.token;
      
      // Build Nango OAuth URL (same as Nango SDK uses)
      const nangoPublicKey = 'f0ea3f0b-de63-48b6-a1a0-60ca04ce29d0';
      const nangoUrl = `https://api.nango.dev/oauth/connect/${integrationId}?user_scope=${sessionToken}&public_key=${nangoPublicKey}`;
      
      console.log('[Integrations] Opening Nango OAuth URL...');
      
      // Open in browser (more reliable than WebView with SDK)
      const result = await WebBrowser.openAuthSessionAsync(
        nangoUrl,
        'odyssey://integrations/callback'
      );

      console.log('[Integrations] OAuth result:', result.type);

      if (result.type === 'success' && result.url) {
        // Parse callback URL
        const url = new URL(result.url);
        const params = url.searchParams;
        const connectionId = params.get('connection_id');
        const status = params.get('status');

        if (status === 'success' && connectionId) {
          console.log('[Integrations] OAuth success, storing connection:', connectionId);
          
          // Store connection ID in backend (matches web app)
          const storeResponse = await apiClient.post<{ success: boolean }>(
            `/nango/store-connection-id?connection_id=${connectionId}`,
            {},
            {
              params: {
                team_id: savedTeamId && savedTeamId !== 'personal-account' ? savedTeamId : null
              }
            }
          );

          if (storeResponse.ok && storeResponse.data?.success) {
            console.log('[Integrations] Connection stored successfully');
            
            // Update active integrations
            setActiveIntegrations(prev => ({
              ...prev,
              [integrationId]: true
            }));
            
            // Refresh connections
            await fetchUserConnections();
            
            // Sync Nango connections (matches web app)
            await apiClient.post('/voice-agent/nango/sync', {}, {
              params: {
                team_id: savedTeamId && savedTeamId !== 'personal-account' ? savedTeamId : null
              }
            });
            
            // Reset search
            setSearchQuery('');
            setIsSearchFocused(false);
            
            Alert.alert(
              'Success',
              `Successfully connected to ${integration.display_name}`
            );
          }
        } else {
          console.log('[Integrations] OAuth cancelled or failed');
        }
      } else if (result.type === 'cancel') {
        console.log('[Integrations] User cancelled OAuth');
      }
      
    } catch (error: any) {
      console.error('[Integrations] Connection error:', error);
      Alert.alert('Error', 'Failed to connect. Please try again.');
    } finally {
      setLoadingStates(prev => ({ ...prev, [integrationId]: false }));
    }
  };

  /**
   * Disconnect integration (matches web app handleDisconnectIntegration)
   */
  const handleDisconnectIntegration = async (integrationId: string) => {
    try {
      // Update loading state
      setLoadingStates(prev => ({ ...prev, [integrationId]: true }));
      
      // Find the connection
      const connection = userConnections.find(conn => conn.str_id === integrationId);
      
      if (!connection) {
        throw new Error(`Connection not found for: ${integrationId}`);
      }
      
      // Confirm disconnect
      Alert.alert(
        'Disconnect Integration',
        `Are you sure you want to disconnect from ${connection.integration_name}?`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              setLoadingStates(prev => ({ ...prev, [integrationId]: false }));
            }
          },
          {
            text: 'Disconnect',
            style: 'destructive',
            onPress: async () => {
              try {
                // Call API to disconnect
                const response = await apiClient.delete<{ success: boolean }>(
                  `/nango/connection/${connection.connection_id}`,
                  {
                    params: {
                      team_id: savedTeamId && savedTeamId !== 'personal-account' ? savedTeamId : null
                    }
                  }
                );
                
                if (response.ok && response.data?.success) {
                  // Update state
                  setActiveIntegrations(prev => {
                    const updated = {...prev};
                    delete updated[integrationId];
                    return updated;
                  });
                  
                  setUserConnections(prev => 
                    prev.filter(conn => conn.connection_id !== connection.connection_id)
                  );
                  
                  // Sync Nango connections
                  await apiClient.post('/voice-agent/nango/sync', {}, {
                    params: {
                      team_id: savedTeamId && savedTeamId !== 'personal-account' ? savedTeamId : null
                    }
                  });
                  
                  Alert.alert('Success', `Disconnected from ${connection.integration_name}`);
                }
              } catch (error) {
                console.error('[Integrations] Disconnect error:', error);
                Alert.alert('Error', 'Failed to disconnect. Please try again.');
              } finally {
                setLoadingStates(prev => ({ ...prev, [integrationId]: false }));
              }
            }
          }
        ]
      );
    } catch (error: any) {
      console.error('[Integrations] Disconnect error:', error);
      Alert.alert('Error', 'Failed to disconnect. Please try again.');
      setLoadingStates(prev => ({ ...prev, [integrationId]: false }));
    }
  };

  /**
   * Render integration card (MinimalistIntegrationCard from web)
   */
  const renderIntegrationCard = (integration: NangoIntegration, isConnectedSection: boolean = false) => {
    const isConnected = Boolean(activeIntegrations[integration.unique_key]);
    const isLoading = loadingStates[integration.unique_key];

    return (
      <TouchableOpacity
        key={integration.unique_key}
        style={[
          styles.card,
          {
            opacity: isConnected && !isConnectedSection ? 0.8 : 1,
          },
        ]}
        onPress={() => {
          if (!isConnected && !isLoading) {
            if (isSearchFocused) {
              setSearchQuery(integration.display_name);
              setIsSearchFocused(false);
            } else {
              handleConnectIntegration(integration.unique_key);
            }
          }
        }}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.cardLeft}>
          {/* Logo */}
          <View style={[styles.logoBox, { backgroundColor: theme.isDark ? theme.colors.background800 : theme.colors.background }]}>
            {integration.logo ? (
              <Image
                source={{ uri: integration.logo }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <Text style={[styles.logoText, { color: theme.colors.primary }]}>
                {integration.display_name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          
          {/* Name */}
          <Text style={[styles.integrationName, { color: theme.isDark ? '#e2e8f0' : '#1e293b' }]} numberOfLines={1}>
            {integration.display_name}
          </Text>
        </View>

        <View style={styles.cardRight}>
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : isConnected ? (
            <TouchableOpacity
              style={styles.disconnectButton}
              onPress={(e) => {
                e.stopPropagation();
                handleDisconnectIntegration(integration.unique_key);
              }}
            >
              <Ionicons name="unlink" size={14} color="#EF4444" />
              <Text style={styles.disconnectText}>Disconnect</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <GradientBackground variant="background">
      <SafeAreaView style={styles.safeArea}>
        {/* Header with description */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="apps" size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.headerTitle}>
            Connected Services
          </Text>
        </View>

        <Text style={styles.description}>
          Connect your third-party services to enhance your experience. Integrations allow you to access additional features and functionality.
        </Text>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.tint}
            />
          }
        >
          {/* Search Bar - matches web app search interface */}
          <View style={styles.searchContainer}>
            <View style={[styles.searchLogoBox, { backgroundColor: theme.colors.background }]}>
              <Ionicons name="search" size={18} color={theme.isDark ? '#94a3b8' : theme.colors.mutedForeground} />
            </View>
            <TextInput
              style={[styles.searchInput, { color: theme.isDark ? '#e2e8f0' : '#1e293b' }]}
              placeholder="Search integrations"
              placeholderTextColor={theme.isDark ? '#64748b' : '#94a3b8'}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery && filteredIntegrations.length > 0 && !isSearchFocused && (
              <TouchableOpacity
                style={styles.authorizeButton}
                onPress={() => {
                  const integration = filteredIntegrations[0];
                  if (!activeIntegrations[integration.unique_key]) {
                    handleConnectIntegration(integration.unique_key);
                  }
                }}
                disabled={loadingStates[filteredIntegrations[0].unique_key] || activeIntegrations[filteredIntegrations[0].unique_key]}
              >
                {loadingStates[filteredIntegrations[0].unique_key] ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.authorizeText}>Authorize</Text>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Search Dropdown (when focused) */}
          {isSearchFocused && (
            <View style={styles.dropdown}>
              <View style={styles.dropdownHeader}>
                <Text style={[styles.dropdownTitle, { color: theme.isDark ? '#e2e8f0' : '#1e293b' }]}>
                  Pick an integration
                </Text>
                <TouchableOpacity onPress={() => setIsSearchFocused(false)}>
                  <Ionicons name="close" size={20} color={theme.isDark ? '#94a3b8' : theme.colors.mutedForeground} />
                </TouchableOpacity>
              </View>
              
              {isLoadingIntegrations ? (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>
                    Loading integrations...
                  </Text>
                </View>
              ) : filteredIntegrations.length === 0 ? (
                <View style={styles.dropdownEmpty}>
                  <Text style={styles.emptyText}>
                    {searchQuery ? 'No matching integrations found' : 'Start typing to search'}
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.dropdownList}>
                  {filteredIntegrations.map(integration => renderIntegrationCard(integration))}
                </ScrollView>
              )}
            </View>
          )}

          {/* Connected Integrations Section (matches web app) */}
          {connectedIntegrations.length > 0 && !isSearchFocused && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.isDark ? '#e2e8f0' : '#1e293b' }]}>
                Connected Integrations
              </Text>
              {isLoadingConnections ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>
                    Loading your connections...
                  </Text>
                </View>
              ) : (
                <View style={styles.connectedGrid}>
                  {connectedIntegrations.map(integration => renderIntegrationCard(integration, true))}
                </View>
              )}
            </View>
          )}

          {/* Help Section (matches web app) */}
          <View style={styles.helpSection}>
            <Text style={[styles.helpTitle, { color: theme.isDark ? '#e2e8f0' : '#1e293b' }]}>
              Need Help with Integrations?
            </Text>
            <Text style={[styles.helpText, { color: theme.isDark ? '#e2e8f0' : theme.colors.foreground }]}>
              If you're having trouble connecting to a service or have questions about integrations, please contact our support team at{' '}
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                info@odysseytech.ai
              </Text>
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const getStyles = (theme: any, isDark: boolean) => StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: isDark 
      ? 'rgba(59, 130, 246, 0.2)' 
      : 'rgba(59, 130, 246, 0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: isDark ? '#e2e8f0' : '#1e293b',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 16,
    color: '#94a3b8',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.6)' : 'rgba(255, 255, 255, 0.8)',
    marginBottom: 16,
  },
  searchLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  authorizeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    backgroundColor: '#3b82f6', // Odyssey blue gradient start
    shadowColor: 'rgba(59, 130, 246, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  authorizeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdown: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border : 'rgba(128, 128, 128, 0.2)',
    backgroundColor: theme.colors.card,
    marginBottom: 16,
    maxHeight: 320,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: isDark ? theme.colors.border : 'rgba(128, 128, 128, 0.1)',
  },
  dropdownTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownLoading: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  dropdownEmpty: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  dropdownList: {
    maxHeight: 280,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border : 'rgba(128, 128, 128, 0.1)',
    backgroundColor: theme.colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0.2 : 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  logo: {
    width: 20,
    height: 20,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '600',
  },
  integrationName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  disconnectText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    backgroundColor: isDark ? theme.colors.background800 + '33' : theme.colors.muted + '33',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border : 'rgba(128, 128, 128, 0.1)',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 8,
    color: isDark ? '#94a3b8' : theme.colors.mutedForeground,
  },
  connectedGrid: {
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    color: isDark ? '#94a3b8' : theme.colors.mutedForeground,
  },
  helpSection: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: isDark ? theme.colors.border : 'rgba(128, 128, 128, 0.1)',
    backgroundColor: isDark ? theme.colors.background800 + '80' : theme.colors.muted + '80',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 13,
    lineHeight: 18,
  },
});

export default IntegrationsScreen;