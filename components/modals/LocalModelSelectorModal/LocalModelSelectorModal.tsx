import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { getSupportedLocalModels, LocalModel } from '@/constants/LocalModels';
import { isLocalLLMSupported } from '@/utils/DeviceCapabilities';

interface LocalModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

const LocalModelSelectorModal: React.FC<LocalModelSelectorModalProps> = ({
  visible,
  onClose,
  selectedModelId,
  onSelectModel,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const isSupported = isLocalLLMSupported();
  const supportedModels = getSupportedLocalModels();

  const handleSelectModel = (modelId: string) => {
    onSelectModel(modelId);
    onClose();
  };

  const renderModelItem = (model: LocalModel) => {
    const isSelected = model.id === selectedModelId;

    return (
      <TouchableOpacity
        key={model.id}
        style={[styles.modelItem, isSelected && styles.modelItemSelected]}
        onPress={() => handleSelectModel(model.id)}
        activeOpacity={0.7}
      >
        <View style={styles.modelItemContent}>
          <View style={styles.modelHeader}>
            <View style={styles.modelTitleRow}>
              <Text style={styles.modelName}>{model.displayName}</Text>
              {model.recommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>Recommended</Text>
                </View>
              )}
              {model.requiresHighEnd && (
                <Ionicons
                  name="flash"
                  size={16}
                  color={theme.colors.primary}
                  style={styles.highEndIcon}
                />
              )}
            </View>
            <Text style={styles.modelSize}>{model.size}</Text>
          </View>
          <Text style={styles.modelDescription}>{model.description}</Text>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark-circle"
            size={24}
            color={theme.colors.primary}
          />
        )}
      </TouchableOpacity>
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
            <Text style={styles.modalTitle}>Select Local AI Model</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

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
          ) : (
            <>
              <View style={styles.infoContainer}>
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text style={styles.infoText}>
                  {supportedModels.length} model
                  {supportedModels.length !== 1 ? 's' : ''} supported on your
                  device
                </Text>
              </View>

              <ScrollView
                style={styles.modelList}
                showsVerticalScrollIndicator={false}
              >
                {supportedModels.map(renderModelItem)}
              </ScrollView>

              <View style={styles.footer}>
                <Text style={styles.footerText}>
                  💡 Local models run on your device and work offline
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
    modelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
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
    modelItemContent: {
      flex: 1,
      marginRight: 12,
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
      marginTop: 2,
    },
    modelDescription: {
      fontSize: 14,
      color: theme.colors.greyLight,
      lineHeight: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.colors.greyLight,
      marginTop: 8,
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

export default LocalModelSelectorModal;

