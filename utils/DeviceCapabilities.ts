import { Platform, Dimensions } from 'react-native';

/**
 * Check if the device supports local LLM execution
 * ExecuTorch requires:
 * - iOS: iOS 14+ (we assume newer devices have sufficient capabilities)
 * - Android: Android 10+ (API level 29+)
 * 
 * This is a conservative check that focuses on OS version rather than 
 * specific hardware specs to avoid compatibility issues.
 */
export const isLocalLLMSupported = (): boolean => {
  if (Platform.OS === 'ios') {
    // iOS device support
    // ExecuTorch works on iOS 14+ devices
    // We use a conservative approach: iOS 14+ is generally capable
    
    const iosVersion = typeof Platform.Version === 'string' 
      ? parseInt(Platform.Version, 10) 
      : Platform.Version;
    
    // Require iOS 14 or newer
    // iPhone 12 and newer (2020+) shipped with iOS 14
    return iosVersion >= 14;
  }
  
  if (Platform.OS === 'android') {
    // Android device support
    // Require Android 10+ (API level 29) for better compatibility
    
    const androidVersion = Platform.Version as number;
    
    // Require Android 10 or newer
    if (androidVersion < 29) { // Android 10 is API level 29
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
    return 'Local LLM requires iPhone 12 or newer with iOS 14+.';
  }
  
  if (Platform.OS === 'android') {
    return 'Local LLM requires Android 10+ with at least 4GB RAM.';
  }
  
  return 'Local LLM is only supported on iOS and Android devices.';
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

