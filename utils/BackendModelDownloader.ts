/**
 * Backend Model Downloader
 * 
 * Handles downloading AI models from our backend S3 servers
 * instead of the default react-native-executorch sources
 * 
 * Features:
 * - Fetches presigned URLs from backend
 * - Downloads large model files with progress tracking
 * - Stores models in the correct directory for executorch
 * - Handles resume/retry logic
 */

import * as FileSystem from 'expo-file-system';
import RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { getToken } from './SecureTokenManager';
import { formatAuthHeader } from './AuthHelpers';

// Default to dedicated models service, fallback to main API
const API_BASE_URL = "https://models.odysseytech.ai";
const MODELS_CACHE_DIR = Platform.OS === 'ios' 
  ? `${RNFS.CachesDirectoryPath}/executorch`
  : `${RNFS.CachesDirectoryPath}/executorch`;


export interface ModelDownloadRequest {
  modelId: string;
  platform: 'ios' | 'android';
  deviceVersion: number;
}

export interface ModelDownloadResponse {
  model_id: string;
  model_url: string;
  tokenizer_url?: string;
  expires_in: number;
  size_bytes: number;
}

export interface LocalModelInfo {
  id: string;
  name: string;
  display_name: string;
  description: string;
  size_bytes: number;
  size_display: string;
  format: string;
  min_ios_version?: number;
  min_android_version?: number;
  requires_high_end: boolean;
  recommended: boolean;
  huggingface_repo: string;
  model_filename: string;
  tokenizer_filename?: string;
  s3_key: string;
  tokenizer_s3_key?: string;
}

export interface ModelsListResponse {
  models: LocalModelInfo[];
  total_count: number;
}

export interface DownloadProgress {
  modelId: string;
  fileName: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0 to 1
}


export class BackendModelDownloader {
  private static instance: BackendModelDownloader;
  private downloadCallbacks: Map<string, (progress: DownloadProgress) => void> = new Map();

  private constructor() {}

  static getInstance(): BackendModelDownloader {
    if (!BackendModelDownloader.instance) {
      BackendModelDownloader.instance = new BackendModelDownloader();
    }
    return BackendModelDownloader.instance;
  }

  /**
   * Fetch list of available models from backend
   */
  async getAvailableModels(
    platform?: 'ios' | 'android',
    deviceVersion?: number
  ): Promise<ModelsListResponse> {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const authHeader = await formatAuthHeader(token);
      
      // Build query params
      const params = new URLSearchParams();
      if (platform) params.append('platform', platform);
      if (deviceVersion) params.append('device_version', deviceVersion.toString());
      
      const url = `${API_BASE_URL}/local-models?${params.toString()}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendModelDownloader] Error fetching models:', error);
      throw error;
    }
  }

  /**
   * Get download URLs for a specific model
   */
  async getModelDownloadUrls(
    modelId: string,
    platform: 'ios' | 'android',
    deviceVersion: number
  ): Promise<ModelDownloadResponse> {
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const authHeader = await formatAuthHeader(token);
      
      const response = await fetch(`${API_BASE_URL}/local-models/download`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_id: modelId,
          platform,
          device_version: deviceVersion,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get download URLs: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[BackendModelDownloader] Error getting download URLs:', error);
      throw error;
    }
  }

  /**
   * Download a model file from presigned URL with progress tracking
   */
  async downloadModelFile(
    url: string,
    destinationPath: string,
    onProgress?: (progress: DownloadProgress) => void,
    modelId?: string,
    fileName?: string
  ): Promise<string> {
    try {
      console.log(`[BackendModelDownloader] Downloading to: ${destinationPath}`);
      
      // Ensure directory exists
      const dirPath = destinationPath.substring(0, destinationPath.lastIndexOf('/'));
      await RNFS.mkdir(dirPath, { NSURLIsExcludedFromBackupKey: true });

      // Use RNFS for better download control
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: destinationPath,
        background: false,
        discretionary: false,
        cacheable: false,
        progressDivider: 10, // Update progress every 10%
        progressInterval: 250, // Update progress every 250ms
        begin: (res) => {
          console.log(`[BackendModelDownloader] Download started, file size: ${res.contentLength} bytes`);
        },
        progress: (res) => {
          if (onProgress && modelId && fileName) {
            const progress: DownloadProgress = {
              modelId,
              fileName,
              totalBytes: res.contentLength,
              downloadedBytes: res.bytesWritten,
              progress: res.bytesWritten / res.contentLength,
            };
            onProgress(progress);
          }
        },
      }).promise;

      if (downloadResult.statusCode === 200) {
        console.log(`[BackendModelDownloader] Download completed: ${destinationPath}`);
        return destinationPath;
      } else {
        throw new Error(`Download failed with status code: ${downloadResult.statusCode}`);
      }
    } catch (error) {
      console.error('[BackendModelDownloader] Download error:', error);
      throw error;
    }
  }

  /**
   * Download complete model (model file + tokenizer) from backend
   */
  async downloadCompleteModel(
    modelId: string,
    onProgress?: (progress: DownloadProgress) => void
  ): Promise<{ modelPath: string; tokenizerPath?: string }> {
    try {
      // Get device info
      const platform = Platform.OS as 'ios' | 'android';
      const deviceVersion = Platform.OS === 'ios' 
        ? parseInt(Platform.Version as string, 10)
        : Platform.Version as number;

      console.log(`[BackendModelDownloader] Starting download for model: ${modelId}`);
      console.log(`[BackendModelDownloader] Platform: ${platform}, Version: ${deviceVersion}`);

      // Get download URLs from backend
      const downloadInfo = await this.getModelDownloadUrls(modelId, platform, deviceVersion);
      
      // Prepare download paths
      const modelFileName = `${modelId}_model.pte`;
      const modelDestPath = `${MODELS_CACHE_DIR}/${modelId}/${modelFileName}`;
      
      // Download model file
      console.log(`[BackendModelDownloader] Downloading model file (${(downloadInfo.size_bytes / 1024 / 1024).toFixed(0)}MB)...`);
      const modelPath = await this.downloadModelFile(
        downloadInfo.model_url,
        modelDestPath,
        onProgress,
        modelId,
        'model'
      );

      // Download tokenizer if available
      let tokenizerPath: string | undefined;
      if (downloadInfo.tokenizer_url) {
        const tokenizerFileName = `${modelId}_tokenizer.json`;
        const tokenizerDestPath = `${MODELS_CACHE_DIR}/${modelId}/${tokenizerFileName}`;
        
        console.log(`[BackendModelDownloader] Downloading tokenizer...`);
        tokenizerPath = await this.downloadModelFile(
          downloadInfo.tokenizer_url,
          tokenizerDestPath,
          (progress) => {
            if (onProgress) {
              // Adjust progress to account for tokenizer being second download
              onProgress({
                ...progress,
                fileName: 'tokenizer',
              });
            }
          },
          modelId,
          'tokenizer'
        );
      }

      console.log(`[BackendModelDownloader] ✅ Model downloaded successfully`);
      return { modelPath, tokenizerPath };
    } catch (error) {
      console.error('[BackendModelDownloader] Error downloading complete model:', error);
      throw error;
    }
  }

  /**
   * Check if model is already downloaded locally
   */
  async isModelDownloaded(modelId: string): Promise<boolean> {
    try {
      const modelPath = `${MODELS_CACHE_DIR}/${modelId}`;
      const exists = await RNFS.exists(modelPath);
      
      if (!exists) {
        return false;
      }

      // Check if model file exists
      const files = await RNFS.readDir(modelPath);
      const hasModelFile = files.some(file => 
        file.name.endsWith('.pte') || file.name.endsWith('.gguf')
      );
      
      return hasModelFile;
    } catch (error) {
      console.error('[BackendModelDownloader] Error checking model existence:', error);
      return false;
    }
  }

  /**
   * Delete a downloaded model to free up space
   */
  async deleteModel(modelId: string): Promise<void> {
    try {
      const modelPath = `${MODELS_CACHE_DIR}/${modelId}`;
      const exists = await RNFS.exists(modelPath);
      
      if (exists) {
        await RNFS.unlink(modelPath);
        console.log(`[BackendModelDownloader] Deleted model: ${modelId}`);
      }
    } catch (error) {
      console.error('[BackendModelDownloader] Error deleting model:', error);
      throw error;
    }
  }

  /**
   * Get total size of all downloaded models
   */
  async getDownloadedModelsSize(): Promise<number> {
    try {
      const exists = await RNFS.exists(MODELS_CACHE_DIR);
      if (!exists) {
        return 0;
      }

      const files = await RNFS.readDir(MODELS_CACHE_DIR);
      let totalSize = 0;

      for (const file of files) {
        if (file.isDirectory()) {
          const modelFiles = await RNFS.readDir(file.path);
          for (const modelFile of modelFiles) {
            totalSize += parseInt(String(modelFile.size), 10);
          }
        } else {
          totalSize += parseInt(String(file.size), 10);
        }
      }

      return totalSize;
    } catch (error) {
      console.error('[BackendModelDownloader] Error calculating models size:', error);
      return 0;
    }
  }
}

export default BackendModelDownloader.getInstance();

