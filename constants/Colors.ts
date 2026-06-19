export interface ColorTheme {
  // Core colors
  text: string;
  background: string;
  tint: string;
  primary: string;
  primaryForeground: string;
  
  // Secondary & accent
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  accentHover: string;
  
  // Background gradient system (50-950)
  background50: string;
  background100: string;
  background200: string;
  background300: string;
  background400: string;
  background500: string;
  background600: string;
  background700: string;
  background800: string;
  background900: string;
  background950: string;
  backgroundLight: string; // Legacy support
  
  // Text colors
  foreground: string;
  textSecondary: string;
  
  // UI elements
  card: string;
  cardForeground: string;
  border: string;
  input: string;
  ring: string;
  muted: string;
  mutedForeground: string;
  
  // Destructive (errors)
  destructive: string;
  destructiveForeground: string;
  
  // Status colors
  success: string;
  warning: string;
  info: string;
  white: string;
  shadow: string;
  
  // Legacy/specific
  light: string;
  tabIconDefault: string;
  tabIconSelected: string;
  chatIcons: string;
  chatInputBg: string;
  chatItemBg: string;
  activeChatItem: string;
  pressedChatItem: string;
  chatIconContainer: string;
  chaRawHistoryBG: string;
}
export interface CommonColors {
  primary: string;
  lime: string;
  pink: string;
  brown: string;
  sky: string;
  teal: string;
  yellow: string;
  orange: string;
  red: string;
  blue: string;
  green: string;
  grey: string;
  greyLight: string;
  input: string;
  selected: string;
  error: string;
}

export interface AppTheme {
  light: ColorTheme;
  dark: ColorTheme;
  common: CommonColors;
}

import { LocaleLightColors, LocaleDarkColors } from './LocaleColors';

const tintColorLight = "#60a5fa"; // Updated to Odyssey primary
const tintColorDark = "#fff";

const theme: AppTheme = {
  light: {
    // Core colors (Odyssey theme)
    text: LocaleLightColors.text,
    background: LocaleLightColors.background,
    tint: tintColorLight,
    primary: LocaleLightColors.primary,
    primaryForeground: LocaleLightColors.primaryForeground,
    
    // Secondary & accent
    secondary: LocaleLightColors.secondary,
    secondaryForeground: LocaleLightColors.secondaryForeground,
    accent: LocaleLightColors.accent,
    accentForeground: LocaleLightColors.accentForeground,
    accentHover: LocaleLightColors.accentHover,
    
    // Background gradient system
    background50: LocaleLightColors.background50,
    background100: LocaleLightColors.background100,
    background200: LocaleLightColors.background200,
    background300: LocaleLightColors.background300,
    background400: LocaleLightColors.background400,
    background500: LocaleLightColors.background500,
    background600: LocaleLightColors.background600,
    background700: LocaleLightColors.background700,
    background800: LocaleLightColors.background800,
    background900: LocaleLightColors.background900,
    background950: LocaleLightColors.background950,
    backgroundLight: LocaleLightColors.background200, // Legacy support
    
    // Text colors
    foreground: LocaleLightColors.foreground,
    textSecondary: LocaleLightColors.textSecondary,
    
    // UI elements
    card: LocaleLightColors.card,
    cardForeground: LocaleLightColors.cardForeground,
    border: LocaleLightColors.border,
    input: LocaleLightColors.input,
    ring: LocaleLightColors.ring,
    muted: LocaleLightColors.muted,
    mutedForeground: LocaleLightColors.mutedForeground,
    
    // Destructive
    destructive: LocaleLightColors.destructive,
    destructiveForeground: LocaleLightColors.destructiveForeground,
    
    // Status colors
    success: '#4CD964',  // Green
    warning: '#FF9500',  // Orange
    info: '#5AC8FA',     // Light blue
    white: '#FFFFFF',
    shadow: '#000000',
    
    // Legacy/specific
    light: '#fff',
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorLight,
    chatIcons: LocaleLightColors.foreground,
    chatInputBg: LocaleLightColors.card,
    chatItemBg: LocaleLightColors.background100,
    activeChatItem: LocaleLightColors.background300,
    pressedChatItem: LocaleLightColors.background400,
    chatIconContainer: LocaleLightColors.background300,
    chaRawHistoryBG: LocaleLightColors.background100,
  },
  dark: {
    // Core colors (Odyssey theme)
    text: LocaleDarkColors.text,
    background: LocaleDarkColors.background,
    tint: tintColorDark,
    primary: LocaleDarkColors.primary,
    primaryForeground: LocaleDarkColors.primaryForeground,
    
    // Secondary & accent
    secondary: LocaleDarkColors.secondary,
    secondaryForeground: LocaleDarkColors.secondaryForeground,
    accent: LocaleDarkColors.accent,
    accentForeground: LocaleDarkColors.accentForeground,
    accentHover: LocaleDarkColors.accentHover,
    
    // Background gradient system
    background50: LocaleDarkColors.background50,
    background100: LocaleDarkColors.background100,
    background200: LocaleDarkColors.background200,
    background300: LocaleDarkColors.background300,
    background400: LocaleDarkColors.background400,
    background500: LocaleDarkColors.background500,
    background600: LocaleDarkColors.background600,
    background700: LocaleDarkColors.background700,
    background800: LocaleDarkColors.background800,
    background900: LocaleDarkColors.background900,
    background950: LocaleDarkColors.background950,
    backgroundLight: LocaleDarkColors.background600, // Legacy support
    
    // Text colors
    foreground: LocaleDarkColors.foreground,
    textSecondary: LocaleDarkColors.textSecondary,
    
    // UI elements
    card: LocaleDarkColors.card,
    cardForeground: LocaleDarkColors.cardForeground,
    border: LocaleDarkColors.border,
    input: LocaleDarkColors.input,
    ring: LocaleDarkColors.ring,
    muted: LocaleDarkColors.muted,
    mutedForeground: LocaleDarkColors.mutedForeground,
    
    // Destructive
    destructive: LocaleDarkColors.destructive,
    destructiveForeground: LocaleDarkColors.destructiveForeground,
    
    // Status colors
    success: '#4CD964',  // Green
    warning: '#FF9500',  // Orange
    info: '#5AC8FA',     // Light blue
    white: '#FFFFFF',
    shadow: '#000000',
    
    // Legacy/specific
    light: '#fff',
    tabIconDefault: "#ccc",
    tabIconSelected: tintColorDark,
    chatIcons: LocaleDarkColors.foreground,
    chatInputBg: LocaleDarkColors.card,
    chatItemBg: LocaleDarkColors.background700,
    activeChatItem: LocaleDarkColors.background600,
    pressedChatItem: LocaleDarkColors.background550,
    chatIconContainer: LocaleDarkColors.background600,
    chaRawHistoryBG: LocaleDarkColors.background800,
  },
  common: {
    primary: "#60a5fa", // Updated to Odyssey primary
    lime: "#D7FFD4",
    pink: "#F655FF",
    brown: "#29271D",
    sky: "#E5EDFF",
    teal: "#0E4D45",
    yellow: "#FCBB80",
    orange: "#EF580B",
    red: "red",
    blue: "#0000FA",
    green: "#172E15",
    grey: "#242026",
    greyLight: "#B8B3BA",
    input: "#EEE9F0",
    selected: "#e5f3f7",
    error: "#EF4444",
  },
};

export default theme;
