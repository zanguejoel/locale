import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listInvoices } from '@/lib/freelance/invoices';
import { listExpenses } from '@/lib/freelance/expenses';
import { listClients } from '@/lib/freelance/clients';
import { computeRevenueTrend, bestMonth, topClientByRevenue } from '@/lib/freelance/metrics';
import { shareMarkdownDocument, ExportFormat } from '@/lib/export/shareMarkdown';
import { Invoice, Expense, Client } from '@/lib/freelance/types';

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'markdown', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word (.docx)' },
];

export default function Reports() {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const load = useCallback(async () => {
    const [i, e, c] = await Promise.all([listInvoices(), listExpenses(), listClients()]);
    setInvoices(i);
    setExpenses(e);
    setClients(c);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <GradientBackground variant="background" style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </GradientBackground>
    );
  }

  const trend = computeRevenueTrend(invoices, expenses);
  const best = bestMonth(trend);
  const top = topClientByRevenue(invoices);
  const topClient = top ? clients.find((c) => c.id === top.clientId) : null;

  const buildMarkdown = (): string => {
    const lines: string[] = ['# Business Report', ''];
    lines.push('## Monthly Revenue & Expenses');
    for (const p of trend) {
      lines.push(`- ${p.month}: revenue $${p.revenue.toFixed(2)}, expenses $${p.expenses.toFixed(2)}`);
    }
    lines.push('');
    if (best) lines.push(`Best month: ${best.month} ($${best.revenue.toFixed(2)} revenue)`);
    if (topClient) lines.push(`Top client by revenue: ${topClient.name} ($${top!.total.toFixed(2)})`);
    return lines.join('\n');
  };

  const onExport = async (format: ExportFormat) => {
    setExporting(format);
    try {
      await shareMarkdownDocument('Business Report', buildMarkdown(), format);
    } catch (e) {
      console.error('[Freelancer] Report export failed:', e);
      Alert.alert('Error', 'Could not export the report.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Revenue Trend</Text>
        {trend.length === 0 ? (
          <Text style={styles.emptyText}>No paid invoices or expenses yet.</Text>
        ) : (
          trend.map((p) => (
            <GlassSurface key={p.month} style={styles.trendRow} borderRadius={12}>
              <Text style={styles.trendMonth}>{p.month}</Text>
              <Text style={styles.trendRevenue}>+${p.revenue.toFixed(0)}</Text>
              <Text style={styles.trendExpenses}>-${p.expenses.toFixed(0)}</Text>
            </GlassSurface>
          ))
        )}

        {best && (
          <GlassSurface style={styles.highlightCard} borderRadius={14}>
            <Text style={styles.highlightText}>Best month: {best.month} (${best.revenue.toFixed(0)})</Text>
          </GlassSurface>
        )}
        {topClient && (
          <GlassSurface style={styles.highlightCard} borderRadius={14}>
            <Text style={styles.highlightText}>Top client: {topClient.name} (${top!.total.toFixed(0)})</Text>
          </GlassSurface>
        )}

        <Text style={styles.sectionTitle}>Export</Text>
        <View style={styles.exportRow}>
          {FORMATS.map((f) => (
            <TouchableOpacity key={f.value} activeOpacity={0.85} onPress={() => onExport(f.value)} disabled={exporting !== null}>
              <GlassSurface style={styles.exportChip} borderRadius={20}>
                {exporting === f.value ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <Text style={styles.exportChipText}>{f.label}</Text>
                )}
              </GlassSurface>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 12, marginBottom: 4, marginLeft: 2 },
  emptyText: { fontSize: 13, color: theme.colors.mutedForeground },
  trendRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, marginBottom: 6 },
  trendMonth: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  trendRevenue: { fontSize: 13, fontWeight: '700', color: '#22c55e' },
  trendExpenses: { fontSize: 13, fontWeight: '700', color: '#ef4444' },
  highlightCard: { padding: 12, marginTop: 6 },
  highlightText: { fontSize: 13, color: theme.colors.text },
  exportRow: { flexDirection: 'row', gap: 8 },
  exportChip: { paddingHorizontal: 16, paddingVertical: 10, minWidth: 80, alignItems: 'center' },
  exportChipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
});
