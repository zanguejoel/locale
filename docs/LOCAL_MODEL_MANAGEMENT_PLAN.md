# Local Model Management - Comprehensive Plan

**Date**: October 3, 2025  
**Goal**: Complete model file management with storage monitoring, deletion, and resource access  
**Status**: 📋 Design & Implementation Plan

---

## 🎯 Executive Summary

Create a comprehensive local model management system that allows users to:
- View all downloaded models and their sizes
- Monitor storage usage
- Delete individual models
- Clear all model cache
- Manage model files and resources
- See download history
- Optimize storage

---

## 🏗️ Architecture Overview

### Components to Build:

1. **Model Manager Screen** (`app/model-manager.tsx`)
2. **Model Card Component** (`components/ModelCard.tsx`)
3. **Storage Monitor** (`components/StorageMonitor.tsx`)
4. **Model File Manager** (`utils/ModelFileManager.ts`)
5. **Cache Utilities** (`utils/ModelCacheUtils.ts`)
6. **Settings Integration** (Update `app/(modal)/settings.tsx`)

---

## 📱 Feature 1: Model Manager Screen

### Visual Design:
```
┌─────────────────────────────────┐
│ ← Local Model Manager           │
├─────────────────────────────────┤
│                                 │
│ Storage Usage                   │
│ ┌─────────────────────────────┐ │
│ │ 4.5 GB / 64 GB Used (7%)   │ │
│ │ ████░░░░░░░░░░░░░░░░░░░░░░ │ │
│ │ 3 models downloaded         │ │
│ └─────────────────────────────┘ │
│                                 │
│ Downloaded Models               │
│ ┌─────────────────────────────┐ │
│ │ ✓ Llama 3.2 3B             │ │
│ │   In use • 3.0 GB          │ │
│ │   [Delete]                  │ │
│ └─────────────────────────────┘ │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ ✓ Qwen 2.5 1.5B            │ │
│ │   Downloaded • 1.5 GB       │ │
│ │   Last used: 2 days ago     │ │
│ │   [Delete]                  │ │
│ └─────────────────────────────┘ │
│                                 │
│ Available to Download           │
│ ┌─────────────────────────────┐ │
│ │ Llama 3.2 1B               │ │
│ │   1.2 GB • Recommended      │ │
│ │   [Download]                │ │
│ └─────────────────────────────┘ │
│                                 │
│ [Clear All Models]              │
└─────────────────────────────────┘
```

### Features:
- Storage usage visualization
- List of downloaded models
- Model status (in use, downloaded, available)
- File sizes
- Last used timestamps
- Individual delete buttons
- Bulk delete option

---

## 📊 Feature 2: Storage Monitor Component

### What It Shows:
```
Storage Summary:
┌─────────────────────────────────┐
│ 📊 Storage Usage                │
│                                 │
│ Models: 4.5 GB                  │
│ Cache: 850 MB                   │
│ Total: 5.35 GB / 64 GB          │
│                                 │
│ Progress Bar:                   │
│ ████████░░░░░░░░░░░░░░░░░░░░  │
│ 8% used                         │
│                                 │
│ [Free Up Space]                 │
└─────────────────────────────────┘
```

### Data to Track:
- **Total device storage**
- **Available storage**
- **Model storage** (all downloaded models)
- **Cache storage** (temporary files)
- **App storage** (conversations, images, etc.)

### Implementation:
```typescript
import * as FileSystem from 'expo-file-system';

interface StorageInfo {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  modelSpace: number;
  cacheSpace: number;
  percentUsed: number;
}

const getStorageInfo = async (): Promise<StorageInfo> => {
  // Get device storage
  const deviceInfo = await FileSystem.getFreeDiskStorageAsync();
  const totalSpace = await FileSystem.getTotalDiskCapacityAsync();
  
  // Calculate model storage
  const modelSpace = await getModelStorageSize();
  const cacheSpace = await getCacheStorageSize();
  
  return {
    totalSpace,
    freeSpace: deviceInfo,
    usedSpace: totalSpace - deviceInfo,
    modelSpace,
    cacheSpace,
    percentUsed: ((totalSpace - deviceInfo) / totalSpace) * 100
  };
};
```

---

## 📁 Feature 3: Model File Manager

### Responsibilities:
1. **Track downloaded models**
2. **Monitor file sizes**
3. **Delete model files**
4. **Clear cache**
5. **Validate model integrity**

### File Structure (react-native-executorch):
```
App Storage Location:
├── DocumentDirectory/
│   ├── models/
│   │   ├── llama-3.2-1b/
│   │   │   ├── model.pte (1.2GB)
│   │   │   ├── tokenizer.bin (500KB)
│   │   │   └── metadata.json
│   │   ├── qwen-2.5-1.5b/
│   │   │   ├── model.pte (1.5GB)
│   │   │   ├── tokenizer.bin (500KB)
│   │   │   └── metadata.json
│   │   └── llama-3.2-3b/
│   │       ├── model.pte (3.0GB)
│   │       ├── tokenizer.bin (500KB)
│   │       └── metadata.json
│   └── cache/
│       ├── temp_downloads/
│       └── thumbnails/
```

### Implementation:
```typescript
// utils/ModelFileManager.ts

import * as FileSystem from 'expo-file-system';
import RNFS from 'react-native-fs';

export interface DownloadedModelInfo {
  modelId: string;
  name: string;
  path: string;
  size: number;
  downloadDate: Date;
  lastUsed?: Date;
  isActive: boolean;
}

export class ModelFileManager {
  
  // Get base directory for models (executorch storage)
  static getModelsDirectory(): string {
    // react-native-executorch stores models in app's cache directory
    return RNFS.CachesDirectoryPath + '/executorch/models';
  }

  // List all downloaded models
  static async getDownloadedModels(): Promise<DownloadedModelInfo[]> {
    const modelsDir = this.getModelsDirectory();
    
    try {
      const exists = await RNFS.exists(modelsDir);
      if (!exists) {
        return [];
      }
      
      const files = await RNFS.readDir(modelsDir);
      const downloadedModels: DownloadedModelInfo[] = [];
      
      for (const file of files) {
        if (file.isDirectory()) {
          const modelInfo = await this.getModelInfo(file.path);
          if (modelInfo) {
            downloadedModels.push(modelInfo);
          }
        }
      }
      
      return downloadedModels;
    } catch (error) {
      console.error('Error getting downloaded models:', error);
      return [];
    }
  }

  // Get info for a specific model
  static async getModelInfo(modelPath: string): Promise<DownloadedModelInfo | null> {
    try {
      const files = await RNFS.readDir(modelPath);
      const modelId = modelPath.split('/').pop() || '';
      
      let totalSize = 0;
      for (const file of files) {
        totalSize += file.size;
      }
      
      // Try to read metadata if exists
      const metadataPath = modelPath + '/metadata.json';
      let metadata: any = {};
      if (await RNFS.exists(metadataPath)) {
        const metadataContent = await RNFS.readFile(metadataPath);
        metadata = JSON.parse(metadataContent);
      }
      
      return {
        modelId,
        name: metadata.name || modelId,
        path: modelPath,
        size: totalSize,
        downloadDate: metadata.downloadDate ? new Date(metadata.downloadDate) : new Date(),
        lastUsed: metadata.lastUsed ? new Date(metadata.lastUsed) : undefined,
        isActive: metadata.isActive || false,
      };
    } catch (error) {
      console.error('Error getting model info:', error);
      return null;
    }
  }

  // Delete a specific model
  static async deleteModel(modelId: string): Promise<boolean> {
    try {
      const modelPath = this.getModelsDirectory() + '/' + modelId;
      const exists = await RNFS.exists(modelPath);
      
      if (!exists) {
        console.log('Model does not exist:', modelId);
        return true;
      }
      
      await RNFS.unlink(modelPath);
      console.log('Model deleted successfully:', modelId);
      return true;
    } catch (error) {
      console.error('Error deleting model:', error);
      return false;
    }
  }

  // Delete all models
  static async deleteAllModels(): Promise<boolean> {
    try {
      const modelsDir = this.getModelsDirectory();
      const exists = await RNFS.exists(modelsDir);
      
      if (!exists) {
        return true;
      }
      
      await RNFS.unlink(modelsDir);
      console.log('All models deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting all models:', error);
      return false;
    }
  }

  // Get total storage used by models
  static async getModelStorageSize(): Promise<number> {
    try {
      const modelsDir = this.getModelsDirectory();
      const exists = await RNFS.exists(modelsDir);
      
      if (!exists) {
        return 0;
      }
      
      const files = await RNFS.readDir(modelsDir);
      let totalSize = 0;
      
      for (const file of files) {
        if (file.isDirectory()) {
          const dirSize = await this.getDirectorySize(file.path);
          totalSize += dirSize;
        } else {
          totalSize += file.size;
        }
      }
      
      return totalSize;
    } catch (error) {
      console.error('Error calculating model storage:', error);
      return 0;
    }
  }

  // Get directory size recursively
  static async getDirectorySize(dirPath: string): Promise<number> {
    try {
      const files = await RNFS.readDir(dirPath);
      let size = 0;
      
      for (const file of files) {
        if (file.isDirectory()) {
          size += await this.getDirectorySize(file.path);
        } else {
          size += file.size;
        }
      }
      
      return size;
    } catch (error) {
      console.error('Error calculating directory size:', error);
      return 0;
    }
  }

  // Clear model cache
  static async clearCache(): Promise<boolean> {
    try {
      const cacheDir = RNFS.CachesDirectoryPath + '/executorch/cache';
      const exists = await RNFS.exists(cacheDir);
      
      if (!exists) {
        return true;
      }
      
      await RNFS.unlink(cacheDir);
      console.log('Cache cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  }

  // Update model metadata
  static async updateModelMetadata(
    modelId: string,
    updates: Partial<{ lastUsed: Date; isActive: boolean }>
  ): Promise<boolean> {
    try {
      const metadataPath = this.getModelsDirectory() + '/' + modelId + '/metadata.json';
      
      let metadata: any = {};
      if (await RNFS.exists(metadataPath)) {
        const content = await RNFS.readFile(metadataPath);
        metadata = JSON.parse(content);
      }
      
      const updatedMetadata = {
        ...metadata,
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      await RNFS.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
      return true;
    } catch (error) {
      console.error('Error updating metadata:', error);
      return false;
    }
  }

  // Format file size for display
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }
}
```

---

## 🎨 Feature 4: Model Card Component

### Visual Design:
```
Downloaded Model Card:
┌─────────────────────────────────┐
│ ┌─┐ Llama 3.2 3B              │
│ │✓│ Best for conversations      │
│ └─┘                             │
│                                 │
│ Status: In use                  │
│ Size: 3.0 GB                    │
│ Downloaded: Oct 1, 2025         │
│ Last used: Just now             │
│                                 │
│ [View Details] [Delete Model]   │
└─────────────────────────────────┘

Available Model Card:
┌─────────────────────────────────┐
│ ┌─┐ Qwen 2.5 0.5B              │
│ │⬇│ Fast and lightweight        │
│ └─┘                             │
│                                 │
│ Size: 500 MB                    │
│ Recommended for: Quick tasks    │
│                                 │
│ [Download Model]                │
└─────────────────────────────────┘
```

### Props:
```typescript
interface ModelCardProps {
  model: LocalModel;
  isDownloaded: boolean;
  isActive: boolean;
  size?: number;
  lastUsed?: Date;
  onDownload?: () => void;
  onDelete?: () => void;
  onSelect?: () => void;
}
```

---

## 📊 Feature 5: Storage Monitor Component

### Metrics to Display:

```typescript
interface StorageMetrics {
  // Device storage
  totalDeviceStorage: number;
  freeDeviceStorage: number;
  usedDeviceStorage: number;
  
  // App storage breakdown
  modelStorage: number;        // All downloaded models
  cacheStorage: number;         // Temporary files
  conversationStorage: number;  // Chat history, images
  
  // Per-model breakdown
  models: {
    [modelId: string]: {
      size: number;
      files: number;
      lastAccessed: Date;
    };
  };
  
  // Percentages
  percentUsed: number;
  percentModels: number;
  percentCache: number;
}
```

### Visual Components:
```
Storage Breakdown:
┌─────────────────────────────────┐
│ Total: 5.35 GB / 64 GB (8%)    │
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                 │
│ Models:        4.5 GB (84%)     │
│ Cache:         850 MB (16%)     │
│ Conversations: 50 MB (1%)       │
│                                 │
│ Recommendations:                │
│ • Delete unused models          │
│ • Clear cache regularly         │
└─────────────────────────────────┘
```

---

## 🗑️ Feature 6: Delete Operations

### Individual Model Delete:
```typescript
const deleteModel = async (modelId: string) => {
  Alert.alert(
    'Delete Model',
    `Are you sure you want to delete this model? This will free up ${modelSize} of storage.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          // Check if model is currently in use
          if (isCurrentModel(modelId)) {
            Alert.alert(
              'Model In Use',
              'This model is currently selected. Please switch to a different model first.',
              [{ text: 'OK' }]
            );
            return;
          }
          
          // Delete the model
          const success = await ModelFileManager.deleteModel(modelId);
          
          if (success) {
            // Show success
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast('Model deleted successfully');
            
            // Refresh model list
            refreshModels();
          } else {
            Alert.alert('Error', 'Failed to delete model');
          }
        },
      },
    ]
  );
};
```

### Bulk Delete (Clear All):
```typescript
const clearAllModels = async () => {
  const downloadedModels = await ModelFileManager.getDownloadedModels();
  const totalSize = downloadedModels.reduce((sum, m) => sum + m.size, 0);
  
  Alert.alert(
    'Clear All Models',
    `This will delete ${downloadedModels.length} models and free up ${formatSize(totalSize)} of storage. You can always re-download them later.`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All',
        style: 'destructive',
        onPress: async () => {
          // Switch to cloud mode if currently using local
          if (isLocal) {
            setIsLocal(false);
          }
          
          // Delete all models
          const success = await ModelFileManager.deleteAllModels();
          
          if (success) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showToast(`Freed ${formatSize(totalSize)} of storage`);
            refreshModels();
          }
        },
      },
    ]
  );
};
```

---

## 🔄 Feature 7: Cache Management

### Types of Cache:
1. **Download cache** - Partial downloads, temp files
2. **Tokenizer cache** - Tokenizer temporary data
3. **Model warmup cache** - Optimization files
4. **Conversation images** - Temporary image cache

### Cache Utilities:
```typescript
// utils/ModelCacheUtils.ts

export class ModelCacheUtils {
  
  // Clear all cache
  static async clearAllCache(): Promise<number> {
    const cacheDir = RNFS.CachesDirectoryPath + '/executorch';
    
    try {
      const sizeBefore = await this.getCacheSize();
      await RNFS.unlink(cacheDir + '/cache');
      return sizeBefore;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return 0;
    }
  }
  
  // Get cache size
  static async getCacheSize(): Promise<number> {
    const cacheDir = RNFS.CachesDirectoryPath + '/executorch/cache';
    
    try {
      const exists = await RNFS.exists(cacheDir);
      if (!exists) return 0;
      
      return await ModelFileManager.getDirectorySize(cacheDir);
    } catch (error) {
      return 0;
    }
  }
  
  // Clear old cache (> 7 days)
  static async clearOldCache(daysOld: number = 7): Promise<number> {
    // Implementation for age-based cache clearing
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    let freedSpace = 0;
    // Delete files older than cutoff date
    // ... implementation
    return freedSpace;
  }
}
```

---

## ⚙️ Feature 8: Settings Integration

### Add to Settings Screen:
```
Settings Menu:
┌─────────────────────────────────┐
│ Account                         │
│ • Profile                       │
│ • Change Password               │
│                                 │
│ AI Models                       │
│ • Default Cloud Model           │
│ • Default Local Model           │
│ • Manage Downloaded Models ← NEW│
│                                 │
│ Storage                         │
│ • Storage Usage            ← NEW│
│ • Clear Cache              ← NEW│
│ • Manage Model Files       ← NEW│
│                                 │
│ About                           │
└─────────────────────────────────┘
```

### Menu Items:

**1. Manage Downloaded Models**
```typescript
{
  title: 'Manage Downloaded Models',
  subtitle: '3 models • 4.5 GB',
  icon: 'cloud-download',
  onPress: () => router.push('/model-manager'),
}
```

**2. Storage Usage**
```typescript
{
  title: 'Storage Usage',
  subtitle: '5.35 GB used • 8% of device',
  icon: 'pie-chart',
  onPress: () => showStorageDetails(),
}
```

**3. Clear Cache**
```typescript
{
  title: 'Clear Cache',
  subtitle: '850 MB cache',
  icon: 'trash-outline',
  onPress: () => clearCacheWithConfirmation(),
}
```

---

## 🎯 Feature 9: Model Download Management

### Download Queue System:
```typescript
interface DownloadTask {
  modelId: string;
  modelName: string;
  totalSize: number;
  downloadedSize: number;
  progress: number;
  status: 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';
  startedAt?: Date;
  estimatedCompletion?: Date;
  error?: string;
}

class DownloadManager {
  private downloads: Map<string, DownloadTask> = new Map();
  
  // Add download to queue
  addDownload(modelId: string, modelName: string, size: number) {
    this.downloads.set(modelId, {
      modelId,
      modelName,
      totalSize: size,
      downloadedSize: 0,
      progress: 0,
      status: 'queued',
    });
  }
  
  // Pause download
  pauseDownload(modelId: string) {
    const task = this.downloads.get(modelId);
    if (task && task.status === 'downloading') {
      task.status = 'paused';
    }
  }
  
  // Resume download
  resumeDownload(modelId: string) {
    const task = this.downloads.get(modelId);
    if (task && task.status === 'paused') {
      task.status = 'downloading';
    }
  }
  
  // Cancel download
  cancelDownload(modelId: string) {
    this.downloads.delete(modelId);
    // Clean up partial files
    ModelFileManager.deleteModel(modelId);
  }
}
```

### Download UI:
```
Active Downloads:
┌─────────────────────────────────┐
│ Downloading Llama 3.2 3B        │
│ ████████████░░░░░░░░░░░░░░░░  │
│ 1.5 GB / 3.0 GB (50%)           │
│ 5 MB/s • 5 minutes remaining    │
│ [Pause] [Cancel]                │
└─────────────────────────────────┘
```

---

## 📱 Feature 10: Model Details Screen

### Individual Model View:
```
┌─────────────────────────────────┐
│ ← Llama 3.2 3B                  │
├─────────────────────────────────┤
│                                 │
│ ┌─────────────────────────────┐ │
│ │  Status: Downloaded ✓       │ │
│ │  Size: 3.0 GB               │ │
│ │  Downloaded: Oct 1, 2025    │ │
│ │  Last used: Just now        │ │
│ └─────────────────────────────┘ │
│                                 │
│ Model Information               │
│ • Name: Llama 3.2 3B           │
│ • Type: Local LLM              │
│ • Context: 8K tokens           │
│ • Description: Most capable... │
│                                 │
│ Storage Details                 │
│ • Model file: 2.8 GB           │
│ • Tokenizer: 200 MB            │
│ • Metadata: 2 MB               │
│ • Total: 3.0 GB                │
│                                 │
│ File Locations                  │
│ • Path: /cache/executorch/...  │
│ • Files: 3                     │
│                                 │
│ Actions                         │
│ [Set as Default]                │
│ [Verify Integrity]              │
│ [Delete Model]                  │
└─────────────────────────────────┘
```

---

## 🔐 Feature 11: Model Verification

### Integrity Check:
```typescript
interface VerificationResult {
  isValid: boolean;
  filesPresent: string[];
  filesMissing: string[];
  corruption: string[];
  totalSize: number;
  expectedSize: number;
}

const verifyModel = async (modelId: string): Promise<VerificationResult> => {
  const modelPath = ModelFileManager.getModelsDirectory() + '/' + modelId;
  
  // Check required files
  const requiredFiles = ['model.pte', 'tokenizer.bin'];
  const filesPresent: string[] = [];
  const filesMissing: string[] = [];
  
  for (const file of requiredFiles) {
    const filePath = modelPath + '/' + file;
    const exists = await RNFS.exists(filePath);
    
    if (exists) {
      filesPresent.push(file);
    } else {
      filesMissing.push(file);
    }
  }
  
  // Calculate actual size
  const totalSize = await ModelFileManager.getDirectorySize(modelPath);
  const model = getLocalModelById(modelId);
  const expectedSize = parseSize(model?.size || '0');
  
  return {
    isValid: filesMissing.length === 0 && totalSize > 0,
    filesPresent,
    filesMissing,
    corruption: [],
    totalSize,
    expectedSize,
  };
};
```

---

## 📈 Feature 12: Usage Analytics

### Track Model Usage:
```typescript
interface ModelUsageStats {
  modelId: string;
  totalMessages: number;
  totalTokens: number;
  averageResponseTime: number;
  lastUsed: Date;
  firstUsed: Date;
  errorRate: number;
}

class ModelAnalytics {
  // Track message sent with model
  static trackMessage(modelId: string, tokens: number, responseTime: number) {
    const stats = this.getStats(modelId);
    stats.totalMessages++;
    stats.totalTokens += tokens;
    stats.lastUsed = new Date();
    this.saveStats(modelId, stats);
  }
  
  // Get usage stats
  static getUsageStats(): ModelUsageStats[] {
    // Return stats for all models
    return LOCAL_MODELS.map(model => this.getStats(model.id));
  }
  
  // Get most used model
  static getMostUsedModel(): string {
    const stats = this.getUsageStats();
    return stats.sort((a, b) => b.totalMessages - a.totalMessages)[0]?.modelId;
  }
}
```

---

## 🎯 Feature 13: Smart Recommendations

### Auto-Suggest Model Deletion:
```typescript
interface DeletionRecommendation {
  modelId: string;
  reason: string;
  spaceSaved: number;
  priority: 'high' | 'medium' | 'low';
}

const getRecommendations = async (): Promise<DeletionRecommendation[]> => {
  const models = await ModelFileManager.getDownloadedModels();
  const recommendations: DeletionRecommendation[] = [];
  
  for (const model of models) {
    // Not used in 30 days
    if (model.lastUsed && daysSince(model.lastUsed) > 30) {
      recommendations.push({
        modelId: model.modelId,
        reason: 'Not used in 30 days',
        spaceSaved: model.size,
        priority: 'high',
      });
    }
    
    // Duplicate model (smaller alternative available)
    if (hasSmallerAlternative(model.modelId)) {
      recommendations.push({
        modelId: model.modelId,
        reason: 'Smaller alternative available',
        spaceSaved: model.size - getAlternativeSize(model.modelId),
        priority: 'medium',
      });
    }
  }
  
  return recommendations.sort((a, b) => b.spaceSaved - a.spaceSaved);
};
```

Display:
```
Recommendations:
┌─────────────────────────────────┐
│ 💡 Storage Recommendations      │
│                                 │
│ Delete "Llama 3.2 3B"           │
│ • Not used in 45 days           │
│ • Free up 3.0 GB                │
│ [Delete Now]                    │
│                                 │
│ Switch to "Qwen 2.5 1.5B"       │
│ • Similar performance           │
│ • Save 1.5 GB                   │
│ [Switch & Delete]               │
└─────────────────────────────────┘
```

---

## 🔔 Feature 14: Storage Notifications

### Alerts & Warnings:

**Low Storage Warning:**
```typescript
if (freeSpace < 1GB) {
  Alert.alert(
    'Low Storage Warning',
    `Only ${formatSize(freeSpace)} remaining on device. Consider deleting unused models or clearing cache.`,
    [
      { text: 'Later' },
      { text: 'Manage Storage', onPress: () => router.push('/model-manager') },
    ]
  );
}
```

**Download Failure (Insufficient Space):**
```typescript
if (requiredSpace > freeSpace) {
  Alert.alert(
    'Insufficient Storage',
    `This model requires ${formatSize(requiredSpace)} but only ${formatSize(freeSpace)} is available. Free up ${formatSize(requiredSpace - freeSpace)} to continue.`,
    [
      { text: 'Cancel' },
      { text: 'Free Up Space', onPress: () => showStorageManager() },
    ]
  );
}
```

**Automatic Cache Cleanup:**
```typescript
// Check cache size daily
const checkCacheSize = async () => {
  const cacheSize = await ModelCacheUtils.getCacheSize();
  
  if (cacheSize > 500MB) {
    // Auto-clear or suggest clearing
    const cleared = await ModelCacheUtils.clearOldCache(7);
    if (cleared > 0) {
      showToast(`Cleared ${formatSize(cleared)} of cache`);
    }
  }
};
```

---

## 📋 Feature 15: Export/Import Model Settings

### Export Model Configuration:
```typescript
interface ModelConfiguration {
  downloadedModels: string[];
  defaultCloudModel: string;
  defaultLocalModel: string;
  preferences: {
    autoCleanCache: boolean;
    warnLowStorage: boolean;
    maxCacheSize: number;
  };
}

const exportConfiguration = async (): Promise<string> => {
  const config: ModelConfiguration = {
    downloadedModels: await getDownloadedModelIds(),
    defaultCloudModel: storage.getString('default_model_id') || '',
    defaultLocalModel: storage.getString('default_local_model_id') || '',
    preferences: {
      autoCleanCache: storage.getBoolean('auto_clean_cache') || false,
      warnLowStorage: storage.getBoolean('warn_low_storage') ?? true,
      maxCacheSize: storage.getNumber('max_cache_size') || 500,
    },
  };
  
  return JSON.stringify(config, null, 2);
};
```

---

## 🎨 Implementation Phases

### Phase 1: Foundation (Week 1)
**Goal**: Basic file management infrastructure

Tasks:
1. Create ModelFileManager utility
2. Implement file size calculations
3. Add model listing functionality
4. Create storage monitoring
5. Add basic delete operations

**Deliverables:**
- ✓ ModelFileManager class
- ✓ Storage calculation utilities
- ✓ File system access methods
- ✓ Basic CRUD operations

**Time**: 8-10 hours

---

### Phase 2: UI Components (Week 2)
**Goal**: User-facing management interface

Tasks:
1. Create Model Manager screen
2. Build ModelCard component
3. Design StorageMonitor component
4. Add download progress tracking
5. Implement delete confirmations

**Deliverables:**
- ✓ Model Manager screen
- ✓ Visual components
- ✓ Interactive UI
- ✓ Progress indicators

**Time**: 10-12 hours

---

### Phase 3: Advanced Features (Week 3)
**Goal**: Smart management and optimization

Tasks:
1. Add cache management
2. Implement usage analytics
3. Create smart recommendations
4. Add verification tools
5. Build export/import

**Deliverables:**
- ✓ Cache utilities
- ✓ Analytics system
- ✓ Recommendation engine
- ✓ Model verification

**Time**: 8-10 hours

---

### Phase 4: Polish & Integration (Week 4)
**Goal**: Settings integration and final polish

Tasks:
1. Integrate into Settings
2. Add notifications
3. Implement auto-cleanup
4. Add help documentation
5. Testing and optimization

**Deliverables:**
- ✓ Settings menu items
- ✓ Alert system
- ✓ Auto-optimization
- ✓ Documentation

**Time**: 6-8 hours

---

## 📁 File Structure

### New Files to Create:
```
utils/
├── ModelFileManager.ts        (File operations)
├── ModelCacheUtils.ts         (Cache management)
├── ModelAnalytics.ts          (Usage tracking)
└── StorageUtils.ts            (Storage calculations)

components/
├── ModelCard.tsx              (Model display card)
├── StorageMonitor.tsx         (Storage visualization)
├── ModelVerification.tsx      (Integrity checker)
└── DownloadProgress.tsx       (Enhanced download UI)

app/
├── model-manager.tsx          (Main management screen)
├── model-details/
│   └── [id].tsx              (Individual model details)
└── storage-details.tsx        (Storage breakdown screen)

hooks/
├── useModelStorage.ts         (Storage state management)
├── useDownloadManager.ts      (Download queue)
└── useModelAnalytics.ts       (Usage stats)
```

---

## 🔧 API Surface

### ModelFileManager:
```typescript
// List operations
ModelFileManager.getDownloadedModels(): Promise<DownloadedModelInfo[]>
ModelFileManager.getModelInfo(path): Promise<DownloadedModelInfo | null>

// Delete operations
ModelFileManager.deleteModel(modelId): Promise<boolean>
ModelFileManager.deleteAllModels(): Promise<boolean>

// Storage operations
ModelFileManager.getModelStorageSize(): Promise<number>
ModelFileManager.getDirectorySize(path): Promise<number>

// Metadata operations
ModelFileManager.updateModelMetadata(modelId, updates): Promise<boolean>

// Utilities
ModelFileManager.formatFileSize(bytes): string
```

### ModelCacheUtils:
```typescript
ModelCacheUtils.clearAllCache(): Promise<number>
ModelCacheUtils.getCacheSize(): Promise<number>
ModelCacheUtils.clearOldCache(days): Promise<number>
```

### StorageMonitor:
```typescript
StorageMonitor.getStorageInfo(): Promise<StorageInfo>
StorageMonitor.getStorageBreakdown(): Promise<StorageBreakdown>
StorageMonitor.checkLowStorage(): boolean
```

---

## ⚡ Quick Wins (Can Implement First)

### 1. Basic Storage Display (2 hours)
Show total model storage in settings

### 2. Clear All Models (3 hours)
Add button to delete all downloaded models

### 3. Model List (4 hours)
Display all downloaded models with sizes

### 4. Individual Delete (2 hours)
Allow deleting one model at a time

### 5. Storage Monitor (3 hours)
Show device storage usage

**Total for Quick Wins**: 14 hours

---

## 📊 Success Metrics

### User Control:
- See exactly what's downloaded
- Delete models easily
- Free up storage on demand
- Understand storage usage

### Storage Optimization:
- 80% reduction in unnecessary storage
- Automatic cache cleanup
- Smart deletion recommendations
- Prevent storage issues

### User Experience:
- Clear visibility of models
- Easy management interface
- Proactive warnings
- Simple cleanup process

---

## 🚀 Implementation Priority

**High Priority** (Essential):
1. View downloaded models
2. Delete individual models
3. Storage usage display
4. Clear all models

**Medium Priority** (Very Useful):
5. Cache management
6. Model verification
7. Download queue
8. Usage analytics

**Low Priority** (Nice-to-Have):
9. Smart recommendations
10. Export/import config
11. Detailed file view
12. Advanced analytics

---

## 📝 Technical Considerations

### Permissions:
- File system access (already have)
- Storage info access (already have)
- No additional permissions needed ✅

### Performance:
- Cache file size calculations
- Lazy load model list
- Background storage monitoring
- Debounce storage updates

### Error Handling:
- File not found errors
- Permission errors
- Disk full errors
- Corruption detection

### Platform Differences:
- iOS: Uses app cache directory
- Android: Uses app cache directory
- Both: Similar file structure

---

## 🎯 Recommended Implementation Order

### Phase 1 (Week 1): Core Infrastructure
1. Create ModelFileManager utility (4h)
2. Add storage calculation methods (2h)
3. Implement basic model listing (2h)
4. Add delete operations (2h)

**Output**: Working file management backend

### Phase 2 (Week 2): UI
1. Create Model Manager screen (4h)
2. Build ModelCard component (2h)
3. Add StorageMonitor (3h)
4. Integrate into Settings (2h)

**Output**: Full management UI

### Phase 3 (Week 3): Advanced
1. Cache management (3h)
2. Usage tracking (3h)
3. Recommendations (2h)
4. Polish & testing (4h)

**Output**: Complete management system

---

## 💡 Quick Start Option

Want to implement **Quick Wins** first (14 hours)?

1. **Today**: Storage monitor + Model list (4-5h)
2. **Tomorrow**: Delete operations + UI (4-5h)
3. **Day 3**: Settings integration + Polish (4-5h)

**Result**: Users can see, understand, and manage their local models!

---

## 🎨 Mockup: Complete Model Manager

```
┌─────────────────────────────────┐
│ ← Local Model Manager           │
├─────────────────────────────────┤
│ 📊 Storage: 4.5 GB / 64 GB (7%)│
│ ████░░░░░░░░░░░░░░░░░░░░░░░░░ │
│                                 │
│ Downloaded (3)                  │
│                                 │
│ ✓ Llama 3.2 3B          [🗑️]  │
│   In use • 3.0 GB               │
│                                 │
│ ✓ Qwen 2.5 1.5B         [🗑️]  │
│   2 days ago • 1.5 GB           │
│                                 │
│ ✓ SmolLM2 135M          [🗑️]  │
│   Never used • 135 MB           │
│   💡 Consider deleting          │
│                                 │
│ Available (4)                   │
│                                 │
│ ⬇ Llama 3.2 1B         [⬇️]   │
│   1.2 GB • Recommended          │
│                                 │
│ Actions                         │
│ [Clear Cache (850 MB)]          │
│ [Delete All Models]             │
│ [Storage Settings]              │
└─────────────────────────────────┘
```

---

## 🎉 Expected Outcomes

After implementation, users will be able to:
- ✅ See all downloaded models at a glance
- ✅ Understand storage usage clearly
- ✅ Delete models with one tap
- ✅ Free up storage easily
- ✅ Get smart recommendations
- ✅ Monitor downloads
- ✅ Verify model integrity
- ✅ Manage cache automatically

---

## 📊 Estimated Total Effort

**Complete Implementation:**
- Phase 1: 10 hours
- Phase 2: 11 hours  
- Phase 3: 12 hours
- Phase 4: 8 hours
**Total**: ~40 hours (1 month part-time)

**Quick Wins Only:**
- Essential features only
**Total**: ~14 hours (1 week)

---

## 💡 Recommendation

**Start with Quick Wins**:
1. Storage monitor
2. Model list
3. Delete operations
4. Settings integration

Then expand based on user feedback!

---

**Want to implement the Quick Wins version first?** 🚀

I can start with the core model management features right now:
1. Storage monitoring
2. Downloaded model list
3. Delete functionality
4. Settings integration

Or would you prefer to:
- See more detailed specs for a specific feature?
- Start with full implementation?
- Focus on a different area?

Let me know! 📱✨

