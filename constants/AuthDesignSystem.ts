/**
 * Authentication Design System
 * Centralized design tokens for all authentication screens
 */

import { textStyles } from './Typography';

export const AUTH_DESIGN = {
  /**
   * Logo dimensions (consistent across all auth screens)
   */
  LOGO: {
    WIDTH: 180,
    HEIGHT: 100,
    RESIZE_MODE: 'contain' as const,
  },

  /**
   * Header layout (spacing above and below logo/title)
   */
  HEADER: {
    MARGIN_TOP: 80,
    MARGIN_BOTTOM: 50,
    PADDING_HORIZONTAL: 24,
    PADDING_VERTICAL: 20,
  },

  /**
   * Form container layout
   */
  FORM: {
    PADDING_HORIZONTAL: 24,
    INPUT_VERTICAL_SPACING: 16,  // Space between inputs
    PADDING_BOTTOM: 24,
  },

  /**
   * Button specifications
   */
  BUTTONS: {
    HEIGHT: 50,
    BORDER_RADIUS: 12,
    BORDER_WIDTH: 1.5,
    GAP_BETWEEN: 16,
    MIN_TOUCH_TARGET: 44,  // Apple/Android minimum
  },

  /**
   * Input field specifications
   */
  INPUTS: {
    HEIGHT: 50,
    BORDER_RADIUS: 12,
    BORDER_WIDTH: 1.5,
    ICON_SIZE: 20,
    PADDING_HORIZONTAL: 12,
  },

  /**
   * Typography (using centralized Typography system)
   */
  TYPOGRAPHY: {
    title: textStyles.h2,           // Page titles
    subtitle: textStyles.body,      // Subtitles
    buttonText: textStyles.button,  // Button text
    errorText: textStyles.small,    // Error messages
    helperText: textStyles.caption, // Helper text
    inputLabel: textStyles.smallMedium,  // Input labels
  },

  /**
   * Spacing scale (8px grid system)
   */
  SPACING: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    '2xl': 32,
    '3xl': 48,
    '4xl': 64,
    '5xl': 80,
  },

  /**
   * Checkbox specifications
   */
  CHECKBOX: {
    SIZE: 24,  // Increased from 20 for better touch target
    BORDER_RADIUS: 4,
    BORDER_WIDTH: 2,
    CHECKMARK_SIZE: 16,
  },

  /**
   * Modal specifications
   */
  MODAL: {
    BORDER_RADIUS: 20,
    PADDING: 16,
    MIN_HEIGHT_PERCENT: 50,
    MAX_HEIGHT_PERCENT: 80,
  },

  /**
   * Animation durations (in milliseconds)
   */
  ANIMATION: {
    FAST: 200,
    NORMAL: 300,
    SLOW: 500,
    ENTRANCE: 800,
  },

  /**
   * Hit slop for small touch targets
   */
  HIT_SLOP: {
    small: { top: 8, bottom: 8, left: 8, right: 8 },
    medium: { top: 12, bottom: 12, left: 12, right: 12 },
    large: { top: 16, bottom: 16, left: 16, right: 16 },
  },
} as const;

/**
 * Helper function to create consistent auth screen styles
 */
export const createAuthStyles = (theme: any) => ({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  headerContainer: {
    alignItems: 'center' as const,
    marginTop: AUTH_DESIGN.HEADER.MARGIN_TOP,
    marginBottom: AUTH_DESIGN.HEADER.MARGIN_BOTTOM,
    paddingHorizontal: AUTH_DESIGN.HEADER.PADDING_HORIZONTAL,
    paddingVertical: AUTH_DESIGN.HEADER.PADDING_VERTICAL,
  },

  logo: {
    width: AUTH_DESIGN.LOGO.WIDTH,
    height: AUTH_DESIGN.LOGO.HEIGHT,
    resizeMode: AUTH_DESIGN.LOGO.RESIZE_MODE,
    marginBottom: AUTH_DESIGN.SPACING.xl,
  },

  title: {
    ...AUTH_DESIGN.TYPOGRAPHY.title,
    color: theme.colors.text,
    marginBottom: AUTH_DESIGN.SPACING.sm,
    textAlign: 'center' as const,
  },

  subtitle: {
    ...AUTH_DESIGN.TYPOGRAPHY.subtitle,
    color: theme.colors.text,
    opacity: 0.8,
    textAlign: 'center' as const,
  },

  formContainer: {
    paddingHorizontal: AUTH_DESIGN.FORM.PADDING_HORIZONTAL,
  },

  errorText: {
    ...AUTH_DESIGN.TYPOGRAPHY.errorText,
    color: theme.colors.red,
    marginTop: 4,
    marginLeft: 12,
  },

  helperText: {
    ...AUTH_DESIGN.TYPOGRAPHY.helperText,
    color: theme.colors.textSecondary,
    marginTop: 4,
    marginLeft: 12,
  },

  buttonContainer: {
    gap: AUTH_DESIGN.BUTTONS.GAP_BETWEEN,
    marginTop: AUTH_DESIGN.SPACING.xl,
  },

  primaryButton: {
    height: AUTH_DESIGN.BUTTONS.HEIGHT,
    borderRadius: AUTH_DESIGN.BUTTONS.BORDER_RADIUS,
    backgroundColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  secondaryButton: {
    height: AUTH_DESIGN.BUTTONS.HEIGHT,
    borderRadius: AUTH_DESIGN.BUTTONS.BORDER_RADIUS,
    borderWidth: AUTH_DESIGN.BUTTONS.BORDER_WIDTH,
    borderColor: theme.colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },

  buttonText: {
    ...AUTH_DESIGN.TYPOGRAPHY.buttonText,
    color: theme.colors.white,
  },

  secondaryButtonText: {
    ...AUTH_DESIGN.TYPOGRAPHY.buttonText,
    color: theme.colors.primary,
  },

  checkbox: {
    width: AUTH_DESIGN.CHECKBOX.SIZE,
    height: AUTH_DESIGN.CHECKBOX.SIZE,
    borderRadius: AUTH_DESIGN.CHECKBOX.BORDER_RADIUS,
    borderWidth: AUTH_DESIGN.CHECKBOX.BORDER_WIDTH,
    borderColor: theme.colors.grey,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },

  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
});

export default AUTH_DESIGN;

