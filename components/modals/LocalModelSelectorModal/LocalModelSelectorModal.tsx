import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { getSupportedLocalModels, LocalModel } from '@/constants/LocalModels';
import { isLocalLLMSupported } from '@/utils/DeviceCapabilities';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { ModelEvent } from '@/types/mixpanel';
import LocalModelErrorBoundary from '@/components/LocalModelErrorBoundary';

interface LocalModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  onFallbackToCloud?: () => void;
  isLocalModelReady?: boolean;
  localModelDownloadProgress?: number;
}

const LocalModelSelectorModalInner: React.FC<LocalModelSelectorModalProps> = ({
  visible,
  onClose,
  selectedModelId,
  onSelectModel,
  isLocalModelReady = false,
  localModelDownloadProgress = 0,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const isSupported = isLocalLLMSupported();
  const supportedModels = getSupportedLocalModels();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!searchQuery.trim()) return supportedModels;
    const query = searchQuery.toLowerCase();
    return supportedModels.filter(
      model =>
        model.displayName.toLowerCase().includes(query) ||
        model.description.toLowerCase().includes(query) ||
        model.size.toLowerCase().includes(query)
    );
  }, [searchQuery, supportedModels]);

  const handleSelectModel = async (model: LocalModel) => {
    // Track model selection
    await mixpanelService.trackModel(ModelEvent.MODEL_SELECTED, {
      model_id: model.id,
      model_name: model.displayName,
      model_type: 'local',
      model_size_mb: parseFloat(model.size.replace(/[^0-9.]/g, '')),
      previous_model_id: selectedModelId !== model.id ? selectedModelId : undefined,
    });
    
    // Show confirmation if changing from a downloaded model
    if (selectedModelId !== model.id && isLocalModelReady) {
      Alert.alert(
        'Change Local Model',
        `Switching to ${model.displayName} (${model.size}) will require downloading the new model. The current model will remain on your device.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: () => {
              onSelectModel(model.id);
              onClose();
            },
          },
        ]
      );
    } else {
      onSelectModel(model.id);
      onClose();
    }
  };

  const renderModelItem = (model: LocalModel) => {
    const isSelected = model.id === selectedModelId;
    const isCurrentlyDownloaded = isSelected && isLocalModelReady;
    const isDownloading = isSelected && localModelDownloadProgress > 0 && localModelDownloadProgress < 1;

    return (
      <Pressable
        key={model.id}
        style={({ pressed }) => [
          styles.modelItem,
          isSelected && styles.modelItemSelected,
          pressed && styles.modelItemPressed,
        ]}
        onPress={() => handleSelectModel(model)}
      >
        <View style={styles.modelItemContent}>
          <View style={styles.radioContainer}>
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
          
          <View style={styles.modelInfo}>
            <View style={styles.modelHeader}>
              <View style={styles.modelTitleRow}>
                <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
                  {model.displayName}
                </Text>
                {model.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMMENDED</Text>
                  </View>
                )}
              </View>
              <View style={styles.modelSizeRow}>
                <Ionicons name="download-outline" size={14} color={theme.colors.greyLight} />
                <Text style={styles.modelSize}>{model.size}</Text>
              </View>
            </View>
            
            <Text style={styles.modelDescription}>{model.description}</Text>
            
            {/* Status indicators */}
            {isCurrentlyDownloaded && (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
                <Text style={styles.statusText}>Downloaded</Text>
              </View>
            )}
            {isDownloading && (
              <View style={styles.statusRow}>
                <Ionicons name="cloud-download-outline" size={14} color={theme.colors.primary} />
                <Text style={styles.statusTextDownloading}>
                  Downloading {Math.round(localModelDownloadProgress * 100)}%
                </Text>
              </View>
            )}
            
            {/* Capability badges */}
            <View style={styles.capabilityRow}>
              {!model.requiresHighEnd && (
                <View style={styles.capabilityBadge}>
                  <Ionicons name="phone-portrait" size={12} color={theme.colors.greyLight} />
                  <Text style={styles.capabilityText}>Works on all devices</Text>
                </View>
              )}
              {model.requiresHighEnd && (
                <View style={styles.capabilityBadge}>
                  <Ionicons name="flash" size={12} color={theme.colors.primary} />
                  <Text style={styles.capabilityText}>Requires powerful device</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Local AI Models</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          {isSupported && supportedModels.length > 0 && (
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.greyLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search models..."
                placeholderTextColor={theme.colors.greyLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.colors.greyLight} />
                </TouchableOpacity>
              )}
            </View>
          )}

          {!isSupported ? (
            <View style={styles.unsupportedContainer}>
              <Ionicons
                name="information-circle-outline"
                size={48}
                color={theme.colors.greyLight}
                style={styles.unsupportedIcon}
              />
              <Text style={styles.unsupportedTitle}>
                Local Models Not Supported
              </Text>
              <Text style={styles.unsupportedText}>
                Your device does not meet the requirements for running local AI
                models. Please use cloud-based models instead.
              </Text>
            </View>
          ) : supportedModels.length === 0 ? (
            <View style={styles.unsupportedContainer}>
              <Ionicons
                name="sad-outline"
                size={48}
                color={theme.colors.greyLight}
                style={styles.unsupportedIcon}
              />
              <Text style={styles.unsupportedTitle}>No Models Available</Text>
              <Text style={styles.unsupportedText}>
                No local models are compatible with your device at this time.
              </Text>
            </View>
          ) : filteredModels.length === 0 ? (
            <View style={styles.unsupportedContainer}>
              <Ionicons
                name="search-outline"
                size={48}
                color={theme.colors.greyLight}
                style={styles.unsupportedIcon}
              />
              <Text style={styles.unsupportedTitle}>No Models Found</Text>
              <Text style={styles.unsupportedText}>
                No models match your search. Try a different query.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.infoContainer}>
                <Ionicons
                  name="cloud-download-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.infoText}>
                  {filteredModels.length} model{filteredModels.length !== 1 ? 's' : ''} • 
                  Run offline • No internet required
                </Text>
              </View>

              <ScrollView
                style={styles.modelList}
                showsVerticalScrollIndicator={false}
              >
                {filteredModels.map(renderModelItem)}
              </ScrollView>

              <View style={styles.footer}>
                <Ionicons name="shield-checkmark" size={16} color={theme.colors.greyLight} />
                <Text style={styles.footerText}>
                  Your data stays on device • Private & secure
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      paddingBottom: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.greyLight,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: theme.colors.text,
    },
    closeButton: {
      padding: 4,
    },
    infoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: theme.isDark
        ? 'rgba(100, 130, 255, 0.1)'
        : 'rgba(100, 130, 255, 0.05)',
      borderRadius: 12,
      gap: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    modelList: {
      padding: 16,
    },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text,
    padding: 0,
  },
  modelItem: {
    marginBottom: 12,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelItemSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.isDark
      ? 'rgba(100, 130, 255, 0.1)'
      : 'rgba(100, 130, 255, 0.05)',
  },
  modelItemPressed: {
    opacity: 0.7,
  },
  radioContainer: {
    paddingTop: 2,
    marginRight: 12,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.colors.greyLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: theme.colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  modelItemContent: {
    flexDirection: 'row',
    padding: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelHeader: {
    marginBottom: 6,
  },
  modelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modelNameSelected: {
    color: theme.colors.primary,
  },
  modelSizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
    recommendedBadge: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    recommendedText: {
      fontSize: 10,
      fontWeight: '600',
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    highEndIcon: {
      marginLeft: 4,
    },
  modelSize: {
    fontSize: 13,
    color: theme.colors.greyLight,
  },
  modelDescription: {
    fontSize: 14,
    color: theme.colors.greyLight,
    lineHeight: 20,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  statusTextDownloading: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  capabilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  capabilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
    borderRadius: 6,
  },
  capabilityText: {
    fontSize: 11,
    color: theme.colors.greyLight,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.greyLight,
    marginTop: 8,
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    color: theme.colors.greyLight,
    textAlign: 'center',
    lineHeight: 18,
  },
    unsupportedContainer: {
      padding: 40,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 300,
    },
    unsupportedIcon: {
      marginBottom: 16,
    },
    unsupportedTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    unsupportedText: {
      fontSize: 15,
      color: theme.colors.greyLight,
      textAlign: 'center',
      lineHeight: 22,
      maxWidth: 300,
    },
  });

// Wrapper component with error boundary
const LocalModelSelectorModal: React.FC<LocalModelSelectorModalProps> = (props) => {
  const handleFallbackToCloud = () => {
    // Switch back to cloud models when local model selector fails
    if (props.onFallbackToCloud) {
      props.onFallbackToCloud();
    }
    props.onClose();
  };
  
  return (
    <LocalModelErrorBoundary fallbackToCloud={handleFallbackToCloud}>
      <LocalModelSelectorModalInner {...props} />
    </LocalModelErrorBoundary>
  );
};

export default LocalModelSelectorModal;

