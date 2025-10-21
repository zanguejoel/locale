/**
 * Artifact Indicator Component
 * 
 * Displays an inline indicator for artifacts in chat messages.
 * Shows artifact type, title, status, and real-time progress during streaming.
 * Tappable to open full viewer.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Artifact, getArtifactTypeName, getArtifactIcon } from '@/utils/ArtifactTypes';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface ArtifactIndicatorProps {
  artifact: Artifact;
  onPress: () => void;
  compact?: boolean;
}

const ArtifactIndicator: React.FC<ArtifactIndicatorProps> = ({
  artifact,
  onPress,
  compact = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const iconName = getArtifactIcon(artifact.type);
  const typeName = getArtifactTypeName(artifact.type);

  // Calculate content progress for streaming artifacts
  const contentProgress = useMemo(() => {
    if (!artifact.isStreaming || !artifact.content) return 100;
    
    // Estimate progress based on content length
    // Average artifact is ~500 characters for code, ~800 for markdown
    const avgLength = artifact.type === 'code' ? 500 : 
                      artifact.type === 'mermaid' ? 300 : 800;
    const currentLength = artifact.content.length;
    const progress = Math.min((currentLength / avgLength) * 100, 95);
    
    return Math.round(progress);
  }, [artifact.isStreaming, artifact.content, artifact.type]);

  // Animated progress value for smooth transitions
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (artifact.isStreaming) {
      Animated.timing(progressAnim, {
        toValue: contentProgress,
        duration: 300,
        useNativeDriver: false,
      }).start();
    } else {
      progressAnim.setValue(100);
    }
  }, [contentProgress, artifact.isStreaming, progressAnim]);

  // Generate preview text from content
  const previewText = useMemo(() => {
    if (!artifact.content) return 'Generating...';
    
    // Show first 60 characters of content
    const preview = artifact.content.trim().substring(0, 60);
    return preview.length < artifact.content.trim().length ? `${preview}...` : preview;
  }, [artifact.content]);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.container}
      activeOpacity={0.8}
      accessibilityLabel={`View ${artifact.title} artifact`}
      accessibilityRole="button"
    >
      <LinearGradient
        colors={
          theme.isDark
            ? ['rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.15)']
            : ['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.1)']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Icon Section */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: theme.colors.primary }]}>
            <Ionicons name={iconName as any} size={20} color="#FFFFFF" />
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title} numberOfLines={1}>
              {artifact.title}
            </Text>
            {artifact.isStreaming && (
              <View style={styles.streamingBadge}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.progressText}>{contentProgress}%</Text>
              </View>
            )}
          </View>

          {/* Content Preview */}
          {artifact.content && (
            <Text style={styles.preview} numberOfLines={2}>
              {previewText}
            </Text>
          )}

          {/* Progress bar for streaming */}
          {artifact.isStreaming && (
            <View style={styles.progressBarContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
          )}

          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{typeName}</Text>
            </View>
            
            {artifact.language && (
              <View style={styles.languageBadge}>
                <Text style={styles.languageText}>{artifact.language}</Text>
              </View>
            )}

            {artifact.isStreaming ? (
              <Text style={styles.streamingStatus}>Generating...</Text>
            ) : (
              <View style={styles.statusContainer}>
                <View style={styles.readyDot} />
                <Text style={styles.statusText}>Tap to view</Text>
              </View>
            )}
          </View>
        </View>

        {/* Arrow Section */}
        <View style={styles.arrowContainer}>
          <Ionicons
            name="chevron-forward"
            size={24}
            color={theme.colors.primary}
          />
        </View>
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
      borderColor: theme.isDark
        ? 'rgba(59, 130, 246, 0.3)'
        : 'rgba(59, 130, 246, 0.2)',
      shadowColor: theme.colors.primary,
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
      gap: 6,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    title: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      flex: 1,
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
    languageBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.isDark
        ? 'rgba(147, 51, 234, 0.2)'
        : 'rgba(147, 51, 234, 0.15)',
      borderWidth: 1,
      borderColor: theme.isDark
        ? 'rgba(147, 51, 234, 0.4)'
        : 'rgba(147, 51, 234, 0.3)',
    },
    languageText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.isDark ? '#c084fc' : '#9333ea',
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    readyDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#10b981',
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
    // NEW: Streaming progress styles
    streamingBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.isDark
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(59, 130, 246, 0.15)',
    },
    progressText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    preview: {
      fontSize: 13,
      fontWeight: '400',
      color: theme.isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.6)',
      marginTop: 4,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      lineHeight: 18,
    },
    progressBarContainer: {
      height: 3,
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)',
      borderRadius: 1.5,
      overflow: 'hidden',
      marginTop: 8,
      marginBottom: 4,
    },
    progressBar: {
      height: '100%',
      borderRadius: 1.5,
    },
    streamingStatus: {
      fontSize: 11,
      fontWeight: '500',
      color: theme.colors.primary,
      fontStyle: 'italic',
    },
  });

export default ArtifactIndicator;

