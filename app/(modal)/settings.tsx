import Colors from '@/constants/Colors';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, SafeAreaView, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from "react";
import { useChat } from '@/hooks/useChat';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';

const rawPage = [{
  id: 1,
  key: 'profile',
  title: 'Profile',
  icon: 'person-outline'
}, {
  id: 2,
  key: 'change-password',
  title: 'Change password',
  icon: 'settings-outline'
}, {
  id: 3,
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
  const { createNewConversation } = useChat();


  const handleSignOut = async () => {
    await createNewConversation()
    signOut()
  }
  const handleInstruction = (type: string) => {
    switch (type) {
      case 'profile':
        return router.push('/profile')
      case 'change-password':
        return router.push('/change-password')
      case 'sign_out':
        return handleSignOut()
    }
  }

  const renderRaw = (item: IItemRaw, index: number) => {
    return (
      <Pressable
        key={item.id}
        style={({ pressed }) => [
          styles.menuItem,
          pressed && styles.menuItemPressed,
          rawPage.length - 1 === index && styles.menuItemLast
        ]}
        onPress={() => handleInstruction(item.key)}
      >
        <View style={styles.menuItemContent}>
          <View style={styles.iconContainer}>
            <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
          </View>
          <Text style={styles.menuItemText}>{item.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.greyLight} />
      </Pressable>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.contentContainer}>
          <View style={styles.menuContainer}>
            {rawPage.map((item, index) => renderRaw(item, index))}
          </View>
          <View style={styles.footer}>
            <Image source={theme.isDark ? require('@/assets/images/Jaiimelogodark.png') : require('@/assets/images/Jaiimelogowhite.png')} style={styles.logo} />
            <Text style={styles.appVersion}>App Version 1.0.0</Text>
          </View>
        </View>
      </ScrollView>
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
  menuItemText: {
    fontSize: 16,
    color: theme.colors.text,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  logo: {
    width: 150,
    height: 75,
    marginBottom: 10,
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