/**
 * Shadow System - Elevation Levels
 * Matching web app's shadow design
 */

import { Platform, ViewStyle } from 'react-native';

interface Shadow {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number; // Android
}

/**
 * Shadow definitions for different elevation levels
 * iOS uses shadow properties, Android uses elevation
 */
export const shadows = {
  /**
   * Small shadow - Subtle elevation
   * Use for: Cards, inputs
   */
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  } as ViewStyle,
  
  /**
   * Medium shadow - Standard elevation
   * Use for: Floating buttons, modals
   */
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  } as ViewStyle,
  
  /**
   * Large shadow - High elevation
   * Use for: Popovers, dropdowns
   */
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  } as ViewStyle,
  
  /**
   * Extra large shadow - Maximum elevation
   * Use for: Modals, dialogs
   */
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  } as ViewStyle,
  
  /**
   * No shadow
   */
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
};

/**
 * Apply shadow based on platform and color
 * @param level Shadow level (sm, md, lg, xl)
 * @param color Shadow color (default: #000)
 */
export function getShadow(level: keyof typeof shadows, color: string = '#000'): ViewStyle {
  return {
    ...shadows[level],
    shadowColor: color,
  };
}

export default shadows;

