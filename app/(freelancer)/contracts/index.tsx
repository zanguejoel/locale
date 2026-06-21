import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listContracts } from '@/lib/freelance/contracts';
import { Contract } from '@/lib/freelance/types';

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(`${dateStr}T00:00:00`).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function ContractsList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setContracts(await listContracts());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Contract }) => {
    const expiry = item.renewalDate ?? item.endDate;
    const days = daysUntil(expiry);
    const expiringSoon = days !== null && days >= 0 && days <= 30;
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(freelancer)/contracts/${item.id}` as any)}>
        <GlassSurface style={styles.row} borderRadius={16}>
          <View style={styles.rowMain}>
            <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
            <Text style={styles.meta}>{item.type}{expiry ? ` · expires ${expiry}` : ''}</Text>
          </View>
          {expiringSoon && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{days}d left</Text>
            </View>
          )}
        </GlassSurface>
      </TouchableOpacity>
    );
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-lock-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>No contracts yet</Text>
              <Text style={styles.emptyText}>Upload an NDA, service agreement, or SOW to track key dates and terms.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/contracts/new' as any)}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabText}>New Contract</Text>
      </TouchableOpacity>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 120, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowMain: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  badge: { backgroundColor: '#ef444422', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#ef4444' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  emptyText: { fontSize: 14, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 20 },
  fab: {
    position: 'absolute', right: 16, bottom: 32, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6,
  },
  fabText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
