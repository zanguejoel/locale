import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { GradientBackground } from '@/components/GradientBackground';

/**
 * Temporary placeholder for Procedure Hub sub-tabs whose full implementation
 * lands in later build steps (chat, documents, timeline, deadlines, export).
 */
export function TabPlaceholder({ icon, title, note }: { icon: string; title: string; note: string }) {
  const theme = useTheme();
  return (
    <GradientBackground variant="background" style={styles.container}>
      <View style={styles.inner}>
        <Ionicons name={icon as any} size={44} color={theme.colors.primary} />
        <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
        <Text style={[styles.note, { color: theme.colors.mutedForeground }]}>{note}</Text>
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 10 },
  title: { fontSize: 18, fontWeight: '700' },
  note: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
