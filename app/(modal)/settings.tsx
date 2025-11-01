import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from "react";
import { useChat } from '@/hooks/useChat';
import { Theme } from '@/constants/Types';
import { useTheme, ThemeMode, setThemeMode } from '@/hooks/useTheme';
import useMMKVStorage, { storage } from '@/hooks/useMMKVStorage';
import { DEFAULT_MODEL_ID, getModelById, isLlamaModel } from '@/constants/Models';
import ModelSelectorModal from '@/components/modals/ModelSelectorModal/ModelSelectorModal';
import { GradientBackground } from '@/components/GradientBackground';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { SettingsEvent } from '@/types/mixpanel';
import { useEffect } from 'react';
import CreditPurchaseModalIAP from '@/components/CreditPurchaseModalIAP';
import CreditBadge from '@/components/CreditBadge';
import { useIntegrations } from '@/contexts/IntegrationsContext';
import apiClient from '@/utils/ApiClient';
import { useIAP } from '@/providers/IAPProvider';

const rawPage = [{
  id: 1,
  key: 'profile',
  title: 'Profile',
  icon: 'person-outline'
}, /* {
  id: 2,
  key: 'integrations',
  title: 'Integrations',
  icon: 'link-outline',
  hasBadge: true
}, */ {
  id: 3,
  key: 'credits',
  title: 'Purchase Credits',
  icon: 'diamond-outline'
}, {
  id: 4,
  key: 'plans-pricing',
  title: 'Plans & Pricing',
  icon: 'card-outline'
}, {
  id: 5,
  key: 'default-model',
  title: 'Default AI Model',
  icon: 'chatbubbles-outline'
}, {
  id: 6,
  key: 'theme',
  title: 'Theme',
  icon: 'color-palette-outline'
}, {
  id: 9,
  key: 'clear-all-chats',
  title: 'Clear All Chats',
  icon: 'trash-outline'
}, {
  id: 10,
  key: 'change-password',
  title: 'Change password',
  icon: 'settings-outline'
}, {
  id: 11,
  key: 'sign_out',
  title: 'Sign Out',
  icon: 'log-out-outline'
}];

interface IItemRaw {
  id: number,
  key: string,
  title: string,
  icon: string,
  hasToggle?: boolean,
  hasBadge?: boolean
}

const Page = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { signOut } = useAuth();
  const { nangoIntegrations, initialized: integrationsInitialized } = useIntegrations();
  const { isInitialized: iapInitialized, isLoading: iapLoading, products: iapProducts, error: iapError } = useIAP();
  
  // Count connected integrations from context
  const [connectedCount, setConnectedCount] = useState(0);
  
  useEffect(() => {
    const fetchConnectedCount = async () => {
      try {
        const response = await apiClient.get<{ success: boolean; connections: any[] }>(
          '/nango/list-connections',
          {
            team_id: storage.getString('selectedTeamId') || undefined
          }
        );
        if (response.ok && response.data?.success) {
          const connections = response.data.connections || [];
          setConnectedCount(connections.length);
        }
      } catch (error) {
        console.log('[Settings] Error fetching connected count:', error);
      }
    };
    
    if (integrationsInitialized) {
      fetchConnectedCount();
    }
  }, [integrationsInitialized]);
  const { 
    createNewConversation, 
    messages,
    conversations,
    currentConversationId,
    resetChat,
    clearAllConversations
  } = useChat();
  const [isModelSelectorVisible, setIsModelSelectorVisible] = useState(false);
  const [isCreditPurchaseVisible, setIsCreditPurchaseVisible] = useState(false);
  
  // Use storage.getString/set directly for simple string values to avoid JSON parsing issues
  const [defaultModelId, setDefaultModelIdState] = useState(() => storage.getString('default_model_id') || DEFAULT_MODEL_ID);
  const setDefaultModelId = (value: string) => {
    storage.set('default_model_id', value);
    setDefaultModelIdState(value);
  };

  // Track settings opened
  useEffect(() => {
    mixpanelService.trackSettings(SettingsEvent.SETTINGS_OPENED);
  }, []);

  const handleSignOut = async () => {
    signOut()
  }

  const handleModelSelect = async (modelId: string) => {
    const oldModel = getModelById(defaultModelId);
    const newModel = getModelById(modelId);
    
    // Track default model changed
    await mixpanelService.trackSettings(SettingsEvent.DEFAULT_MODEL_CHANGED, {
      setting_name: 'default_cloud_model',
      old_value: oldModel?.displayName || defaultModelId,
      new_value: newModel?.displayName || modelId,
    });
    
    // Get the current conversation to check its model_type
    const currentConversation = conversations.find(c => c.id === currentConversationId);
    const currentConversationModelType = currentConversation?.model_type;
    
    // Get current model type - use conversation's model_type if available,
    // otherwise fall back to the current default model
    const currentDefaultModel = getModelById(defaultModelId);
    const currentModelType = currentConversationModelType || currentDefaultModel?.id;
    
    // Check if switching between Llama and non-Llama models
    const currentIsLlama = currentModelType ? isLlamaModel(currentModelType) : false;
    const newIsLlama = isLlamaModel(modelId);
    
    // Only consider cloud model switches (not local mode)
    // And only if:
    // 1. We're not in local mode
    // 2. We have a model to compare against (conversation or default)
    // 3. We're actually switching between Llama and non-Llama
    // 4. The current conversation has at least one message
    const isLocal = false; // Not using local models anymore
    const isSwitchingBetweenLlamaTypes = !isLocal && 
                                         currentModelType && 
                                         currentIsLlama !== newIsLlama;
    const hasMessages = messages && messages.length > 0;
    
    // Update the default model
    setDefaultModelId(modelId);
    
    // If switching between Llama and non-Llama cloud models and there are messages, create new chat
    if (isSwitchingBetweenLlamaTypes && hasMessages) {
      try {
        // Clear current messages from UI
        resetChat();
        
        // Create a new conversation to start fresh
        const newConvId = await createNewConversation();
        if (newConvId) {
          // Navigate to the new conversation
          router.push(`/(chat)/${newConvId}`);
        }
      } catch (error) {
        // console.error('Error creating new conversation after model switch:', error);
        // Continue anyway - the model change has been saved
      }
    }
  };

  const selectedModel = getModelById(defaultModelId);

  const handleClearAllChats = async () => {
    Alert.alert(
      'Clear All Chats',
      'Are you sure you want to delete all conversations? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await clearAllConversations();
              if (success) {
                Alert.alert('Success', 'All conversations have been cleared.');
                // Track clear all chats
                await mixpanelService.trackSettings(SettingsEvent.SETTINGS_SECTION_VIEWED, {
                  section: 'clear_all_chats',
                });
                // Navigate to new chat
                router.push('/(chat)/new');
              } else {
                Alert.alert('Error', 'Failed to clear all conversations.');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred.');
            }
          },
        },
      ]
    );
  };

  const handleThemeSelection = () => {
    Alert.alert(
      'Select Theme',
      'Choose your preferred theme',
      [
        {
          text: 'System',
          onPress: async () => {
            setThemeMode('system');
            await mixpanelService.trackSettings(SettingsEvent.SETTINGS_ITEM_CLICKED, {
              item_name: 'Theme',
              value: 'system'
            });
          },
        },
        {
          text: 'Light',
          onPress: async () => {
            setThemeMode('light');
            await mixpanelService.trackSettings(SettingsEvent.SETTINGS_ITEM_CLICKED, {
              item_name: 'Theme',
              value: 'light'
            });
          },
        },
        {
          text: 'Dark',
          onPress: async () => {
            setThemeMode('dark');
            await mixpanelService.trackSettings(SettingsEvent.SETTINGS_ITEM_CLICKED, {
              item_name: 'Theme',
              value: 'dark'
            });
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };


  const handleInstruction = async (type: string) => {
    // Track settings section viewed
    await mixpanelService.trackSettings(SettingsEvent.SETTINGS_SECTION_VIEWED, {
      section: type,
    });
    
    switch (type) {
      case 'profile':
        return router.push('/profile')
      case 'integrations':
        return router.push('/(modal)/integrations')
      case 'credits':
        return setIsCreditPurchaseVisible(true)
      case 'plans-pricing':
        return router.push('/plans-pricing-iap')
      case 'default-model':
        return setIsModelSelectorVisible(true)
      case 'theme':
        return handleThemeSelection()
      case 'clear-all-chats':
        return handleClearAllChats()
      case 'change-password':
        return router.push('/change-password')
      case 'sign_out':
        return handleSignOut()
    }
  }

  const renderRaw = (item: IItemRaw, index: number, visibleItems: IItemRaw[]) => {
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.menuItem,
          pressed && styles.menuItemPressed,
          visibleItems.length - 1 === index && styles.menuItemLast
        ]}
        onPress={() => handleInstruction(item.key)}
      >
        <View style={styles.menuItemContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuItemText}>{item.title}</Text>
            {item.key === 'default-model' && selectedModel && (
              <Text style={styles.menuItemSubtext}>{selectedModel.displayName}</Text>
            )}
            {item.key === 'integrations' && (
              <Text style={styles.menuItemSubtext}>
                {connectedCount === 0 
                  ? 'Connect your services' 
                  : `${connectedCount} connected`}
              </Text>
            )}
            {item.key === 'theme' && (
              <Text style={styles.menuItemSubtext}>
                {theme.themeMode.charAt(0).toUpperCase() + theme.themeMode.slice(1)}
              </Text>
            )}
            {item.key === 'plans-pricing' && (
              <Text style={styles.menuItemSubtext}>
                Subscribe via App Store
              </Text>
            )}
            {item.key === 'credits' && (
              <Text style={styles.menuItemSubtext}>
                Buy more AI credits
              </Text>
            )}
            {item.key === 'clear-all-chats' && (
              <Text style={styles.menuItemSubtext}>
                Delete all conversations
              </Text>
            )}
          </View>
        </View>
        {item.key === 'credits' ? (
          <CreditBadge variant="compact" />
        ) : item.key === 'integrations' && connectedCount > 0 ? (
          <View style={styles.badgeContainer}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{connectedCount}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.greyLight} style={{ marginLeft: 8 }} />
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.greyLight} />
        )}
      </Pressable>
    )
  }
  
  const visibleMenuItems = rawPage;

  return (
    <GradientBackground variant="background">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.menuContainer}>
            {visibleMenuItems.map((item, index) => renderRaw(item, index, visibleMenuItems))}
          </View>
          
          {/* IAP Debug Status - Only show in development */}
          {__DEV__ && (
            <View style={styles.debugContainer}>
              <View style={styles.debugHeader}>
                <Ionicons name="code-slash" size={16} color={theme.colors.greyLight} />
                <Text style={styles.debugTitle}>IAP Debug Status</Text>
              </View>
              
              <View style={styles.debugContent}>
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Connection Status:</Text>
                  <View style={styles.debugValueContainer}>
                    {iapLoading ? (
                      <>
                        <View style={[styles.statusDot, { backgroundColor: '#FFA500' }]} />
                        <Text style={styles.debugValue}>Connecting...</Text>
                      </>
                    ) : iapInitialized ? (
                      <>
                        <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                        <Text style={[styles.debugValue, { color: '#4CAF50' }]}>Connected</Text>
                      </>
                    ) : (
                      <>
                        <View style={[styles.statusDot, { backgroundColor: '#F44336' }]} />
                        <Text style={[styles.debugValue, { color: '#F44336' }]}>Disconnected</Text>
                      </>
                    )}
                  </View>
                </View>
                
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Products Loaded:</Text>
                  <Text style={styles.debugValue}>{iapProducts?.length || 0}</Text>
                </View>
                
                {iapError && (
                  <View style={styles.debugRow}>
                    <Text style={styles.debugLabel}>Error:</Text>
                    <Text style={[styles.debugValue, styles.debugError]} numberOfLines={2}>
                      {iapError}
                    </Text>
                  </View>
                )}
                
                <View style={styles.debugRow}>
                  <Text style={styles.debugLabel}>Platform:</Text>
                  <Text style={styles.debugValue}>{require('react-native').Platform.OS}</Text>
                </View>
              </View>
            </View>
          )}
          
          <View style={styles.footer}>
            {/* Logo commented out */}
           <Image source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')} style={styles.logo} />
            
            <Text style={styles.appVersion}>App Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
      <ModelSelectorModal
        visible={isModelSelectorVisible}
        onClose={() => setIsModelSelectorVisible(false)}
        selectedModelId={defaultModelId}
        onSelectModel={handleModelSelect}
      />
      <CreditPurchaseModalIAP
        visible={isCreditPurchaseVisible}
        onClose={() => setIsCreditPurchaseVisible(false)}
        source="settings"
      />
      </SafeAreaView>
    </GradientBackground>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  contentContainer: {
    paddingTop: 16,
    flex: 1,
  },
  menuContainer: {
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
  },
  menuItemPressed: {
    backgroundColor: theme.isDark ? theme.colors.selected : theme.colors.selected,
    opacity: 0.2,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.isDark 
      ? 'rgba(255, 255, 255, 0.06)' 
      : 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 15,
    color: theme.colors.text,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  menuItemSubtext: {
    fontSize: 12,
    color: theme.colors.greyLight,
    marginTop: 1,
    opacity: 0.8,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 60,
    paddingTop: 24,
  },
  logo: {
    width: 120,
    height: 60,
    resizeMode: 'contain',
    marginBottom: 6,
    opacity: 0.9,
  },
  appTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 10,
    letterSpacing: 1,
  },
  appLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  appVersion: {
    fontSize: 11,
    color: theme.isDark ? theme.colors.greyLight : theme.colors.grey,
    opacity: 0.6,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Debug styles
  debugContainer: {
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
    overflow: 'hidden',
  },
  debugHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: theme.colors.primary + '10',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary + '20',
  },
  debugTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  debugContent: {
    padding: 14,
    gap: 10,
  },
  debugRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  debugLabel: {
    fontSize: 13,
    color: theme.colors.greyLight,
    flex: 1,
  },
  debugValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  debugValue: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.text,
  },
  debugError: {
    color: '#F44336',
    fontSize: 11,
    flex: 1,
    textAlign: 'right',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

export default Page;