import FontAwesome from "@expo/vector-icons/FontAwesome";
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

import { useColorScheme } from "@/components/useColorScheme";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SQLiteProvider } from "expo-sqlite";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { migrateDbIfNeeded } from "@/utils/Database";
import Colors from "@/constants/Colors";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

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

const Layout = () => {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const { user, isLoading, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();



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
      // console.log("User----", user)
      router.replace("/(chat)/new");
    } else if (!isSignedIn) {
      router.replace("/login");
    }
  }, [isSignedIn]);

  if (!loaded || isLoading) {
    return <Slot />;
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="registration" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="(chat)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(modal)/settings"
        options={{
          headerTitle: "Settings",
          presentation: "modal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: Colors.selected },
          headerRight: () => <></>,
        }}
      />
      <Stack.Screen
        name="(modal)/image/[url]"
        options={{
          headerTitle: "",
          presentation: "fullScreenModal",
          headerBlurEffect: "dark",
          headerStyle: { backgroundColor: "rgba(0,0,0,0.4)" },
          headerTransparent: true,
          headerShadowVisible: false,
          headerLeft: () => <></>,
        }}
      />
      <Stack.Screen
        name="(modal)/purchase"
        options={{
          headerTitle: "",
          presentation: "fullScreenModal",
          headerShadowVisible: false,
          headerLeft: () => <></>,
        }}
      />
    </Stack>
  );
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <SQLiteProvider databaseName="chat.db" onInit={migrateDbIfNeeded}>
        <ThemeProvider
          value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Layout />
          </GestureHandlerRootView>
        </ThemeProvider>
      </SQLiteProvider>
    </AuthProvider>
  );
}
