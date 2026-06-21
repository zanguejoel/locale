import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Ionicons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot, Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";
import { TouchableOpacity, View } from "react-native";
import 'text-encoding-polyfill';

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Colors from "@/constants/Colors";
import { ChatProvider } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MixpanelProvider } from "@/utils/mixpanel/MixpanelProvider";
import { StreamingStateProvider } from "@/contexts/StreamingStateContext";
import { RootSiblingParent } from 'react-native-root-siblings';
import { NotificationProvider, useNotification } from "@/contexts/NotificationContext";
import BackgroundStreamNotification from "@/components/BackgroundStreamNotification";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Polyfill TextDecoder with memory leak prevention
if (typeof global.TextDecoder !== 'undefined') {
  const OriginalTextDecoder = global.TextDecoder;
  const MAX_DECODERS = 5; // Limit cache size to prevent unbounded growth
  const decoderMap = new Map<string, any>();

  global.TextDecoder = function(encoding = 'utf-8', options = {}) {
    const key = encoding.toLowerCase();
    
    if (key === 'latin1' || key === 'iso-8859-1') {
      if (!decoderMap.has(key)) {
        // Prevent unbounded growth by removing oldest entry
        if (decoderMap.size >= MAX_DECODERS) {
          const firstKey = decoderMap.keys().next().value;
          if (firstKey) {
            decoderMap.delete(firstKey);
          }
        }
        decoderMap.set(key, new OriginalTextDecoder('utf-8', options));
      }
      return decoderMap.get(key);
    }
    
    return new OriginalTextDecoder(encoding, options);
  } as any;

  global.TextDecoder.prototype = OriginalTextDecoder.prototype;
  
  // Clean up decoder map when app goes to background
  if (typeof require !== 'undefined') {
    try {
      const { AppState } = require('react-native');
      AppState.addEventListener('change', (nextAppState: string) => {
        if (nextAppState === 'background') {
          decoderMap.clear();
        }
      });
    } catch (e) {
      // AppState not available, skip cleanup listener
      console.warn('[TextDecoder] AppState listener not added:', e);
    }
  }
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const CustomBackButton = () => {
  const router = useRouter();
  const theme = useTheme();

  return (
    <TouchableOpacity
      onPress={() => router.back()}
      style={{ marginLeft: 8 }}
    >
      <Ionicons name="chevron-back" size={24} color={theme.colors.grey} />
    </TouchableOpacity>
  );
};

const Layout = () => {
  // Fonts are already loaded in RootLayout - no need to duplicate
  const { user, isInitialLoading, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  useEffect(() => {
    if (isInitialLoading) return;

    // const notInAuthGroup = ["login", "registration"].includes(segments[0]);

    if (user?.email) {
      router.replace("/(chat)/new");
    } else if (!isSignedIn) {
      console.log('[Layout] User not signed in, redirecting to login');
      router.replace("/login");
    }
  }, [isSignedIn, user, isInitialLoading]);

  if (isInitialLoading) {
    return <Slot />;
  }

  return (
    <Stack
      screenOptions={{
        headerLeft: CustomBackButton,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
      }}
    >

      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="registration" options={{ headerShown: false }} />
      <Stack.Screen name="success-page" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password-change" options={{ headerShown: false }} />

      <Stack.Screen name="email-verification" options={{ headerShown: false }} />
      <Stack.Screen
        name="change-password"
        options={{
          headerTitle: "Change Password",
          presentation: "modal",

          headerTintColor: theme.colors.text,

          headerTitleStyle: { color: theme.colors.text },
          headerStyle: { backgroundColor: theme.colors.background },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          headerTitle: "Profile",
         // presentation: "modal",
          headerTintColor: theme.colors.light,
          headerTitleStyle: { color: theme.colors.text },
          headerStyle: { backgroundColor: theme.colors.background },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="(chat)" options={{ headerShown: false }} />
      <Stack.Screen name="(legal)" options={{ headerShown: false }} />
      <Stack.Screen name="(freelancer)" options={{ headerShown: false }} />

      <Stack.Screen
        name="(modal)/settings"
        options={{
          headerTitle: "Settings",
          headerTitleAlign: 'center',
          headerTintColor: theme.colors.text,
          headerTitleStyle: { color: theme.colors.text },
          headerStyle: { backgroundColor: theme.colors.background },
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={theme.colors.text} />
            </TouchableOpacity>
          ),
        }}
      />
<Stack.Screen
        name="(modal)/image/[url]"
        options={{
          headerTitle: "",
          presentation: "fullScreenModal",
          headerBlurEffect: theme.isDark ? "dark" : "light",
          headerStyle: { backgroundColor: theme.isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)" },
          headerTransparent: true,
          headerShadowVisible: false,
          headerLeft: () => null,
        }}
      />
      <Stack.Screen
        name="(modal)/purchase"
        options={{
          headerTitle: "",
          presentation: "fullScreenModal",
          headerShadowVisible: false,
          headerLeft: () => null,
        }}
      />
    </Stack>
  );
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <RootSiblingParent>
      <SafeAreaProvider >
      <AuthProvider>
            <NotificationProvider>
              <StreamingStateProvider>
                <ChatProvider>
                    <MixpanelProvider>
                      <ThemeProvider
                        value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
                      >
                        <GestureHandlerRootView style={{ flex: 1 }}>
                          <Layout />
                          <NotificationLayer />
                        </GestureHandlerRootView>
                      </ThemeProvider>
                    </MixpanelProvider>
                </ChatProvider>
              </StreamingStateProvider>
            </NotificationProvider>
      </AuthProvider>
      </SafeAreaProvider>
    </RootSiblingParent>
  );
}

// Notification layer that renders above all content with queue support
const NotificationLayer: React.FC = () => {
  const { notificationVisible, notificationData, hideNotification, queueSize } = useNotification();
  const router = useRouter();
  
  const handleNotificationPress = () => {
    const conversationId = notificationData?.conversationId;
    if (conversationId) {
      // Convert to string (handles both number and string IDs)
      const idString = String(conversationId);
      
      // Check if this is a placeholder ID (new chat without ID)
      const isPlaceholder = idString.startsWith('new-chat-');
      
      if (isPlaceholder) {
        // Placeholder ID - just dismiss (can't navigate without real ID)
        console.log('[NotificationLayer] 📱 Placeholder notification - dismissing');
        hideNotification();
        // User can navigate to "New Chat" manually from conversations list
        return;
      }
      
      // Check if this is a combined notification (comma-separated IDs)
      const isCombined = idString.includes(',');
      
      if (isCombined) {
        // For combined notifications, just dismiss and let user check conversations list
        console.log('[NotificationLayer] 📱 Combined notification - multiple conversations');
        hideNotification();
        // Could navigate to conversations list or show a modal with all conversations
      } else {
        // Single conversation - navigate directly
        console.log('[NotificationLayer] 📱 Navigating to conversation:', conversationId);
        router.push(`/(chat)/${conversationId}`);
      }
    }
  };
  
  // Check if current notification is combined (with proper null safety)
  // Guard against undefined conversationId and convert numbers to strings
  const conversationId = notificationData?.conversationId;
  const idString = conversationId ? String(conversationId) : '';
  const isCombined = idString.includes(',');
  const count = isCombined 
    ? idString.split(',').length 
    : undefined;
  
  // Don't render if we don't have valid data
  if (!notificationVisible || !notificationData) {
    return null;
  }
  
  return (
    <BackgroundStreamNotification
      visible={notificationVisible}
      message={notificationData.message || ''}
      chatTitle={notificationData.chatTitle || 'Chat'}
      onDismiss={hideNotification}
      onPress={handleNotificationPress}
      isCombined={isCombined}
      count={count}
    />
  );
};