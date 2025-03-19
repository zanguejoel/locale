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
import { ChatProvider, useChat } from "@/hooks/useChat";
import { useTheme } from "@/hooks/useTheme";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Polyfill TextDecoder
if (typeof global.TextDecoder !== 'undefined') {
  const OriginalTextDecoder = global.TextDecoder;
  const decoderMap = new Map();

  global.TextDecoder = function(encoding = 'utf-8', options = {}) {
    const key = encoding.toLowerCase();
    
    if (key === 'latin1' || key === 'iso-8859-1') {
      if (!decoderMap.has(key)) {
        decoderMap.set(key, new OriginalTextDecoder('utf-8', options));
      }
      return decoderMap.get(key);
    }
    
    return new OriginalTextDecoder(encoding, options);
  } as any;

  global.TextDecoder.prototype = OriginalTextDecoder.prototype;
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
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { user, isLoading, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const theme = useTheme();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (isLoading) return;

    // const notInAuthGroup = ["login", "registration"].includes(segments[0]);

    if (user?.email) {
      router.replace("/(chat)/new");
    } else if (!isSignedIn) {
      router.replace("/login");
    }
  }, [isSignedIn]);

  if (!loaded || isLoading) {
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
          presentation: "modal",
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
    <AuthProvider>
      <ChatProvider>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Layout />
          </GestureHandlerRootView>
        </ThemeProvider>
      </ChatProvider>
    </AuthProvider>
  );
}