import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { LocaleGlass } from '@/constants/LocaleColors';
import { createCase } from '@/lib/cases/cases';
import { legalModule } from '@/lib/navigators/legal';

/**
 * New Case form. Can be opened blank, or prefilled from a "Potential Case
 * Detected" card via the `title`/`category` route params.
 */
export default function NewCase() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; category?: string; jurisdiction?: string }>();

  const [title, setTitle] = useState(params.title ?? '');
  const [category, setCategory] = useState(params.category ?? legalModule.categories[0]);
  const [jurisdiction, setJurisdiction] = useState(params.jurisdiction ?? '');
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Give the case a short title.');
      return;
    }
    try {
      setSaving(true);
      const created = await createCase({
        moduleId: legalModule.id,
        title: title.trim(),
        category,
        jurisdiction: jurisdiction.trim() || null,
      });
      // Replace so back doesn't return to the form.
      router.replace(`/(legal)/${created.id}` as any);
    } catch (e) {
      console.error('[Legal] Failed to create case:', e);
      Alert.alert('Error', 'Could not create the case. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Title</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Security Deposit Dispute"
            placeholderTextColor={theme.colors.mutedForeground}
            autoFocus
          />
        </GlassSurface>

        <Text style={styles.label}>Category</Text>
        <View style={styles.chips}>
          {legalModule.categories.map((c) => {
            const active = c === category;
            return (
              <TouchableOpacity key={c} activeOpacity={0.8} onPress={() => setCategory(c)}>
                <GlassSurface
                  style={[styles.chip, active && styles.chipActive]}
                  borderRadius={20}
                  highlighted={active}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </GlassSurface>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Jurisdiction (optional)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput
            style={styles.input}
            value={jurisdiction}
            onChangeText={setJurisdiction}
            placeholder="e.g. Ontario, Canada"
            placeholderTextColor={theme.colors.mutedForeground}
          />
        </GlassSurface>

        <TouchableOpacity style={styles.createBtn} onPress={onCreate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Create Case</Text>}
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
  chipActive: {},
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  createBtn: {
    marginTop: 24,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
