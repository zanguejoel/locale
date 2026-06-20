/**
 * Typing Indicator Component
 * Shows when AI is thinking/processing
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { layout } from '@/constants/Layout';
import { GlassSurface } from './GlassSurface';

interface TypingIndicatorProps {
  modelName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  modelName = 'AI' 
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  // Animated dots
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = Animated.parallel([
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 200),
      createDotAnimation(dot3, 400),
    ]);

    animations.start();

    return () => {
      animations.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (dot: Animated.Value) => ({
    opacity: dot,
    transform: [
      {
        translateY: dot.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -4],
        }),
      },
    ],
  });

  return (
    <View style={styles.container}>
      <GlassSurface style={styles.bubble} borderRadius={layout.radius.lg}>
        <View style={styles.content}>
          <Text style={styles.text}>{modelName} is thinking</Text>
          <View style={styles.dotsContainer}>
            <Animated.View style={[styles.dot, dotStyle(dot1)]} />
            <Animated.View style={[styles.dot, dotStyle(dot2)]} />
            <Animated.View style={[styles.dot, dotStyle(dot3)]} />
          </View>
        </View>
      </GlassSurface>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '80%',
    alignSelf: 'flex-start',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
  },
});

export default TypingIndicator;



