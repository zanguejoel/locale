import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Switch, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export interface GenerationOptionsState {
  webSearch: boolean;
  generateImage: string; // 'none', 'enabled'
  imageProvider: string; // 'openai', 'gemini'
  imageModel: string; // 'gpt-image-1', 'gemini-2.5-flash-image-preview'
  generateVideo: string; // 'none', 'aws_nova_reel', 'google_veo2', 'google_veo3', 'google_veo3_audio'
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
  const [slideAnim] = useState(new Animated.Value(0));

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      slideAnim.setValue(0);
    }
  }, [visible]);

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
    onPress: (value: string) => void,
    icon?: keyof typeof Ionicons.glyphMap
  ) => {
    const isSelected = currentValue === option;
    return (
      <TouchableOpacity
        style={[styles.optionButton, isSelected && styles.optionButtonSelected]}
        onPress={() => onPress(option)}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.primary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.selectedGradient}
          >
            {icon && <Ionicons name={icon} size={16} color="#FFFFFF" style={styles.optionIcon} />}
            <Text style={[styles.optionButtonText, styles.optionButtonTextSelected]}>
              {label}
            </Text>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={styles.optionButtonContent}>
            {icon && <Ionicons name={icon} size={16} color={theme.colors.textSecondary} style={styles.optionIcon} />}
            <Text style={styles.optionButtonText}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.modalContentWrapper,
            {
              transform: [
                {
                  translateY: slideAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              {/* Handle bar */}
              <View style={styles.handleBar} />
              
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="options" size={24} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.title}>Generation Options</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close-circle" size={28} color={theme.colors.textSecondary} />
                </TouchableOpacity>
              </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Web Search */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={[styles.iconBadge, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)' }]}>
                      <Ionicons name="search" size={20} color={theme.colors.primary} />
                    </View>
                    <View style={styles.titleTextContainer}>
                      <Text style={styles.sectionTitle}>Web Search</Text>
                      <Text style={styles.sectionDescription}>
                        Real-time web information
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={options.webSearch}
                    onValueChange={handleToggleWebSearch}
                    trackColor={{ 
                      false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                      true: theme.colors.primary 
                    }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                </View>
              </View>
            </View>

            {/* Image Generation */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={[styles.iconBadge, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.15)' : 'rgba(168, 85, 247, 0.1)' }]}>
                      <Ionicons name="image" size={20} color="#a855f7" />
                    </View>
                    <View style={styles.titleTextContainer}>
                      <Text style={styles.sectionTitle}>Image Generation</Text>
                      <Text style={styles.sectionDescription}>
                        AI-powered image creation
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.optionButtonGroup}>
                  {renderOptionButton('None', options.generateImage, 'none', handleImageGenerationChange, 'close-circle-outline')}
                  {renderOptionButton('Auto', options.generateImage, 'auto', handleImageGenerationChange, 'flash-outline')}
                  {renderOptionButton('Always', options.generateImage, 'always', handleImageGenerationChange, 'checkmark-circle-outline')}
                </View>

                {options.generateImage !== 'none' && (
                  <View style={styles.providerSection}>
                    <Text style={styles.subSectionTitle}>Provider</Text>
                    <View style={styles.optionButtonGroup}>
                      {renderOptionButton('Stability', options.imageProvider, 'stability', handleImageProviderChange, 'cube-outline')}
                      {renderOptionButton('DALL-E', options.imageProvider, 'dalle', handleImageProviderChange, 'aperture-outline')}
                      {renderOptionButton('Midjourney', options.imageProvider, 'midjourney', handleImageProviderChange, 'diamond-outline')}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Video Generation */}
            <View style={styles.section}>
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleContainer}>
                    <View style={[styles.iconBadge, { backgroundColor: theme.isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }]}>
                      <Ionicons name="videocam" size={20} color="#ec4899" />
                    </View>
                    <View style={styles.titleTextContainer}>
                      <Text style={styles.sectionTitle}>Video Generation</Text>
                      <Text style={styles.sectionDescription}>
                        AI-powered video creation
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.optionButtonGroup}>
                  {renderOptionButton('None', options.generateVideo, 'none', handleVideoGenerationChange, 'close-circle-outline')}
                  {renderOptionButton('Auto', options.generateVideo, 'auto', handleVideoGenerationChange, 'flash-outline')}
                  {renderOptionButton('Always', options.generateVideo, 'always', handleVideoGenerationChange, 'checkmark-circle-outline')}
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.doneButton} 
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.doneButtonGradient}
              >
                <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                <Text style={styles.doneButtonText}>Apply Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  section: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleTextContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  sectionDescription: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  providerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
  },
  optionButtonGroup: {
    flexDirection: 'row',
    gap: 10,
  },
  optionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
  },
  optionButtonSelected: {
    borderColor: 'transparent',
  },
  optionButtonContent: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  selectedGradient: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  optionIcon: {
    marginRight: 2,
  },
  optionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  optionButtonTextSelected: {
    color: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  doneButton: {
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  doneButtonGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default GenerationOptions;

