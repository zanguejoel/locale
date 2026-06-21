import React, { useState } from 'react';
import { Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { extractDocumentText } from '@/lib/docs/extractText';
import { analyzeContractText } from '@/lib/freelance/analyzeContract';
import { addContract } from '@/lib/freelance/contracts';
import { scheduleContractExpiryReminder } from '@/lib/freelance/reminders';
import { indexContract } from '@/lib/freelance/index_rag';

/**
 * New Contract: upload a PDF/DOCX, extract its text (reusing the same
 * lib/docs/extractText.ts pipeline), and have the on-device model fill in
 * start/end/renewal dates, payment terms, and notice period. If the
 * expiry/renewal date is within 30 days, schedules a local reminder.
 */
export default function NewContract() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { llm, isLocalModelReady } = useChat();

  const [name, setName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [fields, setFields] = useState<{
    startDate: string | null; endDate: string | null; renewalDate: string | null;
    paymentTerms: string | null; noticePeriod: string | null;
  } | null>(null);

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const lower = (asset.mimeType || asset.name || '').toLowerCase();
    const type = lower.includes('pdf') ? 'pdf' : lower.includes('wordprocessingml') ? 'docx' : null;
    if (!type) {
      Alert.alert('Unsupported file', 'Please choose a PDF or DOCX file.');
      return;
    }
    if (!isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    if (!name.trim()) setName(asset.name || 'Contract');

    setProcessing(true);
    setSourceUri(asset.uri);
    try {
      const text = await extractDocumentText({ uri: asset.uri, type });
      setExtractedText(text);
      if (text) {
        setFields(await analyzeContractText(text, llm));
      } else {
        Alert.alert('Limited text extraction', 'Could not read text from this file. You can still save it without extracted terms.');
      }
    } catch (e) {
      console.error('[Freelancer] Contract processing failed:', e);
      Alert.alert('Error', 'Something went wrong analyzing this contract.');
    } finally {
      setProcessing(false);
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the contract a name.');
      return;
    }
    try {
      setSaving(true);
      const created = await addContract({
        name: name.trim(),
        uri: sourceUri,
        extractedText,
        startDate: fields?.startDate ?? null,
        endDate: fields?.endDate ?? null,
        renewalDate: fields?.renewalDate ?? null,
        paymentTerms: fields?.paymentTerms ?? null,
        noticePeriod: fields?.noticePeriod ?? null,
      });
      await indexContract(created).catch((e) => console.error('[Freelancer] Index contract failed:', e));
      if (created.renewalDate || created.endDate) {
        await scheduleContractExpiryReminder(created).catch((e) => console.error('[Freelancer] Schedule reminder failed:', e));
      }
      router.replace(`/(freelancer)/contracts/${created.id}` as any);
    } catch (e) {
      console.error('[Freelancer] Failed to save contract:', e);
      Alert.alert('Error', 'Could not save the contract.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. National Bank Service Agreement" placeholderTextColor={theme.colors.mutedForeground} />
        </GlassSurface>

        <TouchableOpacity style={styles.uploadBtn} onPress={pickFile} disabled={processing} activeOpacity={0.85}>
          {processing ? <ActivityIndicator color="#FFFFFF" /> : (
            <>
              <Ionicons name="document-attach-outline" size={20} color="#FFFFFF" />
              <Text style={styles.uploadText}>Upload PDF / DOCX</Text>
            </>
          )}
        </TouchableOpacity>

        {fields && (
          <GlassSurface style={styles.resultCard} borderRadius={16}>
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Start date</Text><Text style={styles.fieldValue}>{fields.startDate ?? '—'}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>End date</Text><Text style={styles.fieldValue}>{fields.endDate ?? '—'}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Renewal date</Text><Text style={styles.fieldValue}>{fields.renewalDate ?? '—'}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Payment terms</Text><Text style={styles.fieldValue}>{fields.paymentTerms ?? '—'}</Text></View>
            <View style={styles.fieldRow}><Text style={styles.fieldLabel}>Notice period</Text><Text style={styles.fieldValue}>{fields.noticePeriod ?? '—'}</Text></View>
          </GlassSurface>
        )}

        <TouchableOpacity style={styles.createBtn} onPress={onSave} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Save Contract</Text>}
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
  uploadBtn: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14,
  },
  uploadText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  resultCard: { marginTop: 16, padding: 14, gap: 8 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 12, color: theme.colors.mutedForeground },
  fieldValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  createBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
