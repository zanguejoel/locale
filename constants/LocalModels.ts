import { Platform } from 'react-native';

export interface LocalModel {
  id: string;
  name: string;
  displayName: string;
  model: string;
  onnx_path: string;
  options?: { externalData: boolean };
  description: string;
  size: string;
  minIOSVersion?: number;
  minAndroidVersion?: number;
  requiresHighEnd?: boolean; // Requires more powerful devices
  recommended?: boolean;
}

export const LOCAL_MODELS: LocalModel[] = [
  {
    id: 'llama-3.2-1b',
    name: 'Llama-3.2-1B',
    displayName: 'Llama 3.2 1B',
    model: 'meta-llama/Llama-3.2-1B',
    onnx_path: 'llama-3.2-1b.pte',
    description: 'Fast and efficient model for everyday tasks',
    size: '~1.2GB',
    minIOSVersion: 14,
    minAndroidVersion: 29,
    requiresHighEnd: false,
    recommended: true
  },
  {
    id: 'phi-3-mini',
    name: 'Phi-3-mini',
    displayName: 'Phi-3 Mini',
    model: 'microsoft/Phi-3-mini-4k-instruct-onnx-web',
    onnx_path: 'onnx/model_q4.onnx',
    options: { externalData: true },
    description: 'Microsoft\'s powerful small model',
    size: '~2.3GB',
    minIOSVersion: 15,
    minAndroidVersion: 30,
    requiresHighEnd: true
  },
  {
    id: 'llama-160m',
    name: 'Llama-160M',
    displayName: 'Llama 160M',
    model: 'Felladrin/onnx-Llama-160M-Chat-v1',
    onnx_path: 'onnx/decoder_model_merged.onnx',
    description: 'Ultra-lightweight model for basic conversations',
    size: '~640MB',
    minIOSVersion: 14,
    minAndroidVersion: 29,
    requiresHighEnd: false
  },
  {
    id: 'minueza-32m',
    name: 'Minueza-32M',
    displayName: 'Minueza 32M',
    model: 'Felladrin/onnx-Minueza-32M-UltraChat',
    onnx_path: 'onnx/decoder_model_merged.onnx',
    description: 'Tiny model for very simple queries',
    size: '~128MB',
    minIOSVersion: 14,
    minAndroidVersion: 29,
    requiresHighEnd: false
  },
  {
    id: 'distilgpt2',
    name: 'distilgpt2',
    displayName: 'DistilGPT-2',
    model: 'Xenova/distilgpt2_onnx-quantized',
    onnx_path: 'decoder_model.onnx',
    description: 'Distilled GPT-2 for text generation',
    size: '~340MB',
    minIOSVersion: 14,
    minAndroidVersion: 29,
    requiresHighEnd: false
  },
  {
    id: 'tiny-mamba',
    name: 'tiny-mamba',
    displayName: 'Tiny Mamba',
    model: 'Xenova/tiny-mamba-onnx',
    onnx_path: 'onnx/model.onnx',
    description: 'Experimental efficient architecture',
    size: '~80MB',
    minIOSVersion: 14,
    minAndroidVersion: 29,
    requiresHighEnd: false
  }
];

export const DEFAULT_LOCAL_MODEL_ID = 'tiny-mamba'; // Lightest model at ~80MB

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
 */
export const getRecommendedLocalModel = (): LocalModel => {
  const supportedModels = getSupportedLocalModels();
  const recommended = supportedModels.find(m => m.recommended);
  return recommended || supportedModels[0] || LOCAL_MODELS[0];
};

// Legacy export for backward compatibility
export const presets = LOCAL_MODELS.map(model => ({
  name: model.name,
  model: model.model,
  onnx_path: model.onnx_path,
  options: model.options
}));