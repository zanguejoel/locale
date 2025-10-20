/**
 * Artifact Indicator Component
 * 
 * Displays an inline indicator for artifacts in chat messages.
 * Shows artifact type, title, and status. Tappable to open full viewer.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
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
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.badgeText}>{typeName}</Text>
            </View>
            
            {artifact.language && (
              <View style={styles.languageBadge}>
                <Text style={styles.languageText}>{artifact.language}</Text>
              </View>
            )}

            {!artifact.isStreaming && (
              <View style={styles.statusContainer}>
                <View style={styles.readyDot} />
                <Text style={styles.statusText}>Ready</Text>
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
  });

export default ArtifactIndicator;

