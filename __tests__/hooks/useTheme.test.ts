/**
 * useTheme Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTheme, getThemeMode, setThemeMode } from '../../hooks/useTheme';
import { useColorScheme } from 'react-native';

// Mock dependencies
jest.mock('react-native', () => ({
  useColorScheme: jest.fn(),
}));

jest.mock('../../hooks/useMMKVStorage', () => ({
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
  },
}));

jest.mock('../../constants/Colors', () => ({
  __esModule: true,
  default: {
    light: {
      background: '#ffffff',
      text: '#000000',
      primary: '#007AFF',
    },
    dark: {
      background: '#000000',
      text: '#ffffff',
      primary: '#0A84FF',
    },
    common: {
      error: '#FF3B30',
      success: '#34C759',
    },
  },
}));

import { storage } from '../../hooks/useMMKVStorage';

describe('useTheme', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('getThemeMode', () => {
    it('should return stored theme mode', () => {
      (storage.getString as jest.Mock).mockReturnValue('dark');
      expect(getThemeMode()).toBe('dark');
    });

    it('should return light when stored', () => {
      (storage.getString as jest.Mock).mockReturnValue('light');
      expect(getThemeMode()).toBe('light');
    });

    it('should return system as default', () => {
      (storage.getString as jest.Mock).mockReturnValue(null);
      expect(getThemeMode()).toBe('system');
    });

    it('should return system for invalid values', () => {
      (storage.getString as jest.Mock).mockReturnValue('invalid');
      expect(getThemeMode()).toBe('system');
    });
  });

  describe('setThemeMode', () => {
    it('should save theme mode to storage', () => {
      setThemeMode('dark');
      expect(storage.set).toHaveBeenCalledWith('theme_mode', 'dark');
    });

    it('should save light mode', () => {
      setThemeMode('light');
      expect(storage.set).toHaveBeenCalledWith('theme_mode', 'light');
    });

    it('should save system mode', () => {
      setThemeMode('system');
      expect(storage.set).toHaveBeenCalledWith('theme_mode', 'system');
    });
  });

  describe('useTheme hook', () => {
    it('should return dark theme when mode is dark', () => {
      (storage.getString as jest.Mock).mockReturnValue('dark');
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
      expect(result.current.themeMode).toBe('dark');
      expect(result.current.colors.background).toBe('#000000');
      expect(result.current.colors.text).toBe('#ffffff');
    });

    it('should return light theme when mode is light', () => {
      (storage.getString as jest.Mock).mockReturnValue('light');
      (useColorScheme as jest.Mock).mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
      expect(result.current.themeMode).toBe('light');
      expect(result.current.colors.background).toBe('#ffffff');
      expect(result.current.colors.text).toBe('#000000');
    });

    it('should follow system theme when mode is system', () => {
      (storage.getString as jest.Mock).mockReturnValue('system');
      (useColorScheme as jest.Mock).mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(true);
      expect(result.current.themeMode).toBe('system');
    });

    it('should follow light system theme when mode is system', () => {
      (storage.getString as jest.Mock).mockReturnValue('system');
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);
      expect(result.current.themeMode).toBe('system');
    });

    it('should include common colors in all themes', () => {
      (storage.getString as jest.Mock).mockReturnValue('light');
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.colors.error).toBe('#FF3B30');
      expect(result.current.colors.success).toBe('#34C759');
    });

    it('should update when theme mode changes in storage', () => {
      (storage.getString as jest.Mock).mockReturnValueOnce('light');
      (useColorScheme as jest.Mock).mockReturnValue('dark');

      const { result } = renderHook(() => useTheme());

      expect(result.current.isDark).toBe(false);

      // Simulate storage change
      (storage.getString as jest.Mock).mockReturnValue('dark');

      // Fast-forward the interval
      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(result.current.isDark).toBe(true);
    });

    it('should default to system mode', () => {
      (storage.getString as jest.Mock).mockReturnValue(undefined);
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { result } = renderHook(() => useTheme());

      expect(result.current.themeMode).toBe('system');
      expect(result.current.isDark).toBe(false);
    });
  });

  describe('useTheme interval cleanup', () => {
    it('should cleanup interval on unmount', () => {
      (storage.getString as jest.Mock).mockReturnValue('light');
      (useColorScheme as jest.Mock).mockReturnValue('light');

      const { unmount } = renderHook(() => useTheme());

      const timerCount = jest.getTimerCount();
      unmount();

      // Interval should be cleared
      expect(jest.getTimerCount()).toBeLessThan(timerCount);
    });
  });
});

