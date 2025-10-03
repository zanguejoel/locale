import { Platform, Dimensions } from 'react-native';

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
    
    // Require iOS 17 or newer
    // iPhone XS and newer with iOS 17+ update
    return iosVersion >= 17;
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
    return 'Local LLM requires iOS 17.0 or newer. Please update your device to use this feature.';
  }
  
  if (Platform.OS === 'android') {
    return 'Local LLM requires Android 13 or newer. Please update your device to use this feature.';
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
    screenWidth: width,
    screenHeight: height,
    isLocalLLMSupported: isLocalLLMSupported(),
  };
};

