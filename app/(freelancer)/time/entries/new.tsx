import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listProjects } from '@/lib/freelance/projects';
import { listClients } from '@/lib/freelance/clients';
import { addManualEntry } from '@/lib/freelance/time';
import { indexTimeEntry } from '@/lib/freelance/index_rag';
import { parseTimeEntry } from '@/lib/freelance/parseTimeEntry';
import { Project, Client } from '@/lib/freelance/types';

/** Fuzzy-match a parsed project name to an existing project (case-insensitive, word-boundary substring). */
function matchProject(name: string | null, projects: Project[]): Project | null {
  if (!name) return null;
  const q = name.toLowerCase().trim();
  if (!q) return null;
  const wordBoundary = (haystack: string, needle: string) =>
    new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(haystack);
  return (
    projects.find((p) => p.title.toLowerCase() === q) ??
    projects.find((p) => wordBoundary(p.title.toLowerCase(), q) || wordBoundary(q, p.title.toLowerCase())) ??
    null
  );
}

export default function NewTimeEntry() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { llm, isLocalModelReady } = useChat();

  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [hours, setHours] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [billable, setBillable] = useState(true);
  const [nlText, setNlText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([listProjects(), listClients()]).then(([p, c]) => {
      setProjects(p);
      setClients(c);
      if (p.length > 0) setProjectId((prev) => prev || p[0].id);
    });
  }, []);

  const onParse = async () => {
    if (!nlText.trim()) return;
    if (!llm || !isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Try again shortly.');
      return;
    }
    setParsing(true);
    try {
      const parsed = await parseTimeEntry(nlText.trim(), llm);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.hours) setHours(String(parsed.hours));
      if (parsed.date) setDate(parsed.date);
      const matched = matchProject(parsed.projectName, projects);
      if (matched) setProjectId(matched.id);
      else if (parsed.projectName) {
        Alert.alert('Project not found', `No project matched "${parsed.projectName}". Pick one below.`);
      }
    } catch (e) {
      console.error('[Freelancer] parse time entry failed:', e);
      Alert.alert('Error', 'Could not understand that. Fill the fields manually.');
    } finally {
      setParsing(false);
    }
  };

  const onSave = async () => {
    const h = parseFloat(hours);
    if (!projectId) { Alert.alert('Project required', 'Pick a project.'); return; }
    if (!h || h <= 0) { Alert.alert('Hours required', 'Enter how many hours you worked.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Invalid date', 'Use YYYY-MM-DD.'); return; }
    setSaving(true);
    try {
      // Anchor the manual entry at 9am local on the chosen day.
      const startTime = new Date(`${date}T09:00:00`).getTime();
      const entry = await addManualEntry({
        projectId,
        description: description.trim() || null,
        startTime,
        durationSeconds: Math.round(h * 3600),
        isBillable: billable,
      });
      const project = projects.find((p) => p.id === projectId);
      const client = clients.find((c) => c.id === entry.clientId);
      indexTimeEntry(entry, project?.title, client?.name).catch((e) =>
        console.error('[Freelancer] indexTimeEntry failed:', e));
      router.back();
    } catch (e) {
      console.error('[Freelancer] add manual entry failed:', e);
      Alert.alert('Error', 'Could not save the entry.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Describe it (optional)</Text>
        <GlassSurface style={styles.nlWrap} borderRadius={12}>
          <TextInput
            style={styles.nlInput}
            value={nlText}
            onChangeText={setNlText}
            placeholder='e.g. "3 hours on the bank dashboard yesterday"'
            placeholderTextColor={theme.colors.mutedForeground}
            multiline
          />
          <TouchableOpacity style={styles.parseBtn} onPress={onParse} disabled={parsing || !nlText.trim()} activeOpacity={0.85}>
            {parsing ? <ActivityIndicator color={theme.colors.primary} size="small" /> : <Ionicons name="sparkles" size={18} color={theme.colors.primary} />}
          </TouchableOpacity>
        </GlassSurface>

        <Text style={styles.label}>Project</Text>
        <View style={styles.chips}>
          {projects.map((p) => {
            const active = p.id === projectId;
            return (
              <TouchableOpacity key={p.id} activeOpacity={0.8} onPress={() => setProjectId(p.id)}>
                <GlassSurface style={styles.chip} borderRadius={20} highlighted={active}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{p.title}</Text>
                </GlassSurface>
              </TouchableOpacity>
            );
          })}
        </View>
        {projects.length === 0 && <Text style={styles.hint}>Add a project first.</Text>}

        <Text style={styles.label}>Description</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={description} onChangeText={setDescription} placeholder="What did you work on?" placeholderTextColor={theme.colors.mutedForeground} />
        </GlassSurface>

        <Text style={styles.label}>Hours</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={hours} onChangeText={setHours} placeholder="e.g. 1.5" placeholderTextColor={theme.colors.mutedForeground} keyboardType="decimal-pad" />
        </GlassSurface>

        <Text style={styles.label}>Date</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.mutedForeground} autoCapitalize="none" />
        </GlassSurface>

        <View style={styles.billableRow}>
          <Text style={styles.billableLabel}>Billable</Text>
          <Switch value={billable} onValueChange={setBillable} trackColor={{ true: theme.colors.primary }} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>Save Entry</Text>}
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 2, marginLeft: 4 },
  nlWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 4 },
  nlInput: { flex: 1, fontSize: 15, color: theme.colors.text, paddingVertical: 10, minHeight: 40 },
  parseBtn: { padding: 8 },
  inputWrap: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 16, color: theme.colors.text, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  hint: { fontSize: 12, color: theme.colors.mutedForeground, marginLeft: 4 },
  billableRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginHorizontal: 4 },
  billableLabel: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  saveBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
