/**
 * Typography System - Matching Web App
 * Based on Inter font family used in the web app
 * Currently using system fonts (SF Pro/Roboto) as fallback
 */

import { Platform } from 'react-native';

export const typography = {
  /**
   * Font families
   * Using system fonts (SF Pro on iOS, Roboto on Android) which are similar to Inter
   * To use Inter fonts: Download from https://fonts.google.com/specimen/Inter
   * and add to assets/fonts/, then update these names
   */
  fonts: {
    regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
    semiBold: Platform.OS === 'ios' ? 'System' : 'Roboto-Medium',
    bold: Platform.OS === 'ios' ? 'System' : 'Roboto-Bold',
  },
  
  /**
   * Font sizes (matching web app scale)
   */
  sizes: {
    xs: 11,    // Tiny text, captions
    sm: 13,    // Small text, secondary info
    base: 15,  // Default body text
    lg: 17,    // Emphasized text
    xl: 20,    // Section headers
    '2xl': 24, // Page titles
    '3xl': 30, // Large headings
    '4xl': 36, // Hero text
  },
  
  /**
   * Line heights (for readability)
   */
  lineHeights: {
    tight: 1.25,    // Dense text
    normal: 1.5,    // Default readable
    relaxed: 1.75,  // Comfortable reading
    loose: 2,       // Extra spacing
  },
  
  /**
   * Font weights (Inter supports variable weights)
   */
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semiBold: '600' as const,
    bold: '700' as const,
    extraBold: '800' as const,
  },
  
  /**
   * Letter spacing (for different sizes)
   */
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },
};

/**
 * Predefined text styles matching web app
 */
export const textStyles = {
  // Headings
  h1: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['3xl'],
    lineHeight: typography.sizes['3xl'] * typography.lineHeights.tight,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  h2: {
    fontFamily: typography.fonts.bold,
    fontSize: typography.sizes['2xl'],
    lineHeight: typography.sizes['2xl'] * typography.lineHeights.tight,
    fontWeight: typography.weights.bold,
    letterSpacing: typography.letterSpacing.tight,
  },
  h3: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.xl,
    lineHeight: typography.sizes.xl * typography.lineHeights.normal,
    fontWeight: typography.weights.semiBold,
  },
  h4: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.lg,
    lineHeight: typography.sizes.lg * typography.lineHeights.normal,
    fontWeight: typography.weights.semiBold,
  },
  
  // Body text
  body: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
    fontWeight: typography.weights.regular,
  },
  bodyMedium: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
    fontWeight: typography.weights.medium,
  },
  
  // Small text
  small: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    fontWeight: typography.weights.regular,
  },
  smallMedium: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.normal,
    fontWeight: typography.weights.medium,
  },
  
  // Tiny text
  caption: {
    fontFamily: typography.fonts.regular,
    fontSize: typography.sizes.xs,
    lineHeight: typography.sizes.xs * typography.lineHeights.normal,
    fontWeight: typography.weights.regular,
  },
  
  // Buttons
  button: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.tight,
    fontWeight: typography.weights.semiBold,
    letterSpacing: typography.letterSpacing.wide,
  },
  buttonLarge: {
    fontFamily: typography.fonts.semiBold,
    fontSize: typography.sizes.lg,
    lineHeight: typography.sizes.lg * typography.lineHeights.tight,
    fontWeight: typography.weights.semiBold,
    letterSpacing: typography.letterSpacing.wide,
  },
  
  // Links
  link: {
    fontFamily: typography.fonts.medium,
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
    fontWeight: typography.weights.medium,
    textDecorationLine: 'underline' as const,
  },
};

export default typography;

