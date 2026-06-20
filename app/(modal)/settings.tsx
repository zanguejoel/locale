import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from "react";
import { useChat } from '@/hooks/useChat';
import { Theme } from '@/constants/Types';
import { useTheme, ThemeMode, setThemeMode } from '@/hooks/useTheme';
import useMMKVStorage from '@/hooks/useMMKVStorage';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassCard } from '@/components/GlassSurface';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { SettingsEvent } from '@/types/mixpanel';
import { useEffect } from 'react';

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
  const {
    createNewConversation, 
    messages,
    conversations,
    currentConversationId,
    resetChat,
    clearAllConversations
  } = useChat();
  // Track settings opened
  useEffect(() => {
    mixpanelService.trackSettings(SettingsEvent.SETTINGS_OPENED);
  }, []);

  const handleSignOut = async () => {
    signOut()
  }

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
            {item.key === 'theme' && (
              <Text style={styles.menuItemSubtext}>
                {theme.themeMode.charAt(0).toUpperCase() + theme.themeMode.slice(1)}
              </Text>
            )}
            {item.key === 'clear-all-chats' && (
              <Text style={styles.menuItemSubtext}>
                Delete all conversations
              </Text>
            )}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.greyLight} />
      </Pressable>
    )
  }
  
  const visibleMenuItems = rawPage;

  return (
    <GradientBackground variant="background">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          <GlassCard style={styles.menuContainer} padding={0} borderRadius={16}>
            {visibleMenuItems.map((item, index) => renderRaw(item, index, visibleMenuItems))}
          </GlassCard>
          
          <View style={styles.footer}>
            {/* Logo commented out */}
           <Image source={theme.isDark ? require('@/assets/images/Localelogodark.png') : require('@/assets/images/Localelogowhite.png')} style={styles.logo} />
            
            <Text style={styles.appVersion}>App Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
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
  menuContainer: {},
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
    width: 160,
    height: 41,
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