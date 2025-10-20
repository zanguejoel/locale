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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AttachmentsModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  isLocal?: boolean;
  generationOptions?: GenerationOptionsState;
  onGenerationOptionsChange?: (options: GenerationOptionsState) => void;
  canGenerateImage?: boolean; // Whether current model supports image generation
  canGenerateVideo?: boolean; // Whether current model supports video generation
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
  canGenerateImage = true,
  canGenerateVideo = true,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const styles = getStyles(theme, insets);

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

  const handleToggleArtifacts = () => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenerationOptionsChange({ ...generationOptions, enableArtifacts: !generationOptions.enableArtifacts });
  };

  const handleImageGenerationChange = (value: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If enabling image generation, disable video generation (mutually exclusive)
    const updates = value !== 'none' 
      ? { generateImage: value, generateVideo: 'none' }
      : { generateImage: value };
    
    onGenerationOptionsChange({ ...generationOptions, ...updates });
  };

  const handleVideoGenerationChange = (value: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Toggle off if selecting the same model, otherwise switch to new model
    if (generationOptions.generateVideo === value) {
      onGenerationOptionsChange({ ...generationOptions, generateVideo: 'none' });
    } else {
      // If enabling video generation, disable image generation (mutually exclusive)
      const updates = value !== 'none'
        ? { generateVideo: value, generateImage: 'none' }
        : { generateVideo: value };
      
      onGenerationOptionsChange({ ...generationOptions, ...updates });
    }
  };

  const handleImageProviderChange = (provider: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Set the correct model name based on provider
    const modelName = provider === 'openai' ? 'gpt-image-1' : 'gemini-2.5-flash-image-preview';
    
    onGenerationOptionsChange({ 
      ...generationOptions, 
      imageProvider: provider,
      imageModel: modelName,
    });
  };

  // Unified view with both attachments and AI options
  const renderUnifiedView = () => (
    <>
      {/* Drag Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Attachments</Text>
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
        bounces={true}
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled={true}
        scrollEventThrottle={16}
        overScrollMode="always"
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

            {/* AI Options Header */}
            <View style={styles.sectionHeader}>
              <Ionicons name="sparkles" size={18} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>AI Options</Text>
            </View>

            {/* Compact AI Options Cards */}
            <View style={styles.aiOptionsGrid}>
              {/* Web Search Toggle */}
              <TouchableOpacity
                style={[
                  styles.singleLineCard,
                  generationOptions.webSearch && styles.singleLineCardActive
                ]}
                onPress={handleToggleWebSearch}
                activeOpacity={0.7}
                accessibilityLabel="Toggle web search"
                accessibilityRole="switch"
                accessibilityState={{ checked: generationOptions.webSearch }}
              >
                <View style={[styles.iconBadge, { backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)' }]}>
                  <Ionicons name="search" size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.optionTitle}>Web Search</Text>
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
              </TouchableOpacity>

              {/* Artifacts Toggle */}
              <TouchableOpacity
                style={[
                  styles.singleLineCard,
                  generationOptions.enableArtifacts && styles.singleLineCardActive
                ]}
                onPress={handleToggleArtifacts}
                activeOpacity={0.7}
                accessibilityLabel="Toggle artifacts"
                accessibilityRole="switch"
                accessibilityState={{ checked: generationOptions.enableArtifacts }}
              >
                <View style={[styles.iconBadge, { backgroundColor: theme.isDark ? 'rgba(147, 51, 234, 0.2)' : 'rgba(147, 51, 234, 0.15)' }]}>
                  <Ionicons name="cube" size={18} color="#9333ea" />
                </View>
                <Text style={styles.optionTitle}>Artifacts</Text>
                <Switch
                  value={generationOptions.enableArtifacts}
                  onValueChange={handleToggleArtifacts}
                  trackColor={{ 
                    false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                    true: '#9333ea' 
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                />
              </TouchableOpacity>

              {/* Image Generation Toggle */}
              <TouchableOpacity
                style={[
                  styles.singleLineCard,
                  generationOptions.generateImage !== 'none' && styles.singleLineCardActive,
                  !canGenerateImage && styles.disabledCard
                ]}
                onPress={() => {
                  if (!canGenerateImage) return;
                  // Always use 'always' mode when enabling image generation
                  const nextValue = generationOptions.generateImage === 'none' ? 'always' : 'none';
                  handleImageGenerationChange(nextValue);
                }}
                activeOpacity={canGenerateImage ? 0.7 : 1}
                disabled={!canGenerateImage}
                accessibilityLabel="Toggle image generation"
                accessibilityRole="switch"
                accessibilityState={{ 
                  checked: generationOptions.generateImage !== 'none',
                  disabled: !canGenerateImage 
                }}
              >
                <View style={[styles.iconBadge, { 
                  backgroundColor: theme.isDark ? 'rgba(168, 85, 247, 0.2)' : 'rgba(168, 85, 247, 0.15)',
                  opacity: canGenerateImage ? 1 : 0.5
                }]}>
                  <Ionicons name="image" size={18} color="#a855f7" />
                </View>
                <Text style={[
                  styles.optionTitle,
                  !canGenerateImage && styles.disabledText
                ]}>Image Generation</Text>
                {!canGenerateImage && (
                  <Ionicons 
                    name="lock-closed" 
                    size={16} 
                    color={theme.colors.textSecondary} 
                    style={{ marginRight: 8, opacity: 0.6 }}
                  />
                )}
                <Switch
                  value={generationOptions.generateImage !== 'none'}
                  onValueChange={(value) => {
                    if (!canGenerateImage) return;
                    // Always use 'always' mode when enabling
                    handleImageGenerationChange(value ? 'always' : 'none');
                  }}
                  disabled={!canGenerateImage}
                  trackColor={{ 
                    false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                    true: '#a855f7' 
                  }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
                />
              </TouchableOpacity>
            </View>

            {/* Image Generation Options (when enabled) - Mode hidden, always uses 'always' */}
            {generationOptions.generateImage !== 'none' && (
              <View style={styles.expandedSection}>
                {/* Mode selection hidden - always uses 'always' mode by default */}
                
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

            {/* Video Generation Toggle */}
            <TouchableOpacity
              style={[
                styles.singleLineCard,
                generationOptions.generateVideo !== 'none' && styles.singleLineCardActive,
                !canGenerateVideo && styles.disabledCard
              ]}
              onPress={() => {
                if (!canGenerateVideo) return;
                const nextValue = generationOptions.generateVideo === 'none' ? 'google_veo3' : 'none';
                handleVideoGenerationChange(nextValue);
              }}
              activeOpacity={canGenerateVideo ? 0.7 : 1}
              disabled={!canGenerateVideo}
              accessibilityLabel="Toggle video generation"
              accessibilityRole="switch"
              accessibilityState={{ 
                checked: generationOptions.generateVideo !== 'none',
                disabled: !canGenerateVideo 
              }}
            >
              <View style={[styles.iconBadge, { 
                backgroundColor: theme.isDark ? 'rgba(236, 72, 153, 0.2)' : 'rgba(236, 72, 153, 0.15)',
                opacity: canGenerateVideo ? 1 : 0.5
              }]}>
                <Ionicons name="videocam" size={18} color="#ec4899" />
              </View>
              <Text style={[
                styles.optionTitle,
                !canGenerateVideo && styles.disabledText
              ]}>Video Generation</Text>
              {!canGenerateVideo && (
                <Ionicons 
                  name="lock-closed" 
                  size={16} 
                  color={theme.colors.textSecondary} 
                  style={{ marginRight: 8, opacity: 0.6 }}
                />
              )}
              <Switch
                value={generationOptions.generateVideo !== 'none'}
                onValueChange={(value) => {
                  if (!canGenerateVideo) return;
                  handleVideoGenerationChange(value ? 'google_veo3' : 'none');
                }}
                disabled={!canGenerateVideo}
                trackColor={{ 
                  false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                  true: '#ec4899' 
                }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
              />
            </TouchableOpacity>

            {/* Video Model Selection (when enabled) */}
            {generationOptions.generateVideo !== 'none' && (
              <View style={styles.expandedSection}>
                <View style={styles.optionRow}>
                  <Text style={styles.optionRowLabel}>Model</Text>
                  <View style={styles.inlineButtonGroup}>
                    <TouchableOpacity
                      style={[
                        styles.inlineButton,
                        generationOptions.generateVideo === 'aws_nova_reel' && styles.inlineButtonActive
                      ]}
                      onPress={() => handleVideoGenerationChange('aws_nova_reel')}
                    >
                      <Ionicons 
                        name="flash" 
                        size={14} 
                        color={generationOptions.generateVideo === 'aws_nova_reel' ? '#FFFFFF' : theme.colors.textSecondary} 
                      />
                      <Text style={[
                        styles.inlineButtonText,
                        generationOptions.generateVideo === 'aws_nova_reel' && styles.inlineButtonTextActive
                      ]}>AWS Nova</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.inlineButton,
                        generationOptions.generateVideo === 'google_veo3' && styles.inlineButtonActive
                      ]}
                      onPress={() => handleVideoGenerationChange('google_veo3')}
                    >
                      <Ionicons 
                        name="sparkles" 
                        size={14} 
                        color={generationOptions.generateVideo === 'google_veo3' ? '#FFFFFF' : theme.colors.textSecondary} 
                      />
                      <Text style={[
                        styles.inlineButtonText,
                        generationOptions.generateVideo === 'google_veo3' && styles.inlineButtonTextActive
                      ]}>Veo3</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* Info Banner for Disabled Features */}
            {(!canGenerateImage || !canGenerateVideo) && (
              <View style={styles.infoBanner}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={18} 
                  color={theme.colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.infoBannerText}>
                  {!canGenerateImage && !canGenerateVideo 
                    ? 'Image and video generation are not available for the selected model.'
                    : !canGenerateImage 
                    ? 'Image generation is not available for the selected model.'
                    : 'Video generation is not available for the selected model.'
                  }
                </Text>
              </View>
            )}
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
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        >
          {Platform.OS === 'ios' ? (
            <BlurView intensity={50} tint={theme.isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill}>
              <View style={styles.blurContent} />
            </BlurView>
          ) : (
            <View style={styles.androidOverlay} />
          )}
        </TouchableOpacity>

        <View style={styles.modalContent}>
          <View style={styles.modalCard}>
            {renderUnifiedView()}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: Theme, insets: { bottom: number }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
    },
    blurContent: {
      flex: 1,
    },
    androidOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.6)',
    },
    modalContent: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      maxHeight: '90%',
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      padding: 20,
      paddingBottom: Math.max(insets.bottom, 20),
      maxHeight: '100%',
      flex: 1,
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
    // Drag Handle
    handleContainer: {
      alignItems: 'center',
      paddingVertical: 8,
      marginBottom: 8,
    },
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
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
    // Section Header
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 16,
      paddingHorizontal: 4,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    // Compact AI Options Cards
    aiOptionsGrid: {
      flexDirection: 'column',
      gap: 12,
      marginBottom: 20,
    },
    // Single Line Cards (Icon + Title + Switch)
    singleLineCard: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
      gap: 12,
    },
    singleLineCardActive: {
      borderColor: theme.colors.primary + '40',
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.08)' : 'rgba(59, 130, 246, 0.05)',
    },
    iconBadge: {
      width: 36,
      height: 36,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    optionTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
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
    // Disabled states
    disabledCard: {
      opacity: 0.5,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
    },
    disabledText: {
      opacity: 0.6,
    },
    // Info banner for disabled features
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
      borderRadius: 12,
      padding: 14,
      marginTop: 8,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    },
    infoBannerText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      color: theme.colors.textSecondary,
    },
    // AI Options view styles
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingBottom: 20,
      flexGrow: 1,
    },
  });

export default AttachmentsModal;
