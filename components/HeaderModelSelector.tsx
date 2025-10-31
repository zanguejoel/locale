/**
 * Header Model Selector Component
 * Quick model switching from chat header
 * Cloud models only (local models removed)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Pressable, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';
import { models, Model } from '@/constants/Models';

interface HeaderModelSelectorProps {
  isLocal?: boolean; // Kept for backwards compatibility but ignored
  currentModelId?: string;
  onSelectModel: (modelId: string) => void;
  isLocalSupported?: boolean; // Kept for backwards compatibility but ignored
}

export const HeaderModelSelector: React.FC<HeaderModelSelectorProps> = ({
  currentModelId,
  onSelectModel,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [modalVisible, setModalVisible] = useState(false);

  // Get current model (cloud only)
  const currentModel = models.find((m: Model) => m.id === currentModelId);
  const displayName = currentModel?.displayName || 'Cloud Model';
  const shortName = displayName.length > 15 ? displayName.substring(0, 15) + '...' : displayName;

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
          name="cloud" 
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
                  name="cloud" 
                  size={20} 
                  color={theme.colors.primary} 
                />
                <Text style={styles.modalTitle}>
                  Cloud Models
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Cloud Models Section */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.section}>
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
    backgroundColor: theme.isDark ? theme.colors.background700 : theme.colors.background200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
    maxWidth: 150,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.isDark ? theme.colors.border : 'transparent',
    shadowColor: theme.isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 2,
    elevation: theme.isDark ? 3 : 1,
  },
  triggerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
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
    shadowColor: theme.isDark ? '#000000' : '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.isDark ? 0.5 : 0.3,
    shadowRadius: theme.isDark ? 12 : 8,
    elevation: theme.isDark ? 12 : 8,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.isDark ? theme.colors.border : 'transparent',
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
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: theme.isDark ? theme.colors.background600 : theme.colors.background,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.isDark ? theme.colors.border : 'transparent',
  },
  modelItemActive: {
    backgroundColor: theme.isDark ? `${theme.colors.primary}25` : `${theme.colors.primary}15`,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.isDark ? 0.3 : 0.1,
    shadowRadius: 2,
    elevation: theme.isDark ? 2 : 1,
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
  modelDescription: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
});

export default HeaderModelSelector;
