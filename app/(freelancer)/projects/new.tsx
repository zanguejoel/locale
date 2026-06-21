import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { addProject } from '@/lib/freelance/projects';
import { listClients } from '@/lib/freelance/clients';
import { indexProject } from '@/lib/freelance/index_rag';
import { Client } from '@/lib/freelance/types';

export default function NewProject() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ clientId?: string }>();

  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState(params.clientId ?? '');
  const [title, setTitle] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    listClients().then((c) => {
      setClients(c);
      if (!clientId && c.length > 0) setClientId(c[0].id);
    });
  }, []);

  const onCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give the project a title.');
      return;
    }
    if (!clientId) {
      Alert.alert('Client required', 'Add a client first.');
      return;
    }
    try {
      setSaving(true);
      const created = await addProject({
        clientId,
        title: title.trim(),
        hourlyRate: parseFloat(hourlyRate) || 0,
        budget: budget ? parseFloat(budget) : null,
      });
      const client = clients.find((c) => c.id === clientId);
      await indexProject(created, client?.name).catch((e) => console.error('[Freelancer] Index project failed:', e));
      router.replace(`/(freelancer)/projects/${created.id}` as any);
    } catch (e) {
      console.error('[Freelancer] Failed to create project:', e);
      Alert.alert('Error', 'Could not create the project. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        {clients.length === 0 && <Text style={styles.hint}>Add a client first from the Clients tab.</Text>}

        <Text style={styles.label}>Title</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Website Redesign" placeholderTextColor={theme.colors.mutedForeground} autoFocus />
        </GlassSurface>

        <Text style={styles.label}>Hourly rate ($)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={hourlyRate} onChangeText={setHourlyRate} placeholder="e.g. 25" placeholderTextColor={theme.colors.mutedForeground} keyboardType="decimal-pad" />
        </GlassSurface>

        <Text style={styles.label}>Budget (optional)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={budget} onChangeText={setBudget} placeholder="e.g. 5000" placeholderTextColor={theme.colors.mutedForeground} keyboardType="decimal-pad" />
        </GlassSurface>

        <TouchableOpacity style={styles.createBtn} onPress={onCreate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Create Project</Text>}
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  hint: { fontSize: 12, color: theme.colors.mutedForeground, marginLeft: 4, marginTop: 4 },
  createBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
