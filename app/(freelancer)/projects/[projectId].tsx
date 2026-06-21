import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { getProject } from '@/lib/freelance/projects';
import { getClient } from '@/lib/freelance/clients';
import { listInvoices } from '@/lib/freelance/invoices';
import { Project, Client, Invoice } from '@/lib/freelance/types';

export default function ProjectDetail() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { projectId } = useLocalSearchParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!projectId) return;
    try {
      const p = await getProject(projectId);
      setProject(p);
      if (p) {
        const [c, allInvoices] = await Promise.all([getClient(p.clientId), listInvoices(p.clientId)]);
        setClient(c);
        setInvoices(allInvoices.filter((i) => i.projectId === projectId));
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !project) {
    return (
      <GradientBackground variant="background" style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: project.title }} />
      <FlatList
        data={invoices}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <GlassSurface style={styles.summaryCard} borderRadius={16}>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectMeta}>{client?.name ?? 'Unknown client'}</Text>
              {!!project.description && <Text style={styles.projectDescription}>{project.description}</Text>}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>${project.hourlyRate}</Text>
                  <Text style={styles.statLabel}>Per hour</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{project.hoursLogged}</Text>
                  <Text style={styles.statLabel}>Hours logged</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{project.status.replace('_', ' ')}</Text>
                  <Text style={styles.statLabel}>Status</Text>
                </View>
              </View>
            </GlassSurface>
            <TouchableOpacity
              style={styles.newInvoiceBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(freelancer)/invoices/new', params: { projectId: project.id, clientId: project.clientId } } as any)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.newInvoiceText}>New Invoice</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Invoices</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(freelancer)/invoices/${item.id}` as any)}>
            <GlassSurface style={styles.row} borderRadius={14}>
              <Text style={styles.rowTitle}>{item.invoiceNumber}</Text>
              <Text style={styles.rowMeta}>${item.total.toFixed(2)} · {item.status}</Text>
            </GlassSurface>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No invoices yet for this project.</Text>}
      />
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  summaryCard: { padding: 16, gap: 4 },
  projectTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  projectMeta: { fontSize: 13, color: theme.colors.mutedForeground },
  projectDescription: { fontSize: 13, color: theme.colors.text, marginTop: 6, lineHeight: 18 },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.mutedForeground, marginTop: 2 },
  newInvoiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 12,
  },
  newInvoiceText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 4, marginLeft: 2 },
  row: { padding: 14, gap: 4, flexDirection: 'row', justifyContent: 'space-between' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 12, color: theme.colors.mutedForeground },
  emptyText: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 12 },
});
