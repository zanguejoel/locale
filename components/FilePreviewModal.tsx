import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { getFileTypeInfo, formatFileSize } from '@/utils/FileTypeHelpers';

export interface SelectedFile {
  uri: string;
  type: string;
  name: string;
  size?: number;
  width?: number;
  height?: number;
}

interface FilePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  onBack?: () => void; // Return to attachments modal
  files: SelectedFile[];
  onDeleteFile: (index: number) => void;
  onClearAll: () => void;
  maxFiles?: number;
  maxTotalSize?: number;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  visible,
  onClose,
  onBack,
  files,
  onDeleteFile,
  onClearAll,
  maxFiles = 5,
  maxTotalSize = 50 * 1024 * 1024, // 50MB
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Calculate total size
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);

  const handleClearAll = () => {
    if (files.length > 1) {
      Alert.alert(
        'Clear All Files',
        `Remove all ${files.length} files?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Clear All', 
            onPress: () => {
              onClearAll();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }, 
            style: 'destructive' 
          }
        ]
      );
    } else {
      onClearAll();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  const handleDeleteFile = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDeleteFile(index);
  };

  const tooManyFiles = files.length > maxFiles;
  const sizeTooLarge = totalSize > maxTotalSize;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
            <View style={styles.blurContent} />
          </BlurView>
        ) : (
          <View style={styles.androidOverlay} />
        )}

        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.header}>
              {/* Back button */}
              {onBack && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onBack();
                  }}
                  style={styles.backButton}
                  accessibilityLabel="Back to attachments"
                  accessibilityRole="button"
                >
                  <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
              )}
              
              <View style={styles.headerCenter}>
                <Ionicons name="attach" size={20} color={theme.colors.text} />
                <Text style={styles.title}>
                  {files.length} File{files.length !== 1 ? 's' : ''}
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

            {/* File List */}
            <ScrollView 
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {files.map((file, index) => {
                const fileInfo = getFileTypeInfo(file.name, file.type);
                const isImage = fileInfo.type === 'image';

                return (
                  <View key={`file-${index}`} style={styles.fileItem}>
                    {/* File Icon/Thumbnail */}
                    {isImage ? (
                      <Image
                        source={{ uri: file.uri }}
                        style={styles.fileThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={[styles.fileIconContainer, { backgroundColor: fileInfo.color + '20' }]}>
                        <Ionicons name={fileInfo.icon} size={28} color={fileInfo.color} />
                      </View>
                    )}

                    {/* File Info */}
                    <View style={styles.fileInfo}>
                      <Text style={styles.fileName} numberOfLines={2}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {formatFileSize(file.size)}
                      </Text>
                    </View>

                    {/* Delete Button */}
                    <TouchableOpacity
                      onPress={() => handleDeleteFile(index)}
                      style={styles.deleteButton}
                      accessibilityLabel={`Remove ${file.name}`}
                      accessibilityRole="button"
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.destructive} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            {/* Footer with Summary and Actions */}
            <View style={styles.footer}>
              {/* Summary */}
              <View style={styles.summary}>
                <View style={styles.summaryItem}>
                  <Ionicons name="folder-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={styles.summaryText}>
                    Total: {formatFileSize(totalSize)}
                  </Text>
                </View>

                {/* Warnings */}
                {tooManyFiles && (
                  <View style={styles.warningItem}>
                    <Ionicons name="warning" size={14} color={theme.colors.destructive} />
                    <Text style={styles.warningText}>
                      Maximum {maxFiles} files allowed
                    </Text>
                  </View>
                )}
                
                {sizeTooLarge && (
                  <View style={styles.warningItem}>
                    <Ionicons name="alert-circle" size={14} color={theme.colors.destructive} />
                    <Text style={styles.warningText}>
                      Total size exceeds {formatFileSize(maxTotalSize)} limit
                    </Text>
                  </View>
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.actions}>
                {/* Add More Button (if files < max) */}
                {onBack && files.length < maxFiles && (
                  <TouchableOpacity
                    style={styles.addMoreButton}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      onBack();
                    }}
                    accessibilityLabel="Add more files"
                    accessibilityRole="button"
                  >
                    <Ionicons name="add-circle" size={18} color={theme.colors.primary} />
                    <Text style={styles.addMoreButtonText}>Add More</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={handleClearAll}
                  accessibilityLabel="Clear all files"
                  accessibilityRole="button"
                >
                  <Ionicons name="trash" size={18} color={theme.colors.destructive} />
                  <Text style={styles.clearButtonText}>Clear All</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.doneButton, onBack && files.length < maxFiles && styles.doneButtonCompact]}
                  onPress={onClose}
                  accessibilityLabel="Done"
                  accessibilityRole="button"
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
  },
  blurContent: {
    flex: 1,
  },
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
  },
  modalContent: {
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
  },
  modalCard: {
    backgroundColor: theme.colors.background,
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    maxHeight: 400,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  fileThumbnail: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: theme.isDark ? '#2a2a2a' : '#f5f5f5',
  },
  fileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.destructive + '15',
  },
  footer: {
    marginTop: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
  },
  summary: {
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  warningText: {
    fontSize: 12,
    color: theme.colors.destructive,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '15',
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  addMoreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.destructive + '15',
    borderWidth: 1,
    borderColor: theme.colors.destructive + '30',
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.destructive,
  },
  doneButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  doneButtonCompact: {
    flex: 1,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default FilePreviewModal;

