import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listDeadlines } from '@/lib/cases/deadlines';
import { getCase } from '@/lib/cases/cases';
import { scheduleDeadlineReminder, cancelDeadlineReminder } from '@/lib/cases/reminders';
import { CaseDeadline } from '@/lib/cases/types';

const KIND_LABEL: Record<string, string> = {
  hearing: 'Hearing',
  filing: 'Filing',
  response: 'Response Due',
  appeal: 'Appeal',
  other: 'Deadline',
};

function daysUntil(iso: string): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Deadlines detected from chat or documents for this case, soonest first.
 * Tap "Add Reminder" to schedule an on-device local notification (9am on the
 * due date) — no push server involved.
 */
export default function CaseDeadlines() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [deadlines, setDeadlines] = useState<CaseDeadline[]>([]);
  const [caseTitle, setCaseTitle] = useState('Case');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!caseId) return;
    const [rows, legalCase] = await Promise.all([listDeadlines(caseId), getCase(caseId)]);
    setDeadlines(rows);
    if (legalCase) setCaseTitle(legalCase.title);
    setLoading(false);
  }, [caseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onToggleReminder = async (deadline: CaseDeadline) => {
    setBusyId(deadline.id);
    try {
      if (deadline.reminderId) {
        await cancelDeadlineReminder(deadline);
      } else {
        const id = await scheduleDeadlineReminder(deadline, caseTitle);
        if (!id) {
          Alert.alert('Permission needed', 'Enable notifications to get deadline reminders.');
        }
      }
      await load();
    } catch (error) {
      console.error('[Legal] Reminder toggle failed:', error);
      Alert.alert('Error', 'Could not update the reminder.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <GradientBackground variant="background" style={styles.center}>
        <ActivityIndicator color={theme.colors.primary} />
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <FlatList
        data={deadlines}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const days = daysUntil(item.dueDate);
          const urgent = days !== null && days <= 7 && days >= 0;
          const past = days !== null && days < 0;
          return (
            <GlassSurface style={styles.card} borderRadius={14} highlighted={urgent}>
              <View style={styles.cardHeader}>
                <View style={[styles.kindBadge, urgent && styles.kindBadgeUrgent]}>
                  <Text style={[styles.kindText, urgent && styles.kindTextUrgent]}>
                    {KIND_LABEL[item.kind] ?? 'Deadline'}
                  </Text>
                </View>
              </View>
              <Text style={styles.label}>{item.label}</Text>
              <Text style={[styles.dueText, past && styles.dueTextPast]}>
                {formatDate(item.dueDate)}
                {days !== null && !past && ` · ${days === 0 ? 'today' : `in ${days}d`}`}
                {past && ' · past'}
              </Text>
              <TouchableOpacity
                style={styles.reminderBtn}
                onPress={() => onToggleReminder(item)}
                disabled={busyId === item.id}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.reminderId ? 'notifications' : 'notifications-outline'}
                  size={14}
                  color={theme.colors.primary}
                />
                <Text style={styles.reminderText}>
                  {item.reminderId ? 'Reminder set' : 'Add Reminder'}
                </Text>
              </TouchableOpacity>
            </GlassSurface>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="alarm-outline" size={44} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>No deadlines detected yet</Text>
            <Text style={styles.emptyText}>
              Hearing dates, filing deadlines, and response windows mentioned in chat or
              found in documents will appear here.
            </Text>
          </View>
        }
      />
    </GradientBackground>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 40, gap: 10 },
  card: { padding: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kindBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
  },
  kindBadgeUrgent: { backgroundColor: '#ef444422' },
  kindText: { fontSize: 11, fontWeight: '700', color: theme.colors.mutedForeground },
  kindTextUrgent: { color: '#ef4444' },
  label: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  dueText: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 4 },
  dueTextPast: { color: '#ef4444' },
  reminderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 4,
  },
  reminderText: { fontSize: 12, fontWeight: '600', color: theme.colors.primary },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  emptyText: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 18 },
});
