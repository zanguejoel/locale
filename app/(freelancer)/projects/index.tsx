import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listProjects } from '@/lib/freelance/projects';
import { listClients } from '@/lib/freelance/clients';
import { Project, ProjectStatus, Client } from '@/lib/freelance/types';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  active: '#22c55e',
  completed: '#3b82f6',
  on_hold: '#f59e0b',
  cancelled: '#64748b',
};

export default function ProjectsList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [p, clients] = await Promise.all([listProjects(), listClients()]);
      setProjects(p);
      setClientsById(Object.fromEntries(clients.map((c) => [c.id, c])));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Project }) => (
    <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(freelancer)/projects/${item.id}` as any)}>
      <GlassSurface style={styles.row} borderRadius={16}>
        <View style={styles.rowMain}>
          <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {clientsById[item.clientId]?.name ?? 'Unknown client'} · ${item.hourlyRate}/hr
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] }]}>{item.status.replace('_', ' ')}</Text>
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
          data={projects}
          keyExtractor={(p) => p.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="briefcase-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptyText}>Create a project under a client to start tracking hours and invoices.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/projects/new' as any)}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabText}>New Project</Text>
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
