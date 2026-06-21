import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listCases } from '@/lib/cases/cases';
import { LegalCase, CaseStatus } from '@/lib/cases/types';
import { legalModule, LEGAL_DISCLAIMER } from '@/lib/navigators/legal';

const STATUS_COLORS: Record<CaseStatus, string> = {
  Open: '#3b82f6',
  'In Progress': '#f59e0b',
  Waiting: '#8b5cf6',
  Closed: '#64748b',
};

export default function ActiveCases() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [cases, setCases] = useState<LegalCase[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await listCases(legalModule.id);
      setCases(data);
    } catch (e) {
      console.error('[Legal] Failed to load cases:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the screen regains focus (e.g. after creating a case).
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: LegalCase }) => (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/(legal)/${item.id}` as any)}
    >
      <GlassSurface style={styles.caseRow} borderRadius={16}>
        <View style={styles.caseRowMain}>
          <Text style={styles.caseTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.caseMeta} numberOfLines={1}>
            {item.category}{item.jurisdiction ? ` · ${item.jurisdiction}` : ''}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
        </View>
      </GlassSurface>
    </TouchableOpacity>
  );

  return (
    <GradientBackground variant="background" style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={cases}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>No cases yet</Text>
              <Text style={styles.emptyText}>
                Create a case to organize a legal matter, track deadlines, and prepare
                information for a lawyer.
              </Text>
            </View>
          }
          ListFooterComponent={
            <Text style={styles.disclaimer}>{LEGAL_DISCLAIMER}</Text>
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => router.push('/(legal)/new' as any)}
        accessibilityLabel="New case"
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabText}>New Case</Text>
      </TouchableOpacity>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 120, gap: 10 },
  caseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  caseRowMain: { flex: 1 },
  caseTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, letterSpacing: -0.2 },
  caseMeta: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  emptyText: { fontSize: 14, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  disclaimer: {
    fontSize: 11,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 8,
    lineHeight: 16,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
