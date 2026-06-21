import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect, Stack } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { getClient } from '@/lib/freelance/clients';
import { listProjects } from '@/lib/freelance/projects';
import { listInvoices } from '@/lib/freelance/invoices';
import { generateBusinessDocument, DocumentKind } from '@/lib/freelance/generateDocument';
import { shareMarkdownDocument } from '@/lib/export/shareMarkdown';
import { Client, Project, Invoice } from '@/lib/freelance/types';

const DOC_KIND_OPTIONS: { value: DocumentKind; label: string }[] = [
  { value: 'proposal', label: 'Proposal' },
  { value: 'sow', label: 'SOW' },
  { value: 'service_agreement', label: 'Service Agreement' },
  { value: 'change_request', label: 'Change Request' },
];

export default function ClientDetail() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const { llm, isLocalModelReady } = useChat();

  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingKind, setGeneratingKind] = useState<DocumentKind | null>(null);
  const [draft, setDraft] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!clientId) return;
    try {
      const [c, p, i] = await Promise.all([
        getClient(clientId),
        listProjects(clientId),
        listInvoices(clientId),
      ]);
      setClient(c);
      setProjects(p);
      setInvoices(i);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !client) {
    return (
      <GradientBackground variant="background" style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </GradientBackground>
    );
  }

  const outstanding = invoices.filter((i) => i.status === 'sent' || i.status === 'overdue')
    .reduce((sum, i) => sum + i.total, 0);

  const onGenerateDoc = async (kind: DocumentKind) => {
    if (!llm || !isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    setGeneratingKind(kind);
    try {
      const text = await generateBusinessDocument(kind, client, projects[0] ?? null, llm);
      setDraft(text);
    } catch (e) {
      console.error('[Freelancer] Document generation failed:', e);
      Alert.alert('Error', 'Could not generate a draft.');
    } finally {
      setGeneratingKind(null);
    }
  };

  const onCopyDraft = async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    Alert.alert('Copied', 'The draft was copied to your clipboard.');
  };

  const onExportDraft = async () => {
    if (!draft) return;
    try {
      await shareMarkdownDocument(`${client.name} Document`, draft, 'pdf');
    } catch (e) {
      console.error('[Freelancer] Document export failed:', e);
      Alert.alert('Error', 'Could not export the document.');
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: client.name }} />
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={{ gap: 12 }}>
            <GlassSurface style={styles.summaryCard} borderRadius={16}>
              <Text style={styles.clientName}>{client.name}</Text>
              {!!client.company && <Text style={styles.clientMeta}>{client.company}</Text>}
              {!!client.email && <Text style={styles.clientMeta}>{client.email}</Text>}
              {!!client.phone && <Text style={styles.clientMeta}>{client.phone}</Text>}
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{projects.length}</Text>
                  <Text style={styles.statLabel}>Projects</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>{invoices.length}</Text>
                  <Text style={styles.statLabel}>Invoices</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>${outstanding.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Outstanding</Text>
                </View>
              </View>
            </GlassSurface>
            <TouchableOpacity
              style={styles.newProjectBtn}
              activeOpacity={0.85}
              onPress={() => router.push({ pathname: '/(freelancer)/projects/new', params: { clientId: client.id } } as any)}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.newProjectText}>New Project</Text>
            </TouchableOpacity>
            <Text style={styles.sectionTitle}>Generate Document</Text>
            <View style={styles.docChips}>
              {DOC_KIND_OPTIONS.map((opt) => (
                <TouchableOpacity key={opt.value} activeOpacity={0.8} onPress={() => onGenerateDoc(opt.value)} disabled={generatingKind !== null}>
                  <GlassSurface style={styles.docChip} borderRadius={20}>
                    {generatingKind === opt.value ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Text style={styles.docChipText}>{opt.label}</Text>
                    )}
                  </GlassSurface>
                </TouchableOpacity>
              ))}
            </View>
            {draft && (
              <GlassSurface style={styles.draftCard} borderRadius={14}>
                <Text style={styles.draftText}>{draft}</Text>
                <View style={styles.draftActions}>
                  <TouchableOpacity onPress={onCopyDraft} style={styles.draftActionBtn}>
                    <Ionicons name="copy-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.draftActionText}>Copy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onExportDraft} style={styles.draftActionBtn}>
                    <Ionicons name="share-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.draftActionText}>Export PDF</Text>
                  </TouchableOpacity>
                </View>
              </GlassSurface>
            )}

            <Text style={styles.sectionTitle}>Projects</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push(`/(freelancer)/projects/${item.id}` as any)}>
            <GlassSurface style={styles.row} borderRadius={14}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.rowMeta}>{item.status} · ${item.hourlyRate}/hr</Text>
            </GlassSurface>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No projects yet for this client.</Text>}
      />
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  summaryCard: { padding: 16, gap: 4 },
  clientName: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  clientMeta: { fontSize: 13, color: theme.colors.mutedForeground },
  statsRow: { flexDirection: 'row', marginTop: 12, gap: 16 },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.mutedForeground, marginTop: 2 },
  newProjectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: 10, borderRadius: 12,
  },
  newProjectText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 4, marginLeft: 2 },
  row: { padding: 14, gap: 4 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  rowMeta: { fontSize: 12, color: theme.colors.mutedForeground },
  emptyText: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 12 },
  docChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  docChip: { paddingHorizontal: 14, paddingVertical: 8, minWidth: 64, alignItems: 'center' },
  docChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  draftCard: { padding: 14, gap: 10 },
  draftText: { fontSize: 13, color: theme.colors.text, lineHeight: 19 },
  draftActions: { flexDirection: 'row', gap: 16 },
  draftActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  draftActionText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
});
