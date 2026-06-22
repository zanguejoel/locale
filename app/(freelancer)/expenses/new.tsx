import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useChat } from '@/hooks/useChat';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { useOcrGlobal } from '@/hooks/useOcrGlobal';
import { extractDocumentText } from '@/lib/docs/extractText';
import { CaseDocType } from '@/lib/cases/types';
import { analyzeExpenseText, ParsedExpense } from '@/lib/freelance/analyzeExpense';
import { addExpense } from '@/lib/freelance/expenses';
import { indexExpense } from '@/lib/freelance/index_rag';

function inferType(mimeType?: string | null, name?: string | null): CaseDocType | null {
  const lower = (mimeType || name || '').toLowerCase();
  if (lower.includes('image') || /\.(png|jpe?g|heic|webp)$/.test(lower)) return 'image';
  if (lower.includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
  return null;
}

/**
 * New Expense: upload a receipt photo or PDF, extract its text (OCR/PDF —
 * reusing the exact same lib/docs/extractText.ts pipeline Procedure Hub
 * uses), and have the on-device model fill in vendor/amount/date/category.
 */
export default function NewExpense() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { llm, isLocalModelReady } = useChat();
  const ocr = useOcrGlobal();

  const [processing, setProcessing] = useState(false);
  const [parsed, setParsed] = useState<ParsedExpense | null>(null);
  const [sourceUri, setSourceUri] = useState<string | null>(null);

  const processReceipt = async (uri: string, type: CaseDocType) => {
    if (!isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    if (type === 'image' && !ocr.isReady) {
      Alert.alert('OCR loading', 'Loading the on-device text-recognition model. Please try again shortly.');
      return;
    }
    setProcessing(true);
    setSourceUri(uri);
    try {
      const text = await extractDocumentText({ uri, type, ocrForward: type === 'image' ? ocr.forward : undefined });
      if (!text) {
        Alert.alert('Limited text extraction', 'Could not read text from this file. Please enter the details manually.');
        setParsed({ vendor: '', amount: 0, date: new Date().toISOString().slice(0, 10), category: 'Other' });
        return;
      }
      const result = await analyzeExpenseText(text, llm);
      setParsed(result);
    } catch (error) {
      console.error('[Freelancer] Expense receipt processing failed:', error);
      Alert.alert('Error', 'Something went wrong analyzing this receipt.');
    } finally {
      setProcessing(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    await processReceipt(result.assets[0].uri, 'image');
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf'] });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = inferType(asset.mimeType, asset.name);
    if (!type) {
      Alert.alert('Unsupported file', 'Please choose an image or PDF receipt.');
      return;
    }
    await processReceipt(asset.uri, type);
  };

  const onSave = async () => {
    if (!parsed) return;
    try {
      const created = await addExpense({
        vendor: parsed.vendor || 'Unknown vendor',
        amount: parsed.amount,
        date: parsed.date || new Date().toISOString().slice(0, 10),
        category: parsed.category,
        sourceDocumentUri: sourceUri,
      });
      await indexExpense(created).catch((e) => console.error('[Freelancer] Index expense failed:', e));
      router.back();
    } catch (e) {
      console.error('[Freelancer] Failed to save expense:', e);
      Alert.alert('Error', 'Could not save the expense.');
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {!parsed ? (
          <>
            <Text style={styles.intro}>Upload a receipt photo or PDF and the assistant will extract the vendor, amount, date, and category.</Text>
            <View style={styles.actions}>
              <TouchableOpacity style={styles.actionBtn} onPress={pickImage} disabled={processing} activeOpacity={0.85}>
                <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn} onPress={pickFile} disabled={processing} activeOpacity={0.85}>
                <Ionicons name="document-attach-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionText}>PDF</Text>
              </TouchableOpacity>
            </View>
            {processing && (
              <GlassSurface style={styles.processingCard} borderRadius={14}>
                <ActivityIndicator color={theme.colors.primary} />
                <Text style={styles.processingText}>Analyzing receipt…</Text>
              </GlassSurface>
            )}
          </>
        ) : (
          <GlassSurface style={styles.resultCard} borderRadius={16}>
            <Text style={styles.resultLabel}>Vendor</Text>
            <Text style={styles.resultValue}>{parsed.vendor || 'Unknown vendor'}</Text>
            <Text style={styles.resultLabel}>Amount</Text>
            <Text style={styles.resultValue}>${parsed.amount.toFixed(2)}</Text>
            <Text style={styles.resultLabel}>Date</Text>
            <Text style={styles.resultValue}>{parsed.date || 'Unknown'}</Text>
            <Text style={styles.resultLabel}>Category</Text>
            <Text style={styles.resultValue}>{parsed.category}</Text>
            <TouchableOpacity style={styles.saveBtn} onPress={onSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Expense</Text>
            </TouchableOpacity>
          </GlassSurface>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  intro: { fontSize: 13, color: theme.colors.mutedForeground, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14,
  },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  processingCard: { padding: 16, alignItems: 'center', gap: 8, flexDirection: 'row', justifyContent: 'center' },
  processingText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
  resultCard: { padding: 16, gap: 2 },
  resultLabel: { fontSize: 11, color: theme.colors.mutedForeground, marginTop: 10 },
  resultValue: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  saveBtn: { marginTop: 20, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
