import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { listLetters } from '@/lib/cases/letters';
import { generateFollowUp } from '@/lib/followups/generate';
import { CaseLetter, LetterKind, LetterTone } from '@/lib/cases/types';

const KIND_OPTIONS: { value: LetterKind; label: string }[] = [
  { value: 'email', label: 'Email' },
  { value: 'letter', label: 'Letter' },
  { value: 'complaint', label: 'Complaint' },
  { value: 'status_request', label: 'Status Request' },
  { value: 'information_request', label: 'Information Request' },
];

const TONE_OPTIONS: { value: LetterTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'assertive', label: 'Assertive' },
];

export default function CaseFollowUp() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { llm, isLocalModelReady } = useChat();

  const [kind, setKind] = useState<LetterKind>('email');
  const [tone, setTone] = useState<LetterTone>('professional');
  const [generating, setGenerating] = useState(false);
  const [letters, setLetters] = useState<CaseLetter[]>([]);

  const load = useCallback(async () => {
    if (!caseId) return;
    setLetters(await listLetters(caseId));
  }, [caseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onGenerate = async () => {
    if (!caseId) return;
    if (!isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    setGenerating(true);
    try {
      await generateFollowUp(caseId, kind, tone, llm);
      await load();
    } catch (error) {
      console.error('[Legal] Follow-up generation failed:', error);
      Alert.alert('Error', 'Could not generate a draft.');
    } finally {
      setGenerating(false);
    }
  };

  const onCopy = async (content: string) => {
    await Clipboard.setStringAsync(content);
    Alert.alert('Copied', 'The draft was copied to your clipboard.');
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.chips}>
          {KIND_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} activeOpacity={0.8} onPress={() => setKind(opt.value)}>
              <GlassSurface style={styles.chip} borderRadius={20} highlighted={kind === opt.value}>
                <Text style={[styles.chipText, kind === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </GlassSurface>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Tone</Text>
        <View style={styles.chips}>
          {TONE_OPTIONS.map((opt) => (
            <TouchableOpacity key={opt.value} activeOpacity={0.8} onPress={() => setTone(opt.value)}>
              <GlassSurface style={styles.chip} borderRadius={20} highlighted={tone === opt.value}>
                <Text style={[styles.chipText, tone === opt.value && styles.chipTextActive]}>{opt.label}</Text>
              </GlassSurface>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={onGenerate} disabled={generating} activeOpacity={0.85}>
          {generating ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Ionicons name="sparkles-outline" size={18} color="#FFFFFF" />
              <Text style={styles.generateText}>Generate Follow-Up</Text>
            </>
          )}
        </TouchableOpacity>

        {letters.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Drafts</Text>
            {letters.map((letter) => (
              <GlassSurface key={letter.id} style={styles.draftCard} borderRadius={14}>
                <View style={styles.draftHeader}>
                  <Text style={styles.draftKind}>
                    {KIND_OPTIONS.find((k) => k.value === letter.kind)?.label} · {TONE_OPTIONS.find((t) => t.value === letter.tone)?.label}
                  </Text>
                  <TouchableOpacity onPress={() => onCopy(letter.content)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="copy-outline" size={18} color={theme.colors.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.draftContent}>{letter.content}</Text>
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
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 8, marginBottom: 2, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary },
  generateBtn: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
  },
  generateText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginTop: 24, marginBottom: 4 },
  draftCard: { padding: 14, marginTop: 8 },
  draftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  draftKind: { fontSize: 12, fontWeight: '700', color: theme.colors.mutedForeground },
  draftContent: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
});
