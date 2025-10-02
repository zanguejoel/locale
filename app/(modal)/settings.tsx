import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from "react";
import { useChat } from '@/hooks/useChat';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import useMMKVStorage from '@/hooks/useMMKVStorage';
import { DEFAULT_MODEL_ID, getModelById } from '@/constants/Models';
import ModelSelectorModal from '@/components/modals/ModelSelectorModal/ModelSelectorModal';
import LocalModelSelectorModal from '@/components/modals/LocalModelSelectorModal/LocalModelSelectorModal';
import { DEFAULT_LOCAL_MODEL_ID, getLocalModelById } from '@/constants/LocalModels';
import { isLocalLLMSupported } from '@/utils/DeviceCapabilities';

const rawPage = [{
  id: 1,
  key: 'profile',
  title: 'Profile',
  icon: 'person-outline'
}, {
  id: 2,
  key: 'default-model',
  title: 'Default AI Model',
  icon: 'chatbubbles-outline'
}, {
  id: 3,
  key: 'local-model',
  title: 'Local AI Model',
  icon: 'phone-portrait-outline'
}, {
  id: 4,
  key: 'clear-model',
  title: 'Clear Downloaded Models',
  icon: 'trash-outline'
}, {
  id: 5,
  key: 'change-password',
  title: 'Change password',
  icon: 'settings-outline'
}, {
  id: 6,
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
    localModelDownloadProgress
  } = useChat();
  const [isModelSelectorVisible, setIsModelSelectorVisible] = useState(false);
  const [isLocalModelSelectorVisible, setIsLocalModelSelectorVisible] = useState(false);
  const [defaultModelId, setDefaultModelId] = useMMKVStorage('default_model_id', DEFAULT_MODEL_ID);
  const [defaultLocalModelId, setDefaultLocalModelId] = useMMKVStorage('default_local_model_id', DEFAULT_LOCAL_MODEL_ID);

  const handleSignOut = async () => {
    await createNewConversation()
    signOut()
  }

  const handleModelSelect = (modelId: string) => {
    setDefaultModelId(modelId);
  };

  const handleLocalModelSelect = (modelId: string) => {
    setDefaultLocalModelId(modelId);
  };

  const selectedModel = getModelById(defaultModelId);
  const selectedLocalModel = getLocalModelById(defaultLocalModelId);
  const modelSize = selectedLocalModel?.size || '~80MB';

  const handleInstruction = (type: string) => {
    switch (type) {
      case 'profile':
        return router.push('/profile')
      case 'default-model':
        return setIsModelSelectorVisible(true)
      case 'local-model':
        return setIsLocalModelSelectorVisible(true)
      case 'clear-model':
        return clearLocalModel()
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
            {item.key === 'local-model' && selectedLocalModel && (
              <Text style={styles.menuItemSubtext}>
                {deviceSupportsLocal ? selectedLocalModel.displayName : 'Not supported'}
              </Text>
            )}
            {item.key === 'clear-model' && deviceSupportsLocal && (
              <Text style={styles.menuItemSubtext}>
                {isLocalModelReady 
                  ? `Model downloaded (${modelSize})` 
                  : localModelDownloadProgress > 0 
                    ? `Downloading ${Math.round(localModelDownloadProgress * 100)}%` 
                    : 'No model downloaded'}
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.greyLight} />
      </Pressable>
    )
  }
  
  // Filter menu items based on device support
  const visibleMenuItems = rawPage.filter(item => {
    // Hide local-model and clear-model options if device doesn't support it
    if ((item.key === 'local-model' || item.key === 'clear-model') && !deviceSupportsLocal) {
      return false;
    }
    return true;
  });

  return (
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
    </SafeAreaView>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingTop: 20,
    flex: 1,
  },
  menuContainer: {
    minHeight: 600,
    borderRadius: 16,
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