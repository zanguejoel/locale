import React, { useState } from 'react';
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
import { models, Model } from '@/constants/Models';
import Colors from '@/constants/Colors';

interface ModelSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
}

const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  visible,
  onClose,
  selectedModelId,
  onSelectModel,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [tempSelectedId, setTempSelectedId] = useState(selectedModelId);

  const handleConfirm = () => {
    onSelectModel(tempSelectedId);
    onClose();
  };

  const categoryLabels = {
    claude: 'Claude Models',
    gpt: 'OpenAI Models',
    gemini: 'Gemini Models',
    grok: 'Grok Models',
    opensource: 'Open Source Models',
  };

  const groupedModels = models.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = [];
    }
    acc[model.category].push(model);
    return acc;
  }, {} as Record<string, Model[]>);

  const renderCapabilityBadges = (model: Model) => {
    const badges = [];
    
    if (model.isNew) {
      badges.push(
        <View key="new" style={[styles.badge, styles.badgeNew]}>
          <Text style={styles.badgeText}>NEW</Text>
        </View>
      );
    }
    
    if (model.isFast) {
      badges.push(
        <View key="fast" style={[styles.badge, styles.badgeFast]}>
          <Text style={styles.badgeText}>FAST</Text>
        </View>
      );
    }
    
    if (model.capabilities.reasoning) {
      badges.push(
        <View key="reasoning" style={[styles.badge, styles.badgeReasoning]}>
          <Text style={styles.badgeText}>REASONING</Text>
        </View>
      );
    }

    return badges;
  };

  const renderModelItem = (model: Model) => {
    const isSelected = tempSelectedId === model.id;
    
    return (
      <Pressable
        key={model.id}
        style={({ pressed }) => [
          styles.modelItem,
          isSelected && styles.modelItemSelected,
          pressed && styles.modelItemPressed,
        ]}
        onPress={() => setTempSelectedId(model.id)}
      >
        <View style={styles.modelItemContent}>
          <View style={styles.radioContainer}>
            <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
              {isSelected && <View style={styles.radioInner} />}
            </View>
          </View>
          <View style={styles.modelInfo}>
            <View style={styles.modelHeader}>
              <Text style={[styles.modelName, isSelected && styles.modelNameSelected]}>
                {model.displayName}
              </Text>
              <View style={styles.badgeContainer}>
                {renderCapabilityBadges(model)}
              </View>
            </View>
            <Text style={styles.modelDescription} numberOfLines={2}>
              {model.description}
            </Text>
            <View style={styles.capabilityIcons}>
              {model.capabilities.vision && (
                <Ionicons name="eye-outline" size={16} color={theme.colors.greyLight} />
              )}
              {model.capabilities.search && (
                <Ionicons name="search-outline" size={16} color={theme.colors.greyLight} />
              )}
              {model.capabilities.pdf && (
                <Ionicons name="document-outline" size={16} color={theme.colors.greyLight} />
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
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Default Model</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {Object.entries(groupedModels).map(([category, categoryModels]) => (
              <View key={category} style={styles.categorySection}>
                <Text style={styles.categoryTitle}>
                  {categoryLabels[category as keyof typeof categoryLabels]}
                </Text>
                {categoryModels.map(renderModelItem)}
              </View>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.buttonCancel]}
              onPress={onClose}
            >
              <Text style={styles.buttonTextCancel}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonConfirm]}
              onPress={handleConfirm}
            >
              <Text style={styles.buttonTextConfirm}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.greyLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    maxHeight: 500,
  },
  categorySection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.greyLight,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modelItem: {
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modelItemSelected: {
    borderColor: Colors.common.primary,
    backgroundColor: theme.isDark ? '#1a3a4a' : '#e3f2fd',
  },
  modelItemPressed: {
    opacity: 0.7,
  },
  modelItemContent: {
    flexDirection: 'row',
    padding: 12,
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
    borderColor: Colors.common.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.common.primary,
  },
  modelInfo: {
    flex: 1,
  },
  modelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    flex: 1,
  },
  modelNameSelected: {
    color: Colors.common.primary,
  },
  modelDescription: {
    fontSize: 13,
    color: theme.colors.greyLight,
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginLeft: 8,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeNew: {
    backgroundColor: '#4CAF50',
  },
  badgeFast: {
    backgroundColor: '#FF9800',
  },
  badgeReasoning: {
    backgroundColor: '#9C27B0',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  capabilityIcons: {
    flexDirection: 'row',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.colors.greyLight,
  },
  buttonConfirm: {
    backgroundColor: Colors.common.primary,
  },
  buttonTextCancel: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextConfirm: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ModelSelectorModal;

