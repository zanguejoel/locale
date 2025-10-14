/**
 * Local Models Configuration
 * 
 * This file adds configuration for backend-managed model downloads
 * while maintaining compatibility with react-native-executorch's default sources
 */

import { storage } from '@/hooks/useMMKVStorage';

export interface ModelDownloadConfig {
  useBackendDownloads: boolean; // If true, download from backend instead of default source
  backendApiUrl: string;
  fallbackToDefault: boolean; // If backend download fails, fallback to default source
}

const DEFAULT_CONFIG: ModelDownloadConfig = {
  useBackendDownloads: false, // Start with default executorch downloads
  backendApiUrl: 'https://models.odysseytech.ai', // Dedicated models service
  fallbackToDefault: true,
};

/**
 * Get current model download configuration
 */
export function getModelDownloadConfig(): ModelDownloadConfig {
  try {
    const configJson = storage.getString('model_download_config');
    if (configJson) {
      return JSON.parse(configJson);
    }
  } catch (error) {
    console.error('[ModelConfig] Error reading config:', error);
  }
  return DEFAULT_CONFIG;
}

/**
 * Update model download configuration
 */
export function setModelDownloadConfig(config: Partial<ModelDownloadConfig>): void {
  try {
    const currentConfig = getModelDownloadConfig();
    const newConfig = { ...currentConfig, ...config };
    storage.set('model_download_config', JSON.stringify(newConfig));
    console.log('[ModelConfig] Config updated:', newConfig);
  } catch (error) {
    console.error('[ModelConfig] Error saving config:', error);
  }
}

/**
 * Enable backend downloads for all models
 */
export function enableBackendDownloads(): void {
  setModelDownloadConfig({ useBackendDownloads: true });
}

/**
 * Disable backend downloads (use default executorch sources)
 */
export function disableBackendDownloads(): void {
  setModelDownloadConfig({ useBackendDownloads: false });
}

/**
 * Check if backend downloads are enabled
 */
export function isBackendDownloadsEnabled(): boolean {
  return getModelDownloadConfig().useBackendDownloads;
}

