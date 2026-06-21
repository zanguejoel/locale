import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { getCase } from '@/lib/cases/cases';
import { listFacts } from '@/lib/cases/facts';
import { listEvents } from '@/lib/cases/events';
import { listDeadlines } from '@/lib/cases/deadlines';
import { LegalCase } from '@/lib/cases/types';
import { LEGAL_DISCLAIMER } from '@/lib/navigators/legal';

const TILES: { key: string; label: string; icon: string; route: string }[] = [
  { key: 'chat', label: 'Legal Research', icon: 'chatbubbles-outline', route: 'chat' },
  { key: 'documents', label: 'Documents', icon: 'document-text-outline', route: 'documents' },
  { key: 'timeline', label: 'Timeline', icon: 'time-outline', route: 'timeline' },
  { key: 'deadlines', label: 'Deadlines', icon: 'alarm-outline', route: 'deadlines' },
  { key: 'followup', label: 'Generate Follow-Up', icon: 'mail-outline', route: 'followup' },
  { key: 'exports', label: 'Export Case', icon: 'share-outline', route: 'exports' },
];

export default function CaseHome() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [legalCase, setLegalCase] = useState<LegalCase | null>(null);
  const [counts, setCounts] = useState({ facts: 0, events: 0, deadlines: 0, assumptions: 0 });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!caseId) return;
    const [c, facts, events, deadlines] = await Promise.all([
      getCase(caseId),
      listFacts(caseId),
      listEvents(caseId),
      listDeadlines(caseId),
    ]);
    setLegalCase(c);
    setCounts({
      facts: facts.filter((f) => !f.isAssumption).length,
      assumptions: facts.filter((f) => f.isAssumption).length,
      events: events.length,
      deadlines: deadlines.length,
    });
    setLoading(false);
  }, [caseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <GradientBackground variant="background" style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: legalCase?.title ?? 'Case' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassSurface style={styles.summaryCard} borderRadius={16}>
          <Text style={styles.caseTitle}>{legalCase?.title}</Text>
          <Text style={styles.caseMeta}>
            {legalCase?.category}
            {legalCase?.jurisdiction ? ` · ${legalCase.jurisdiction}` : ' · Jurisdiction unknown'}
          </Text>
          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{legalCase?.status}</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{counts.facts}</Text>
              <Text style={styles.statLabel}>Facts</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{counts.assumptions}</Text>
              <Text style={styles.statLabel}>Assumptions</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{counts.events}</Text>
              <Text style={styles.statLabel}>Timeline</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{counts.deadlines}</Text>
              <Text style={styles.statLabel}>Deadlines</Text>
            </View>
          </View>
        </GlassSurface>

        <View style={styles.tiles}>
          {TILES.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={styles.tileTouchable}
              activeOpacity={0.85}
              onPress={() => router.push(`/(legal)/${caseId}/${t.route}` as any)}
            >
              <GlassSurface style={styles.tile} borderRadius={16}>
                <Ionicons name={t.icon as any} size={24} color={theme.colors.primary} />
                <Text style={styles.tileLabel}>{t.label}</Text>
              </GlassSurface>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.disclaimer}>{LEGAL_DISCLAIMER}</Text>
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 16 },
  summaryCard: { padding: 16, gap: 6 },
  caseTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  caseMeta: { fontSize: 13, color: theme.colors.mutedForeground },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '22',
  },
  statusText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  statsRow: { flexDirection: 'row', marginTop: 14, gap: 4 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.mutedForeground, marginTop: 2 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tileTouchable: { width: '47%' },
  tile: { alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 8 },
  tileLabel: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  disclaimer: { fontSize: 11, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 16, marginTop: 8 },
});
