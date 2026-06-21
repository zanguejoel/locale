import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listInvoices } from '@/lib/freelance/invoices';
import { listExpenses } from '@/lib/freelance/expenses';
import { getTaxRate, setTaxRate } from '@/lib/freelance/settings';
import { computeRevenueTrend } from '@/lib/freelance/metrics';
import { shareMarkdownDocument, ExportFormat } from '@/lib/export/shareMarkdown';
import { Invoice, Expense } from '@/lib/freelance/types';

const FREELANCER_TAX_DISCLAIMER =
  'This is an informational estimate, not tax advice. For decisions about your ' +
  'taxes, consult a qualified accountant or tax professional.';

export default function Taxes() {
  const theme = useTheme();
  const styles = getStyles(theme);

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rateInput, setRateInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const [i, e, rate] = await Promise.all([listInvoices(), listExpenses(), getTaxRate()]);
    setInvoices(i);
    setExpenses(e);
    setRateInput(rate ? String(rate * 100) : '');
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

  const revenue = invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0);
  const deductibleExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const taxableIncome = Math.max(0, revenue - deductibleExpenses);
  const rate = (parseFloat(rateInput) || 0) / 100;
  const estimatedTax = taxableIncome * rate;
  const quarters = computeRevenueTrend(invoices, expenses);

  const onSaveRate = async () => {
    const parsed = parseFloat(rateInput);
    await setTaxRate(isNaN(parsed) ? 0 : parsed / 100);
    Alert.alert('Saved', 'Tax rate updated.');
  };

  const onExport = async () => {
    setExporting(true);
    try {
      const lines = [
        '# Tax Summary',
        '',
        `Revenue: $${revenue.toFixed(2)}`,
        `Deductible expenses: $${deductibleExpenses.toFixed(2)}`,
        `Estimated taxable income: $${taxableIncome.toFixed(2)}`,
        `Tax rate: ${(rate * 100).toFixed(1)}%`,
        `Estimated tax owed: $${estimatedTax.toFixed(2)}`,
        '',
        '## Quarterly Summary',
        ...quarters.map((q) => `- ${q.month}: revenue $${q.revenue.toFixed(2)}, expenses $${q.expenses.toFixed(2)}`),
        '',
        FREELANCER_TAX_DISCLAIMER,
      ];
      await shareMarkdownDocument('Tax Summary', lines.join('\n'), 'pdf' as ExportFormat);
    } catch (e) {
      console.error('[Freelancer] Tax export failed:', e);
      Alert.alert('Error', 'Could not export the tax summary.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Effective tax rate (%)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput
            style={styles.input}
            value={rateInput}
            onChangeText={setRateInput}
            placeholder="e.g. 25"
            placeholderTextColor={theme.colors.mutedForeground}
            keyboardType="decimal-pad"
          />
        </GlassSurface>
        <TouchableOpacity style={styles.saveRateBtn} onPress={onSaveRate} activeOpacity={0.85}>
          <Text style={styles.saveRateText}>Save Rate</Text>
        </TouchableOpacity>

        <GlassSurface style={styles.summaryCard} borderRadius={16}>
          <Row label="Revenue" value={`$${revenue.toFixed(2)}`} />
          <Row label="Deductible expenses" value={`$${deductibleExpenses.toFixed(2)}`} />
          <Row label="Estimated taxable income" value={`$${taxableIncome.toFixed(2)}`} />
          <Row label="Estimated tax owed" value={`$${estimatedTax.toFixed(2)}`} bold />
        </GlassSurface>

        <TouchableOpacity style={styles.exportBtn} onPress={onExport} disabled={exporting} activeOpacity={0.85}>
          {exporting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.exportText}>Export Tax Summary (PDF)</Text>}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>{FREELANCER_TAX_DISCLAIMER}</Text>
      </ScrollView>
    </GradientBackground>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, bold && styles.rowValueBold]}>{value}</Text>
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 4, marginBottom: 2, marginLeft: 4 },
  inputWrap: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 16, color: theme.colors.text, paddingVertical: 10 },
  saveRateBtn: { alignSelf: 'flex-start', marginTop: 8, marginLeft: 4 },
  saveRateText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  summaryCard: { padding: 16, gap: 10, marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, color: theme.colors.mutedForeground },
  rowValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  rowValueBold: { fontSize: 16, fontWeight: '700' },
  exportBtn: { marginTop: 20, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  exportText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  disclaimer: { fontSize: 11, color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 20, lineHeight: 16 },
});
