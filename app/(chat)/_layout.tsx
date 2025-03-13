import { Drawer } from 'expo-router/drawer';
import { useRouter } from 'expo-router';

import {
  Image,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  Alert,

} from 'react-native';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import { useChat } from '@/hooks/useChat';
import React from 'react';

import { CustomDrawerContent } from '@/components/ChatCustomDrawerContent';

const Layout = () => {
  const dimensions = useWindowDimensions();
  const router = useRouter();
  const { createNewConversation, resetChat } = useChat();

  const handleNewChat = async () => {
    try {
      // Create a new conversation and get its ID
      const newChatId = await createNewConversation();

      // Navigate to the new conversation
      router.push(`/(chat)/${newChatId}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      Alert.alert('Error', 'Failed to create a new chat');

      // If there's an error, still try to navigate to the new chat route
      resetChat();
      router.push('/(chat)/new');
    }
  };

  return (
    <Drawer
      drawerContent={CustomDrawerContent}
      screenOptions={(navigation) => ({
        /*   headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigation.toggleDrawer()}
              style={styles.headerButton}>
                <Ionicons name="menu-sharp" size={22} color={Colors.grey} />
            </TouchableOpacity>
          ), */
        headerTintColor: Colors.light.tint,
        headerStyle: {
          backgroundColor: Colors.light.background,
          height: 110,
        },
        headerShadowVisible: true,
        drawerActiveBackgroundColor: Colors.selected,
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#000',
        overlayColor: 'rgba(0, 0, 0, 0.2)',
        drawerItemStyle: { borderRadius: 12 },
        drawerLabelStyle: { marginLeft: -20 },
        drawerStyle: {
          width: dimensions.width * 0.85,
          backgroundColor: '#FFFFFF',
        },
        drawerType: 'front',
        drawerAnimationType: 'slide',
        drawerAnimationDuration: 300,
      })}>
      <Drawer.Screen
        name="new"

        getId={() => Math.random().toString()}
        options={{
          title: 'Jaiime AI',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.headerLogo} />
              <Text style={styles.headerTitle}>Jaiime AI</Text>
            </View>
          ),
          drawerIcon: () => (
            <View style={styles.drawerIconContainer}>
              <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.drawerIcon} />
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
              <Ionicons
                name="add"
                size={24}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen
        name="[id]"
        options={{
          title: 'Jaiime AI',
          drawerItemStyle: {
            display: 'none',
          },
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
              <Ionicons
                name="add"
                size={24}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
          ),
        }}
      />
    </Drawer>
  );
};

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 15,
    color: Colors.grey,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.grey,
  },
  drawerIconContainer: {
    backgroundColor: '#F5F5F5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerIcon: {
    width: 20,
    height: 20,
  },
});

export default Layout;