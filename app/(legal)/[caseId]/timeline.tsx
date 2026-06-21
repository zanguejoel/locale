import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listEvents } from '@/lib/cases/events';
import { CaseEvent } from '@/lib/cases/types';

/**
 * Chronological timeline of every dated event extracted from chat or
 * documents for this case, oldest first.
 */
export default function CaseTimeline() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!caseId) return;
    const rows = await listEvents(caseId);
    setEvents(rows);
    setLoading(false);
  }, [caseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <GradientBackground variant="background" style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <View style={styles.railCol}>
              <View style={styles.dot} />
              {index < events.length - 1 && <View style={styles.rail} />}
            </View>
            <GlassSurface style={styles.card} borderRadius={14}>
              <Text style={styles.date}>{formatDate(item.date)}</Text>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={styles.source}>{sourceLabel(item.source)}</Text>
            </GlassSurface>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={44} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>No timeline events yet</Text>
            <Text style={styles.emptyText}>
              Dates mentioned in chat or found in uploaded documents will appear here in order.
            </Text>
          </View>
        }
      />
    </GradientBackground>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceLabel(source: string): string {
  if (source === 'document') return 'From a document';
  if (source === 'manual') return 'Added manually';
  return 'From chat';
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40 },
  row: { flexDirection: 'row', gap: 10 },
  railCol: { width: 16, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.primary, marginTop: 18 },
  rail: { flex: 1, width: 2, backgroundColor: theme.colors.primary + '33' },
  card: { flex: 1, padding: 12, marginBottom: 12 },
  date: { fontSize: 12, fontWeight: '700', color: theme.colors.primary, marginBottom: 2 },
  label: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  source: { fontSize: 11, color: theme.colors.mutedForeground, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  emptyText: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 18 },
});
