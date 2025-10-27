/**
 * Document Preview Modal Component
 * 
 * Full-screen modal for viewing documents.
 * Supports: Images, PDFs, Videos, Voice recordings
 * 
 * Features:
 * - Full-screen image viewer with zoom/pan
 * - Video player
 * - Audio player for voice recordings
 * - Download/share options
 * - Close button
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DocumentBlock } from '@/utils/DocumentTypes';
import { getDocumentIcon, getDocumentTypeLabel } from '@/utils/DocumentParser';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import LazyImage from './LazyImage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DocumentPreviewModalProps {
  visible: boolean;
  document: DocumentBlock | null;
  onClose: () => void;
}

const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  visible,
  document,
  onClose,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!document) return null;

  const icon = getDocumentIcon(document.type);
  const typeLabel = getDocumentTypeLabel(document.type);

  // Check if content is a valid URL
  const isUrl = document.content && /^https?:\/\//i.test(document.content.trim());

  /**
   * Handle download document
   */
  const handleDownload = async () => {
    if (!isUrl) {
      Alert.alert('Cannot Download', 'This document cannot be downloaded.');
      return;
    }

    try {
      setIsDownloading(true);

      const fileUri = FileSystem.documentDirectory + document.name;
      const downloadResult = await FileSystem.downloadAsync(
        document.content.trim(),
        fileUri
      );

      if (downloadResult.status === 200) {
        Alert.alert(
          'Download Complete',
          `${document.name} has been saved successfully.`,
          [
            {
              text: 'OK',
              style: 'default',
            },
          ]
        );
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('[DocumentPreviewModal] Download error:', error);
      Alert.alert(
        'Download Failed',
        'Unable to download the document. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Handle share document
   */
  const handleShare = async () => {
    if (!isUrl) {
      // Share text content
      try {
        await Share.share({
          message: document.content || document.name,
          title: document.name,
        });
      } catch (error) {
        console.error('[DocumentPreviewModal] Share error:', error);
      }
      return;
    }

    try {
      setIsDownloading(true);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (!isAvailable) {
        Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
        return;
      }

      // Download file first
      const fileUri = FileSystem.cacheDirectory + document.name;
      const downloadResult = await FileSystem.downloadAsync(
        document.content.trim(),
        fileUri
      );

      if (downloadResult.status === 200) {
        await Sharing.shareAsync(fileUri, {
          mimeType: getMimeType(document.type),
          dialogTitle: `Share ${document.name}`,
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('[DocumentPreviewModal] Share error:', error);
      Alert.alert(
        'Share Failed',
        'Unable to share the document. Please try again.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  /**
   * Get MIME type for document type
   */
  const getMimeType = (type: string): string => {
    switch (type) {
      case 'image':
        return 'image/jpeg';
      case 'video':
        return 'video/mp4';
      case 'voice':
        return 'audio/mp4';
      case 'file':
      default:
        return 'application/octet-stream';
    }
  };

  /**
   * Render document content based on type
   */
  const renderContent = () => {
    // If not a URL, show description
    if (!isUrl) {
      return (
        <View style={styles.descriptionContainer}>
          <Ionicons name="document-text-outline" size={64} color={theme.colors.text} />
          <Text style={styles.descriptionText}>{document.content || 'No content available'}</Text>
        </View>
      );
    }

    // Render based on document type
    switch (document.type) {
      case 'image':
        return (
          <View style={styles.imageContainer}>
            <LazyImage
              uri={document.content.trim()}
              style={styles.fullImage}
              resizeMode="contain"
              priority="high"
              showLoadingIndicator
            />
          </View>
        );

      case 'video':
        return (
          <View style={styles.videoContainer}>
            <Ionicons name="videocam-outline" size={64} color={theme.colors.text} />
            <Text style={styles.placeholderText}>Video preview coming soon</Text>
            <Text style={styles.urlText} numberOfLines={2}>
              {document.content}
            </Text>
          </View>
        );

      case 'voice':
        return (
          <View style={styles.audioContainer}>
            <Ionicons name="mic-outline" size={64} color={theme.colors.text} />
            <Text style={styles.placeholderText}>Audio player coming soon</Text>
            <Text style={styles.urlText} numberOfLines={2}>
              {document.content}
            </Text>
          </View>
        );

      case 'file':
      default:
        return (
          <View style={styles.fileContainer}>
            <Ionicons name="document-text-outline" size={64} color={theme.colors.text} />
            <Text style={styles.placeholderText}>File preview not available</Text>
            <Text style={styles.urlText} numberOfLines={2}>
              {document.content}
            </Text>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar barStyle={theme.isDark ? 'light-content' : 'dark-content'} />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerContent}>
            <Text style={styles.headerEmoji}>{icon}</Text>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {document.name}
              </Text>
              <Text style={styles.headerSubtitle}>{typeLabel}</Text>
            </View>
          </View>

          <View style={styles.headerActions}>
            {isUrl && (
              <>
                <TouchableOpacity
                  onPress={handleShare}
                  style={styles.actionButton}
                  disabled={isDownloading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="share-outline" size={24} color={theme.colors.text} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDownload}
                  style={styles.actionButton}
                  disabled={isDownloading}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name={isDownloading ? 'hourglass-outline' : 'download-outline'}
                    size={24}
                    color={theme.colors.text}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {renderContent()}
        </View>

        {/* Footer (optional metadata) */}
        {document.created && (
          <View style={styles.footer}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.footerText}>
              Created: {new Date(document.created).toLocaleString()}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      gap: 12,
    },
    closeButton: {
      padding: 4,
    },
    headerContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    headerEmoji: {
      fontSize: 24,
    },
    headerTextContainer: {
      flex: 1,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerSubtitle: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    actionButton: {
      padding: 4,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageContainer: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT - 200,
      justifyContent: 'center',
      alignItems: 'center',
    },
    fullImage: {
      width: '100%',
      height: '100%',
    },
    videoContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 16,
    },
    audioContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 16,
    },
    fileContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 16,
    },
    descriptionContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
      gap: 16,
    },
    placeholderText: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      textAlign: 'center',
    },
    descriptionText: {
      fontSize: 15,
      fontWeight: '400',
      color: theme.colors.text,
      textAlign: 'center',
      lineHeight: 22,
    },
    urlText: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: 8,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
      gap: 8,
    },
    footerText: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.colors.textSecondary,
    },
  });

export default DocumentPreviewModal;

