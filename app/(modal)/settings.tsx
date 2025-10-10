import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from "react";
import { useChat } from '@/hooks/useChat';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import useMMKVStorage, { storage } from '@/hooks/useMMKVStorage';
import { DEFAULT_MODEL_ID, getModelById, isLlamaModel } from '@/constants/Models';
import ModelSelectorModal from '@/components/modals/ModelSelectorModal/ModelSelectorModal';
import LocalModelSelectorModal from '@/components/modals/LocalModelSelectorModal/LocalModelSelectorModal';
import { DEFAULT_LOCAL_MODEL_ID, getLocalModelById } from '@/constants/LocalModels';
import { isLocalLLMSupported } from '@/utils/DeviceCapabilities';
import { GradientBackground } from '@/components/GradientBackground';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { SettingsEvent } from '@/types/mixpanel';
import { useEffect } from 'react';
import CreditPurchaseModal from '@/components/CreditPurchaseModal';
import CreditBadge from '@/components/CreditBadge';

const rawPage = [{
  id: 1,
  key: 'profile',
  title: 'Profile',
  icon: 'person-outline'
}, {
  id: 2,
  key: 'credits',
  title: 'Purchase Credits',
  icon: 'diamond-outline'
}, {
  id: 3,
  key: 'plans-pricing',
  title: 'Plans & Pricing',
  icon: 'card-outline'
}, {
  id: 4,
  key: 'default-model',
  title: 'Default AI Model',
  icon: 'chatbubbles-outline'
}, {
  id: 5,
  key: 'model-manager',
  title: 'Manage Downloaded Models',
  icon: 'folder-open-outline'
}, {
  id: 6,
  key: 'clear-all-chats',
  title: 'Clear All Chats',
  icon: 'trash-outline'
}, {
  id: 7,
  key: 'change-password',
  title: 'Change password',
  icon: 'settings-outline'
}, {
  id: 8,
  key: 'sign_out',
  title: 'Sign Out',
  icon: 'log-out-outline'
}];

interface IItemRaw {
  id: number,
  key: string,
  title: string,
  icon: string
}

const Page = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { signOut } = useAuth();
  const { 
    createNewConversation, 
    isLocalLLMSupported: deviceSupportsLocal,
    clearLocalModel,
    isLocalModelReady,
    localModelDownloadProgress,
    messages,
    isLocal,
    conversations,
    currentConversationId,
    resetChat,
    clearAllConversations
  } = useChat();
  const [isModelSelectorVisible, setIsModelSelectorVisible] = useState(false);
  const [isLocalModelSelectorVisible, setIsLocalModelSelectorVisible] = useState(false);
  const [isCreditPurchaseVisible, setIsCreditPurchaseVisible] = useState(false);
  
  // Use storage.getString/set directly for simple string values to avoid JSON parsing issues
  const [defaultModelId, setDefaultModelIdState] = useState(() => storage.getString('default_model_id') || DEFAULT_MODEL_ID);
  const setDefaultModelId = (value: string) => {
    storage.set('default_model_id', value);
    setDefaultModelIdState(value);
  };
  
  const [defaultLocalModelId, setDefaultLocalModelIdState] = useState(() => storage.getString('default_local_model_id') || DEFAULT_LOCAL_MODEL_ID);
  const setDefaultLocalModelId = (value: string) => {
    storage.set('default_local_model_id', value);
    setDefaultLocalModelIdState(value);
  };

  // Track settings opened
  useEffect(() => {
    mixpanelService.trackSettings(SettingsEvent.SETTINGS_OPENED);
  }, []);

  const handleSignOut = async () => {
    await createNewConversation()
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

  const handleLocalModelSelect = async (modelId: string) => {
    const oldModel = getLocalModelById(defaultLocalModelId);
    const newModel = getLocalModelById(modelId);
    
    // Track default local model changed
    await mixpanelService.trackSettings(SettingsEvent.DEFAULT_MODEL_CHANGED, {
      setting_name: 'default_local_model',
      old_value: oldModel?.displayName || defaultLocalModelId,
      new_value: newModel?.displayName || modelId,
    });
    
    setDefaultLocalModelId(modelId);
  };

  const selectedModel = getModelById(defaultModelId);
  const selectedLocalModel = getLocalModelById(defaultLocalModelId);
  const modelSize = selectedLocalModel?.size || '~1.2GB';

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

  const handleInstruction = async (type: string) => {
    // Track settings section viewed
    await mixpanelService.trackSettings(SettingsEvent.SETTINGS_SECTION_VIEWED, {
      section: type,
    });
    
    switch (type) {
      case 'profile':
        return router.push('/profile')
      case 'credits':
        return setIsCreditPurchaseVisible(true)
      case 'plans-pricing':
        return router.push('/plans-pricing')
      case 'default-model':
        return setIsModelSelectorVisible(true)
      case 'model-manager':
        return router.push('/model-manager')
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
            {item.key === 'model-manager' && deviceSupportsLocal && (
              <Text style={styles.menuItemSubtext}>
                View and manage local models
              </Text>
            )}
            {item.key === 'plans-pricing' && (
              <Text style={styles.menuItemSubtext}>
                Manage subscriptions on web
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
        ) : (
          <Ionicons name="chevron-forward" size={20} color={theme.colors.greyLight} />
        )}
      </Pressable>
    )
  }
  
  // Filter menu items based on device support
  const visibleMenuItems = rawPage.filter(item => {
    // Hide model-manager option if device doesn't support local models
    if (item.key === 'model-manager' && !deviceSupportsLocal) {
      return false;
    }
    return true;
  });

  return (
    <GradientBackground variant="background">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.menuContainer}>
            {visibleMenuItems.map((item, index) => renderRaw(item, index, visibleMenuItems))}
          </View>
          <View style={styles.footer}>
            {/* Logo commented out */}
            {/* <Image source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')} style={styles.logo} /> */}
            <Text style={styles.appTitle}>Odyssey</Text>
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
      <LocalModelSelectorModal
        visible={isLocalModelSelectorVisible}
        onClose={() => setIsLocalModelSelectorVisible(false)}
        selectedModelId={defaultLocalModelId}
        onSelectModel={handleLocalModelSelect}
      />
      <CreditPurchaseModal
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
    backgroundColor: 'transparent', // Let gradient show through
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Let gradient show through
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingTop: 20,
    flex: 1,
  },
  menuContainer: {
    minHeight: 600,
    borderRadius: 16,
    backgroundColor: theme.colors.card, // Solid background for efficient shadow calculation
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.greyLight,
  },
  menuItemPressed: {
    backgroundColor: theme.colors.selected,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  menuItemSubtext: {
    fontSize: 13,
    color: theme.colors.greyLight,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    marginBottom: 80,
    paddingTop: 20,
  },
  logo: {
    width: 150,
    height: 75,
    marginBottom: 10,
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
    fontSize: 12,
    color: theme.colors.greyLight,
  },
});

export default Page;