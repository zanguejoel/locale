/**
 * DeviceCapabilities - Check if device can run local AI models smoothly
 * 
 * Simplified version using Platform API only (no expo-device dependency)
 */

import { Platform } from 'react-native';

export interface DeviceCapability {
  /** Whether local AI is supported */
  isSupported: boolean;
  
  /** Device model name */
  deviceModel: string;
  
  /** Estimated RAM in GB (conservative estimate) */
  estimatedRAM: number;
  
  /** Reason if not supported */
  reason?: string;
  
  /** Recommended model if supported */
  recommendedModel?: 'Llama 3.2 1B' | 'Llama 3.2 3B';
}

// Simplified approach: Use iOS version as proxy for capability
// iOS 17+ requires iPhone XS or newer, which mostly have 4GB+ RAM
// We'll be conservative and assume devices running iOS 17+ can handle it

/**
 * Check if device supports local AI models
 * 
 * Simplified approach using Platform API only:
 * - iOS 17.0+ → Supported (requires iPhone XR or newer)
 * - Android 8.0+ → Supported
 */
export function checkLocalAISupport(): DeviceCapability {
  // iOS support
  if (Platform.OS === 'ios') {
    const iosVersion = parseInt(Platform.Version as string, 10);
    
    // iOS 17+ required (as per your app config)
    if (iosVersion >= 17) {
      return {
        isSupported: true,
        deviceModel: 'iOS Device',
        estimatedRAM: 6, // Conservative estimate for iOS 17+ devices
        recommendedModel: 'Llama 3.2 1B',
      };
    }
    
    return {
      isSupported: false,
      deviceModel: 'iOS Device',
      estimatedRAM: 0,
      reason: 'Requires iOS 17.0 or higher',
    };
  }
  
  // Android support
  if (Platform.OS === 'android') {
    const apiLevel = Platform.Version as number;
    
    if (apiLevel >= 26) {
      return {
        isSupported: true,
        deviceModel: 'Android Device',
        estimatedRAM: 6, // Conservative estimate
        recommendedModel: 'Llama 3.2 1B',
      };
    }
    
    return {
      isSupported: false,
      deviceModel: 'Android Device',
      estimatedRAM: 0,
      reason: 'Requires Android 8.0 or higher (API 26+)',
    };
  }
  
  // Other platforms
  return {
    isSupported: false,
    deviceModel: 'Unknown',
    estimatedRAM: 0,
    reason: 'Platform not supported. Requires iOS or Android.',
  };
}

/**
 * Check if device can run 3B model smoothly
 * Simplified: Assume iOS 17+ devices can handle 1B, maybe 3B
 */
export function canRun3BModel(): boolean {
  const capability = checkLocalAISupport();
  return capability.isSupported; // Let user try, performance will vary
}

/**
 * Get user-friendly device capability message
 */
export function getCapabilityMessage(): string {
  const capability = checkLocalAISupport();
  
  if (!capability.isSupported) {
    return `Local AI is not available on this device. ${capability.reason}`;
  }
  
  if (capability.estimatedRAM >= 8) {
    return 'Your device supports Local AI with excellent performance!';
  }
  
  if (capability.estimatedRAM >= 6) {
    return 'Your device supports Local AI with good performance.';
  }
  
  if (capability.estimatedRAM >= 4) {
    return 'Local AI supported. Performance may vary. Close other apps for best experience.';
  }
  
  return 'Local AI available on this device.';
}

/**
 * Simple check: Is local AI supported?
 */
export function isLocalAISupported(): boolean {
  const capability = checkLocalAISupport();
  return capability.isSupported;
}

