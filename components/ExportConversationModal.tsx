import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Message } from '@/utils/Interfaces';
import { exportConversation, ExportFormat, getExportSizeEstimate } from '@/utils/ConversationExporter';

interface ExportConversationModalProps {
  visible: boolean;
  onClose: () => void;
  messages: Message[];
  conversationTitle?: string;
}

interface FormatOption {
  format: ExportFormat;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    format: 'txt',
    icon: 'document-text-outline',
    label: 'Plain Text',
    description: 'Simple text format, easy to read',
  },
  {
    format: 'markdown',
    icon: 'logo-markdown',
    label: 'Markdown',
    description: 'Formatted text with styling',
  },
  {
    format: 'json',
    icon: 'code-slash-outline',
    label: 'JSON',
    description: 'Structured data format',
  },
];

const ExportConversationModal: React.FC<ExportConversationModalProps> = ({
  visible,
  onClose,
  messages,
  conversationTitle,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await exportConversation(messages, selectedFormat, {
        conversationTitle,
        includeTimestamps,
        includeMetadata,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const estimatedSize = getExportSizeEstimate(messages, selectedFormat);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Export Conversation</Text>
              <Text style={styles.subtitle}>
                {messages.length} message{messages.length !== 1 ? 's' : ''} • Est. {estimatedSize}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Format Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Export Format</Text>
              <View style={styles.formatOptions}>
                {FORMAT_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.format}
                    onPress={() => handleFormatSelect(option.format)}
                    style={[
                      styles.formatOption,
                      selectedFormat === option.format && styles.formatOptionSelected,
                    ]}
                    accessibilityLabel={`Export as ${option.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedFormat === option.format }}
                  >
                    <View style={styles.formatOptionIcon}>
                      <Ionicons
                        name={option.icon}
                        size={24}
                        color={
                          selectedFormat === option.format
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles.formatOptionContent}>
                      <Text
                        style={[
                          styles.formatOptionLabel,
                          selectedFormat === option.format && styles.formatOptionLabelSelected,
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={styles.formatOptionDescription}>
                        {option.description}
                      </Text>
                    </View>
                    {selectedFormat === option.format && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Options */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Options</Text>
              
              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Include Timestamps</Text>
                  <Text style={styles.optionDescription}>
                    Add message timestamps to export
                  </Text>
                </View>
                <Switch
                  value={includeTimestamps}
                  onValueChange={setIncludeTimestamps}
                  trackColor={{ 
                    false: theme.isDark ? '#3a3a3a' : '#e0e0e0',
                    true: theme.colors.primary + '80'
                  }}
                  thumbColor={includeTimestamps ? theme.colors.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.optionRow}>
                <View style={styles.optionInfo}>
                  <Text style={styles.optionLabel}>Include Metadata</Text>
                  <Text style={styles.optionDescription}>
                    Add conversation info and statistics
                  </Text>
                </View>
                <Switch
                  value={includeMetadata}
                  onValueChange={setIncludeMetadata}
                  trackColor={{ 
                    false: theme.isDark ? '#3a3a3a' : '#e0e0e0',
                    true: theme.colors.primary + '80'
                  }}
                  thumbColor={includeMetadata ? theme.colors.primary : '#f4f3f4'}
                />
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.button, styles.cancelButton]}
              disabled={isExporting}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExport}
              disabled={isExporting || messages.length === 0}
              style={[
                styles.button,
                styles.exportButton,
                (isExporting || messages.length === 0) && styles.exportButtonDisabled,
              ]}
              accessibilityLabel="Export conversation"
              accessibilityRole="button"
              accessibilityState={{ disabled: isExporting || messages.length === 0 }}
            >
              {isExporting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.exportButtonText}>Exporting...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="share-outline" size={18} color="#fff" />
                  <Text style={styles.exportButtonText}>Export</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    maxHeight: 500,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  formatOptions: {
    gap: 12,
  },
  formatOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 2,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  formatOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '10',
  },
  formatOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.isDark ? '#2a2a2a' : '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  formatOptionContent: {
    flex: 1,
  },
  formatOptionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  formatOptionLabelSelected: {
    color: theme.colors.primary,
  },
  formatOptionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionInfo: {
    flex: 1,
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  exportButton: {
    backgroundColor: theme.colors.primary,
  },
  exportButtonDisabled: {
    opacity: 0.5,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default ExportConversationModal;

