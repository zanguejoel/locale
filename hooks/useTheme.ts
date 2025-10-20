import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Types';
import { storage } from './useMMKVStorage';
import { useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

export const getThemeMode = (): ThemeMode => {
  const stored = storage.getString('theme_mode');
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }
  return 'system'; // Default to system
};

export const setThemeMode = (mode: ThemeMode) => {
  storage.set('theme_mode', mode);
};

export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(getThemeMode());
  
  // Listen for storage changes
  useEffect(() => {
    const interval = setInterval(() => {
      const currentMode = getThemeMode();
      if (currentMode !== themeMode) {
        setThemeModeState(currentMode);
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [themeMode]);
  
  // Determine if dark mode should be active
  const isDark = themeMode === 'system' 
    ? systemColorScheme === 'dark'
    : themeMode === 'dark';

  return {
    isDark,
    themeMode,
    colors: {
      ...Colors[isDark ? 'dark' : 'light'],
      ...Colors.common,
    },
  } as Theme & { themeMode: ThemeMode };
}; 