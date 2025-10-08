import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Platform,
  Switch,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { GenerationOptionsState } from './GenerationOptions';
import { Message } from '@/utils/Interfaces';
import { exportConversation, ExportFormat, getExportSizeEstimate } from '@/utils/ConversationExporter';

type ModalView = 'attachments' | 'ai-options' | 'export';

interface AttachmentsModalProps {
  visible: boolean;
  onClose: () => void;
  onTakePhoto: () => void;
  onPickImage: () => void;
  onPickDocument: () => void;
  isLocal?: boolean;
  generationOptions?: GenerationOptionsState;
  onGenerationOptionsChange?: (options: GenerationOptionsState) => void;
  // Export props
  messages?: Message[];
  conversationTitle?: string;
}

const FORMAT_OPTIONS: Array<{format: ExportFormat; icon: keyof typeof Ionicons.glyphMap; label: string; description: string}> = [
  {
    format: 'txt',
    icon: 'document-text-outline',
    label: 'Plain Text',
    description: 'Simple text format, easy to read',
  },
  {
    format: 'markdown',
    icon: 'logo-markdown',
    label: 'Markdown',
    description: 'Formatted text with styling',
  },
  {
    format: 'json',
    icon: 'code-slash-outline',
    label: 'JSON',
    description: 'Structured data format',
  },
];

const AttachmentsModal: React.FC<AttachmentsModalProps> = ({
  visible,
  onClose,
  onTakePhoto,
  onPickImage,
  onPickDocument,
  isLocal = false,
  generationOptions,
  onGenerationOptionsChange,
  messages = [],
  conversationTitle,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  // State to toggle between different views
  const [currentView, setCurrentView] = useState<ModalView>('attachments');
  
  // Export state
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('txt');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleOptionPress = async (action: () => void) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose(); // Close modal first
    // Small delay to allow modal to close before opening camera/gallery
    setTimeout(() => action(), 100);
  };
  
  const handleExport = async () => {
    try {
      setIsExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await exportConversation(messages, selectedFormat, {
        conversationTitle,
        includeTimestamps,
        includeMetadata,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCurrentView('attachments');
      onClose();
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFormatSelect = (format: ExportFormat) => {
    setSelectedFormat(format);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const handleToggleWebSearch = () => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onGenerationOptionsChange({ ...generationOptions, webSearch: !generationOptions.webSearch });
  };

  const handleImageGenerationChange = (value: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Use 'enabled' instead of 'always' to match web app
    const newValue = value === 'always' ? 'enabled' : value;
    onGenerationOptionsChange({ ...generationOptions, generateImage: newValue });
  };

  const handleVideoGenerationChange = (value: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // If selecting the same option, toggle it off (set to 'none')
    if (generationOptions.generateVideo === value) {
      onGenerationOptionsChange({ ...generationOptions, generateVideo: 'none' });
    } else {
      onGenerationOptionsChange({ ...generationOptions, generateVideo: value });
    }
  };

  const handleImageProviderChange = (provider: string) => {
    if (!generationOptions || !onGenerationOptionsChange) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Update model based on provider
    const imageModel = provider === 'openai' ? 'gpt-image-1' : 'gemini-2.5-flash-image-preview';
    
    onGenerationOptionsChange({ 
      ...generationOptions, 
      imageProvider: provider,
      imageModel: imageModel
    });
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
        style={[styles.generationOptionButton, isSelected && styles.generationOptionButtonSelected]}
        onPress={() => onPress(option)}
        activeOpacity={0.7}
      >
        {icon && <Ionicons name={icon} size={14} color={isSelected ? '#FFFFFF' : theme.colors.textSecondary} style={{ marginRight: 4 }} />}
        <Text style={[styles.generationOptionText, isSelected && styles.generationOptionTextSelected]}>
          {label}
        </Text>
        {isSelected && <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />}
      </TouchableOpacity>
    );
  };
  
  // Check if any generation option is active
  const hasActiveOptions = generationOptions && (
    generationOptions.webSearch || 
    generationOptions.generateImage !== 'none' || 
    (generationOptions.generateVideo !== 'none' && 
     ['aws_nova_reel', 'google_veo2', 'google_veo3', 'google_veo3_audio'].includes(generationOptions.generateVideo))
  );
  
  const estimatedSize = messages.length > 0 ? getExportSizeEstimate(messages, selectedFormat) : '0 KB';
  
  // Get view title
  const getViewTitle = () => {
    switch (currentView) {
      case 'ai-options': return 'AI Options';
      case 'export': return 'Export Chat';
      default: return 'Attachments';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                {currentView !== 'attachments' ? (
                  <TouchableOpacity
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setCurrentView('attachments');
                    }}
                    style={styles.backButton}
                    accessibilityLabel="Back to attachments"
                    accessibilityRole="button"
                  >
                    <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.backButtonPlaceholder} />
                )}
              </View>
              
              <Text style={styles.title}>{getViewTitle()}</Text>
              
              <TouchableOpacity
                onPress={() => {
                  setCurrentView('attachments');
                  onClose();
                }}
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
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              {/* Attachments View */}
              {currentView === 'attachments' && (
                <>
                  {/* Main Options */}
                  <View style={styles.optionsContainer}>
                    {/* Camera Option */}
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

                    {/* Gallery Option */}
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

                    {/* Document Option */}
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

                  {/* Secondary Actions Row */}
                  {(messages.length > 0 || (!isLocal && generationOptions)) && (
                    <View style={styles.secondaryActionsContainer}>
                      {/* Export Option */}
                      {messages.length > 0 && (
                        <TouchableOpacity
                          style={styles.secondaryOption}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCurrentView('export');
                          }}
                          accessibilityLabel="Export conversation"
                          accessibilityRole="button"
                        >
                          <Ionicons name="share-outline" size={20} color={theme.colors.text} />
                          <Text style={styles.secondaryOptionText}>Export</Text>
                        </TouchableOpacity>
                      )}

                      {/* AI Options Button (Cloud only) */}
                      {!isLocal && generationOptions && (
                        <TouchableOpacity
                          style={[
                            styles.secondaryOption,
                            hasActiveOptions && styles.secondaryOptionActive
                          ]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setCurrentView('ai-options');
                          }}
                          accessibilityLabel="AI generation options"
                          accessibilityRole="button"
                          accessibilityState={{ selected: hasActiveOptions }}
                        >
                          <Ionicons 
                            name="sparkles" 
                            size={20} 
                            color={hasActiveOptions ? theme.colors.primary : theme.colors.text} 
                          />
                          <Text style={[
                            styles.secondaryOptionText,
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
                      )}
                    </View>
                  )}
                </>
              )}

              {/* AI Options View */}
              {currentView === 'ai-options' && generationOptions && (
                <View style={styles.aiOptionsContainer}>
                  {/* Web Search */}
                  <View style={styles.aiOptionCard}>
                    <View style={styles.aiOptionHeader}>
                      <View style={styles.aiOptionTitleRow}>
                        <View style={[styles.aiIconBadge, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                          <Ionicons name="search" size={20} color={theme.colors.primary} />
                        </View>
                        <View>
                          <Text style={styles.aiOptionTitle}>Web Search</Text>
                          <Text style={styles.aiOptionDescription}>Real-time web information</Text>
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
                      />
                    </View>
                  </View>

                  {/* Image Generation */}
                  <View style={styles.aiOptionCard}>
                    <View style={styles.aiOptionHeader}>
                      <View style={styles.aiOptionTitleRow}>
                        <View style={[styles.aiIconBadge, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                          <Ionicons name="image" size={20} color="#a855f7" />
                        </View>
                        <View>
                          <Text style={styles.aiOptionTitle}>Image Generation</Text>
                          <Text style={styles.aiOptionDescription}>AI-powered image creation</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.generationButtonGroup}>
                      {renderOptionButton('None', generationOptions.generateImage, 'none', handleImageGenerationChange, 'close-circle-outline')}
                      {renderOptionButton('Auto', generationOptions.generateImage, 'auto', handleImageGenerationChange, 'flash-outline')}
                      {renderOptionButton('Always', generationOptions.generateImage, 'always', handleImageGenerationChange, 'checkmark-circle-outline')}
                    </View>

                    {generationOptions.generateImage !== 'none' && (
                      <View style={styles.providerSection}>
                        <Text style={styles.providerLabel}>Provider</Text>
                        <View style={styles.generationButtonGroup}>
                          {renderOptionButton('OpenAI', generationOptions.imageProvider, 'openai', handleImageProviderChange, 'aperture-outline')}
                          {renderOptionButton('Gemini', generationOptions.imageProvider, 'gemini', handleImageProviderChange, 'diamond-outline')}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Video Generation */}
                  <View style={styles.aiOptionCard}>
                    <View style={styles.aiOptionHeader}>
                      <View style={styles.aiOptionTitleRow}>
                        <View style={[styles.aiIconBadge, { backgroundColor: 'rgba(236, 72, 153, 0.15)' }]}>
                          <Ionicons name="videocam" size={20} color="#ec4899" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.aiOptionTitle}>Video Generation</Text>
                          <Text style={styles.aiOptionDescription}>Select AI model for video creation</Text>
                        </View>
                      </View>
                    </View>
                    
                    {/* Video Model Options */}
                    <View style={styles.videoModelsContainer}>
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
                            name="videocam" 
                            size={18} 
                            color={generationOptions.generateVideo === 'aws_nova_reel' ? '#3b82f6' : theme.colors.textSecondary} 
                          />
                          <View style={styles.videoModelInfo}>
                            <Text style={[
                              styles.videoModelName,
                              generationOptions.generateVideo === 'aws_nova_reel' && styles.videoModelNameSelected
                            ]}>AWS Nova Reel</Text>
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
                            name="videocam" 
                            size={18} 
                            color={generationOptions.generateVideo === 'google_veo2' ? '#10b981' : theme.colors.textSecondary} 
                          />
                          <View style={styles.videoModelInfo}>
                            <Text style={[
                              styles.videoModelName,
                              generationOptions.generateVideo === 'google_veo2' && styles.videoModelNameSelected
                            ]}>Google Veo2</Text>
                            <Text style={styles.videoModelCost}>300 credits · High Quality</Text>
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
                            name="videocam" 
                            size={18} 
                            color={generationOptions.generateVideo === 'google_veo3' ? '#10b981' : theme.colors.textSecondary} 
                          />
                          <View style={styles.videoModelInfo}>
                            <Text style={[
                              styles.videoModelName,
                              generationOptions.generateVideo === 'google_veo3' && styles.videoModelNameSelected
                            ]}>Google Veo3</Text>
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
                            size={18} 
                            color={generationOptions.generateVideo === 'google_veo3_audio' ? '#a855f7' : theme.colors.textSecondary} 
                          />
                          <View style={styles.videoModelInfo}>
                            <Text style={[
                              styles.videoModelName,
                              generationOptions.generateVideo === 'google_veo3_audio' && styles.videoModelNameSelected
                            ]}>Google Veo3 + Audio</Text>
                            <Text style={styles.videoModelCost}>450 credits · With Audio</Text>
                          </View>
                        </View>
                        {generationOptions.generateVideo === 'google_veo3_audio' && (
                          <Ionicons name="checkmark-circle" size={20} color="#a855f7" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              )}

              {/* Export View */}
              {currentView === 'export' && (
                <View style={styles.exportContainer}>
                  {/* Format Selection */}
                  <View style={styles.exportSection}>
                    <Text style={styles.exportSectionTitle}>Export Format</Text>
                    <View style={styles.formatOptions}>
                      {FORMAT_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.format}
                          onPress={() => handleFormatSelect(option.format)}
                          style={[
                            styles.formatOption,
                            selectedFormat === option.format && styles.formatOptionSelected,
                          ]}
                          accessibilityLabel={`Export as ${option.label}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: selectedFormat === option.format }}
                        >
                          <View style={styles.formatOptionIcon}>
                            <Ionicons
                              name={option.icon}
                              size={24}
                              color={
                                selectedFormat === option.format
                                  ? theme.colors.primary
                                  : theme.colors.textSecondary
                              }
                            />
                          </View>
                          <View style={styles.formatOptionContent}>
                            <Text
                              style={[
                                styles.formatOptionLabel,
                                selectedFormat === option.format && styles.formatOptionLabelSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text style={styles.formatOptionDescription}>
                              {option.description}
                            </Text>
                          </View>
                          {selectedFormat === option.format && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Export Options */}
                  <View style={styles.exportSection}>
                    <Text style={styles.exportSectionTitle}>Options</Text>
                    
                    <View style={styles.exportOptionRow}>
                      <View style={styles.exportOptionLeft}>
                        <Ionicons name="time-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.exportOptionLabel}>Include Timestamps</Text>
                      </View>
                      <Switch
                        value={includeTimestamps}
                        onValueChange={(val) => {
                          setIncludeTimestamps(val);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        trackColor={{ 
                          false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                          true: theme.colors.primary 
                        }}
                        thumbColor="#FFFFFF"
                      />
                    </View>

                    <View style={styles.exportOptionRow}>
                      <View style={styles.exportOptionLeft}>
                        <Ionicons name="information-circle-outline" size={20} color={theme.colors.text} />
                        <Text style={styles.exportOptionLabel}>Include Metadata</Text>
                      </View>
                      <Switch
                        value={includeMetadata}
                        onValueChange={(val) => {
                          setIncludeMetadata(val);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        trackColor={{ 
                          false: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)', 
                          true: theme.colors.primary 
                        }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  </View>

                  {/* Export Info */}
                  <View style={styles.exportInfo}>
                    <View style={styles.exportInfoRow}>
                      <Ionicons name="chatbubbles-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.exportInfoText}>{messages.length} messages</Text>
                    </View>
                    <View style={styles.exportInfoRow}>
                      <Ionicons name="document-outline" size={16} color={theme.colors.textSecondary} />
                      <Text style={styles.exportInfoText}>~{estimatedSize}</Text>
                    </View>
                  </View>

                  {/* Export Button */}
                  <TouchableOpacity
                    style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
                    onPress={handleExport}
                    disabled={isExporting}
                    accessibilityLabel="Export conversation"
                    accessibilityRole="button"
                  >
                    {isExporting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={20} color="#FFFFFF" />
                        <Text style={styles.exportButtonText}>Export as {selectedFormat.toUpperCase()}</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
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
      paddingBottom: Platform.OS === 'ios' ? 34 : 16, // Account for iOS home indicator
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 20,
      paddingHorizontal: 4,
    },
    headerLeft: {
      width: 40,
      height: 40,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backButtonPlaceholder: {
      width: 40,
      height: 40,
    },
    title: {
      fontSize: 24,
      fontWeight: '700',
      color: theme.colors.text,
      flex: 1,
      textAlign: 'center',
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.backgroundLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollContent: {
      maxHeight: 500,
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
    secondaryActionsContainer: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 12,
    },
    secondaryOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundLight,
    },
    secondaryOptionActive: {
      backgroundColor: theme.colors.primary + '15',
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    secondaryOptionText: {
      fontSize: 14,
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
    // AI Options Styles
    aiOptionsContainer: {
      gap: 12,
    },
    aiOptionCard: {
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
    },
    aiOptionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    aiOptionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    aiIconBadge: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    aiOptionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    aiOptionDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    generationButtonGroup: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    generationOptionButton: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 8,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      borderWidth: 1.5,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.03)' : '#FFFFFF',
    },
    generationOptionButtonSelected: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    generationOptionText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    generationOptionTextSelected: {
      color: '#FFFFFF',
    },
    providerSection: {
      marginTop: 12,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
    },
    providerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    // Video Model Options Styles
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
      borderColor: theme.colors.primary + '60',
      backgroundColor: theme.colors.primary + '10',
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
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    videoModelNameSelected: {
      color: theme.colors.primary,
    },
    videoModelCost: {
      fontSize: 11,
      color: theme.colors.textSecondary,
    },
    // Export View Styles
    exportContainer: {
      gap: 16,
    },
    exportSection: {
      marginBottom: 16,
    },
    exportSectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
      marginBottom: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    formatOptions: {
      gap: 12,
    },
    formatOption: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundLight,
      borderWidth: 2,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    },
    formatOptionSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    formatOptionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.isDark ? '#2a2a2a' : '#f5f5f5',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    formatOptionContent: {
      flex: 1,
    },
    formatOptionLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    formatOptionLabelSelected: {
      color: theme.colors.primary,
    },
    formatOptionDescription: {
      fontSize: 12,
      color: theme.colors.textSecondary,
    },
    exportOptionRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      marginBottom: 8,
    },
    exportOptionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    exportOptionLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.text,
    },
    exportInfo: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: 16,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
      borderRadius: 12,
      marginBottom: 16,
    },
    exportInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    exportInfoText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.textSecondary,
    },
    exportButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    exportButtonDisabled: {
      opacity: 0.6,
    },
    exportButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

export default AttachmentsModal;

