import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { getInvoice, updateInvoiceStatus } from '@/lib/freelance/invoices';
import { getClient } from '@/lib/freelance/clients';
import { listPayments, markPaymentPaid } from '@/lib/freelance/payments';
import { exportInvoice, ExportFormat } from '@/lib/freelance/exportInvoice';
import { generateInvoiceFollowUp, FollowUpTone } from '@/lib/freelance/followup';
import { Invoice, Client, Payment } from '@/lib/freelance/types';

const FORMATS: { value: ExportFormat; label: string; icon: string }[] = [
  { value: 'markdown', label: 'Markdown', icon: 'document-text-outline' },
  { value: 'pdf', label: 'PDF', icon: 'document-outline' },
  { value: 'docx', label: 'Word (.docx)', icon: 'create-outline' },
];

const TONE_OPTIONS: { value: FollowUpTone; label: string }[] = [
  { value: 'friendly', label: 'Friendly' },
  { value: 'standard', label: 'Standard' },
  { value: 'final', label: 'Final Notice' },
];

function isOverdue(invoice: Invoice): boolean {
  return invoice.status === 'sent' && invoice.dueDate < new Date().toISOString().slice(0, 10);
}

export default function InvoiceDetail() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const { llm, isLocalModelReady } = useChat();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [generatingTone, setGeneratingTone] = useState<FollowUpTone | null>(null);
  const [followUpDraft, setFollowUpDraft] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!invoiceId) return;
    try {
      const inv = await getInvoice(invoiceId);
      setInvoice(inv);
      if (inv) {
        const [c, p] = await Promise.all([getClient(inv.clientId), listPayments(inv.id)]);
        setClient(c);
        setPayments(p);
      }
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onMarkPaid = async () => {
    if (!invoice) return;
    const today = new Date().toISOString().slice(0, 10);
    await updateInvoiceStatus(invoice.id, 'paid');
    const pending = payments.find((p) => p.status === 'pending');
    if (pending) await markPaymentPaid(pending.id, today);
    await load();
  };

  const onGenerateFollowUp = async (tone: FollowUpTone) => {
    if (!invoice) return;
    if (!llm || !isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    setGeneratingTone(tone);
    try {
      const draft = await generateInvoiceFollowUp(invoice.id, tone, llm);
      setFollowUpDraft(draft);
    } catch (e) {
      console.error('[Freelancer] Follow-up generation failed:', e);
      Alert.alert('Error', 'Could not generate a draft.');
    } finally {
      setGeneratingTone(null);
    }
  };

  const onCopyFollowUp = async () => {
    if (!followUpDraft) return;
    await Clipboard.setStringAsync(followUpDraft);
    Alert.alert('Copied', 'The draft was copied to your clipboard.');
  };

  const onExport = async (format: ExportFormat) => {
    if (!invoice) return;
    setExporting(format);
    try {
      await exportInvoice(invoice.id, format);
    } catch (e) {
      console.error('[Freelancer] Export invoice failed:', e);
      Alert.alert('Error', 'Could not export the invoice.');
    } finally {
      setExporting(null);
    }
  };

  if (loading || !invoice) {
    return (
      <GradientBackground variant="background" style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: invoice.invoiceNumber }} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassSurface style={styles.summaryCard} borderRadius={16}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.meta}>{client?.name ?? 'Unknown client'}</Text>
          <Text style={styles.meta}>Issued {invoice.issueDate} · Due {invoice.dueDate}</Text>
          <View style={styles.divider} />
          <Text style={styles.lineItem}>{invoice.hours} hours x ${invoice.rate}/hr = ${invoice.subtotal.toFixed(2)}</Text>
          {invoice.taxAmount > 0 && (
            <Text style={styles.lineItem}>Tax ({(invoice.taxRate * 100).toFixed(1)}%): ${invoice.taxAmount.toFixed(2)}</Text>
          )}
          <Text style={styles.total}>Total: ${invoice.total.toFixed(2)}</Text>
          <Text style={styles.status}>Status: {invoice.status}</Text>
        </GlassSurface>

        {invoice.status !== 'paid' && (
          <TouchableOpacity style={styles.markPaidBtn} activeOpacity={0.85} onPress={onMarkPaid}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.markPaidText}>Mark as Paid</Text>
          </TouchableOpacity>
        )}

        {isOverdue(invoice) && (
          <GlassSurface style={styles.followUpCard} borderRadius={14} highlighted>
            <Text style={styles.followUpTitle}>This invoice is overdue. Generate a follow-up?</Text>
            <View style={styles.toneRow}>
              {TONE_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} activeOpacity={0.8} onPress={() => onGenerateFollowUp(opt.value)} disabled={generatingTone !== null}>
                  <GlassSurface style={styles.toneChip} borderRadius={20}>
                    {generatingTone === opt.value ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text style={styles.toneChipText}>{opt.label}</Text>
                    )}
                  </GlassSurface>
                </TouchableOpacity>
              ))}
            </View>
            {followUpDraft && (
              <View style={styles.draftBox}>
                <Text style={styles.draftText}>{followUpDraft}</Text>
                <TouchableOpacity onPress={onCopyFollowUp} style={styles.copyBtn}>
                  <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.copyBtnText}>Copy</Text>
                </TouchableOpacity>
              </View>
            )}
          </GlassSurface>
        )}

        <Text style={styles.sectionTitle}>Export</Text>
        {FORMATS.map((f) => (
          <TouchableOpacity key={f.value} activeOpacity={0.85} onPress={() => onExport(f.value)} disabled={exporting !== null}>
            <GlassSurface style={styles.formatRow} borderRadius={14}>
              <Ionicons name={f.icon as any} size={20} color={theme.colors.primary} />
              <Text style={styles.formatLabel}>{f.label}</Text>
              {exporting === f.value ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginLeft: 'auto' }} />
              ) : (
                <Ionicons name="share-outline" size={18} color={theme.colors.mutedForeground} style={{ marginLeft: 'auto' }} />
              )}
            </GlassSurface>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  summaryCard: { padding: 16, gap: 4 },
  invoiceNumber: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  meta: { fontSize: 13, color: theme.colors.mutedForeground },
  divider: { height: 1, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginVertical: 10 },
  lineItem: { fontSize: 13, color: theme.colors.text },
  total: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  status: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 4 },
  markPaidBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12,
  },
  markPaidText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 8, marginLeft: 2 },
  formatRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  formatLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  followUpCard: { padding: 14, gap: 10 },
  followUpTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  toneRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toneChip: { paddingHorizontal: 14, paddingVertical: 8, minWidth: 64, alignItems: 'center' },
  toneChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  draftBox: { marginTop: 4, gap: 8 },
  draftText: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
});
