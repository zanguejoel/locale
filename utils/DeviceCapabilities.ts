import { Platform, Dimensions } from 'react-native';

/**
 * Get iPhone model name for better error messages
 * Note: Without native module, we can only get basic info from Platform
 */
export const getIPhoneModel = (): string | null => {
  if (Platform.OS !== 'ios') return null;
  
  try {
    const iosVersion = typeof Platform.Version === 'string' 
      ? parseInt(Platform.Version, 10) 
      : Platform.Version;
    
    return `iPhone (iOS ${iosVersion})`;
  } catch (error) {
    return 'Unknown iPhone';
  }
};

/**
 * Check if iPhone supports iOS 17+ and local LLM
 * iPhones that can run iOS 17:
 * - iPhone XS and newer (2018+)
 * - iPhone XR (2018+)
 * - iPhone SE (2nd gen 2020+)
 * 
 * Note: We primarily rely on iOS version check since we can't reliably
 * determine the exact iPhone model without native modules
 */
export const isIPhoneModelSupported = (): { supported: boolean; reason?: string } => {
  if (Platform.OS !== 'ios') {
    return { supported: true }; // Not iOS, check other criteria
  }
  
  try {
    const iosVersion = typeof Platform.Version === 'string' 
      ? parseInt(Platform.Version, 10) 
      : Platform.Version;
    
    // If device is running iOS 17+, it must be a supported iPhone model
    // (since older iPhones can't run iOS 17)
    if (iosVersion >= 17) {
      return { supported: true };
    }
    
    // If iOS version is below 17, device is not supported
    return {
      supported: false,
      reason: `Your iPhone is running iOS ${iosVersion}. iOS 17+ is required for local AI models.`
    };
  } catch (error) {
    console.warn('[DeviceCapabilities] Could not determine iPhone compatibility:', error);
    // If we can't determine, allow it (better than blocking valid devices)
    return { supported: true };
  }
};

/**
 * Check if the device supports local LLM execution
 * react-native-executorch requires:
 * - iOS: iOS 17.0+ (as per official documentation)
 * - Android: Android 13+ (API level 33+)
 * 
 * These are the minimum versions required by the react-native-executorch library.
 * Reference: https://docs.swmansion.com/react-native-executorch/docs
 */
export const isLocalLLMSupported = (): boolean => {
  if (Platform.OS === 'ios') {
    // iOS device support
    // react-native-executorch requires iOS 17.0+
    
    const iosVersion = typeof Platform.Version === 'string' 
      ? parseInt(Platform.Version, 10) 
      : Platform.Version;
    
    // Check iOS version first
    if (iosVersion < 17) {
      return false;
    }
    
    // Check if iPhone model can support iOS 17
    const modelCheck = isIPhoneModelSupported();
    return modelCheck.supported;
  }
  
  if (Platform.OS === 'android') {
    // Android device support
    // react-native-executorch requires Android 13+ (API level 33)
    
    const androidVersion = Platform.Version as number;
    
    // Require Android 13 or newer (API level 33)
    if (androidVersion < 33) {
      return false;
    }
    
    // Use screen dimensions as a rough proxy for device capability
    // Most recent Android phones with larger screens have better hardware
    const { width, height } = Dimensions.get('window');
    const minDimension = Math.min(width, height);
    
    // Very small screens (< 320px) are likely older/budget devices
    if (minDimension < 320) {
      return false;
    }
    
    return true;
  }
  
  // Web and other platforms are not supported
  return false;
};

/**
 * Get a user-friendly message explaining why local LLM is not supported
 */
export const getLocalLLMUnsupportedMessage = (): string => {
  if (Platform.OS === 'ios') {
    const iosVersion = typeof Platform.Version === 'string' 
      ? parseInt(Platform.Version, 10) 
      : Platform.Version;
    
    // Check iPhone model compatibility first
    const modelCheck = isIPhoneModelSupported();
    if (!modelCheck.supported && modelCheck.reason) {
      return modelCheck.reason + '\n\nSupported: iPhone XS and newer (2018+)';
    }
    
    // Check iOS version
    if (iosVersion < 17) {
      const currentModel = getIPhoneModel();
      return `Local AI requires iOS 17.0 or newer.\n\nYour device: ${currentModel || 'iPhone'}\niOS version: ${iosVersion}\n\nPlease update to iOS 17+ to use this feature.`;
    }
    
    return 'Local LLM requires iOS 17.0 or newer. Please update your device to use this feature.';
  }
  
  if (Platform.OS === 'android') {
    const androidVersion = Platform.Version as number;
    return `Local AI requires Android 13 or newer.\n\nYour device: Android ${androidVersion}\n\nPlease update to Android 13+ (API level 33+) to use this feature.`;
  }
  
  return 'Local LLM is only supported on iOS 17+ and Android 13+ devices.';
};

/**
 * Get device information for debugging
 */
export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  
  return {
    platform: Platform.OS,
    platformVersion: Platform.Version,
    deviceModel: Platform.OS === 'ios' ? getIPhoneModel() : `Android ${Platform.Version}`,
    screenWidth: width,
    screenHeight: height,
    isLocalLLMSupported: isLocalLLMSupported(),
    modelSupported: Platform.OS === 'ios' ? isIPhoneModelSupported() : { supported: true },
  };
};

