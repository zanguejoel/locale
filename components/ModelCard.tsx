/**
 * Model Card Component
 * Displays model information with action buttons
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';
import { LocalModel } from '@/constants/LocalModels';
import { ModelFileManager, DownloadedModelInfo } from '@/utils/ModelFileManager';
import { formatDistanceToNow } from '@/utils/dateHelpers';

interface ModelCardProps {
  model: LocalModel;
  downloadInfo?: DownloadedModelInfo;
  isActive: boolean;
  isDownloading?: boolean;
  downloadProgress?: number;
  onDelete?: () => void;
  onSelect?: () => void;
  onDownload?: () => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  downloadInfo,
  isActive,
  isDownloading = false,
  downloadProgress = 0,
  onDelete,
  onSelect,
  onDownload,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const isDownloaded = !!downloadInfo;

  const getStatusInfo = () => {
    if (isDownloading) {
      return { text: 'Downloading...', color: theme.colors.primary, icon: 'cloud-download' as const };
    }
    if (isActive) {
      return { text: 'In use', color: theme.colors.primary, icon: 'checkmark-circle' as const };
    }
    if (isDownloaded) {
      return { text: 'Downloaded', color: theme.colors.accent, icon: 'checkmark-circle-outline' as const };
    }
    return { text: 'Not downloaded', color: theme.colors.textSecondary, icon: 'cloud-download-outline' as const };
  };

  const status = getStatusInfo();

  const handleDelete = () => {
    if (!downloadInfo) return;

    Alert.alert(
      'Delete Model',
      `Delete ${model.displayName}? This will free up ${ModelFileManager.formatFileSize(downloadInfo.size)}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDelete?.(),
        },
      ]
    );
  };

  return (
    <View style={[styles.container, isActive && styles.containerActive]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.icon, isDownloaded && styles.iconDownloaded]}>
          <Ionicons 
            name={status.icon} 
            size={24} 
            color={isDownloaded ? '#fff' : theme.colors.textSecondary} 
          />
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{model.displayName}</Text>
          <Text style={styles.description} numberOfLines={1}>
            {model.description}
          </Text>
        </View>
      </View>

      {/* Details */}
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="information-circle-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.detailLabel}>Status</Text>
          </View>
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.text}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="folder-outline" size={14} color={theme.colors.textSecondary} />
            <Text style={styles.detailLabel}>Size</Text>
          </View>
          <Text style={styles.detailValue}>
            {isDownloaded 
              ? ModelFileManager.formatFileSize(downloadInfo.size)
              : model.size
            }
          </Text>
        </View>

        {downloadInfo?.lastUsed && (
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.detailLabel}>Last used</Text>
            </View>
            <Text style={styles.detailValue}>
              {formatDistanceToNow(downloadInfo.lastUsed)}
            </Text>
          </View>
        )}

        {downloadInfo?.fileCount && (
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Ionicons name="documents-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={styles.detailLabel}>Files</Text>
            </View>
            <Text style={styles.detailValue}>
              {downloadInfo.fileCount} file{downloadInfo.fileCount !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Download Progress */}
      {isDownloading && (
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              Downloading... {Math.round(downloadProgress * 100)}%
            </Text>
            <Text style={styles.progressSize}>
              {model.size}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressBarFill, 
                { width: `${Math.max(downloadProgress * 100, 2)}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        {isDownloaded ? (
          <>
            {/* Downloaded Model Actions */}
            {!isActive && onSelect && (
              <TouchableOpacity 
                style={[styles.button, styles.selectButton]}
                onPress={onSelect}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.selectButtonText}>Set as Default</Text>
              </TouchableOpacity>
            )}
            
            {!isActive && onDelete && (
              <TouchableOpacity 
                style={[styles.button, styles.deleteButton]}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={16} color={theme.colors.destructive} />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </TouchableOpacity>
            )}

            {isActive && (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
                <Text style={styles.activeBadgeText}>Currently Active</Text>
              </View>
            )}
          </>
        ) : (
          <>
            {/* Not Downloaded - Show Download Button */}
            {isDownloading ? (
              <View style={styles.downloadingBadge}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.downloadingText}>Downloading...</Text>
              </View>
            ) : (
              onDownload && (
                <TouchableOpacity 
                  style={[styles.button, styles.downloadButton]}
                  onPress={onDownload}
                >
                  <Ionicons name="cloud-download-outline" size={18} color="#fff" />
                  <Text style={styles.downloadButtonText}>Download Model</Text>
                </TouchableOpacity>
              )
            )}
          </>
        )}
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  containerActive: {
    borderColor: theme.colors.primary,
    borderWidth: 2,
    backgroundColor: `${theme.colors.primary}05`,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.background200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconDownloaded: {
    backgroundColor: theme.colors.primary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  details: {
    gap: 8,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  selectButton: {
    backgroundColor: theme.colors.primary,
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    backgroundColor: `${theme.colors.destructive}15`,
    borderWidth: 1,
    borderColor: theme.colors.destructive,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.destructive,
  },
  downloadButton: {
    backgroundColor: theme.colors.primary,
    flex: 1,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  activeBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    backgroundColor: `${theme.colors.primary}15`,
  },
  activeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  progressContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  progressSize: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  progressBar: {
    height: 6,
    backgroundColor: theme.colors.background200,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
  },
  downloadingBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    backgroundColor: `${theme.colors.primary}15`,
  },
  downloadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});

export default ModelCard;

