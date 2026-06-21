import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
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
import { analyzeDocumentText, DocumentSummary } from '@/lib/docs/analyze';
import { listDocuments, addDocument } from '@/lib/cases/documents';
import { addEvent } from '@/lib/cases/events';
import { addDeadline } from '@/lib/cases/deadlines';
import { indexCaseText } from '@/lib/rag/index';
import { CaseDocument, CaseDocType } from '@/lib/cases/types';

const RISK_COLOR: Record<string, string> = {
  Low: '#10b981',
  Medium: '#f59e0b',
  High: '#ef4444',
  Unknown: '#64748b',
};

function inferType(mimeType?: string | null, name?: string | null): CaseDocType | null {
  const lower = (mimeType || name || '').toLowerCase();
  if (lower.includes('image') || /\.(png|jpe?g|heic|webp)$/.test(lower)) return 'image';
  if (lower.includes('pdf') || lower.endsWith('.pdf')) return 'pdf';
  if (lower.includes('wordprocessingml') || lower.endsWith('.docx')) return 'docx';
  return null;
}

/**
 * Documents tab: upload an image (OCR), PDF, or DOCX; extract its text;
 * analyze it into a Document Summary; persist it to the case; feed any
 * important date into the timeline (and deadlines, if it reads as one); and
 * index it for RAG so the legal chat can reference it.
 */
export default function CaseDocuments() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const { llm, isLocalModelReady } = useChat();
  const ocr = useOcrGlobal();

  const [docs, setDocs] = useState<CaseDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    if (!caseId) return;
    const rows = await listDocuments(caseId);
    setDocs(rows);
    setLoading(false);
  }, [caseId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const processDocument = useCallback(async (input: { uri: string; name: string; type: CaseDocType }) => {
    if (!caseId) return;
    if (!isLocalModelReady) {
      Alert.alert('Model loading', 'The on-device model is still loading. Please try again in a moment.');
      return;
    }
    if (input.type === 'image' && !ocr.isReady) {
      Alert.alert(
        'OCR loading',
        ocr.downloadProgress > 0
          ? `Downloading the on-device text-recognition model (${Math.round(ocr.downloadProgress * 100)}%)…`
          : 'Loading the on-device text-recognition model. Please try again shortly.'
      );
      return;
    }

    setProcessing(true);
    try {
      const text = await extractDocumentText({
        uri: input.uri,
        type: input.type,
        ocrForward: input.type === 'image' ? ocr.forward : undefined,
      });

      let summary: DocumentSummary;
      if (!text) {
        summary = { documentType: 'Document', importantDate: null, requiredAction: null, risk: 'Unknown' };
        Alert.alert(
          'Limited text extraction',
          input.type === 'pdf'
            ? 'Could not read text from this PDF (it may be a scanned/compressed PDF without a text layer). It was saved, but no summary could be generated.'
            : 'Could not extract readable text from this file. It was saved without a summary.'
        );
      } else {
        summary = await analyzeDocumentText(text, llm);
      }

      const saved = await addDocument({
        caseId,
        name: input.name,
        type: input.type,
        uri: input.uri,
        extractedText: text,
        summaryJson: JSON.stringify(summary),
        risk: summary.risk,
      });

      if (text) {
        await indexCaseText({ caseId, sourceType: 'document', sourceId: saved.id, text });
      }
      if (summary.importantDate) {
        await addEvent({ caseId, date: summary.importantDate, label: `${summary.documentType}: ${input.name}`, source: 'document' });
        if (summary.requiredAction) {
          await addDeadline({ caseId, dueDate: summary.importantDate, label: summary.requiredAction, kind: 'other' });
        }
      }

      await load();
    } catch (error) {
      console.error('[Docs] Failed to process document:', error);
      Alert.alert('Error', 'Something went wrong analyzing this document.');
    } finally {
      setProcessing(false);
    }
  }, [caseId, llm, isLocalModelReady, ocr, load]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await processDocument({ uri: asset.uri, name: asset.fileName || `image_${Date.now()}.jpg`, type: 'image' });
  };

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const type = inferType(asset.mimeType, asset.name);
    if (!type) {
      Alert.alert('Unsupported file', 'Please choose an image, PDF, or DOCX file.');
      return;
    }
    await processDocument({ uri: asset.uri, name: asset.name || `document_${Date.now()}`, type });
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
        data={docs}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const summary: DocumentSummary | null = item.summaryJson ? JSON.parse(item.summaryJson) : null;
          return (
            <GlassSurface style={styles.card} borderRadius={14}>
              <View style={styles.cardHeader}>
                <Ionicons
                  name={item.type === 'image' ? 'image-outline' : item.type === 'pdf' ? 'document-outline' : 'document-text-outline'}
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={styles.docName} numberOfLines={1}>{item.name}</Text>
                <View style={[styles.riskBadge, { backgroundColor: RISK_COLOR[item.risk] + '22' }]}>
                  <Text style={[styles.riskText, { color: RISK_COLOR[item.risk] }]}>{item.risk}</Text>
                </View>
              </View>
              {summary && (
                <>
                  <Text style={styles.summaryType}>{summary.documentType}</Text>
                  {summary.importantDate && (
                    <Text style={styles.summaryLine}>📅 {summary.importantDate}</Text>
                  )}
                  {summary.requiredAction && (
                    <Text style={styles.summaryLine}>✅ {summary.requiredAction}</Text>
                  )}
                </>
              )}
            </GlassSurface>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={44} color={theme.colors.primary} />
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyText}>
              Upload a photo of a notice, a PDF, or a DOCX file to extract dates, required
              actions, and a risk level.
            </Text>
          </View>
        }
      />

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={pickImage} disabled={processing} activeOpacity={0.85}>
          <Ionicons name="camera-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickFile} disabled={processing} activeOpacity={0.85}>
          <Ionicons name="document-attach-outline" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>PDF / DOCX</Text>
        </TouchableOpacity>
      </View>

      {processing && (
        <View style={styles.processingOverlay}>
          <GlassSurface style={styles.processingCard} borderRadius={16} strong>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.processingText}>Analyzing document…</Text>
          </GlassSurface>
        </View>
      )}
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: 16, paddingBottom: 100, gap: 10 },
  card: { padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  docName: { flex: 1, fontSize: 13, fontWeight: '600', color: theme.colors.text },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  riskText: { fontSize: 10, fontWeight: '700' },
  summaryType: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  summaryLine: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  emptyText: { fontSize: 13, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 18 },
  actions: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 14,
  },
  actionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  processingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  processingCard: { padding: 20, alignItems: 'center', gap: 10 },
  processingText: { fontSize: 13, color: theme.colors.text, fontWeight: '600' },
});
