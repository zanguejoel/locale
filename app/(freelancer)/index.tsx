import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listInvoices } from '@/lib/freelance/invoices';
import { listPayments } from '@/lib/freelance/payments';
import { listExpenses } from '@/lib/freelance/expenses';
import { listClients } from '@/lib/freelance/clients';
import { listProjects } from '@/lib/freelance/projects';
import { listTimeEntries } from '@/lib/freelance/time';
import { thisWeekSeconds, toHours } from '@/lib/freelance/timeMetrics';
import { computeDashboardMetrics, DashboardMetrics } from '@/lib/freelance/metrics';
import { computeInsights, Insight } from '@/lib/freelance/insights';

const TILES: { key: string; label: string; icon: string; route: string }[] = [
  { key: 'chat', label: 'Business Assistant', icon: 'sparkles-outline', route: '/(freelancer)/chat' },
  { key: 'clients', label: 'Clients', icon: 'people-outline', route: '/(freelancer)/clients' },
  { key: 'projects', label: 'Projects', icon: 'briefcase-outline', route: '/(freelancer)/projects' },
  { key: 'time', label: 'Time Tracking', icon: 'timer-outline', route: '/(freelancer)/time' },
  { key: 'invoices', label: 'Invoices', icon: 'document-text-outline', route: '/(freelancer)/invoices' },
  { key: 'expenses', label: 'Expenses', icon: 'receipt-outline', route: '/(freelancer)/expenses' },
  { key: 'contracts', label: 'Contracts', icon: 'document-lock-outline', route: '/(freelancer)/contracts' },
  { key: 'reports', label: 'Reports', icon: 'bar-chart-outline', route: '/(freelancer)/reports' },
  { key: 'taxes', label: 'Taxes', icon: 'calculator-outline', route: '/(freelancer)/taxes' },
];

const INSIGHT_COLORS: Record<Insight['severity'], string> = {
  info: '#3b82f6',
  warning: '#f59e0b',
  risk: '#ef4444',
};

export default function FreelancerDashboard() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [weekHours, setWeekHours] = useState(0);

  const load = useCallback(async () => {
    const [invoices, payments, expenses, clients, projects, timeEntries] = await Promise.all([
      listInvoices(), listPayments(), listExpenses(), listClients(), listProjects(), listTimeEntries({ completedOnly: true }),
    ]);
    setMetrics(computeDashboardMetrics(invoices, payments, expenses, clients));
    setWeekHours(toHours(thisWeekSeconds(timeEntries)));
    setInsights(await computeInsights({ invoices, payments, expenses, clients, projects, timeEntries }));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {metrics && (
          <View style={styles.metricsGrid}>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Revenue (mo)</Text>
              <Text style={styles.metricValue}>${metrics.monthlyRevenue.toFixed(0)}</Text>
            </GlassSurface>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Expenses (mo)</Text>
              <Text style={styles.metricValue}>${metrics.monthlyExpenses.toFixed(0)}</Text>
            </GlassSurface>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Net Profit (mo)</Text>
              <Text style={styles.metricValue}>${metrics.netProfit.toFixed(0)}</Text>
            </GlassSurface>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Outstanding</Text>
              <Text style={styles.metricValue}>${metrics.outstandingTotal.toFixed(0)}</Text>
            </GlassSurface>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Active Clients</Text>
              <Text style={styles.metricValue}>{metrics.activeClientCount}</Text>
            </GlassSurface>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Avg Invoice</Text>
              <Text style={styles.metricValue}>${metrics.averageInvoiceValue.toFixed(0)}</Text>
            </GlassSurface>
            <GlassSurface style={styles.metricCard} borderRadius={14}>
              <Text style={styles.metricLabel}>Hours (wk)</Text>
              <Text style={styles.metricValue}>{weekHours}h</Text>
            </GlassSurface>
          </View>
        )}

        {insights.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Insights</Text>
            {insights.map((insight) => (
              <GlassSurface key={insight.id} style={styles.insightCard} borderRadius={14}>
                <Ionicons name={insight.icon as any} size={18} color={INSIGHT_COLORS[insight.severity]} />
                <Text style={styles.insightText}>{insight.message}</Text>
              </GlassSurface>
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Workspace</Text>
        <View style={styles.grid}>
          {TILES.map((tile) => (
            <TouchableOpacity
              key={tile.key}
              activeOpacity={0.85}
              style={styles.tileWrap}
              onPress={() => router.push(tile.route as any)}
            >
              <GlassSurface style={styles.tile} borderRadius={16}>
                <View style={styles.tileIconWrap}>
                  <Ionicons name={tile.icon as any} size={22} color={theme.colors.primary} />
                </View>
                <Text style={styles.tileLabel}>{tile.label}</Text>
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
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 10, marginTop: 16, marginLeft: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { width: '31%', padding: 12, gap: 4 },
  metricLabel: { fontSize: 11, color: theme.colors.mutedForeground },
  metricValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  insightCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 8 },
  insightText: { flex: 1, fontSize: 13, color: theme.colors.text, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tileWrap: { width: '47%' },
  tile: { padding: 16, gap: 10, minHeight: 96 },
  tileIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileLabel: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
});
