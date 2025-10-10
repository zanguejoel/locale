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

import { OdysseyLightColors, OdysseyDarkColors } from './OdysseyColors';

const tintColorLight = "#60a5fa"; // Updated to Odyssey primary
const tintColorDark = "#fff";

const theme: AppTheme = {
  light: {
    // Core colors (Odyssey theme)
    text: OdysseyLightColors.text,
    background: OdysseyLightColors.background,
    tint: tintColorLight,
    primary: OdysseyLightColors.primary,
    primaryForeground: OdysseyLightColors.primaryForeground,
    
    // Secondary & accent
    secondary: OdysseyLightColors.secondary,
    secondaryForeground: OdysseyLightColors.secondaryForeground,
    accent: OdysseyLightColors.accent,
    accentForeground: OdysseyLightColors.accentForeground,
    accentHover: OdysseyLightColors.accentHover,
    
    // Background gradient system
    background50: OdysseyLightColors.background50,
    background100: OdysseyLightColors.background100,
    background200: OdysseyLightColors.background200,
    background300: OdysseyLightColors.background300,
    background400: OdysseyLightColors.background400,
    background500: OdysseyLightColors.background500,
    background600: OdysseyLightColors.background600,
    background700: OdysseyLightColors.background700,
    background800: OdysseyLightColors.background800,
    background900: OdysseyLightColors.background900,
    background950: OdysseyLightColors.background950,
    backgroundLight: OdysseyLightColors.background200, // Legacy support
    
    // Text colors
    foreground: OdysseyLightColors.foreground,
    textSecondary: OdysseyLightColors.textSecondary,
    
    // UI elements
    card: OdysseyLightColors.card,
    cardForeground: OdysseyLightColors.cardForeground,
    border: OdysseyLightColors.border,
    input: OdysseyLightColors.input,
    ring: OdysseyLightColors.ring,
    muted: OdysseyLightColors.muted,
    mutedForeground: OdysseyLightColors.mutedForeground,
    
    // Destructive
    destructive: OdysseyLightColors.destructive,
    destructiveForeground: OdysseyLightColors.destructiveForeground,
    
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
    chatIcons: OdysseyLightColors.foreground,
    chatInputBg: OdysseyLightColors.card,
    chatItemBg: OdysseyLightColors.background100,
    activeChatItem: OdysseyLightColors.background300,
    pressedChatItem: OdysseyLightColors.background400,
    chatIconContainer: OdysseyLightColors.background300,
    chaRawHistoryBG: OdysseyLightColors.background100,
  },
  dark: {
    // Core colors (Odyssey theme)
    text: OdysseyDarkColors.text,
    background: OdysseyDarkColors.background,
    tint: tintColorDark,
    primary: OdysseyDarkColors.primary,
    primaryForeground: OdysseyDarkColors.primaryForeground,
    
    // Secondary & accent
    secondary: OdysseyDarkColors.secondary,
    secondaryForeground: OdysseyDarkColors.secondaryForeground,
    accent: OdysseyDarkColors.accent,
    accentForeground: OdysseyDarkColors.accentForeground,
    accentHover: OdysseyDarkColors.accentHover,
    
    // Background gradient system
    background50: OdysseyDarkColors.background50,
    background100: OdysseyDarkColors.background100,
    background200: OdysseyDarkColors.background200,
    background300: OdysseyDarkColors.background300,
    background400: OdysseyDarkColors.background400,
    background500: OdysseyDarkColors.background500,
    background600: OdysseyDarkColors.background600,
    background700: OdysseyDarkColors.background700,
    background800: OdysseyDarkColors.background800,
    background900: OdysseyDarkColors.background900,
    background950: OdysseyDarkColors.background950,
    backgroundLight: OdysseyDarkColors.background600, // Legacy support
    
    // Text colors
    foreground: OdysseyDarkColors.foreground,
    textSecondary: OdysseyDarkColors.textSecondary,
    
    // UI elements
    card: OdysseyDarkColors.card,
    cardForeground: OdysseyDarkColors.cardForeground,
    border: OdysseyDarkColors.border,
    input: OdysseyDarkColors.input,
    ring: OdysseyDarkColors.ring,
    muted: OdysseyDarkColors.muted,
    mutedForeground: OdysseyDarkColors.mutedForeground,
    
    // Destructive
    destructive: OdysseyDarkColors.destructive,
    destructiveForeground: OdysseyDarkColors.destructiveForeground,
    
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
    chatIcons: OdysseyDarkColors.foreground,
    chatInputBg: OdysseyDarkColors.card,
    chatItemBg: OdysseyDarkColors.background700,
    activeChatItem: OdysseyDarkColors.background600,
    pressedChatItem: OdysseyDarkColors.background550,
    chatIconContainer: OdysseyDarkColors.background600,
    chaRawHistoryBG: OdysseyDarkColors.background800,
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
