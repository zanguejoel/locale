import { Stack, useRouter } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { LocaleGlass } from '@/constants/LocaleColors';
import { useEmbeddingsGlobal } from '@/hooks/useEmbeddingsGlobal';

/**
 * Freelancer Hub workspace stack. Header tint matches the glassmorphic chat
 * header, same convention as the Legal Navigator stack.
 */
export default function FreelancerLayout() {
  const theme = useTheme();
  const router = useRouter();
  const glass = theme.isDark ? LocaleGlass.dark : LocaleGlass.light;

  // RAG over clients/projects/invoices/expenses/contracts needs the same
  // on-device embeddings model Legal Navigator uses — loads in the
  // background, retrieval falls back to lexical matching until ready.
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
          title: 'Freelancer Hub',
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
      <Stack.Screen name="chat" options={{ title: 'Business Assistant' }} />
      <Stack.Screen name="clients/index" options={{ title: 'Clients' }} />
      <Stack.Screen name="clients/new" options={{ title: 'New Client', presentation: 'modal' }} />
      <Stack.Screen name="clients/[clientId]" options={{ title: 'Client' }} />
      <Stack.Screen name="projects/index" options={{ title: 'Projects' }} />
      <Stack.Screen name="projects/new" options={{ title: 'New Project', presentation: 'modal' }} />
      <Stack.Screen name="projects/[projectId]" options={{ title: 'Project' }} />
      <Stack.Screen name="invoices/index" options={{ title: 'Invoices' }} />
      <Stack.Screen name="invoices/new" options={{ title: 'New Invoice', presentation: 'modal' }} />
      <Stack.Screen name="invoices/[invoiceId]" options={{ title: 'Invoice' }} />
      <Stack.Screen name="expenses/index" options={{ title: 'Expenses' }} />
      <Stack.Screen name="expenses/new" options={{ title: 'New Expense', presentation: 'modal' }} />
      <Stack.Screen name="contracts/index" options={{ title: 'Contracts' }} />
      <Stack.Screen name="contracts/new" options={{ title: 'New Contract', presentation: 'modal' }} />
      <Stack.Screen name="contracts/[contractId]" options={{ title: 'Contract' }} />
      <Stack.Screen name="reports" options={{ title: 'Reports' }} />
      <Stack.Screen name="taxes" options={{ title: 'Taxes' }} />
    </Stack>
  );
}
