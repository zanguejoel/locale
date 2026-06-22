import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listProjects } from '@/lib/freelance/projects';
import { listClients } from '@/lib/freelance/clients';
import { getRunningEntry, startTimer, stopTimer, listTimeEntries } from '@/lib/freelance/time';
import { indexTimeEntry } from '@/lib/freelance/index_rag';
import { formatStopwatch, formatDuration, thisWeekSeconds, toHours } from '@/lib/freelance/timeMetrics';
import { Project, Client, TimeEntry } from '@/lib/freelance/types';

export default function TimeTracker() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [running, setRunning] = useState<TimeEntry | null>(null);
  const [todayEntries, setTodayEntries] = useState<TimeEntry[]>([]);
  const [weekSeconds, setWeekSeconds] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);

  const projectName = useCallback((id: string) => projects.find((p) => p.id === id)?.title ?? 'Project', [projects]);

  const load = useCallback(async () => {
    const [p, c, run, all] = await Promise.all([
      listProjects(), listClients(), getRunningEntry(), listTimeEntries({ completedOnly: true }),
    ]);
    setProjects(p);
    setClients(c);
    setRunning(run);
    if (!run && p.length > 0) {
      setSelectedProjectId((prev) => prev || p[0].id);
    } else if (run) {
      setSelectedProjectId(run.projectId);
    }
    const todayKey = new Date().toISOString().slice(0, 10);
    setTodayEntries(all.filter((e) => new Date(e.startTime).toISOString().slice(0, 10) === todayKey));
    setWeekSeconds(thisWeekSeconds(all));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Live stopwatch for the running entry.
  useEffect(() => {
    if (tick.current) { clearInterval(tick.current); tick.current = null; }
    if (running) {
      const update = () => setElapsed(Math.floor((Date.now() - running.startTime) / 1000));
      update();
      tick.current = setInterval(update, 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (tick.current) clearInterval(tick.current); };
  }, [running]);

  const onStart = async () => {
    if (!selectedProjectId) {
      Alert.alert('Pick a project', 'Select a project to track time against.');
      return;
    }
    setBusy(true);
    try {
      const entry = await startTimer({ projectId: selectedProjectId });
      setRunning(entry);
    } catch (e) {
      console.error('[Freelancer] startTimer failed:', e);
      Alert.alert('Error', 'Could not start the timer.');
    } finally {
      setBusy(false);
    }
  };

  const onStop = async () => {
    if (!running) return;
    setBusy(true);
    try {
      const stopped = await stopTimer(running.id);
      setRunning(null);
      if (stopped) {
        const client = clients.find((c) => c.id === stopped.clientId);
        indexTimeEntry(stopped, projectName(stopped.projectId), client?.name).catch((e) =>
          console.error('[Freelancer] indexTimeEntry failed:', e));
      }
      await load();
    } catch (e) {
      console.error('[Freelancer] stopTimer failed:', e);
      Alert.alert('Error', 'Could not stop the timer.');
    } finally {
      setBusy(false);
    }
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
      <ScrollView contentContainerStyle={styles.content}>
        <GlassSurface style={styles.timerCard} borderRadius={20}>
          <Text style={styles.timerLabel}>{running ? projectName(running.projectId) : 'Ready to track'}</Text>
          <Text style={[styles.timerValue, running && styles.timerValueActive]}>{formatStopwatch(elapsed)}</Text>
          <TouchableOpacity
            style={[styles.timerBtn, running ? styles.stopBtn : styles.startBtn]}
            onPress={running ? onStop : onStart}
            disabled={busy || (!running && projects.length === 0)}
            activeOpacity={0.85}
          >
            {busy ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name={running ? 'stop' : 'play'} size={20} color="#FFFFFF" />
                <Text style={styles.timerBtnText}>{running ? 'Stop' : 'Start'}</Text>
              </>
            )}
          </TouchableOpacity>
        </GlassSurface>

        {projects.length === 0 && (
          <Text style={styles.hint}>Add a project first to start tracking time.</Text>
        )}

        {!running && projects.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Project</Text>
            <View style={styles.chips}>
              {projects.map((p) => {
                const active = p.id === selectedProjectId;
                return (
                  <TouchableOpacity key={p.id} activeOpacity={0.8} onPress={() => setSelectedProjectId(p.id)}>
                    <GlassSurface style={styles.chip} borderRadius={20} highlighted={active}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.title}</Text>
                    </GlassSurface>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.statsRow}>
          <GlassSurface style={styles.statCard} borderRadius={14}>
            <Text style={styles.statLabel}>This week</Text>
            <Text style={styles.statValue}>{toHours(weekSeconds)}h</Text>
          </GlassSurface>
          <GlassSurface style={styles.statCard} borderRadius={14}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{formatDuration(todayEntries.reduce((s, e) => s + e.durationSeconds, 0))}</Text>
          </GlassSurface>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/time/entries' as any)}>
            <Ionicons name="list-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Timesheet</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} activeOpacity={0.85} onPress={() => router.push('/(freelancer)/time/entries/new' as any)}>
            <Ionicons name="add-circle-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.actionText}>Add entry</Text>
          </TouchableOpacity>
        </View>

        {todayEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today</Text>
            {todayEntries.map((e) => (
              <GlassSurface key={e.id} style={styles.entryRow} borderRadius={12}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryTitle} numberOfLines={1}>{e.description || projectName(e.projectId)}</Text>
                  <Text style={styles.entryMeta}>{projectName(e.projectId)}{e.isBillable ? '' : ' · non-billable'}</Text>
                </View>
                <Text style={styles.entryDuration}>{formatDuration(e.durationSeconds)}</Text>
              </GlassSurface>
            ))}
          </>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 40, gap: 8 },
  timerCard: { padding: 24, alignItems: 'center', gap: 12 },
  timerLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.mutedForeground },
  timerValue: { fontSize: 48, fontWeight: '800', color: theme.colors.text, fontVariant: ['tabular-nums'] },
  timerValueActive: { color: theme.colors.primary },
  timerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 32, borderRadius: 28, minWidth: 160 },
  startBtn: { backgroundColor: theme.colors.primary },
  stopBtn: { backgroundColor: '#ef4444' },
  timerBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  hint: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 12, marginLeft: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  statCard: { flex: 1, padding: 14, gap: 4 },
  statLabel: { fontSize: 12, color: theme.colors.mutedForeground },
  statValue: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary },
  actionText: { fontSize: 13, fontWeight: '700', color: theme.colors.primary },
  entryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  entryTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  entryMeta: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  entryDuration: { fontSize: 15, fontWeight: '700', color: theme.colors.text, fontVariant: ['tabular-nums'] },
});
