import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listExpenses } from '@/lib/freelance/expenses';
import { Expense } from '@/lib/freelance/types';

export default function ExpensesList() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setExpenses(await listExpenses());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <GradientBackground variant="background" style={styles.container}>
      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            expenses.length > 0 ? (
              <GlassSurface style={styles.totalCard} borderRadius={14}>
                <Text style={styles.totalLabel}>Total tracked</Text>
                <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
              </GlassSurface>
            ) : null
          }
          renderItem={({ item }) => (
            <GlassSurface style={styles.row} borderRadius={14}>
              <View style={styles.rowMain}>
                <Text style={styles.title} numberOfLines={1}>{item.vendor}</Text>
                <Text style={styles.meta}>{item.category} · {item.date}</Text>
              </View>
              <Text style={styles.amount}>${item.amount.toFixed(2)}</Text>
            </GlassSurface>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="receipt-outline" size={48} color={theme.colors.primary} />
              <Text style={styles.emptyTitle}>No expenses yet</Text>
              <Text style={styles.emptyText}>Upload a receipt photo or PDF and the assistant will extract the details.</Text>
            </View>
          }
        />
      )}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/expenses/new' as any)}>
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabText}>New Expense</Text>
      </TouchableOpacity>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 120, gap: 10 },
  totalCard: { padding: 14, marginBottom: 4 },
  totalLabel: { fontSize: 12, color: theme.colors.mutedForeground },
  totalValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rowMain: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  meta: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
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
