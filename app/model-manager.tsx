/**
 * Model Manager Screen
 * Manage downloaded local models and storage
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { GradientBackground } from '@/components/GradientBackground';
import { StorageMonitor } from '@/components/StorageMonitor';
import { ModelCard } from '@/components/ModelCard';
import { ModelFileManager, DownloadedModelInfo } from '@/utils/ModelFileManager';
import { DownloadedModelsTracker } from '@/utils/DownloadedModelsTracker';
import { LOCAL_MODELS, getLocalModelById } from '@/constants/LocalModels';
import { useDefaultLocalModel } from '@/hooks/useDefaultLocalModel';
import * as ChatHooks from '@/hooks/useChat';
import { storage } from '@/hooks/useMMKVStorage';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { ModelEvent } from '@/types/mixpanel';
import { CrashReporter } from '@/utils/CrashReporter';

const useChat = ChatHooks.useChat;

export default function ModelManagerScreen() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const currentLocalModel = useDefaultLocalModel();
  const { 
    isLocal, 
    setIsLocal, 
    localModelDownloadProgress,
    isLocalModelReady 
  } = useChat();
  
  const [downloadedModels, setDownloadedModels] = useState<DownloadedModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    // Track model manager opened
    mixpanelService.trackModel(ModelEvent.MODEL_MANAGER_OPENED);
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      // Get tracked downloaded models
      const downloadedInfo = DownloadedModelsTracker.getDownloadedModels();
      
      // Convert to DownloadedModelInfo format
      const models: DownloadedModelInfo[] = downloadedInfo.map(info => {
        const model = getLocalModelById(info.modelId);
        const sizeInBytes = ModelFileManager.parseSizeString(info.size);
        
        return {
          modelId: info.modelId,
          name: model?.name || info.modelId,
          displayName: model?.displayName || info.modelId,
          path: '', // Not needed for display
          size: sizeInBytes,
          downloadDate: info.downloadedAt ? new Date(info.downloadedAt) : undefined,
          lastUsed: info.lastUsed ? new Date(info.lastUsed) : undefined,
          isActive: currentLocalModel.id === info.modelId,
          fileCount: 1, // Simplified
        };
      });
      
      setDownloadedModels(models);
    } catch (error) {
      // console.error('[ModelManager] Error loading models:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadModels();
  };

  const handleDeleteModel = async (modelId: string) => {
    try {
      // Can't delete if it's the active model
      if (modelId === currentLocalModel.id && isLocal) {
        Alert.alert(
          'Model In Use',
          'This model is currently active. Please switch to cloud mode or select a different local model first.',
          [{ text: 'OK' }]
        );
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Note: With react-native-executorch, we can't delete individual models easily
      // For now, show explanation
      Alert.alert(
        'Delete Model',
        'To delete individual models, you need to clear all downloaded models. This is a limitation of the current model loading system.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All Models',
            style: 'destructive',
            onPress: () => {
              // Track deletion attempt
              const model = getLocalModelById(modelId);
              mixpanelService.trackModel(ModelEvent.LOCAL_MODEL_DELETED, {
                model_id: modelId,
                model_name: model?.displayName || modelId,
                model_type: 'local',
              });
              handleClearAllModels();
            },
          },
        ]
      );
    } catch (error) {
      // console.error('[ModelManager] Error deleting model:', error);
      Alert.alert('Error', 'Failed to delete model');
    }
  };

  const handleClearAllModels = () => {
    const totalSize = downloadedModels.reduce((sum, m) => sum + m.size, 0);
    const modelCount = downloadedModels.length;
    
    Alert.alert(
      'Clear All Models',
      `This will delete ${modelCount} model${modelCount !== 1 ? 's' : ''} and free up ${ModelFileManager.formatFileSize(totalSize)}.\n\nModels will need to be re-downloaded when used again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Switch to cloud mode if currently using local
              if (isLocal) {
                setIsLocal(false);
                Alert.alert(
                  'Switched to Cloud Mode',
                  'Switched to cloud mode before clearing models.',
                  [{ text: 'OK' }]
                );
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              
              const success = await ModelFileManager.deleteAllModels();
              
              // Clear the tracker regardless of file deletion success
              DownloadedModelsTracker.clearAll();
              
              if (success) {
                Alert.alert(
                  'Success',
                  `Freed ${ModelFileManager.formatFileSize(totalSize)} of storage. Models cleared successfully.`,
                  [{ text: 'OK' }]
                );
                loadModels();
              } else {
                Alert.alert('Error', 'Failed to clear model files, but tracking reset');
                loadModels();
              }
            } catch (error) {
              // console.error('[ModelManager] Error clearing models:', error);
              Alert.alert('Error', 'An error occurred while clearing models');
            }
          },
        },
      ]
    );
  };

  const handleClearCache = async () => {
    try {
      const cacheSize = await ModelFileManager.getCacheSize();
      
      if (cacheSize === 0) {
        Alert.alert('Cache Empty', 'No cache to clear', [{ text: 'OK' }]);
        return;
      }

      Alert.alert(
        'Clear Cache',
        `This will free up ${ModelFileManager.formatFileSize(cacheSize)} of temporary files.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear',
            onPress: async () => {
              const freed = await ModelFileManager.clearCache();
              if (freed > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  'Cache Cleared',
                  `Freed ${ModelFileManager.formatFileSize(freed)}`,
                  [{ text: 'OK' }]
                );
                loadModels();
              }
            },
          },
        ]
      );
    } catch (error) {
      // console.error('[ModelManager] Error clearing cache:', error);
    }
  };

  const handleSelectModel = (modelId: string) => {
    // Update default local model
    storage.set('default_local_model_id', modelId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    loadModels(); // Refresh to show updated active state
  };

  const handleDownloadModel = async (modelId: string, modelName: string, modelSize: string) => {
    const model = getLocalModelById(modelId);
    if (!model) return;

    // Check if local models are temporarily disabled due to crashes
    if (CrashReporter.isLocalModelsDisabled()) {
      Alert.alert(
        'Local Models Temporarily Disabled',
        'Local models were disabled due to recent crashes. Please try again later or use cloud models.',
        [
          { text: 'OK' },
          { text: 'Enable Anyway', onPress: () => {
            CrashReporter.reenableLocalModels();
            // Retry download
            handleDownloadModel(modelId, modelName, modelSize);
          }}
        ]
      );
      return;
    }

    // Check available storage first
    try {
      const deviceStorage = await ModelFileManager.getDeviceStorageInfo();
      const requiredBytes = ModelFileManager.parseSizeString(modelSize);
      const requiredWithBuffer = requiredBytes * 1.2; // 20% buffer
      
      if (deviceStorage.freeSpace < requiredWithBuffer) {
        const freeSpaceFormatted = ModelFileManager.formatFileSize(deviceStorage.freeSpace);
        const requiredFormatted = ModelFileManager.formatFileSize(requiredWithBuffer);
        
        Alert.alert(
          '⚠️ Insufficient Storage',
          `Not enough space to download ${modelName}.\n\n` +
          `Required: ${requiredFormatted} (with 20% buffer)\n` +
          `Available: ${freeSpaceFormatted}\n\n` +
          `Please free up approximately ${ModelFileManager.formatFileSize(requiredWithBuffer - deviceStorage.freeSpace)} to continue.\n\n` +
          `Tip: You can delete unused models from this screen to free up space.`,
          [{ text: 'OK' }]
        );
        return;
      }
    } catch (error) {
      console.error('[ModelManager] Error checking storage:', error);
      // Continue with download if storage check fails
    }

    // Calculate estimated download time
    const sizeMatch = modelSize.match(/(\d+\.?\d*)\s*(MB|GB)/i);
    const sizeValue = sizeMatch ? parseFloat(sizeMatch[1]) : 1000;
    const sizeUnit = sizeMatch ? sizeMatch[2].toUpperCase() : 'MB';
    const sizeInMB = sizeUnit === 'GB' ? sizeValue * 1024 : sizeValue;
    const estimatedMinutes = Math.ceil(sizeInMB / 10);
    const downloadTimeText = estimatedMinutes < 2 
      ? '1-2 minutes' 
      : estimatedMinutes < 5 
      ? '2-5 minutes'
      : `${estimatedMinutes} minutes`;

    Alert.alert(
      '📥 Download Local Model?',
      `${modelName}\n${model.description}\n\n` +
      `📦 File Size: ${modelSize}\n` +
      `⏱️ Estimated Time: ${downloadTimeText}\n` +
      `📡 Network Usage: ${modelSize} of data\n` +
      `📱 Storage Required: ${modelSize} free space\n\n` +
      `✅ Benefits:\n` +
      `• 100% offline AI\n` +
      `• Complete privacy\n` +
      `• No API costs\n` +
      `• Fast responses\n\n` +
      `⚠️ Limitations:\n` +
      `• No web search\n` +
      `• No image generation\n` +
      `• No file attachments\n\n` +
      `💡 We recommend downloading over Wi-Fi to avoid using mobile data.`,
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Download',
          onPress: async () => {
            // Set as default local model
            storage.set('default_local_model_id', modelId);
            
            // Provide haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            
            // Small delay to ensure storage is written
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Switch to local mode to trigger download (async to avoid blocking)
            setIsLocal(true);
            
            // Small delay before navigation to let state propagate
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Navigate back to chat to show download progress
            router.back();
          },
        },
      ]
    );
  };

  // Separate downloaded and available models
  const downloadedModelIds = new Set(downloadedModels.map(m => m.modelId));
  const availableModels = LOCAL_MODELS.filter(m => !downloadedModelIds.has(m.id));

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Local Model Manager',
          headerTitleAlign: 'center',
          headerShown: false,
        }} 
      />
      
      {/* Custom Header */}
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.customHeader}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons 
              name="arrow-back" 
              size={24} 
              color={theme.colors.text} 
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Local Model Manager</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
          />
        }
      >
        {/* Storage Monitor */}
        <StorageMonitor />

        {/* Downloaded Models Section */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading models...</Text>
          </View>
        ) : (
          <>
            {downloadedModels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Downloaded Models ({downloadedModels.length})
                </Text>
                {downloadedModels.map((downloadInfo) => {
                  const model = LOCAL_MODELS.find(m => m.id === downloadInfo.modelId);
                  if (!model) return null;
                  
                  // Check if this model is currently downloading
                  const isDownloading = isLocal && 
                    currentLocalModel.id === model.id && 
                    localModelDownloadProgress < 1 &&
                    localModelDownloadProgress > 0;
                  
                  return (
                    <ModelCard
                      key={model.id}
                      model={model}
                      downloadInfo={downloadInfo}
                      isActive={downloadInfo.isActive}
                      isDownloading={isDownloading}
                      downloadProgress={isDownloading ? localModelDownloadProgress : 0}
                      onDelete={() => handleDeleteModel(model.id)}
                      onSelect={() => handleSelectModel(model.id)}
                    />
                  );
                })}
              </View>
            )}

            {/* Available Models Section */}
            {availableModels.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Available to Download ({availableModels.length})
                </Text>
                <View style={styles.infoCard}>
                  <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
                  <Text style={styles.infoText}>
                    Models will download automatically when you select them and switch to local mode.
                  </Text>
                </View>
                {availableModels.map((model) => {
                  // Check if this model is currently downloading (selected but not in downloaded list yet)
                  const isDownloading = isLocal && 
                    currentLocalModel.id === model.id && 
                    localModelDownloadProgress < 1 &&
                    localModelDownloadProgress > 0;
                  
                  return (
                    <ModelCard
                      key={model.id}
                      model={model}
                      isActive={false}
                      isDownloading={isDownloading}
                      downloadProgress={isDownloading ? localModelDownloadProgress : 0}
                      onSelect={() => handleSelectModel(model.id)}
                      onDownload={() => handleDownloadModel(model.id, model.displayName, model.size)}
                    />
                  );
                })}
              </View>
            )}

            {/* No models */}
            {downloadedModels.length === 0 && availableModels.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="cloud-download-outline" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyStateTitle}>No Models Found</Text>
                <Text style={styles.emptyStateText}>
                  Models will appear here once downloaded
                </Text>
              </View>
            )}
          </>
        )}

        {/* Actions Section */}
        {downloadedModels.length > 0 && (
          <View style={styles.actionsSection}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearCache}
            >
              <Ionicons name="trash-outline" size={20} color={theme.colors.text} />
              <Text style={styles.actionButtonText}>Clear Cache</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.dangerButton]}
              onPress={handleClearAllModels}
            >
              <Ionicons name="warning-outline" size={20} color={theme.colors.destructive} />
              <Text style={[styles.actionButtonText, styles.dangerButtonText]}>
                Clear All Models
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Help Section */}
        <View style={styles.helpSection}>
          <Text style={styles.helpTitle}>💡 Tips</Text>
          <Text style={styles.helpText}>
            • Models are cached on your device for offline use
          </Text>
          <Text style={styles.helpText}>
            • Larger models provide better quality but use more storage
          </Text>
          <Text style={styles.helpText}>
            • Delete unused models to free up space
          </Text>
          <Text style={styles.helpText}>
            • Models can be re-downloaded anytime
          </Text>
        </View>
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    backgroundColor: theme.colors.background,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.background,
  },
  backButton: {
    padding: 8,
    width: 40,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 12,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: `${theme.colors.primary}10`,
    padding: 12,
    borderRadius: 8,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  actionsSection: {
    gap: 12,
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  dangerButton: {
    backgroundColor: `${theme.colors.destructive}10`,
    borderColor: theme.colors.destructive,
  },
  dangerButtonText: {
    color: theme.colors.destructive,
  },
  helpSection: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 12,
  },
  helpText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
});

