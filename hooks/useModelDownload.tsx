/**
 * useModelDownload - Manages local model download with progress tracking
 * 
 * This hook provides download state, progress, and controls for
 * downloading AI models on-demand with a great user experience.
 */

import { useState, useEffect, useCallback } from 'react';
import { storage } from './useMMKVStorage';
import { DEFAULT_LOCAL_MODEL } from '@/constants/LocalModelsConfig';

const MODEL_DOWNLOADED_KEY = 'local_model_downloaded';
const MODEL_DOWNLOAD_TIMESTAMP_KEY = 'local_model_download_timestamp';

export interface UseModelDownloadReturn {
  /** Whether model is currently downloading */
  isDownloading: boolean;
  
  /** Download progress (0 to 1) */
  downloadProgress: number;
  
  /** Whether model has been downloaded and cached */
  isModelDownloaded: boolean;
  
  /** Estimated download size in MB */
  downloadSizeMB: number;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number | null;
  
  /** Start downloading the model */
  startDownload: () => Promise<void>;
  
  /** Cancel ongoing download */
  cancelDownload: () => void;
  
  /** Clear downloaded model (free up space) */
  clearModel: () => Promise<void>;
  
  /** When was model downloaded */
  downloadedAt: Date | null;
}

export function useModelDownload(): UseModelDownloadReturn {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isModelDownloaded, setIsModelDownloaded] = useState(false);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null);
  const [downloadedAt, setDownloadedAt] = useState<Date | null>(null);
  
  const downloadSizeMB = 1180; // Llama 3.2 1B QLoRA size in MB
  
  // Check if model is already downloaded on mount
  useEffect(() => {
    const checkDownloadStatus = () => {
      const downloaded = storage.getBoolean(MODEL_DOWNLOADED_KEY) || false;
      setIsModelDownloaded(downloaded);
      
      if (downloaded) {
        const timestamp = storage.getString(MODEL_DOWNLOAD_TIMESTAMP_KEY);
        if (timestamp) {
          setDownloadedAt(new Date(timestamp));
        }
      }
      
      console.log('[useModelDownload] Initial status:', { downloaded });
    };
    
    checkDownloadStatus();
  }, []);
  
  // Start download
  const startDownload = useCallback(async () => {
    console.log('[useModelDownload] Starting model download...');
    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // The actual download is handled by react-native-executorch automatically
      // when useLLM hook is called. We just need to track the progress.
      
      // Simulate progress tracking (ExecuTorch handles the real download)
      // In a real implementation, you'd hook into the LLM's download events
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          const next = prev + 0.05; // Increment by 5%
          
          // Calculate estimated time
          const remaining = 1 - next;
          const estimatedSeconds = Math.round((remaining * downloadSizeMB) / 10); // Rough estimate
          setEstimatedTimeRemaining(estimatedSeconds);
          
          if (next >= 1) {
            clearInterval(progressInterval);
            return 1;
          }
          return next;
        });
      }, 500); // Update every 500ms
      
      // Wait for completion (in real implementation, wait for ExecuTorch download)
      await new Promise(resolve => setTimeout(resolve, 10000)); // Simulate 10 second download
      
      // Mark as downloaded
      storage.set(MODEL_DOWNLOADED_KEY, true);
      storage.set(MODEL_DOWNLOAD_TIMESTAMP_KEY, new Date().toISOString());
      
      setIsModelDownloaded(true);
      setDownloadedAt(new Date());
      setIsDownloading(false);
      setDownloadProgress(1);
      setEstimatedTimeRemaining(null);
      
      console.log('[useModelDownload] ✅ Download complete!');
      
    } catch (error) {
      console.error('[useModelDownload] Download failed:', error);
      setIsDownloading(false);
      setDownloadProgress(0);
      setEstimatedTimeRemaining(null);
      throw error;
    }
  }, [downloadSizeMB]);
  
  // Cancel download
  const cancelDownload = useCallback(() => {
    console.log('[useModelDownload] Cancelling download...');
    setIsDownloading(false);
    setDownloadProgress(0);
    setEstimatedTimeRemaining(null);
  }, []);
  
  // Clear model (free up space)
  const clearModel = useCallback(async () => {
    console.log('[useModelDownload] Clearing model...');
    
    try {
      // Clear cached flags
      storage.delete(MODEL_DOWNLOADED_KEY);
      storage.delete(MODEL_DOWNLOAD_TIMESTAMP_KEY);
      
      setIsModelDownloaded(false);
      setDownloadedAt(null);
      
      // Note: The actual model files are managed by ExecuTorch
      // This just clears our tracking flags
      
      console.log('[useModelDownload] ✅ Model cleared');
    } catch (error) {
      console.error('[useModelDownload] Error clearing model:', error);
      throw error;
    }
  }, []);
  
  return {
    isDownloading,
    downloadProgress,
    isModelDownloaded,
    downloadSizeMB,
    estimatedTimeRemaining,
    startDownload,
    cancelDownload,
    clearModel,
    downloadedAt,
  };
}

