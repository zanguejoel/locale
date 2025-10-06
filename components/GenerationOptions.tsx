import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';

export interface GenerationOptionsState {
  webSearch: boolean;
  generateImage: string; // 'none', 'auto', 'always'
  imageProvider: string; // 'stability', 'dalle', 'midjourney'
  imageModel: string;
  generateVideo: string; // 'none', 'auto', 'always'
}

interface GenerationOptionsProps {
  visible: boolean;
  onClose: () => void;
  options: GenerationOptionsState;
  onOptionsChange: (options: GenerationOptionsState) => void;
}

const GenerationOptions: React.FC<GenerationOptionsProps> = ({
  visible,
  onClose,
  options,
  onOptionsChange,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const handleToggleWebSearch = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptionsChange({ ...options, webSearch: !options.webSearch });
  };

  const handleImageGenerationChange = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptionsChange({ ...options, generateImage: value });
  };

  const handleVideoGenerationChange = (value: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptionsChange({ ...options, generateVideo: value });
  };

  const handleImageProviderChange = (provider: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onOptionsChange({ ...options, imageProvider: provider });
  };

  const renderOptionButton = (
    label: string,
    currentValue: string,
    option: string,
    onPress: (value: string) => void
  ) => {
    const isSelected = currentValue === option;
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
        onPress={() => onPress(option)}
      >
        <Text style={[styles.optionButtonText, isSelected && styles.optionButtonTextSelected]}>
          {label}
        </Text>
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
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Generation Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Web Search */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="search" size={20} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Web Search</Text>
                </View>
                <Switch
                  value={options.webSearch}
                  onValueChange={handleToggleWebSearch}
                  trackColor={{ false: theme.colors.greyLight, true: theme.colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text style={styles.sectionDescription}>
                Enable real-time web search for up-to-date information
              </Text>
            </View>

            {/* Image Generation */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="image" size={20} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Image Generation</Text>
                </View>
              </View>
              <Text style={styles.sectionDescription}>
                Generate images based on your prompts
              </Text>
              <View style={styles.optionButtonGroup}>
                {renderOptionButton('None', options.generateImage, 'none', handleImageGenerationChange)}
                {renderOptionButton('Auto', options.generateImage, 'auto', handleImageGenerationChange)}
                {renderOptionButton('Always', options.generateImage, 'always', handleImageGenerationChange)}
              </View>

              {options.generateImage !== 'none' && (
                <>
                  <Text style={styles.subSectionTitle}>Image Provider</Text>
                  <View style={styles.optionButtonGroup}>
                    {renderOptionButton('Stability AI', options.imageProvider, 'stability', handleImageProviderChange)}
                    {renderOptionButton('DALL-E', options.imageProvider, 'dalle', handleImageProviderChange)}
                    {renderOptionButton('Midjourney', options.imageProvider, 'midjourney', handleImageProviderChange)}
                  </View>
                </>
              )}
            </View>

            {/* Video Generation */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Ionicons name="videocam" size={20} color={theme.colors.primary} />
                  <Text style={styles.sectionTitle}>Video Generation</Text>
                </View>
              </View>
              <Text style={styles.sectionDescription}>
                Generate videos from your descriptions
              </Text>
              <View style={styles.optionButtonGroup}>
                {renderOptionButton('None', options.generateVideo, 'none', handleVideoGenerationChange)}
                {renderOptionButton('Auto', options.generateVideo, 'auto', handleVideoGenerationChange)}
                {renderOptionButton('Always', options.generateVideo, 'always', handleVideoGenerationChange)}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Done</Text>
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.greyLight,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.colors.grey,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  optionButtonGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.greyLight,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  optionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
  optionButtonTextSelected: {
    color: theme.colors.white,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  doneButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});

export default GenerationOptions;

