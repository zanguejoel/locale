/**
 * DocumentPreview Component
 * Modern document preview for chat messages - matches audio player design
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Role } from '@/utils/Interfaces';
import { getFileTypeInfo, formatFileSize } from '@/utils/FileTypeHelpers';
import * as Haptics from 'expo-haptics';

interface DocumentPreviewProps {
  fileName: string;
  fileSize?: number;
  fileUri?: string;
  mimeType?: string;
  role: Role;
  onPress?: () => void;
  onLongPress?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  fileName,
  fileSize,
  fileUri,
  mimeType,
  role,
  onPress,
  onLongPress,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Get file type information (icon, color, category)
  const fileInfo = getFileTypeInfo(fileName, mimeType);

  // Extract file extension
  const extension = fileName.split('.').pop()?.toUpperCase() || 'FILE';

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      style={[
        styles.container,
        role === Role.Bot ? styles.botContent : styles.userContent,
      ]}
      accessible
      accessibilityLabel={`${role === Role.Bot ? 'Assistant' : 'Your'} document: ${fileName}`}
      accessibilityRole="button"
      testID="document-preview-container"
    >
      {/* Document Icon Circle */}
      <View style={[
        styles.iconContainer,
        role === Role.User && styles.iconContainerUser,
        { backgroundColor: `${fileInfo.color}${role === Role.User ? '33' : '20'}` }
      ]}>
        <Ionicons 
          name={fileInfo.icon as any} 
          size={24} 
          color={role === Role.User ? '#FFFFFF' : fileInfo.color} 
        />
        {/* Extension Badge */}
        <View style={[
          styles.extensionBadge,
          { backgroundColor: role === Role.User ? 'rgba(255, 255, 255, 0.25)' : fileInfo.color }
        ]}>
          <Text style={[
            styles.extensionText,
            { color: role === Role.User ? '#FFFFFF' : '#FFFFFF' }
          ]}>
            {extension.slice(0, 4)}
          </Text>
        </View>
      </View>

      {/* Document Info */}
      <View style={styles.infoContainer}>
        <Text 
          style={[
            styles.fileName,
            role === Role.User && styles.fileNameUser
          ]} 
          numberOfLines={2}
        >
          {fileName}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[
            styles.fileType,
            role === Role.User && styles.metaTextUser
          ]}>
            {fileInfo.category}
          </Text>
          {fileSize && (
            <>
              <Text style={[styles.separator, role === Role.User && styles.metaTextUser]}>•</Text>
              <Text style={[
                styles.fileSize,
                role === Role.User && styles.metaTextUser
              ]}>
                {formatFileSize(fileSize)}
              </Text>
            </>
          )}
        </View>
      </View>

      {/* Action Icon */}
      <View style={styles.actionContainer}>
        <Ionicons 
          name="download-outline" 
          size={20} 
          color={role === Role.User ? 'rgba(255, 255, 255, 0.8)' : theme.colors.primary} 
        />
      </View>
    </Pressable>
  );
};

export default DocumentPreview;

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 260,
    maxWidth: 340,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  botContent: {
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
  },
  userContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerUser: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  extensionBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    minWidth: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.isDark ? '#1a1a1a' : '#FFFFFF',
  },
  extensionText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    lineHeight: 18,
  },
  fileNameUser: {
    color: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fileType: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
  separator: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    opacity: 0.6,
  },
  fileSize: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    opacity: 0.8,
    fontVariant: ['tabular-nums'],
  },
  metaTextUser: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  actionContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
  },
});

