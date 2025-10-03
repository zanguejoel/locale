/**
 * Header Model Selector Component
 * Quick model switching from chat header
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';
import { models, Model } from '@/constants/Models';
import { LOCAL_MODELS, LocalModel } from '@/constants/LocalModels';
import { DownloadedModelsTracker } from '@/utils/DownloadedModelsTracker';

interface HeaderModelSelectorProps {
  isLocal: boolean;
  currentModelId?: string;
  onSelectModel: (modelId: string) => void;
  isLocalSupported: boolean;
}

export const HeaderModelSelector: React.FC<HeaderModelSelectorProps> = ({
  isLocal,
  currentModelId,
  onSelectModel,
  isLocalSupported,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [modalVisible, setModalVisible] = useState(false);
  const [downloadedModelIds, setDownloadedModelIds] = useState<Set<string>>(new Set());
  const [loadingModels, setLoadingModels] = useState(false);

  // Load downloaded models when modal opens and in local mode
  useEffect(() => {
    if (modalVisible && isLocal) {
      loadDownloadedModels();
    }
  }, [modalVisible, isLocal]);

  const loadDownloadedModels = async () => {
    try {
      setLoadingModels(true);
      // Get downloaded model IDs from tracker
      const downloadedIds = DownloadedModelsTracker.getDownloadedModelIds();
      setDownloadedModelIds(new Set(downloadedIds));
      console.log('[HeaderModelSelector] Downloaded models:', downloadedIds);
    } catch (error) {
      console.error('[HeaderModelSelector] Error loading downloaded models:', error);
    } finally {
      setLoadingModels(false);
    }
  };

  // Get current model
  const currentModel = isLocal
    ? LOCAL_MODELS.find((m: LocalModel) => m.id === currentModelId)
    : models.find((m: Model) => m.id === currentModelId);

  const displayName = currentModel?.displayName || (isLocal ? 'Local Model' : 'Cloud Model');
  const shortName = displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName;

  // Filter local models to only show downloaded ones
  const availableLocalModels = isLocal 
    ? LOCAL_MODELS.filter(m => downloadedModelIds.has(m.id))
    : LOCAL_MODELS;

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    setModalVisible(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Ionicons 
          name={isLocal ? 'phone-portrait' : 'cloud'} 
          size={14} 
          color={theme.colors.primary} 
        />
        <Text style={styles.triggerText} numberOfLines={1}>
          {shortName}
        </Text>
        <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Model Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons 
                  name={isLocal ? 'phone-portrait' : 'cloud'} 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.modalTitle}>
                  {isLocal ? 'Local Models' : 'Cloud Models'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Models Section - Shows only current mode */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.section}>
              {isLocal ? (
                <>
                  {/* Local Models - Only Downloaded */}
                  {!isLocalSupported && (
                    <View style={styles.warningBanner}>
                      <Ionicons name="information-circle" size={18} color={theme.colors.destructive} />
                      <Text style={styles.warningText}>
                        Local models not supported on this device
                      </Text>
                    </View>
                  )}
                  
                  {loadingModels && (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text style={styles.loadingText}>Loading models...</Text>
                    </View>
                  )}

                  {!loadingModels && availableLocalModels.length === 0 && isLocalSupported && (
                    <View style={styles.emptyState}>
                      <Ionicons name="cloud-download-outline" size={32} color={theme.colors.textSecondary} />
                      <Text style={styles.emptyStateText}>No models downloaded</Text>
                      <Text style={styles.emptyStateSubtext}>
                        Download models from Settings → Manage Downloaded Models
                      </Text>
                    </View>
                  )}

                  {!loadingModels && availableLocalModels.map((model: LocalModel) => (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelItem,
                        currentModelId === model.id && styles.modelItemActive,
                        !isLocalSupported && styles.modelItemDisabled,
                      ]}
                      onPress={() => isLocalSupported && handleSelectModel(model.id)}
                      disabled={!isLocalSupported}
                    >
                      <View style={styles.modelInfo}>
                        <Text 
                          style={[
                            styles.modelName,
                            !isLocalSupported && styles.modelNameDisabled,
                          ]}
                        >
                          {model.displayName}
                        </Text>
                        {model.description && (
                          <Text style={styles.modelDescription}>{model.description}</Text>
                        )}
                        <Text style={styles.modelSize}>{model.size}</Text>
                      </View>
                      {currentModelId === model.id && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              ) : (
                <>
                  {/* Cloud Models */}
                  {models.map((model: Model) => (
                    <TouchableOpacity
                      key={model.id}
                      style={[
                        styles.modelItem,
                        currentModelId === model.id && styles.modelItemActive,
                      ]}
                      onPress={() => handleSelectModel(model.id)}
                    >
                      <View style={styles.modelInfo}>
                        <Text style={styles.modelName}>{model.displayName}</Text>
                        {model.description && (
                          <Text style={styles.modelDescription}>{model.description}</Text>
                        )}
                      </View>
                      {currentModelId === model.id && (
                        <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    maxWidth: 150,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  scrollView: {
    maxHeight: 500, // Limit height to allow scrolling
  },
  section: {
    padding: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: `${theme.colors.destructive}15`,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.destructive,
    fontWeight: '500',
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.colors.background,
  },
  modelItemActive: {
    backgroundColor: `${theme.colors.primary}15`,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  modelItemDisabled: {
    opacity: 0.5,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  modelNameDisabled: {
    color: theme.colors.textSecondary,
  },
  modelDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  modelSize: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyStateText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default HeaderModelSelector;

