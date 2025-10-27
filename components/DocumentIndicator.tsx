/**
 * Document Indicator Component
 * 
 * Displays an inline indicator for documents in chat messages.
 * Shows document type, name, preview, and real-time progress during streaming.
 * Tappable to open full viewer.
 * 
 * Supports: Images, Files, Videos, Voice recordings
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { DocumentBlock } from '@/utils/DocumentTypes';
import { getDocumentIcon, getDocumentTypeLabel } from '@/utils/DocumentParser';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import LazyImage from './LazyImage';

interface DocumentIndicatorProps {
  document: DocumentBlock;
  onPress: () => void;
  compact?: boolean;
}

const DocumentIndicator: React.FC<DocumentIndicatorProps> = ({
  document,
  onPress,
  compact = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const icon = getDocumentIcon(document.type);
  const typeLabel = getDocumentTypeLabel(document.type);

  // Determine if content is a valid URL for image preview
  const isImageUrl = useMemo(() => {
    if (document.type !== 'image' || !document.content) return false;
    
    // Check if content is a URL (not just a description)
    const urlPattern = /^https?:\/\//i;
    return urlPattern.test(document.content.trim());
  }, [document.type, document.content]);

  // Format created date
  const formattedDate = useMemo(() => {
    if (!document.created) return null;
    
    try {
      // Try to parse the date string
      // Format: "2025-10-27 21:15:23" or ISO format
      const date = new Date(document.created);
      
      if (isNaN(date.getTime())) return null;
      
      // Format as "Oct 27, 2025"
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  }, [document.created]);

  // Get icon name for Ionicons based on document type
  const getIconName = (): string => {
    switch (document.type) {
      case 'image':
        return 'image';
      case 'file':
        return 'document-text';
      case 'video':
        return 'videocam';
      case 'voice':
        return 'mic';
      default:
        return 'attach';
    }
  };

  // Get color scheme based on document type
  const getColorScheme = () => {
    switch (document.type) {
      case 'image':
        return {
          primary: '#8b5cf6', // Purple
          light: theme.isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.1)',
          border: theme.isDark ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 92, 246, 0.2)',
        };
      case 'video':
        return {
          primary: '#ec4899', // Pink
          light: theme.isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)',
          border: theme.isDark ? 'rgba(236, 72, 153, 0.3)' : 'rgba(236, 72, 153, 0.2)',
        };
      case 'voice':
        return {
          primary: '#10b981', // Green
          light: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
          border: theme.isDark ? 'rgba(16, 185, 129, 0.3)' : 'rgba(16, 185, 129, 0.2)',
        };
      case 'file':
      default:
        return {
          primary: '#3b82f6', // Blue
          light: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
          border: theme.isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
        };
    }
  };

  const colorScheme = getColorScheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { borderColor: colorScheme.border }]}
      activeOpacity={0.8}
      accessibilityLabel={`View ${document.name} document`}
      accessibilityRole="button"
      disabled={document.isStreaming && !document.content}
    >
      <LinearGradient
        colors={[colorScheme.light, colorScheme.light]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Icon Section */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colorScheme.primary }]}>
            <Ionicons name={getIconName() as any} size={20} color="#FFFFFF" />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.emoji}>{icon}</Text>
            <Text style={styles.title} numberOfLines={1}>
              {document.name}
            </Text>
            {document.isStreaming && (
              <ActivityIndicator size="small" color={colorScheme.primary} />
            )}
          </View>

          {/* Image Preview */}
          {isImageUrl && document.content && !document.isStreaming && (
            <View style={styles.imagePreviewContainer}>
              <LazyImage
                uri={document.content.trim()}
                style={styles.imagePreview}
                resizeMode="cover"
                priority="high"
                placeholderColor={colorScheme.light}
              />
            </View>
          )}

          {/* Metadata Row */}
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: colorScheme.primary }]}>
              <Text style={styles.badgeText}>{typeLabel}</Text>
            </View>

            {formattedDate && (
              <View style={styles.dateBadge}>
                <Ionicons name="calendar-outline" size={10} color={theme.isDark ? '#888' : '#666'} />
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
            )}

            {document.isStreaming ? (
              <Text style={[styles.statusText, { color: colorScheme.primary }]}>
                Loading...
              </Text>
            ) : (
              <View style={styles.statusContainer}>
                <View style={[styles.readyDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.statusText}>Tap to view</Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow Section */}
        {!document.isStreaming && (
          <View style={styles.arrowContainer}>
            <Ionicons
              name="chevron-forward"
              size={24}
              color={colorScheme.primary}
            />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: 8,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    gradient: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      gap: 12,
    },
    iconContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    iconCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    contentContainer: {
      flex: 1,
      gap: 8,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    emoji: {
      fontSize: 16,
    },
    title: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
    },
    imagePreviewContainer: {
      width: '100%',
      height: 120,
      borderRadius: 8,
      overflow: 'hidden',
      marginVertical: 4,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    imagePreview: {
      width: '100%',
      height: '100%',
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    dateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.05)',
    },
    dateText: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.isDark ? '#888' : '#666',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
    },
    readyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    statusText: {
      fontSize: 11,
      fontWeight: '500',
      color: '#10b981',
    },
    arrowContainer: {
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

export default DocumentIndicator;

