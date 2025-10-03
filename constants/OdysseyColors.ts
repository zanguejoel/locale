/**
 * Odyssey Theme Colors - Matching Web App Design
 * Based on: /Users/zanguejoel/Documents/work/jaiime-frontend/utils/theme/palettes.ts
 * 
 * This file contains the exact Odyssey theme from the web app,
 * converted to React Native compatible formats.
 */

import { hslStringToHex } from '@/utils/colorConversion';

// Odyssey Light Mode Colors (from web app)
export const OdysseyLightColors = {
  // Primary colors
  primary: hslStringToHex('213 94% 68%'),                    // #60a5fa - Bright blue
  primaryForeground: hslStringToHex('222 47% 11%'),          // #0f172a - Dark slate
  
  // Secondary & accent
  secondary: hslStringToHex('214 95% 93%'),                  // #dbeafe - Very light blue
  secondaryForeground: hslStringToHex('217 33% 17%'),        // #1e293b - Slate
  accent: hslStringToHex('199 89% 48%'),                     // #0891b2 - Cyan
  accentForeground: hslStringToHex('0 0% 100%'),             // #ffffff - White
  accentHover: hslStringToHex('199 89% 42%'),                // Darker cyan for hover
  
  // Backgrounds - gradient system
  background: hslStringToHex('199 89% 95%'),                 // #e0f2fe - Sky blue (base)
  background50: hslStringToHex('0 0% 100%'),                 // #ffffff - Pure white
  background100: hslStringToHex('210 100% 99%'),             // Near white with blue hint
  background150: hslStringToHex('210 100% 98%'),
  background200: hslStringToHex('214 100% 97%'),
  background250: hslStringToHex('214 95% 96%'),
  background300: hslStringToHex('214 95% 95%'),
  background350: hslStringToHex('213 95% 94%'),
  background400: hslStringToHex('213 95% 93%'),              // #dbeafe
  background450: hslStringToHex('213 96% 91%'),
  background500: hslStringToHex('213 97% 89%'),
  background550: hslStringToHex('213 97% 87%'),              // #bfdbfe
  background600: hslStringToHex('213 96% 85%'),
  background650: hslStringToHex('213 95% 83%'),
  background700: hslStringToHex('213 94% 80%'),
  background750: hslStringToHex('213 94% 78%'),              // #93c5fd
  background800: hslStringToHex('199 95% 88%'),
  background850: hslStringToHex('199 95% 86%'),              // #bae6fd
  background900: hslStringToHex('199 89% 82%'),
  background950: hslStringToHex('199 89% 78%'),
  
  // Text colors
  foreground: hslStringToHex('222 47% 11%'),                 // #0f172a - Dark slate
  text: hslStringToHex('222 47% 11%'),                       // Same as foreground
  textSecondary: hslStringToHex('215 16% 47%'),              // #64748b - Gray
  
  // UI elements
  card: hslStringToHex('0 0% 100%'),                         // #ffffff - White
  cardForeground: hslStringToHex('217 33% 17%'),             // #1e293b - Slate
  border: hslStringToHex('213 27% 84%'),                     // Light blue border
  input: hslStringToHex('213 27% 84%'),                      // Same as border
  ring: hslStringToHex('213 94% 68%'),                       // Primary blue (focus ring)
  
  // Muted colors
  muted: hslStringToHex('214 32% 91%'),                      // #e2e8f0 - Light gray
  mutedForeground: hslStringToHex('215 16% 47%'),            // #64748b - Gray text
  
  // Destructive (errors)
  destructive: hslStringToHex('0 84% 60%'),                  // Red
  destructiveForeground: hslStringToHex('0 0% 100%'),        // White
};

// Odyssey Dark Mode Colors (from web app)
export const OdysseyDarkColors = {
  // Primary colors (same as light for consistency)
  primary: hslStringToHex('213 94% 68%'),                    // #60a5fa - Bright blue
  primaryForeground: hslStringToHex('0 0% 100%'),            // #ffffff - White
  
  // Secondary & accent
  secondary: hslStringToHex('217 33% 22%'),                  // Lighter slate
  secondaryForeground: hslStringToHex('210 40% 98%'),        // Very light
  accent: hslStringToHex('199 89% 48%'),                     // #0891b2 - Cyan
  accentForeground: hslStringToHex('0 0% 100%'),             // White
  accentHover: hslStringToHex('199 89% 55%'),                // Lighter cyan for hover
  
  // Backgrounds - dark gradient system
  background: hslStringToHex('217 33% 17%'),                 // #1e293b - Slate (base)
  background50: hslStringToHex('215 20% 95%'),               // Very light (inverted)
  background100: hslStringToHex('217 25% 90%'),
  background150: hslStringToHex('217 28% 85%'),
  background200: hslStringToHex('217 30% 75%'),
  background250: hslStringToHex('217 32% 65%'),
  background300: hslStringToHex('217 33% 55%'),
  background350: hslStringToHex('217 33% 45%'),
  background400: hslStringToHex('217 33% 35%'),
  background450: hslStringToHex('217 33% 28%'),
  background500: hslStringToHex('217 33% 25%'),
  background550: hslStringToHex('217 33% 23%'),
  background600: hslStringToHex('217 33% 21%'),
  background650: hslStringToHex('217 33% 19%'),
  background700: hslStringToHex('217 33% 17%'),              // #1e293b - Main slate
  background750: hslStringToHex('222 47% 15%'),
  background800: hslStringToHex('222 47% 13%'),
  background850: hslStringToHex('222 47% 11%'),              // #0f172a
  background900: hslStringToHex('205 79% 16%'),              // #0c4a6e - Deep blue
  background950: hslStringToHex('222 47% 9%'),               // Darkest
  
  // Text colors
  foreground: hslStringToHex('210 40% 98%'),                 // #f1f5f9 - Light text
  text: hslStringToHex('210 40% 98%'),                       // Same as foreground
  textSecondary: hslStringToHex('215 20% 65%'),              // #94a3b8 - Gray
  
  // UI elements
  card: hslStringToHex('217 33% 20%'),                       // #293548 - Slate cards
  cardForeground: hslStringToHex('210 40% 98%'),             // Light text
  border: hslStringToHex('217 25% 27%'),                     // #334155 - Visible border
  input: hslStringToHex('217 33% 20%'),                      // Slate input
  ring: hslStringToHex('213 94% 68%'),                       // Primary blue
  
  // Muted colors
  muted: hslStringToHex('217 33% 22%'),                      // Lighter slate
  mutedForeground: hslStringToHex('215 20% 65%'),            // #94a3b8 - Gray
  
  // Destructive (errors)
  destructive: hslStringToHex('0 84% 60%'),                  // Red
  destructiveForeground: hslStringToHex('0 0% 100%'),        // White
};

// Gradient colors for backgrounds
export const OdysseyGradients = {
  light: {
    background: ['#e0f2fe', '#bae6fd', '#e0f2fe'] as const,          // Sky blue gradient
    card: ['#ffffff', '#f8fafc'] as const,                            // Subtle white gradient
    header: ['#60a5fa', '#0891b2'] as const,                          // Blue to cyan
  },
  dark: {
    background: ['#1e293b', '#0c4a6e', '#1e293b'] as const,          // Slate to deep blue
    card: ['#293548', '#1e293b'] as const,                            // Slate gradient
    header: ['#60a5fa', '#06b6d4'] as const,                          // Blue to cyan
  },
} as const;

// Export combined theme
export const OdysseyTheme = {
  light: OdysseyLightColors,
  dark: OdysseyDarkColors,
  gradients: OdysseyGradients,
};

// Helper to get color by key for both light and dark
export function getOdysseyColor(key: keyof typeof OdysseyLightColors, isDark: boolean): string {
  return isDark ? OdysseyDarkColors[key] : OdysseyLightColors[key];
}

