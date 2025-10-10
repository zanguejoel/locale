import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';

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

type ViewType = 'attachments' | 'ai-options';

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
  const [currentView, setCurrentView] = useState<ViewType>('attachments');

  // Reset to attachments view when modal closes
  React.useEffect(() => {
    if (!visible) {
      setCurrentView('attachments');
    }
  }, [visible]);

  const handleOptionPress = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    setTimeout(() => action(), 100);
  };

  const handleAIOptionsPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView('ai-options');
  };

  const handleBackToAttachments = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentView('attachments');
  };

  // Check if any generation option is active
  const hasActiveOptions = generationOptions
    ? generationOptions.webSearch || 
      generationOptions.generateImage !== 'none' || 
      generationOptions.generateVideo !== 'none'
    : false;

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
    onGenerationOptionsChange({ ...generationOptions, generateVideo: value });
  };

  const handleImageProviderChange = (provider: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenerationOptionsChange({ ...generationOptions, imageProvider: provider });
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
            {icon && <Ionicons name={icon} size={16} color="#FFFFFF" style={styles.optionIconSmall} />}
            <Text style={[styles.optionButtonText, styles.optionButtonTextSelected]}>
              {label}
            </Text>
            <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
          </LinearGradient>
        ) : (
          <View style={styles.optionButtonContent}>
            {icon && <Ionicons name={icon} size={16} color={theme.colors.textSecondary} style={styles.optionIconSmall} />}
            <Text style={styles.optionButtonText}>
              {label}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Render attachments view
  const renderAttachmentsView = () => (
    <>
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
          <View style={[styles.optionIcon, { backgroundColor: theme.colors.green + '20' }]}>
            <Ionicons name="images" size={28} color={theme.colors.green} />
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

      {/* AI Options Button (Cloud mode only) */}
      {!isLocal && onGenerationOptionsChange && (
        <View style={styles.aiOptionsRow}>
          <TouchableOpacity
            style={[
              styles.aiOptionsButton,
              hasActiveOptions && styles.aiOptionsButtonActive
            ]}
            onPress={handleAIOptionsPress}
            accessibilityLabel="AI Options"
            accessibilityRole="button"
            accessibilityState={{ selected: hasActiveOptions }}
          >
            <Ionicons 
              name="sparkles" 
              size={20} 
              color={hasActiveOptions ? theme.colors.primary : theme.colors.text} 
            />
            <Text style={[
              styles.aiOptionsButtonText,
              hasActiveOptions && { color: theme.colors.primary }
            ]}>
              AI Options
            </Text>
            {hasActiveOptions && (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // Render AI options view
  const renderAIOptionsView = () => {
    if (!generationOptions) return null;

    return (
      <>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              onPress={handleBackToAttachments}
              style={styles.backButton}
              accessibilityLabel="Back to attachments"
              accessibilityRole="button"
            >
              <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>AI Options</Text>
          </View>
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
                {renderOptionButton('None', generationOptions.generateImage, 'none', handleImageGenerationChange, 'close-circle-outline')}
                {renderOptionButton('Auto', generationOptions.generateImage, 'auto', handleImageGenerationChange, 'flash-outline')}
                {renderOptionButton('Always', generationOptions.generateImage, 'always', handleImageGenerationChange, 'checkmark-circle-outline')}
              </View>

              {generationOptions.generateImage !== 'none' && (
                <View style={styles.providerSection}>
                  <Text style={styles.subSectionTitle}>Provider</Text>
                  <View style={styles.optionButtonGroup}>
                    {renderOptionButton('Stability', generationOptions.imageProvider, 'stability', handleImageProviderChange, 'cube-outline')}
                    {renderOptionButton('DALL-E', generationOptions.imageProvider, 'dalle', handleImageProviderChange, 'aperture-outline')}
                    {renderOptionButton('Midjourney', generationOptions.imageProvider, 'midjourney', handleImageProviderChange, 'diamond-outline')}
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
                {renderOptionButton('None', generationOptions.generateVideo, 'none', handleVideoGenerationChange, 'close-circle-outline')}
                {renderOptionButton('Auto', generationOptions.generateVideo, 'auto', handleVideoGenerationChange, 'flash-outline')}
                {renderOptionButton('Always', generationOptions.generateVideo, 'always', handleVideoGenerationChange, 'checkmark-circle-outline')}
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.doneButton} 
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setCurrentView('attachments');
            }}
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
      </>
    );
  };

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
        onPress={currentView === 'attachments' ? onClose : undefined}
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
          <View style={[
            styles.modalCard,
            currentView === 'ai-options' && styles.modalCardExpanded
          ]}>
            {currentView === 'attachments' ? renderAttachmentsView() : renderAIOptionsView()}
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
    modalCardExpanded: {
      maxHeight: '85%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundLight,
      justifyContent: 'center',
      alignItems: 'center',
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
    aiOptionsRow: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    },
    aiOptionsButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 14,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundLight,
      borderWidth: 1,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    },
    aiOptionsButtonActive: {
      backgroundColor: theme.colors.primary + '15',
      borderColor: theme.colors.primary + '40',
    },
    aiOptionsButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
    },
    activeBadge: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
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
    optionIconSmall: {
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
      paddingTop: 16,
      marginTop: 8,
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

export default AttachmentsModal;
