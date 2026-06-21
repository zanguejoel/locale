import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { exportCase, ExportFormat } from '@/lib/export/exportCase';
import { LEGAL_DISCLAIMER } from '@/lib/navigators/legal';

const FORMATS: { value: ExportFormat; label: string; icon: string; note: string }[] = [
  { value: 'markdown', label: 'Markdown', icon: 'document-text-outline', note: 'Plain text, easy to paste anywhere' },
  { value: 'pdf', label: 'PDF', icon: 'document-outline', note: 'Best for printing or emailing a lawyer' },
  { value: 'docx', label: 'Word (.docx)', icon: 'create-outline', note: 'Editable in Word or Google Docs' },
];

/**
 * Export Case — the "Lawyer Handoff" flow. Assembles Case Summary, Timeline,
 * Facts, Evidence List, Documents, and Outstanding Issues into one document
 * and hands it to the OS share sheet.
 */
export default function CaseExports() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const onExport = async (format: ExportFormat) => {
    if (!caseId) return;
    setExporting(format);
    try {
      await exportCase(caseId, format);
    } catch (error) {
      console.error('[Legal] Export failed:', error);
      Alert.alert('Error', 'Could not export the case. Please try again.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.intro}>
          Export the case summary, timeline, facts, evidence list, and documents to
          share with a lawyer, paralegal, or agency.
        </Text>

        {FORMATS.map((f) => (
          <TouchableOpacity
            key={f.value}
            activeOpacity={0.85}
            onPress={() => onExport(f.value)}
            disabled={exporting !== null}
          >
            <GlassSurface style={styles.formatRow} borderRadius={16}>
              <View style={styles.formatIconWrap}>
                <Ionicons name={f.icon as any} size={22} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.formatLabel}>{f.label}</Text>
                <Text style={styles.formatNote}>{f.note}</Text>
              </View>
              {exporting === f.value ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <Ionicons name="share-outline" size={20} color={theme.colors.mutedForeground} />
              )}
            </GlassSurface>
          </TouchableOpacity>
        ))}

        <Text style={styles.disclaimer}>{LEGAL_DISCLAIMER}</Text>
      </View>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 12 },
  intro: { fontSize: 13, color: theme.colors.mutedForeground, lineHeight: 18, marginBottom: 8 },
  formatRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  formatIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  formatNote: { fontSize: 12, color: theme.colors.mutedForeground, marginTop: 2 },
  disclaimer: { fontSize: 11, color: theme.colors.mutedForeground, textAlign: 'center', lineHeight: 16, marginTop: 16 },
});
