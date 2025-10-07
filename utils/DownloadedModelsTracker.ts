/**
 * Downloaded Models Tracker
 * Tracks which local models have been successfully downloaded
 * Since react-native-executorch manages files internally, we track in storage
 */

import { storage } from '@/hooks/useMMKVStorage';

const DOWNLOADED_MODELS_KEY = 'downloaded_local_models';

export interface ModelDownloadInfo {
  modelId: string;
  downloadedAt: string;
  lastUsed?: string;
  size: string; // From model definition
}

export class DownloadedModelsTracker {
  
  /**
   * Get all downloaded model IDs
   */
  static getDownloadedModelIds(): string[] {
    try {
      const stored = storage.getString(DOWNLOADED_MODELS_KEY);
      if (!stored) return [];
      
      const data: ModelDownloadInfo[] = JSON.parse(stored);
      return data.map(m => m.modelId);
    } catch (error) {
      // console.error('[DownloadedModelsTracker] Error getting downloaded models:', error);
      return [];
    }
  }

  /**
   * Get full download info for all models
   */
  static getDownloadedModels(): ModelDownloadInfo[] {
    try {
      const stored = storage.getString(DOWNLOADED_MODELS_KEY);
      if (!stored) return [];
      
      return JSON.parse(stored);
    } catch (error) {
      // console.error('[DownloadedModelsTracker] Error getting download info:', error);
      return [];
    }
  }

  /**
   * Check if a specific model is downloaded
   */
  static isModelDownloaded(modelId: string): boolean {
    const downloadedIds = this.getDownloadedModelIds();
    return downloadedIds.includes(modelId);
  }

  /**
   * Mark a model as downloaded
   */
  static markAsDownloaded(modelId: string, size: string): void {
    try {
      const current = this.getDownloadedModels();
      
      // Check if already exists
      const existingIndex = current.findIndex(m => m.modelId === modelId);
      
      if (existingIndex >= 0) {
        // Update existing
        current[existingIndex] = {
          ...current[existingIndex],
          lastUsed: new Date().toISOString(),
        };
      } else {
        // Add new
        current.push({
          modelId,
          downloadedAt: new Date().toISOString(),
          lastUsed: new Date().toISOString(),
          size,
        });
      }
      
      storage.set(DOWNLOADED_MODELS_KEY, JSON.stringify(current));
      // console.log('[DownloadedModelsTracker] Marked as downloaded:', modelId);
    } catch (error) {
      // console.error('[DownloadedModelsTracker] Error marking downloaded:', error);
    }
  }

  /**
   * Update last used timestamp for a model
   */
  static updateLastUsed(modelId: string): void {
    try {
      const current = this.getDownloadedModels();
      const index = current.findIndex(m => m.modelId === modelId);
      
      if (index >= 0) {
        current[index].lastUsed = new Date().toISOString();
        storage.set(DOWNLOADED_MODELS_KEY, JSON.stringify(current));
      }
    } catch (error) {
      // console.error('[DownloadedModelsTracker] Error updating last used:', error);
    }
  }

  /**
   * Remove a model from tracking (when deleted)
   */
  static removeModel(modelId: string): void {
    try {
      const current = this.getDownloadedModels();
      const filtered = current.filter(m => m.modelId !== modelId);
      storage.set(DOWNLOADED_MODELS_KEY, JSON.stringify(filtered));
      // console.log('[DownloadedModelsTracker] Removed:', modelId);
    } catch (error) {
      // console.error('[DownloadedModelsTracker] Error removing model:', error);
    }
  }

  /**
   * Clear all tracked models
   */
  static clearAll(): void {
    try {
      storage.delete(DOWNLOADED_MODELS_KEY);
      // console.log('[DownloadedModelsTracker] Cleared all tracked models');
    } catch (error) {
      // console.error('[DownloadedModelsTracker] Error clearing:', error);
    }
  }

  /**
   * Get model info by ID
   */
  static getModelInfo(modelId: string): ModelDownloadInfo | undefined {
    const models = this.getDownloadedModels();
    return models.find(m => m.modelId === modelId);
  }
}

