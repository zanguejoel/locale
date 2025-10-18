import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface LocalModelCleanupIndicatorProps {
  isCleaningUp: boolean;
  isGenerating?: boolean;
}

/**
 * Shows a visual indicator when the local model is being cleaned up/stopped
 * Features smooth fade-in/out animations for better UX
 */
export const LocalModelCleanupIndicator: React.FC<LocalModelCleanupIndicatorProps> = React.memo(({
  isCleaningUp,
  isGenerating
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    if (isCleaningUp) {
      // Fade in and slide down
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Fade out and slide up
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isCleaningUp, fadeAnim, slideAnim]);

  if (!isCleaningUp && fadeAnim._value === 0) {
    return null;
  }

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View style={styles.content}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Stopping Model</Text>
          <Text style={styles.subtitle}>
            {isGenerating 
              ? 'Interrupting generation...' 
              : 'Cleaning up resources...'}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if props actually changed
  return prevProps.isCleaningUp === nextProps.isCleaningUp &&
         prevProps.isGenerating === nextProps.isGenerating;
});

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});

