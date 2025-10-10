import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { GenerationOptionsState } from './GenerationOptions';

interface AttachmentsModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  isLocal?: boolean;
  generationOptions?: GenerationOptionsState;
  onGenerationOptionsChange?: (options: GenerationOptionsState) => void;
}

const AttachmentsModal: React.FC<AttachmentsModalProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
  onPickDocument,
  isLocal = false,
  generationOptions,
  onGenerationOptionsChange,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const handleOptionPress = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => action(), 100);
  };

  // Generation options handlers
  const handleToggleWebSearch = () => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenerationOptionsChange({ ...generationOptions, webSearch: !generationOptions.webSearch });
  };

  const handleImageGenerationChange = (value: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenerationOptionsChange({ ...generationOptions, generateImage: value });
  };

  const handleVideoGenerationChange = (value: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Toggle off if selecting the same model, otherwise switch to new model
    if (generationOptions.generateVideo === value) {
      onGenerationOptionsChange({ ...generationOptions, generateVideo: 'none' });
    } else {
      onGenerationOptionsChange({ ...generationOptions, generateVideo: value });
    }
  };

  const handleImageProviderChange = (provider: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenerationOptionsChange({ ...generationOptions, imageProvider: provider });
  };

  // Unified view with both attachments and AI options
  const renderUnifiedView = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>Attachments & AI</Text>
        <TouchableOpacity
          onPress={onClose}
          style={styles.closeButton}
          accessibilityLabel="Close"
          accessibilityRole="button"
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Attachments Section */}
        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOptionPress(onTakePhoto)}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <Ionicons name="camera" size={28} color={theme.colors.primary} />
            </View>
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOptionPress(onPickImage)}
            accessibilityLabel="Pick from gallery"
            accessibilityRole="button"
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.orange + '20' }]}>
              <Ionicons name="images" size={28} color={theme.colors.orange} />
            </View>
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={() => handleOptionPress(onPickDocument)}
            accessibilityLabel="Pick document"
            accessibilityRole="button"
          >
            <View style={[styles.optionIcon, { backgroundColor: theme.colors.blue + '20' }]}>
              <Ionicons name="document-text" size={28} color={theme.colors.blue} />
            </View>
            <Text style={styles.optionText}>Document</Text>
          </TouchableOpacity>
        </View>

        {/* AI Options Section (Cloud mode only) */}
        {!isLocal && generationOptions && onGenerationOptionsChange && (
          <>
            {/* Divider */}
            <View style={styles.divider} />

            {/* Compact AI Options Cards */}
            <View style={styles.aiOptionsGrid}>
              {/* Web Search Toggle */}
              <TouchableOpacity
                style={[
                  styles.compactCard,
                  generationOptions.webSearch && styles.compactCardActive
                ]}
                onPress={handleToggleWebSearch}
                activeOpacity={0.7}
                accessibilityLabel="Toggle web search"
                accessibilityRole="switch"
                accessibilityState={{ checked: generationOptions.webSearch }}
              >
                <View style={styles.compactCardHeader}>
                  <View style={[styles.compactIconBadge, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)' }]}>
                    <Ionicons name="search" size={18} color={theme.colors.primary} />
                  </View>
                  <Switch
                    value={generationOptions.webSearch}
                    onValueChange={handleToggleWebSearch}
                    trackColor={{ 
                      false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                      true: theme.colors.primary 
                    }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                </View>
                <Text style={styles.compactCardTitle}>Web Search</Text>
                <Text style={styles.compactCardDescription}>Real-time information</Text>
              </TouchableOpacity>

              {/* Image Generation Toggle */}
              <TouchableOpacity
                style={[
                  styles.compactCard,
                  generationOptions.generateImage !== 'none' && styles.compactCardActive
                ]}
                onPress={() => {
                  const nextValue = generationOptions.generateImage === 'none' ? 'auto' : 'none';
                  handleImageGenerationChange(nextValue);
                }}
                activeOpacity={0.7}
                accessibilityLabel="Toggle image generation"
                accessibilityRole="switch"
                accessibilityState={{ checked: generationOptions.generateImage !== 'none' }}
              >
                <View style={styles.compactCardHeader}>
                  <View style={[styles.compactIconBadge, { backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.15)' }]}>
                    <Ionicons name="image" size={18} color="#a855f7" />
                  </View>
                  <Switch
                    value={generationOptions.generateImage !== 'none'}
                    onValueChange={(value) => {
                      handleImageGenerationChange(value ? 'auto' : 'none');
                    }}
                    trackColor={{ 
                      false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                      true: '#a855f7' 
                    }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                  />
                </View>
                <Text style={styles.compactCardTitle}>Image Generation</Text>
                <Text style={styles.compactCardDescription}>
                  {generationOptions.generateImage === 'none' ? 'Off' : 
                   generationOptions.generateImage === 'auto' ? 'Auto' : 'Always'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Image Generation Options (when enabled) */}
            {generationOptions.generateImage !== 'none' && (
              <View style={styles.expandedSection}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionRowLabel}>Mode</Text>
                  <View style={styles.inlineButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.inlineButton,
                        generationOptions.generateImage === 'auto' && styles.inlineButtonActive
                      ]}
                      onPress={() => handleImageGenerationChange('auto')}
                    >
                      <Text style={[
                        styles.inlineButtonText,
                        generationOptions.generateImage === 'auto' && styles.inlineButtonTextActive
                      ]}>Auto</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.inlineButton,
                        generationOptions.generateImage === 'always' && styles.inlineButtonActive
                      ]}
                      onPress={() => handleImageGenerationChange('always')}
                    >
                      <Text style={[
                        styles.inlineButtonText,
                        generationOptions.generateImage === 'always' && styles.inlineButtonTextActive
                      ]}>Always</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.optionRow}>
                  <Text style={styles.optionRowLabel}>Provider</Text>
                  <View style={styles.inlineButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.inlineButton,
                        generationOptions.imageProvider === 'openai' && styles.inlineButtonActive
                      ]}
                      onPress={() => handleImageProviderChange('openai')}
                    >
                      <Ionicons 
                        name="aperture-outline" 
                        size={14} 
                        color={generationOptions.imageProvider === 'openai' ? '#FFFFFF' : theme.colors.textSecondary} 
                      />
                      <Text style={[
                        styles.inlineButtonText,
                        generationOptions.imageProvider === 'openai' && styles.inlineButtonTextActive
                      ]}>OpenAI</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.inlineButton,
                        generationOptions.imageProvider === 'gemini' && styles.inlineButtonActive
                      ]}
                      onPress={() => handleImageProviderChange('gemini')}
                    >
                      <Ionicons 
                        name="sparkles-outline" 
                        size={14} 
                        color={generationOptions.imageProvider === 'gemini' ? '#FFFFFF' : theme.colors.textSecondary} 
                      />
                      <Text style={[
                        styles.inlineButtonText,
                        generationOptions.imageProvider === 'gemini' && styles.inlineButtonTextActive
                      ]}>Gemini</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Video Generation */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={[styles.compactIconBadge, { backgroundColor: theme.isDark ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.15)' }]}>
                  <Ionicons name="videocam" size={18} color="#ec4899" />
                </View>
                <View>
                  <Text style={styles.sectionHeaderTitle}>Video Generation</Text>
                  <Text style={styles.sectionHeaderSubtitle}>
                    {generationOptions.generateVideo === 'none' ? 'Off' : 
                     generationOptions.generateVideo === 'aws_nova_reel' ? 'AWS Nova Reel' :
                     generationOptions.generateVideo === 'google_veo2' ? 'Google Veo2' :
                     generationOptions.generateVideo === 'google_veo3' ? 'Google Veo3' :
                     generationOptions.generateVideo === 'google_veo3_audio' ? 'Veo3 + Audio' : 'Off'}
                  </Text>
                </View>
              </View>

              <View style={styles.videoModelsContainer}>
                {/* None Option */}
                <TouchableOpacity
                  style={[
                    styles.videoModelOption,
                    generationOptions.generateVideo === 'none' && styles.videoModelOptionSelected
                  ]}
                  onPress={() => onGenerationOptionsChange({ ...generationOptions, generateVideo: 'none' })}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoModelLeft}>
                    <Ionicons 
                      name="close-circle-outline" 
                      size={20} 
                      color={generationOptions.generateVideo === 'none' ? theme.colors.text : theme.colors.textSecondary} 
                    />
                    <Text style={[
                      styles.videoModelName,
                      generationOptions.generateVideo === 'none' && styles.videoModelNameSelected
                    ]}>
                      None
                    </Text>
                  </View>
                  {generationOptions.generateVideo === 'none' && (
                    <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>

                {/* AWS Nova Reel */}
                <TouchableOpacity
                  style={[
                    styles.videoModelOption,
                    generationOptions.generateVideo === 'aws_nova_reel' && styles.videoModelOptionSelected
                  ]}
                  onPress={() => handleVideoGenerationChange('aws_nova_reel')}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoModelLeft}>
                    <Ionicons 
                      name="flash" 
                      size={20} 
                      color={generationOptions.generateVideo === 'aws_nova_reel' ? '#3b82f6' : theme.colors.textSecondary} 
                    />
                    <View style={styles.videoModelInfo}>
                      <Text style={[
                        styles.videoModelName,
                        generationOptions.generateVideo === 'aws_nova_reel' && styles.videoModelNameSelected
                      ]}>
                        AWS Nova Reel
                      </Text>
                      <Text style={styles.videoModelCost}>36 credits · Fast</Text>
                    </View>
                  </View>
                  {generationOptions.generateVideo === 'aws_nova_reel' && (
                    <Ionicons name="checkmark-circle" size={20} color="#3b82f6" />
                  )}
                </TouchableOpacity>

                {/* Google Veo2 */}
                <TouchableOpacity
                  style={[
                    styles.videoModelOption,
                    generationOptions.generateVideo === 'google_veo2' && styles.videoModelOptionSelected
                  ]}
                  onPress={() => handleVideoGenerationChange('google_veo2')}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoModelLeft}>
                    <Ionicons 
                      name="sparkles" 
                      size={20} 
                      color={generationOptions.generateVideo === 'google_veo2' ? '#10b981' : theme.colors.textSecondary} 
                    />
                    <View style={styles.videoModelInfo}>
                      <Text style={[
                        styles.videoModelName,
                        generationOptions.generateVideo === 'google_veo2' && styles.videoModelNameSelected
                      ]}>
                        Google Veo2
                      </Text>
                      <Text style={styles.videoModelCost}>300 credits · High quality</Text>
                    </View>
                  </View>
                  {generationOptions.generateVideo === 'google_veo2' && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>

                {/* Google Veo3 */}
                <TouchableOpacity
                  style={[
                    styles.videoModelOption,
                    generationOptions.generateVideo === 'google_veo3' && styles.videoModelOptionSelected
                  ]}
                  onPress={() => handleVideoGenerationChange('google_veo3')}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoModelLeft}>
                    <Ionicons 
                      name="star" 
                      size={20} 
                      color={generationOptions.generateVideo === 'google_veo3' ? '#10b981' : theme.colors.textSecondary} 
                    />
                    <View style={styles.videoModelInfo}>
                      <Text style={[
                        styles.videoModelName,
                        generationOptions.generateVideo === 'google_veo3' && styles.videoModelNameSelected
                      ]}>
                        Google Veo3
                      </Text>
                      <Text style={styles.videoModelCost}>300 credits · Latest</Text>
                    </View>
                  </View>
                  {generationOptions.generateVideo === 'google_veo3' && (
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                  )}
                </TouchableOpacity>

                {/* Google Veo3 + Audio */}
                <TouchableOpacity
                  style={[
                    styles.videoModelOption,
                    generationOptions.generateVideo === 'google_veo3_audio' && styles.videoModelOptionSelected
                  ]}
                  onPress={() => handleVideoGenerationChange('google_veo3_audio')}
                  activeOpacity={0.7}
                >
                  <View style={styles.videoModelLeft}>
                    <Ionicons 
                      name="musical-notes" 
                      size={20} 
                      color={generationOptions.generateVideo === 'google_veo3_audio' ? '#a855f7' : theme.colors.textSecondary} 
                    />
                    <View style={styles.videoModelInfo}>
                      <Text style={[
                        styles.videoModelName,
                        generationOptions.generateVideo === 'google_veo3_audio' && styles.videoModelNameSelected
                      ]}>
                        Google Veo3 + Audio
                      </Text>
                      <Text style={styles.videoModelCost}>450 credits · With sound</Text>
                    </View>
                  </View>
                  {generationOptions.generateVideo === 'google_veo3_audio' && (
                    <Ionicons name="checkmark-circle" size={20} color="#a855f7" />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {Platform.OS === 'ios' ? (
          <BlurView intensity={80} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
            <View style={styles.blurContent} />
          </BlurView>
        ) : (
          <View style={styles.androidOverlay} />
        )}

        <TouchableOpacity
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalCard}>
            {renderUnifiedView()}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.5)',
    },
    blurContent: {
      flex: 1,
    },
    androidOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
      padding: 16,
      paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderRadius: 24,
      padding: 20,
      maxHeight: '85%',
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: {
          elevation: 8,
        },
      }),
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 16,
    },
    option: {
      flex: 1,
      alignItems: 'center',
      gap: 12,
    },
    optionIcon: {
      width: 70,
      height: 70,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
    },
    divider: {
      height: 1,
      backgroundColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      marginVertical: 20,
    },
    // Compact AI Options Cards
    aiOptionsGrid: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 16,
    },
    compactCard: {
      flex: 1,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 16,
      padding: 14,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    compactCardActive: {
      borderColor: theme.colors.primary + '40',
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
    },
    compactCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    compactIconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    compactCardTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    compactCardDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    // Expanded Section for Image Options
    expandedSection: {
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 16,
      padding: 14,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      gap: 12,
    },
    optionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    optionRowLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    inlineButtonGroup: {
      flexDirection: 'row',
      gap: 8,
    },
    inlineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : '#FFFFFF',
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
    },
    inlineButtonActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    inlineButtonText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    inlineButtonTextActive: {
      color: '#FFFFFF',
    },
    // Section Header for Video
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    sectionHeaderTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    sectionHeaderSubtitle: {
      fontSize: 13,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    // AI Options view styles
    scrollContent: {
      maxHeight: 500,
    },
    scrollContentContainer: {
      paddingBottom: 10,
    },
    section: {
      marginBottom: 16,
    },
    // Video Model Styles
    videoModelsContainer: {
      gap: 10,
    },
    videoModelOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
    },
    videoModelOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
    },
    videoModelLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    videoModelInfo: {
      flex: 1,
    },
    videoModelName: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    videoModelNameSelected: {
      color: theme.colors.primary,
    },
    videoModelCost: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
  });

export default AttachmentsModal;
