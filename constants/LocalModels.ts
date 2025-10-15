import { Platform } from 'react-native';
import {
  LLAMA3_2_1B,
  LLAMA3_2_3B,
  QWEN2_5_0_5B,
  QWEN2_5_1_5B,
  SMOLLM2_1_135M,
  SMOLLM2_1_360M,
  HAMMER2_1_0_5B,
} from 'react-native-executorch';

export interface LocalModel {
  id: string;
  name: string;
  displayName: string;
  modelSource: any; // react-native-executorch model constant
  description: string;
  size: string;
  minIOSVersion?: number;
  minAndroidVersion?: number;
  requiresHighEnd?: boolean; // Requires more powerful devices
  recommended?: boolean;
}

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'smollm2-135m',
    name: 'SmolLM2-135M',
    displayName: 'SmolLM2 135M',
    modelSource: SMOLLM2_1_135M,
    description: 'Ultra-lightweight model for basic conversations',
    size: '~135MB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: false,
    recommended: false
  },
  {
    id: 'smollm2-360m',
    name: 'SmolLM2-360M',
    displayName: 'SmolLM2 360M',
    modelSource: SMOLLM2_1_360M,
    description: 'Small, efficient model for everyday tasks',
    size: '~360MB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: false,
    recommended: false
  },
  {
    id: 'hammer2-0.5b',
    name: 'Hammer2-0.5B',
    displayName: 'Hammer2 0.5B',
    modelSource: HAMMER2_1_0_5B,
    description: 'Fast model for general use',
    size: '~500MB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: false,
    recommended: false
  },
  {
    id: 'qwen2.5-0.5b',
    name: 'Qwen2.5-0.5B',
    displayName: 'Qwen 2.5 0.5B',
    modelSource: QWEN2_5_0_5B,
    description: 'Balanced model for various tasks - Most stable',
    size: '~500MB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: false,
    recommended: true
  },
  {
    id: 'llama-3.2-1b',
    name: 'Llama-3.2-1B',
    displayName: 'Llama 3.2 1B',
    modelSource: LLAMA3_2_1B,
    description: 'Good performance but may have stability issues on some devices',
    size: '~1.2GB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: false,
    recommended: false
  },
  {
    id: 'qwen2.5-1.5b',
    name: 'Qwen2.5-1.5B',
    displayName: 'Qwen 2.5 1.5B',
    modelSource: QWEN2_5_1_5B,
    description: 'More capable model for complex tasks',
    size: '~1.5GB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: true,
    recommended: false
  },
  {
    id: 'llama-3.2-3b',
    name: 'Llama-3.2-3B',
    displayName: 'Llama 3.2 3B',
    modelSource: LLAMA3_2_3B,
    description: 'Most capable model, requires more resources',
    size: '~3GB',
    minIOSVersion: 17,
    minAndroidVersion: 33,
    requiresHighEnd: true,
    recommended: false
  }
];

export const DEFAULT_LOCAL_MODEL_ID = 'qwen2.5-0.5b'; // Most stable and reliable model for all devices

/**
 * Get supported local models based on device capabilities
 */
export const getSupportedLocalModels = (): LocalModel[] => {
  const platform = Platform.OS;
  const version = Platform.Version;
  
  return LOCAL_MODELS.filter(model => {
    if (platform === 'ios') {
      const iosVersion = typeof version === 'string' ? parseInt(version, 10) : version;
      return !model.minIOSVersion || iosVersion >= model.minIOSVersion;
    }
    
    if (platform === 'android') {
      const androidVersion = version as number;
      return !model.minAndroidVersion || androidVersion >= model.minAndroidVersion;
    }
    
    return false;
  });
};

/**
 * Get a local model by ID
 */
export const getLocalModelById = (id: string): LocalModel | undefined => {
  return LOCAL_MODELS.find(model => model.id === id);
};

/**
 * Get the recommended local model for the device
 * Prioritizes performance while considering device capabilities
 */
export const getRecommendedLocalModel = (): LocalModel => {
  const supportedModels = getSupportedLocalModels();
  
  // First, try to find the marked recommended model (Qwen 2.5 0.5B)
  const recommended = supportedModels.find(m => m.recommended);
  if (recommended) {
    return recommended;
  }
  
  // Fallback priority: stability first, then capability
  // Order of preference: Qwen 0.5B > Hammer2 > SmolLM2 360M > Qwen 1.5B > SmolLM2 135M
  const preferenceOrder = [
    'qwen2.5-0.5b', 
    'hammer2-0.5b',
    'smollm2-360m',
    'qwen2.5-1.5b',
    'smollm2-135m'
  ];
  
  for (const modelId of preferenceOrder) {
    const model = supportedModels.find(m => m.id === modelId);
    if (model) {
      return model;
    }
  }
  
  // Fallback to first available or first in list
  return supportedModels[0] || LOCAL_MODELS[0];
};