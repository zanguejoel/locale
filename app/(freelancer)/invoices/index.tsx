import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listInvoices } from '@/lib/freelance/invoices';
import { listClients } from '@/lib/freelance/clients';
import { Invoice, InvoiceStatus, Client } from '@/lib/freelance/types';

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: '#64748b',
  sent: '#3b82f6',
  paid: '#22c55e',
  overdue: '#ef4444',
};

function isOverdue(invoice: Invoice): boolean {
  return invoice.status === 'sent' && invoice.dueDate < new Date().toISOString().slice(0, 10);
}

export default function InvoicesList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clientsById, setClientsById] = useState<Record<string, Client>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [i, clients] = await Promise.all([listInvoices(), listClients()]);
      setInvoices(i);
      setClientsById(Object.fromEntries(clients.map((c) => [c.id, c])));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const renderItem = ({ item }: { item: Invoice }) => {
    const overdue = isOverdue(item);
    const statusKey = overdue ? 'overdue' : item.status;
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(freelancer)/invoices/${item.id}` as any)}>
        <GlassSurface style={styles.row} borderRadius={16}>
          <View style={styles.rowMain}>
            <Text style={styles.title} numberOfLines={1}>{item.invoiceNumber}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {clientsById[item.clientId]?.name ?? 'Unknown client'} · ${item.total.toFixed(2)} · due {item.dueDate}
            </Text>
          </View>
          <View style={[styles.badge, { backgroundColor: STATUS_COLORS[statusKey] + '22' }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLORS[statusKey] }]}>{overdue ? 'overdue' : item.status}</Text>
          </View>
          {overdue && (
            <Ionicons name="mail-outline" size={18} color={theme.colors.primary} style={{ marginLeft: 8 }} />
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
          data={invoices}
          keyExtractor={(i) => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="document-text-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>No invoices yet</Text>
              <Text style={styles.emptyText}>Create an invoice manually or ask the assistant to generate one.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/invoices/new' as any)}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabText}>New Invoice</Text>
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
