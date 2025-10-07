
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
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useChat } from '@/hooks/useChat';
import React from 'react';

import { CustomDrawerContent } from '@/components/ChatCustomDrawerContent';
import ChatPage from './new';
import ChatPageId from '../../components/ChatPage';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import ChatErrorBoundary from '@/components/ChatErrorBoundary';

const Drawer = createDrawerNavigator();

const Layout = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { createNewConversation, resetChat } = useChat();

  const handleNewChat = async () => {
    try {
      // Create a new conversation and get its ID
      const newChatId = await createNewConversation();

      // Navigate to the new conversation
      router.push(`/(chat)/${newChatId}`);
    } catch (error) {
      // console.error('Error creating new chat:', error);
      Alert.alert('Error', 'Failed to create a new chat');

      // If there's an error, still try to navigate to the new chat route
      resetChat();
      router.push('/(chat)/new');
    }
  };

  const handleErrorReset = () => {
    // Reset chat state when recovering from error
    resetChat();
    router.push('/(chat)/new');
  };

  return (
    <ChatErrorBoundary onReset={handleErrorReset}>
      <View style={{ flex: 1 }}>

        <Drawer.Navigator
          drawerContent={(props) => <CustomDrawerContent {...props} />}
          screenOptions={{
            drawerActiveBackgroundColor: '#selectedColor',
            drawerActiveTintColor: '#000',
            drawerInactiveTintColor: '#000',
            headerTintColor: Colors.light.tint,
            headerStyle: {
              backgroundColor: theme.colors.background,
              height: 110,
            },
            headerShadowVisible: true,
            overlayColor: 'rgba(0, 0, 0, 0.2)',
            drawerItemStyle: { borderRadius: 12 },
            drawerLabelStyle: { marginLeft: -20 },
            drawerStyle: {
              backgroundColor: '#FFFFFF',
            },
            drawerType: 'slide',
            swipeEdgeWidth: 50,
            swipeMinDistance: 10,
          }}
        >



          <Drawer.Screen name="new" component={ChatPage} options={{
            title: 'Odyssey',
            headerRight: () => (
              <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
                <Ionicons
                  name="add"
                  size={24}
                  color={Colors.light.tint}
                />
              </TouchableOpacity>
            ),
          }} />

          <Drawer.Screen name="[id]"
            component={ChatPageId} options={{
              title: 'Odyssey',
              headerRight: () => (
                <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
                  <Ionicons
                    name="add"
                    size={24}
                    color={Colors.light.tint}
                  />
                </TouchableOpacity>
              ),
            }} />

        </Drawer.Navigator>
      </View>
    </ChatErrorBoundary>

  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.grey,
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
    color: theme.colors.grey,
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