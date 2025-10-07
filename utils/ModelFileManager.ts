/**
 * Model File Manager
 * Handles file system operations for local models
 */

import RNFS from 'react-native-fs';
import { LOCAL_MODELS, LocalModel, getLocalModelById } from '@/constants/LocalModels';

export interface DownloadedModelInfo {
  modelId: string;
  name: string;
  displayName: string;
  path: string;
  size: number;
  downloadDate?: Date;
  lastUsed?: Date;
  isActive: boolean;
  fileCount: number;
}

export class ModelFileManager {
  
  /**
   * Get base directory for models
   * react-native-executorch stores models in cache directory
   */
  static getModelsDirectory(): string {
    return RNFS.CachesDirectoryPath + '/executorch';
  }

  /**
   * List all downloaded models with their information
   */
  static async getDownloadedModels(currentModelId?: string): Promise<DownloadedModelInfo[]> {
    const modelsDir = this.getModelsDirectory();
    
    try {
      const exists = await RNFS.exists(modelsDir);
      if (!exists) {
        // console.log('[ModelFileManager] Models directory does not exist yet');
        return [];
      }
      
      const items = await RNFS.readDir(modelsDir);
      const downloadedModels: DownloadedModelInfo[] = [];
      
      // Check each local model to see if it's downloaded
      for (const model of LOCAL_MODELS) {
        const modelInfo = await this.checkModelDownloaded(model, currentModelId);
        if (modelInfo) {
          downloadedModels.push(modelInfo);
        }
      }
      
      return downloadedModels.sort((a, b) => {
        // Sort: active first, then by size descending
        if (a.isActive && !b.isActive) return -1;
        if (!a.isActive && b.isActive) return 1;
        return b.size - a.size;
      });
    } catch (error) {
      // console.error('[ModelFileManager] Error getting downloaded models:', error);
      return [];
    }
  }

  /**
   * Check if a specific model is downloaded
   */
  static async checkModelDownloaded(
    model: LocalModel, 
    currentModelId?: string
  ): Promise<DownloadedModelInfo | null> {
    const modelsDir = this.getModelsDirectory();
    
    try {
      // Look for any .pte files in the executorch directory
      const items = await RNFS.readDir(modelsDir);
      
      // Find files that might belong to this model
      // executorch may use different naming conventions
      const modelFiles = items.filter(item => 
        item.name.includes('.pte') || 
        item.name.includes(model.id) ||
        item.name.toLowerCase().includes(model.name.toLowerCase())
      );
      
      if (modelFiles.length === 0) {
        return null;
      }
      
      // Calculate total size
      let totalSize = 0;
      let fileCount = 0;
      
      for (const file of modelFiles) {
        if (file.isFile()) {
          totalSize += file.size;
          fileCount++;
        }
      }
      
      // If we found files, consider it downloaded
      if (fileCount > 0) {
        return {
          modelId: model.id,
          name: model.name,
          displayName: model.displayName,
          path: modelsDir,
          size: totalSize,
          isActive: currentModelId === model.id,
          fileCount,
        };
      }
      
      return null;
    } catch (error) {
      // console.error('[ModelFileManager] Error checking model:', model.id, error);
      return null;
    }
  }

  /**
   * Get total storage used by all models
   */
  static async getModelStorageSize(): Promise<number> {
    try {
      const modelsDir = this.getModelsDirectory();
      const exists = await RNFS.exists(modelsDir);
      
      if (!exists) {
        return 0;
      }
      
      const totalSize = await this.getDirectorySize(modelsDir);
      return totalSize;
    } catch (error) {
      // console.error('[ModelFileManager] Error calculating model storage:', error);
      return 0;
    }
  }

  /**
   * Get directory size recursively
   */
  static async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const items = await RNFS.readDir(dirPath);
      let size = 0;
      
      for (const item of items) {
        if (item.isDirectory()) {
          size += await this.getDirectorySize(item.path);
        } else {
          size += item.size;
        }
      }
      
      return size;
    } catch (error) {
      // console.error('[ModelFileManager] Error calculating directory size:', error);
      return 0;
    }
  }

  /**
   * Delete all models (clear entire executorch directory)
   */
  static async deleteAllModels(): Promise<boolean> {
    try {
      const modelsDir = this.getModelsDirectory();
      const exists = await RNFS.exists(modelsDir);
      
      if (!exists) {
        // console.log('[ModelFileManager] No models to delete');
        return true;
      }
      
      await RNFS.unlink(modelsDir);
      // console.log('[ModelFileManager] All models deleted successfully');
      return true;
    } catch (error) {
      // console.error('[ModelFileManager] Error deleting all models:', error);
      return false;
    }
  }

  /**
   * Clear cache (temporary files, not models)
   */
  static async clearCache(): Promise<number> {
    try {
      const cacheDir = this.getModelsDirectory() + '/cache';
      const exists = await RNFS.exists(cacheDir);
      
      if (!exists) {
        return 0;
      }
      
      const sizeBefore = await this.getDirectorySize(cacheDir);
      await RNFS.unlink(cacheDir);
      
      // console.log('[ModelFileManager] Cache cleared:', this.formatFileSize(sizeBefore));
      return sizeBefore;
    } catch (error) {
      // console.error('[ModelFileManager] Error clearing cache:', error);
      return 0;
    }
  }

  /**
   * Get cache size
   */
  static async getCacheSize(): Promise<number> {
    try {
      const cacheDir = this.getModelsDirectory() + '/cache';
      const exists = await RNFS.exists(cacheDir);
      
      if (!exists) {
        return 0;
      }
      
      return await this.getDirectorySize(cacheDir);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Format file size for display
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    return size.toFixed(2) + ' ' + sizes[i];
  }

  /**
   * Get device storage info
   */
  static async getDeviceStorageInfo(): Promise<{
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
    percentUsed: number;
  }> {
    try {
      const freeSpace = await RNFS.getFSInfo().then(info => info.freeSpace);
      const totalSpace = await RNFS.getFSInfo().then(info => info.totalSpace);
      const usedSpace = totalSpace - freeSpace;
      const percentUsed = (usedSpace / totalSpace) * 100;
      
      return {
        totalSpace,
        freeSpace,
        usedSpace,
        percentUsed,
      };
    } catch (error) {
      // console.error('[ModelFileManager] Error getting device storage:', error);
      return {
        totalSpace: 0,
        freeSpace: 0,
        usedSpace: 0,
        percentUsed: 0,
      };
    }
  }

  /**
   * Check if there's enough space to download a model
   */
  static async hasEnoughSpace(requiredSize: number): Promise<boolean> {
    try {
      const { freeSpace } = await this.getDeviceStorageInfo();
      // Require 20% buffer
      return freeSpace > (requiredSize * 1.2);
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse model size string to bytes (e.g., "1.2GB" -> bytes)
   */
  static parseSizeString(sizeStr: string): number {
    const match = sizeStr.match(/~?([\d.]+)\s*(MB|GB|KB|B)/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers: { [key: string]: number } = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
    };
    
    return value * (multipliers[unit] || 0);
  }
}

