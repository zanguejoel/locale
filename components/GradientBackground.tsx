/**
 * GradientBackground Component
 * Provides themed gradient backgrounds matching the web app's Odyssey design
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';
import { LocaleGradients } from '@/constants/LocaleColors';

interface GradientBackgroundProps {
  children: React.ReactNode;
  variant?: 'background' | 'card' | 'header';
  style?: ViewStyle;
}

/**
 * Gradient background component that automatically adapts to light/dark theme
 * Uses the Odyssey color palette from the web app
 */
export const GradientBackground: React.FC<GradientBackgroundProps> = ({ 
  children, 
  variant = 'background',
  style 
}) => {
  const theme = useTheme();
  
  // Get gradient colors based on theme and variant
  const gradientColors = theme.isDark 
    ? LocaleGradients.dark[variant]
    : LocaleGradients.light[variant];
  
  return (
    <LinearGradient
      colors={gradientColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

/**
 * Subtle gradient for elevated sections
 */
export const SubtleGradient: React.FC<GradientBackgroundProps> = ({ 
  children, 
  style 
}) => {
  const theme = useTheme();
  
  // Very subtle gradient using background shades
  const gradientColors = theme.isDark 
    ? [theme.colors.background700, theme.colors.background800, theme.colors.background700]
    : [theme.colors.background50, theme.colors.background100, theme.colors.background50];
  
  return (
    <LinearGradient
      colors={gradientColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

/**
 * Header gradient for top bars
 */
export const HeaderGradient: React.FC<Omit<GradientBackgroundProps, 'variant'>> = ({ 
  children, 
  style 
}) => {
  const theme = useTheme();
  
  const gradientColors = theme.isDark 
    ? LocaleGradients.dark.header
    : LocaleGradients.light.header;
  
  return (
    <LinearGradient
      colors={gradientColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={[styles.gradient, style]}
    >
      {children}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

export default GradientBackground;

