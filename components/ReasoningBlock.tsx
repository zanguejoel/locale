/**
 * Reasoning Block Component
 * 
 * Purpose: Display the model's reasoning process extracted from <jmeReasoning> tags.
 * 
 * Features:
 * - Collapsible to save screen space
 * - Distinct visual style (blue gradient vs purple for thinking)
 * - Shows streaming state while reasoning is being generated
 * - Accessible and responsive design
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';
import useMarkdownDisplay from '@/hooks/useMarkdownDisplay';

interface ReasoningBlockProps {
  content: string;
  isStreaming?: boolean;
}

/**
 * ReasoningBlock Component
 * 
 * Displays reasoning content in a collapsible block with a distinctive blue theme
 * to differentiate it from thinking blocks (purple) and regular content.
 * 
 * @param content - The reasoning text to display
 * @param isStreaming - Whether the reasoning is currently being generated
 * 
 * @example
 * <ReasoningBlock 
 *   content="Let me analyze the problem step by step..."
 *   isStreaming={false}
 * />
 */
const ReasoningBlock: React.FC<ReasoningBlockProps> = ({
  content,
  isStreaming = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const MarkdownDisplay = useMarkdownDisplay();
  
  // Auto-expand when streaming (same as frontend)
  const [isExpanded, setIsExpanded] = useState(isStreaming);
  
  const rotateValue = useSharedValue(isExpanded ? 180 : 0);
  
  // Auto-expand when streaming starts
  useEffect(() => {
    if (isStreaming && !isExpanded) {
      setIsExpanded(true);
      rotateValue.value = withTiming(180, { duration: 200 });
    }
  }, [isStreaming]);
  
  // Calculate thinking duration based on word count (same as frontend)
  // Assumes ~20 words per second reading speed
  const thinkingSeconds = useMemo(() => {
    if (!content) return 0;
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    return Math.ceil(wordCount / 20);
  }, [content]);

  /**
   * Toggle the expanded state of the reasoning block
   * Animates the chevron icon rotation
   */
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    rotateValue.value = withTiming(isExpanded ? 0 : 180, { duration: 200 });
  };

  /**
   * Animated style for the chevron icon
   * Rotates 180 degrees when expanded
   */
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  // Don't render if there's no content
  if (!content) return null;

  return (
    <View style={styles.container}>
      {/* Header - Always visible, tappable to expand/collapse */}
      <TouchableOpacity
        onPress={toggleExpanded}
        style={styles.header}
        activeOpacity={0.7}
        accessibilityLabel={`Reasoning block, ${isExpanded ? 'expanded' : 'collapsed'}`}
        accessibilityHint="Tap to toggle reasoning visibility"
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
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: '#3b82f6' }]}>
              <Ionicons name="analytics" size={18} color="#FFFFFF" />
            </View>
          </View>

          {/* Title and subtitle */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {isStreaming ? 'Thinking...' : `Thought for ${thinkingSeconds} second${thinkingSeconds !== 1 ? 's' : ''}`}
            </Text>
            <Text style={styles.subtitle}>
              {isExpanded ? 'Tap to hide' : 'Tap to view'}
            </Text>
          </View>

          {/* Chevron indicator */}
          <Animated.View style={arrowStyle}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Content - Only visible when expanded */}
      {isExpanded && (
        <View style={styles.contentContainer}>
          <View style={styles.contentInner}>
            {/* Render content as markdown */}
            <MarkdownDisplay>{content}</MarkdownDisplay>
          </View>
        </View>
      )}
    </View>
  );
};

/**
 * Get component styles based on current theme
 * 
 * @param theme - Current theme (light/dark)
 * @returns StyleSheet object with themed styles
 */
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
    },
    header: {
      overflow: 'hidden',
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
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 2,
    },
    titleContainer: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '400',
      color: theme.colors.textSecondary,
      fontStyle: 'italic',
    },
    contentContainer: {
      backgroundColor: theme.isDark
        ? 'rgba(59, 130, 246, 0.05)'
        : 'rgba(59, 130, 246, 0.03)',
      borderTopWidth: 1,
      borderTopColor: theme.isDark
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(59, 130, 246, 0.15)',
    },
    contentInner: {
      padding: 16,
      // Markdown will handle its own text styling
    },
  });

export default ReasoningBlock;

