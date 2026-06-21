import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listClients } from '@/lib/freelance/clients';
import { Client, ClientStatus } from '@/lib/freelance/types';

const STATUS_COLORS: Record<ClientStatus, string> = {
  active: '#22c55e',
  inactive: '#64748b',
  prospect: '#f59e0b',
};

export default function ClientsList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setClients(await listClients());
    } catch (e) {
      console.error('[Freelancer] Failed to load clients:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Client }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(freelancer)/clients/${item.id}` as any)}>
      <GlassSurface style={styles.row} borderRadius={16}>
        <View style={styles.rowMain}>
          <Text style={styles.title} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>{item.company || item.email || 'No details'}</Text>
        </View>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>{item.status}</Text>
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
          data={clients}
          keyExtractor={(c) => c.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>No clients yet</Text>
              <Text style={styles.emptyText}>Add a client to start tracking projects and invoices for them.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/clients/new' as any)}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabText}>New Client</Text>
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
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
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
