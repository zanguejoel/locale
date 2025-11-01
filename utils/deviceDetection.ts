/**
 * Device Detection Utilities
 * 
 * Reliable methods to detect simulator/emulator vs physical device
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Detect if running on iOS Simulator or Android Emulator
 * 
 * Uses multiple detection methods for reliability:
 * 1. Constants.isDevice (primary check)
 * 2. Device model string check
 * 3. __DEV__ flag as fallback
 * 
 * @returns true if running on simulator/emulator, false on physical device
 */
export function isRunningOnSimulator(): boolean {
  // Method 1: Check Constants.isDevice (most reliable)
  if (Constants.isDevice === false) {
    return true;
  }

  // Method 2: Check device model/name
  if (Platform.OS === 'ios') {
    const model = Constants.platform?.ios?.model?.toLowerCase();
    if (model?.includes('simulator')) {
      return true;
    }
  } else if (Platform.OS === 'android') {
    const model = Constants.platform?.android?.model?.toLowerCase();
    if (
      model?.includes('emulator') ||
      model?.includes('sdk') ||
      model?.includes('android sdk')
    ) {
      return true;
    }
  }

  // Method 3: Check for development mode (less reliable, but helpful)
  // In production, we definitely want real IAP
  // In dev mode on simulator, we want mock
  if (__DEV__) {
    // If we're in dev mode and couldn't determine device type above,
    // log a warning but don't automatically assume simulator
    console.log('[DeviceDetection] Running in dev mode, device status unclear');
  }

  // If all checks pass, assume it's a real device
  return false;
}

/**
 * Get a human-readable description of the current environment
 */
export function getEnvironmentDescription(): string {
  const isSimulator = isRunningOnSimulator();
  const platform = Platform.OS;
  const isDevice = Constants.isDevice;
  const model = 
    Platform.OS === 'ios' 
      ? Constants.platform?.ios?.model 
      : Constants.platform?.android?.model;

  return `${platform} - ${isSimulator ? 'Simulator/Emulator' : 'Physical Device'} (isDevice: ${isDevice}, model: ${model})`;
}

/**
 * Should use mock IAP service?
 * 
 * Use mock service if:
 * 1. Running on simulator/emulator
 * 2. IAP module not available
 * 
 * @returns true if should use mock service
 */
export function shouldUseMockIAP(): boolean {
  // Always use mock on simulator
  if (isRunningOnSimulator()) {
    return true;
  }

  // Check if IAP module is available
  try {
    const IAP = require('react-native-iap');
    if (!IAP || !IAP.initConnection) {
      console.warn('[DeviceDetection] react-native-iap not available, using mock');
      return true;
    }
  } catch (error) {
    console.warn('[DeviceDetection] react-native-iap module error, using mock:', error);
    return true;
  }

  // Use real IAP on physical device
  return false;
}

export default {
  isRunningOnSimulator,
  getEnvironmentDescription,
  shouldUseMockIAP,
};

