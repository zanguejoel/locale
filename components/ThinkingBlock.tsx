/**
 * Thinking Block Component
 * 
 * Displays the model's reasoning process from <|thinking|> tags
 * Collapsible to save space, with a distinct visual style
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import Animated, { useAnimatedStyle, withTiming, useSharedValue } from 'react-native-reanimated';

interface ThinkingBlockProps {
  content: string;
  isStreaming?: boolean;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({
  content,
  isStreaming = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const rotateValue = useSharedValue(0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    rotateValue.value = withTiming(isExpanded ? 0 : 180, { duration: 200 });
  };

  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotateValue.value}deg` }],
  }));

  if (!content) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleExpanded}
        style={styles.header}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={
            theme.isDark
              ? ['rgba(168, 85, 247, 0.15)', 'rgba(147, 51, 234, 0.15)']
              : ['rgba(168, 85, 247, 0.1)', 'rgba(147, 51, 234, 0.1)']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: '#a855f7' }]}>
              <Ionicons name="bulb" size={18} color="#FFFFFF" />
            </View>
          </View>

          <View style={styles.titleContainer}>
            <Text style={styles.title}>
              {isStreaming ? 'Thinking...' : 'Reasoning Process'}
            </Text>
            <Text style={styles.subtitle}>
              {isExpanded ? 'Tap to hide' : 'Tap to view'}
            </Text>
          </View>

          <Animated.View style={arrowStyle}>
            <Ionicons
              name="chevron-down"
              size={20}
              color={theme.colors.textSecondary}
            />
          </Animated.View>
        </LinearGradient>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.contentContainer}>
          <View style={styles.contentInner}>
            <Text style={styles.content}>{content}</Text>
          </View>
        </View>
      )}
    </View>
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
        ? 'rgba(168, 85, 247, 0.3)'
        : 'rgba(168, 85, 247, 0.2)',
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
        ? 'rgba(168, 85, 247, 0.05)'
        : 'rgba(168, 85, 247, 0.03)',
      borderTopWidth: 1,
      borderTopColor: theme.isDark
        ? 'rgba(168, 85, 247, 0.2)'
        : 'rgba(168, 85, 247, 0.15)',
    },
    contentInner: {
      padding: 16,
    },
    content: {
      fontSize: 13,
      lineHeight: 20,
      color: theme.isDark
        ? 'rgba(255, 255, 255, 0.8)'
        : 'rgba(0, 0, 0, 0.7)',
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
  });

export default ThinkingBlock;

