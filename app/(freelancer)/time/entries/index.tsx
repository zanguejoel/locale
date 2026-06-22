import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listTimeEntries, deleteTimeEntry } from '@/lib/freelance/time';
import { listProjects } from '@/lib/freelance/projects';
import { listClients } from '@/lib/freelance/clients';
import { removeTimeEntryIndex } from '@/lib/freelance/index_rag';
import { createInvoiceFromUnbilledTime } from '@/lib/freelance/invoiceFromTime';
import { summarizeTimesheet } from '@/lib/freelance/summarizeTimesheet';
import { formatDuration, unbilledValue, unbilledSeconds, toHours } from '@/lib/freelance/timeMetrics';
import { TimeEntry, Project, Client } from '@/lib/freelance/types';

interface Section { title: string; data: TimeEntry[] }

export default function Timesheet() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { llm, isLocalModelReady } = useChat();

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [invoicing, setInvoicing] = useState(false);
  const [pickClients, setPickClients] = useState<Client[] | null>(null);

  const projectTitle = useCallback((id: string) => projects.find((p) => p.id === id)?.title ?? 'Project', [projects]);

  const load = useCallback(async () => {
    const [e, p, c] = await Promise.all([
      listTimeEntries({ completedOnly: true }), listProjects(), listClients(),
    ]);
    setEntries(e);
    setProjects(p);
    setClients(c);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const sections = useMemo<Section[]>(() => {
    const byDay = new Map<string, TimeEntry[]>();
    for (const e of entries) {
      const key = new Date(e.startTime).toISOString().slice(0, 10);
      const arr = byDay.get(key) ?? [];
      arr.push(e);
      byDay.set(key, arr);
    }
    return Array.from(byDay.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([day, data]) => ({ title: day, data }));
  }, [entries]);

  const unbilledHours = toHours(unbilledSeconds(entries));
  const unbilledAmount = unbilledValue(entries);

  const onSummarize = async () => {
    if (!llm || !isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Try again shortly.');
      return;
    }
    setSummarizing(true);
    try {
      const projectNames: Record<string, string> = {};
      projects.forEach((p) => { projectNames[p.id] = p.title; });
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const text = await summarizeTimesheet(
        { entries: entries.filter((e) => e.startTime >= weekAgo), projectNames, periodLabel: 'this week' },
        llm
      );
      setSummary(text);
    } catch (e) {
      console.error('[Freelancer] summarize failed:', e);
      Alert.alert('Error', 'Could not generate a summary.');
    } finally {
      setSummarizing(false);
    }
  };

  const onInvoiceUnbilled = () => {
    const clientIds = Array.from(new Set(entries.filter((e) => e.isBillable && !e.billed).map((e) => e.clientId)));
    if (clientIds.length === 0) {
      Alert.alert('Nothing to bill', 'There is no unbilled billable time.');
      return;
    }
    if (clientIds.length > 1) {
      // Native Alert buttons don't scale past a couple of options, so pick
      // the client from an in-app list instead.
      setPickClients(clients.filter((c) => clientIds.includes(c.id)));
      return;
    }
    runInvoice(clientIds[0]);
  };

  const runInvoice = async (clientId: string) => {
    setPickClients(null);
    setInvoicing(true);
    try {
      const result = await createInvoiceFromUnbilledTime({ clientId });
      if (!result) {
        Alert.alert('Nothing to bill', 'There is no unbilled billable time for that client.');
        return;
      }
      await load();
      Alert.alert(
        'Invoice drafted',
        `Created a draft invoice ($${result.total.toFixed(2)}) from ${result.entryCount} time entr${result.entryCount === 1 ? 'y' : 'ies'}.`,
        [{ text: 'View', onPress: () => router.push(`/(freelancer)/invoices/${result.invoiceId}` as any) }, { text: 'OK' }]
      );
    } catch (e) {
      console.error('[Freelancer] invoice from time failed:', e);
      Alert.alert('Error', 'Could not create the invoice.');
    } finally {
      setInvoicing(false);
    }
  };

  const onDelete = (entry: TimeEntry) => {
    Alert.alert('Delete entry?', 'This removes the tracked time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await deleteTimeEntry(entry.id);
          removeTimeEntryIndex(entry.id).catch(() => {});
          await load();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <GradientBackground variant="background" style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 10 }}>
            <GlassSurface style={styles.unbilledCard} borderRadius={16}>
              <View style={{ flex: 1 }}>
                <Text style={styles.unbilledLabel}>Unbilled billable time</Text>
                <Text style={styles.unbilledValue}>{unbilledHours}h · ${unbilledAmount.toFixed(0)}</Text>
              </View>
              <TouchableOpacity style={styles.invoiceBtn} onPress={onInvoiceUnbilled} disabled={invoicing || unbilledHours === 0} activeOpacity={0.85}>
                {invoicing ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.invoiceBtnText}>Invoice</Text>}
              </TouchableOpacity>
            </GlassSurface>

            <TouchableOpacity style={styles.summaryBtn} onPress={onSummarize} disabled={summarizing} activeOpacity={0.85}>
              <Ionicons name="sparkles-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.summaryBtnText}>{summarizing ? 'Summarizing…' : 'Weekly summary'}</Text>
            </TouchableOpacity>
            {summary && (
              <GlassSurface style={styles.summaryCard} borderRadius={14}>
                <Text style={styles.summaryText}>{summary}</Text>
              </GlassSurface>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => {
          const secs = section.data.reduce((s, e) => s + e.durationSeconds, 0);
          return (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionDay}>{section.title}</Text>
              <Text style={styles.sectionTotal}>{formatDuration(secs)}</Text>
            </View>
          );
        }}
        renderItem={({ item }) => (
          <TouchableOpacity onLongPress={() => onDelete(item)} activeOpacity={0.85}>
            <GlassSurface style={styles.entryRow} borderRadius={12}>
              <View style={{ flex: 1 }}>
                <Text style={styles.entryTitle} numberOfLines={1}>{item.description || projectTitle(item.projectId)}</Text>
                <Text style={styles.entryMeta}>
                  {projectTitle(item.projectId)}
                  {item.billed ? ' · invoiced' : item.isBillable ? '' : ' · non-billable'}
                </Text>
              </View>
              <Text style={styles.entryDuration}>{formatDuration(item.durationSeconds)}</Text>
            </GlassSurface>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No time tracked yet.</Text>}
      />

      {pickClients && (
        <View style={styles.pickerOverlay}>
          <GlassSurface style={styles.pickerCard} borderRadius={16}>
            <Text style={styles.pickerTitle}>Invoice which client?</Text>
            <Text style={styles.pickerHint}>You have unbilled time for multiple clients — invoice them one at a time.</Text>
            {pickClients.map((c) => (
              <TouchableOpacity key={c.id} style={styles.pickerRow} activeOpacity={0.85} onPress={() => runInvoice(c.id)}>
                <Text style={styles.pickerRowText}>{c.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.mutedForeground} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.pickerCancel} onPress={() => setPickClients(null)} activeOpacity={0.85}>
              <Text style={styles.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </GlassSurface>
        </View>
      )}
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40, gap: 8 },
  unbilledCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  unbilledLabel: { fontSize: 12, color: theme.colors.mutedForeground },
  unbilledValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 2 },
  invoiceBtn: { backgroundColor: theme.colors.primary, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, minWidth: 84, alignItems: 'center' },
  invoiceBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  summaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary },
  summaryBtnText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  summaryCard: { padding: 14 },
  summaryText: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 6, marginHorizontal: 2 },
  sectionDay: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  sectionTotal: { fontSize: 13, fontWeight: '700', color: theme.colors.mutedForeground, fontVariant: ['tabular-nums'] },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, marginBottom: 6 },
  entryTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  entryMeta: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  entryDuration: { fontSize: 15, fontWeight: '700', color: theme.colors.text, fontVariant: ['tabular-nums'] },
  empty: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 20 },
  pickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  pickerCard: { width: '100%', padding: 18, gap: 4 },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  pickerHint: { fontSize: 12, color: theme.colors.mutedForeground, marginBottom: 10 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
  pickerRowText: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  pickerCancel: { marginTop: 8, paddingVertical: 10, alignItems: 'center' },
  pickerCancelText: { fontSize: 14, fontWeight: '600', color: theme.colors.mutedForeground },
});
