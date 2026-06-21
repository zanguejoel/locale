import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { addInvoice, nextInvoiceNumber } from '@/lib/freelance/invoices';
import { listClients, findClientByName } from '@/lib/freelance/clients';
import { calcInvoice, defaultDueDate } from '@/lib/freelance/invoiceCalc';
import { getTaxRate } from '@/lib/freelance/settings';
import { parseInvoiceRequest } from '@/lib/freelance/parseInvoiceRequest';
import { indexInvoice } from '@/lib/freelance/index_rag';
import { addPayment } from '@/lib/freelance/payments';
import { Client } from '@/lib/freelance/types';

export default function NewInvoice() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string; projectId?: string }>();
  const { llm, isLocalModelReady } = useChat();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(params.clientId ?? '');
  const [hours, setHours] = useState('');
  const [rate, setRate] = useState('');
  const [nlText, setNlText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listClients().then((c) => {
      setClients(c);
      if (!clientId && c.length > 0) setClientId(c[0].id);
    });
  }, []);

  const onParseNl = async () => {
    if (!nlText.trim()) return;
    if (!llm || !isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseInvoiceRequest(nlText, llm);
      if (parsed.clientName) {
        const match = await findClientByName(parsed.clientName);
        if (match) setClientId(match.id);
        else Alert.alert('Client not found', `No client matching "${parsed.clientName}" — pick one below or add it first.`);
      }
      if (parsed.hours != null) setHours(String(parsed.hours));
      if (parsed.rate != null) setRate(String(parsed.rate));
    } finally {
      setParsing(false);
    }
  };

  const onCreate = async () => {
    const hoursNum = parseFloat(hours);
    const rateNum = parseFloat(rate);
    if (!clientId) {
      Alert.alert('Client required', 'Add a client first.');
      return;
    }
    if (!hoursNum || !rateNum) {
      Alert.alert('Hours and rate required', 'Enter the hours worked and the hourly rate.');
      return;
    }
    try {
      setSaving(true);
      const taxRate = await getTaxRate();
      const { subtotal, taxAmount, total } = calcInvoice({ hours: hoursNum, rate: rateNum, taxRate });
      const issueDate = new Date().toISOString().slice(0, 10);
      const dueDate = defaultDueDate(issueDate);
      const invoiceNumber = await nextInvoiceNumber();

      const invoice = await addInvoice({
        clientId,
        projectId: params.projectId ?? null,
        invoiceNumber,
        issueDate,
        dueDate,
        hours: hoursNum,
        rate: rateNum,
        subtotal,
        taxRate,
        taxAmount,
        total,
        status: 'sent',
      });
      await addPayment({ invoiceId: invoice.id, amount: total, status: 'pending', dueDate });

      const client = clients.find((c) => c.id === clientId);
      await indexInvoice(invoice, client?.name).catch((e) => console.error('[Freelancer] Index invoice failed:', e));

      router.replace(`/(freelancer)/invoices/${invoice.id}` as any);
    } catch (e) {
      console.error('[Freelancer] Failed to create invoice:', e);
      Alert.alert('Error', 'Could not create the invoice. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Generate from text (optional)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput
            style={styles.input}
            value={nlText}
            onChangeText={setNlText}
            placeholder="e.g. Generate an invoice for National Bank for 160 hours at $25/hour"
            placeholderTextColor={theme.colors.mutedForeground}
            multiline
          />
        </GlassSurface>
        <TouchableOpacity style={styles.parseBtn} onPress={onParseNl} disabled={parsing} activeOpacity={0.85}>
          {parsing ? <ActivityIndicator color={theme.colors.primary} /> : <Text style={styles.parseText}>Fill from text</Text>}
        </TouchableOpacity>

        <Text style={styles.label}>Client</Text>
        <View style={styles.chips}>
          {clients.map((c) => {
            const active = c.id === clientId;
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.8} onPress={() => setClientId(c.id)}>
                <GlassSurface style={styles.chip} borderRadius={20} highlighted={active}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </GlassSurface>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Hours</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={hours} onChangeText={setHours} placeholder="e.g. 160" placeholderTextColor={theme.colors.mutedForeground} keyboardType="decimal-pad" />
        </GlassSurface>

        <Text style={styles.label}>Rate ($/hour)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={rate} onChangeText={setRate} placeholder="e.g. 25" placeholderTextColor={theme.colors.mutedForeground} keyboardType="decimal-pad" />
        </GlassSurface>

        <TouchableOpacity style={styles.createBtn} onPress={onCreate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Create Invoice</Text>}
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 2, marginLeft: 4 },
  inputWrap: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 16, color: theme.colors.text, paddingVertical: 10 },
  parseBtn: { alignSelf: 'flex-start', marginTop: 8, marginLeft: 4 },
  parseText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  createBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
