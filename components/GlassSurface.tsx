import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/hooks/useTheme';
import { LocaleGlass } from '@/constants/LocaleColors';

interface GlassSurfaceProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Blur intensity passed to expo-blur's BlurView (default 40). */
  intensity?: number;
  /** Use the stronger, less-transparent fill (for content that needs more contrast). */
  strong?: boolean;
  /** Draw the primary-blue highlight border instead of the neutral glass border. */
  highlighted?: boolean;
  borderRadius?: number;
}

/**
 * Frosted-glass surface: BlurView background + translucent fill + hairline
 * border. The base primitive for the glassmorphic redesign — cards, inputs,
 * modals, and headers all wrap their content in this.
 */
export const GlassSurface: React.FC<GlassSurfaceProps> = ({
  children,
  style,
  intensity = 40,
  strong = false,
  highlighted = false,
  borderRadius = 16,
}) => {
  const { isDark } = useTheme();
  const glass = isDark ? LocaleGlass.dark : LocaleGlass.light;

  return (
    <View style={[styles.container, { borderRadius }, style]}>
      <BlurView
        intensity={intensity}
        tint={glass.blurTint}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: strong ? glass.surfaceFillStrong : glass.surfaceFill,
            borderRadius,
            borderWidth: 1,
            borderColor: highlighted ? glass.highlightBorder : glass.border,
          },
        ]}
      />
      {children}
    </View>
  );
};

/**
 * GlassSurface with default card padding and elevation shadow — use this for
 * the common case (auth form cards, message bubbles, list rows).
 */
export const GlassCard: React.FC<GlassSurfaceProps & { padding?: number }> = ({
  padding = 20,
  style,
  ...props
}) => {
  const { isDark } = useTheme();
  const glass = isDark ? LocaleGlass.dark : LocaleGlass.light;

  return (
    <GlassSurface
      {...props}
      style={[
        {
          padding,
          shadowColor: glass.shadowColor,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: glass.shadowOpacity,
          shadowRadius: 24,
          elevation: 8,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

export default GlassSurface;
