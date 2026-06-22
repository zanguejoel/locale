import { Stack } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { LocaleGlass } from '@/constants/LocaleColors';
import { useEmbeddingsGlobal } from '@/hooks/useEmbeddingsGlobal';

/**
 * Procedure Hub workspace stack. Header tint matches the glassmorphic chat
 * header. Individual case tabs are nested under [caseId].
 */
export default function LegalLayout() {
  const theme = useTheme();
  const router = useRouter();
  const glass = theme.isDark ? LocaleGlass.dark : LocaleGlass.light;

  // Lazily load the on-device embeddings model for case RAG. Loads silently
  // in the background — retrieval falls back to lexical matching until it's
  // ready, so this never blocks the workspace from being usable.
  useEmbeddingsGlobal();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: glass.surfaceFillStrong },
        headerTitleStyle: { color: theme.colors.text, fontWeight: '700' },
        headerTintColor: theme.colors.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Procedure Hub',
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.canGoBack() ? router.back() : router.replace('/(chat)/new')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.Screen name="new" options={{ title: 'New Case', presentation: 'modal' }} />
      <Stack.Screen name="[caseId]/index" options={{ title: 'Case' }} />
      <Stack.Screen name="[caseId]/chat" options={{ title: 'Legal Research' }} />
      <Stack.Screen name="[caseId]/documents" options={{ title: 'Documents' }} />
      <Stack.Screen name="[caseId]/timeline" options={{ title: 'Timeline' }} />
      <Stack.Screen name="[caseId]/deadlines" options={{ title: 'Deadlines' }} />
      <Stack.Screen name="[caseId]/followup" options={{ title: 'Generate Follow-Up' }} />
      <Stack.Screen name="[caseId]/exports" options={{ title: 'Export Case' }} />
    </Stack>
  );
}
