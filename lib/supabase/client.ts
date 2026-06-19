/**
 * Supabase client (single shared instance).
 *
 * Backend for auth + chat persistence after the move off the FastAPI backend.
 * Session is persisted in AsyncStorage and auto-refreshed while the app is
 * foregrounded (the standard React Native pattern).
 */
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
// New-style publishable key (sb_publishable_...), the client-safe replacement
// for the legacy anon key. Never use the secret key (sb_secret_...) here — it
// bypasses RLS and would be shipped in the app bundle.
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  // Fail loudly in dev; in prod this surfaces as a clear startup error rather
  // than a confusing "fetch failed" deep inside an auth call.
  console.error(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. ' +
      'Set them in .env (see .env.example).'
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabasePublishableKey ?? '', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // No URL-based session detection on native (deep-link OAuth handled explicitly).
    detectSessionInUrl: false,
  },
});

// Keep the session fresh only while the app is in the foreground. Supabase
// recommends pausing the refresh timer in the background to avoid wasted work.
let appStateSubscription: { remove: () => void } | null = null;

export function registerSupabaseAutoRefresh() {
  if (appStateSubscription) return;
  appStateSubscription = AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
  // Kick it off immediately if we're already active at registration time.
  if (AppState.currentState === 'active') {
    supabase.auth.startAutoRefresh();
  }
}
