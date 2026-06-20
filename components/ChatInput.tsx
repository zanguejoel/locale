import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Image, Keyboard, Platform, Alert } from 'react-native';
import { Text } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRef, useState, useEffect, useCallback } from 'react';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GlassSurface } from './GlassSurface';
import { GenerationOptionsState } from './GenerationOptions';
import { CHAT_INPUT } from '@/constants/ChatConstants';
import { handleError } from '@/utils/ErrorHandler';
import KeyboardAccessoryView from './KeyboardAccessoryView';
import AttachmentsModal from './AttachmentsModal';
import { SelectedFile } from './FilePreviewModal'; // Only importing type
import { canGenerateMedia } from '@/constants/Models';



// Keyboard accessory view ID for iOS
const INPUT_ACCESSORY_VIEW_ID = 'chatInputAccessory';

export type Props = {
  onShouldSend: (message: string, type?: string, operation?: string | null, additionalData?: string, options?: any) => void;
  fetchMessages?: (conversationId?: string) => void | Promise<void>
  files?: SelectedFile[];
  setFiles?: (files: SelectedFile[]) => void;
  isLoading?: boolean
  onStopStreaming?: () => Promise<void>;
  onRecordingStateChange?: (isRecording: boolean, onCancel: () => void) => void;
  isLocal?: boolean; // To show/hide generation options
  messages?: any[]; // For export functionality
  conversationTitle?: string; // For export functionality
  currentModelId?: string; // Current selected model ID to check generation capabilities
};

const ChatInput = ({ onShouldSend, fetchMessages, files = [], setFiles, isLoading, onStopStreaming, onRecordingStateChange, isLocal = false, messages = [], conversationTitle, currentModelId }: Props) => {
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState<number>(CHAT_INPUT.MIN_HEIGHT);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingStartTime = useRef<number | null>(null); // Track recording start time for duration

  // Check current model's media generation capabilities
  const mediaCapabilities = currentModelId ? canGenerateMedia(currentModelId) : { image: true, video: true };

  // Generation options state
  const [generationOptions, setGenerationOptions] = useState<GenerationOptionsState>({
    webSearch: true, // Enable web search by default
    generateImage: 'none',
    imageProvider: 'gemini', // Default to Gemini for image generation
    imageModel: 'gemini-2.5-flash-image-preview', // Gemini's image model name
    generateVideo: 'none',
    enableArtifacts: true, // Enable artifacts by default
  });

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);

  // Notify parent about recording state changes
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording, cancelRecording);
    }
  }, [isRecording]);

  // Auto-disable image/video generation when switching to a model that doesn't support them
  useEffect(() => {
    // Only apply restrictions for cloud models (not local)
    if (isLocal) return;

    const needsUpdate = 
      (!mediaCapabilities.image && generationOptions.generateImage !== 'none') ||
      (!mediaCapabilities.video && generationOptions.generateVideo !== 'none');

    if (needsUpdate) {
      setGenerationOptions(prev => ({
        ...prev,
        generateImage: mediaCapabilities.image ? prev.generateImage : 'none',
        generateVideo: mediaCapabilities.video ? prev.generateVideo : 'none',
      }));
      
      // Show a subtle haptic feedback when options are auto-disabled
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [currentModelId, mediaCapabilities.image, mediaCapabilities.video, isLocal]);

  // ============================================================================
  // AUDIO RECORDING CONFIGURATION
  // ============================================================================
  
  /**
   * Audio session configuration constants
   * Based on iOS audio session activation timing requirements
   */
  const AUDIO_CONFIG = {
    // Polling configuration for audio session readiness
    POLL_INTERVAL_MS: 50,           // Check every 50ms
    MAX_POLL_ATTEMPTS: 20,          // Max 20 attempts = 1000ms total
    
    // Retry configuration for recording initialization
    MAX_RETRY_ATTEMPTS: 2,          // Retry up to 2 times on failure
    RETRY_DELAY_MS: 300,            // Wait 300ms between retries
    
    // Minimum delay after audio mode configuration (iOS only)
    MIN_IOS_DELAY_MS: 100,          // Minimum wait for iOS audio session
  } as const;

  /**
   * Polls iOS audio session to check if it's ready for recording
   * This replaces fixed delays with adaptive waiting based on actual state
   * 
   * @param maxAttempts - Maximum number of polling attempts
   * @returns Promise that resolves when audio session is ready
   */
  const waitForAudioSessionReady = async (maxAttempts: number = AUDIO_CONFIG.MAX_POLL_ATTEMPTS): Promise<boolean> => {
    // Android doesn't need polling - audio is immediately ready
    if (Platform.OS !== 'ios') {
      return true;
    }

    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        // Try to get the audio session status
        // If this succeeds without error, audio session is ready
        const status = await Audio.getPermissionsAsync();
        if (status.granted && status.canAskAgain !== undefined) {
          console.log(`[Audio] Session ready after ${attempts * AUDIO_CONFIG.POLL_INTERVAL_MS}ms`);
          return true;
        }
      } catch (error) {
        // Session not ready yet, continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.POLL_INTERVAL_MS));
      attempts++;
    }
    
    console.warn(`[Audio] Session check timed out after ${maxAttempts * AUDIO_CONFIG.POLL_INTERVAL_MS}ms`);
    return true; // Continue anyway after timeout
  };

  /**
   * Configures audio mode for recording
   * Always reconfigures to ensure proper state (no caching to avoid iOS issues)
   */
  const configureAudioMode = async (): Promise<void> => {
    console.log('[Audio] Configuring audio mode...');
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeAndroid: 2, // DuckOthers
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    
    console.log('[Audio] Audio mode configured successfully');
  };

  /**
   * Attempts to prepare the audio recording with retry logic
   * 
   * @param recording - Audio.Recording instance to prepare
   * @param attempt - Current attempt number (for retry logic)
   * @returns Promise that resolves when recording is prepared
   */
  const prepareRecordingWithRetry = async (
    recording: Audio.Recording, 
    attempt: number = 0
  ): Promise<void> => {
    try {
      console.log(`[Audio] Preparing recording (attempt ${attempt + 1}/${AUDIO_CONFIG.MAX_RETRY_ATTEMPTS + 1})...`);
      
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: CHAT_INPUT.AUDIO.SAMPLE_RATE,
          numberOfChannels: CHAT_INPUT.AUDIO.NUMBER_OF_CHANNELS,
          bitRate: CHAT_INPUT.AUDIO.BIT_RATE,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: CHAT_INPUT.AUDIO.SAMPLE_RATE,
          numberOfChannels: CHAT_INPUT.AUDIO.NUMBER_OF_CHANNELS,
          bitRate: CHAT_INPUT.AUDIO.BIT_RATE,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: CHAT_INPUT.AUDIO.BIT_RATE,
        },
      });
      
      console.log('[Audio] Recording prepared successfully');
    } catch (error) {
      // If this isn't the last attempt, retry with delay
      if (attempt < AUDIO_CONFIG.MAX_RETRY_ATTEMPTS) {
        console.log(`[Audio] Prepare failed, retrying in ${AUDIO_CONFIG.RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.RETRY_DELAY_MS));
        return prepareRecordingWithRetry(recording, attempt + 1);
      }
      
      // Last attempt failed, throw error
      throw error;
    }
  };

  // ============================================================================
  // RECORDING FUNCTIONS
  // ============================================================================

  /**
   * Starts audio recording with intelligent session management
   * Uses polling instead of fixed delays for better reliability and UX
   * Implements retry logic for robust error handling
   * Always reconfigures audio mode to ensure proper iOS state
   */
  const startRecording = async () => {
    // Haptic feedback on recording start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const startTime = Date.now();
    
    try {
      // Step 1: Request permissions if needed
      console.log('[Audio] Checking permissions...');
      const { status } = await Audio.getPermissionsAsync();
      let permissionJustGranted = false;
      
      if (status !== 'granted') {
        console.log('[Audio] Requesting microphone permission...');
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        
        if (newStatus !== 'granted') {
          handleError(new Error('Microphone permission not granted'), 'Recording');
          return;
        }
        
        permissionJustGranted = true;
        console.log('[Audio] Permission granted');
      }

      // Step 2: Configure audio mode (always reconfigure for reliability)
      await configureAudioMode();

      // Step 3: Poll for audio session readiness (iOS only, adaptive timing)
      if (Platform.OS === 'ios') {
        console.log('[Audio] Polling for audio session readiness...');
        await waitForAudioSessionReady();
        
        // Add minimum delay after polling to ensure stability
        await new Promise(resolve => setTimeout(resolve, AUDIO_CONFIG.MIN_IOS_DELAY_MS));
      }

      // Step 4: Create recording instance
      console.log('[Audio] Creating recording instance...');
      const newRecording = new Audio.Recording();
      
      // Step 5: Prepare recording with retry logic
      await prepareRecordingWithRetry(newRecording);
      
      // Step 6: Start recording
      console.log('[Audio] Starting recording...');
      await newRecording.startAsync();

      // Step 7: Update state
      setRecording(newRecording);
      setIsRecording(true);
      recordingStartTime.current = Date.now();
      
      const totalTime = Date.now() - startTime;
      console.log(`[Audio] ✅ Recording started successfully (total time: ${totalTime}ms)`);
    } catch (err) {
      const totalTime = Date.now() - startTime;
      console.error(`[Audio] ❌ Recording failed after ${totalTime}ms:`, err);
      handleError(err, 'Recording');
      
      // Clean up on error
      setRecording(null);
      setIsRecording(false);
      recordingStartTime.current = null;
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    // Haptic feedback on recording stop
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        handleError(new Error('Failed to retrieve the recording URI.'), 'Recording');
        return;
      }

      // Calculate recording duration in seconds (same as web app)
      const duration = recordingStartTime.current 
        ? Math.floor((Date.now() - recordingStartTime.current) / 1000) 
        : 1; // Default to 1 second if no start time
      
      console.log('[Audio] Recording stopped, duration:', duration, 'seconds');

      // Reset audio mode to allow playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        // interruptionModeAndroid values: 1 = DoNotMix, 2 = DuckOthers
        interruptionModeAndroid: 1, // DoNotMix - normal playback mode
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      // Pass audio duration to backend (same as web app)
      onShouldSend(uri, 'audio', null, undefined, { audio_duration: duration });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('[Audio] Recording stop failed:', err);
      handleError(err, 'Recording');
    } finally {
      setRecording(null);
      recordingStartTime.current = null; // Reset start time
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    // Haptic feedback on cancel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      
      // Reset audio mode to allow playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        // interruptionModeAndroid values: 1 = DoNotMix, 2 = DuckOthers
        interruptionModeAndroid: 1, // DoNotMix - normal playback mode
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      
      console.log('[Audio] Recording cancelled successfully');
      // Don't send the recording, just discard it
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      console.error('[Audio] Recording cancel failed:', err);
      handleError(err, 'Recording', { showAlert: false }); // Silent error for cancel
    } finally {
      setRecording(null);
      recordingStartTime.current = null; // Reset start time
    }
  };


  // Handle multiline input - removed LayoutAnimation to prevent callback leaks
  const handleContentSizeChange = (event: any) => {
    const newHeight = Math.min(
      Math.max(CHAT_INPUT.MIN_HEIGHT, event.nativeEvent.contentSize.height),
      CHAT_INPUT.MAX_HEIGHT
    );
    
    // Simple state update without LayoutAnimation
    // This prevents the "Excessive pending callbacks" error
    setInputHeight(newHeight);
  };

  const onChangeText = (text: string) => {
    setMessage(text);
  };

  const onSend = () => {
    // Haptic feedback on send
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Keyboard.dismiss();
    
    // Prepare generation options for cloud models (skip for local)
    // Only include imageProvider/imageModel when actually generating images
    const options = !isLocal ? {
      webSearch: generationOptions.webSearch,
      generateImage: generationOptions.generateImage,
      ...(generationOptions.generateImage !== 'none' && {
        imageProvider: generationOptions.imageProvider,
        imageModel: generationOptions.imageModel,
      }),
      generateVideo: generationOptions.generateVideo,
      enableArtifacts: generationOptions.enableArtifacts,
      modelId: currentModelId, // Pass the selected model ID
      files: files.length > 0 ? files : undefined, // Pass files array in options
    } : undefined;
    
    console.log('[ChatInput] Sending message with options:', JSON.stringify(options, null, 2));
    console.log('[ChatInput] Files count:', files.length);
    
    // Handle files if any are attached
    if (files.length > 0) {
      // Determine primary file type for messageType
      const hasImage = files.some(f => f.type.startsWith('image/'));
      const hasVideo = files.some(f => f.type.startsWith('video/'));
      const hasAudio = files.some(f => f.type.startsWith('audio/'));
      
      const fileType = hasImage ? 'image' : hasVideo ? 'video' : hasAudio ? 'audio' : 'file';
      
      // Send first file URI with message type, options will contain all files
      onShouldSend(files[0].uri, fileType, null, message, options);
      // Don't call fetchMessages - sendMessage already handles state correctly
      setFiles?.([]);
    } else {
      onShouldSend(message, 'text', null, '', options);
    }
    
    // Reset generation options after sending
    // This ensures image/video generation options are cleared after use
    setGenerationOptions(prev => ({
      ...prev,
      generateImage: 'none',
      generateVideo: 'none',
    }));
    
    setMessage('');
    setInputHeight(CHAT_INPUT.MIN_HEIGHT);
  };

  // Check if any generation option is active
  const hasActiveOptions = generationOptions.webSearch || 
                          generationOptions.generateImage !== 'none' || 
                          generationOptions.generateVideo !== 'none';

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.6,
      });

      if (!result.canceled && setFiles) {
        const asset = result.assets[0];
        const selectedFile: SelectedFile = {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize,
          width: asset.width,
          height: asset.height,
        };
        
        // Add to files array (limit to 5 files)
        if (files.length < 5) {
          setFiles([...files, selectedFile]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Limit Reached', 'Maximum 5 files allowed per message');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      handleError(error, 'Image Picker');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        handleError(new Error('Permission to access camera is required!'), 'Camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.6,
      });

      if (!result.canceled && setFiles) {
        const asset = result.assets[0];
        const selectedFile: SelectedFile = {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || `photo_${Date.now()}.jpg`,
          size: asset.fileSize,
          width: asset.width,
          height: asset.height,
        };
        
        // Add to files array (limit to 5 files)
        if (files.length < 5) {
          setFiles([...files, selectedFile]);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Alert.alert('Limit Reached', 'Maximum 5 files allowed per message');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      handleError(error, 'Camera');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
      });

      if (result.canceled || !setFiles) return;
      
      const asset = result.assets[0];
      const selectedFile: SelectedFile = {
        uri: asset.uri,
        type: asset.mimeType || 'application/octet-stream',
        name: asset.name || `document_${Date.now()}`,
        size: asset.size,
      };
      
      // Add to files array (limit to 5 files)
      if (files.length < 5) {
        setFiles([...files, selectedFile]);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('Limit Reached', 'Maximum 5 files allowed per message');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      handleError(error, 'Document Picker');
    }
  };

  // File management functions - handled in parent (ChatPage)
  // Files are displayed above the input in ChatPage with remove buttons


  return (
    <View style={[styles.container]}>
      <GlassSurface style={styles.inputContainer} borderRadius={28} strong>
        <View style={styles.row}>
          {/* Attachments are hidden in local mode — the on-device text-only model
              can't consume images/documents, so offering them would mislead. */}
          {!isLocal && (
            <View style={styles.attachmentButtonContainer}>
              <TouchableOpacity
                disabled={isLoading}
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  // Always show attachments modal - file preview is already visible above input
                  setShowAttachmentsModal(true);
                }}
                style={styles.roundBtn}
                accessibilityLabel="Show attachments and AI options"
                accessibilityRole="button"
                accessibilityHint="Opens modal to show camera, gallery, document options, and AI settings"
                accessibilityState={{ disabled: isLoading }}
              >
                <Ionicons
                  name="add"
                  size={30}
                  color={isLoading ? theme.colors.mutedForeground : theme.colors.chatIcons}
                  style={{ opacity: isLoading ? 0.5 : 1 }}
                />
              </TouchableOpacity>

              {/* File count badge */}
              {files.length > 0 && (
                <View style={styles.fileBadge}>
                  <Text style={styles.fileBadgeText}>{files.length}</Text>
                </View>
              )}
            </View>
          )}

          <TextInput
            // autoFocus
            ref={inputRef}
            placeholder="Message"
            style={[styles.messageInput, { height: inputHeight }]}
            placeholderTextColor={theme.colors.mutedForeground}
            onChangeText={onChangeText}
            value={message}
            multiline={true}
            numberOfLines={4}
            onContentSizeChange={handleContentSizeChange}
            textAlignVertical="center"
            returnKeyType="default"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={true}
            // editable={!isLoading}
            inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_VIEW_ID : undefined}
          />
          {isLoading ? (
            // Show stop button during streaming (replaces send/mic button)
            <TouchableOpacity 
              onPress={async () => {
                if (onStopStreaming) {
                  await onStopStreaming();
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }
              }}
              accessibilityLabel="Stop generation"
              accessibilityRole="button"
              accessibilityHint="Stops the AI from generating more content"
            >
              <Ionicons 
                name="stop-circle" 
                size={30} 
                color={theme.colors.mutedForeground} 
              />
            </TouchableOpacity>
          ) : message.length > 0 ? (
            // Show send button when not loading and message exists
            <TouchableOpacity 
              onPress={onSend}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              accessibilityHint="Sends your message"
            >
              <Ionicons 
                name="arrow-up-circle" 
                size={30} 
                color={theme.colors.chatIcons} 
              />
            </TouchableOpacity>
          ) : (
            // Show microphone button when not loading and no message
            <TouchableOpacity 
              onPress={isRecording ? stopRecording : startRecording}
              accessibilityLabel={isRecording ? "Stop recording" : "Start voice recording"}
              accessibilityRole="button"
              accessibilityHint={isRecording ? "Stops and sends voice message" : "Starts voice recording"}
              accessibilityState={{ selected: isRecording }}
            >
              <Ionicons name="mic-outline" size={30} color={isRecording ? theme.colors.red : theme.colors.chatIcons} />
            </TouchableOpacity>
          )}
        </View>
      </GlassSurface>

      {/* Attachments Modal with integrated AI Options */}
      <AttachmentsModal
        visible={showAttachmentsModal}
        onClose={() => setShowAttachmentsModal(false)}
        onTakePhoto={takePhoto}
        onPickImage={pickImageFromGallery}
        onPickDocument={pickDocument}
        isLocal={isLocal}
        generationOptions={generationOptions}
        onGenerationOptionsChange={setGenerationOptions}
        canGenerateImage={mediaCapabilities.image}
        canGenerateVideo={mediaCapabilities.video}
      />

      {/* iOS Keyboard Accessory View */}
      {/* <KeyboardAccessoryView
        inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
        onDismiss={() => {
          Keyboard.dismiss();
          inputRef.current?.blur();
        }}
      /> */}
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  inputContainer: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: Platform.OS === 'ios' ? 6 : 10,
    paddingTop: 10,
    paddingBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  messageInput: {
    flex: 1,
    minHeight: CHAT_INPUT.MIN_HEIGHT,
    marginHorizontal: 10,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: theme.colors.text,
    backgroundColor: 'transparent',
    fontSize: 16,
    lineHeight: 20,
  },
  roundBtn: {
    width: CHAT_INPUT.BUTTON_WIDTH,
    height: CHAT_INPUT.BUTTON_WIDTH,
    borderRadius: 20,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  selectedFileContainer: {
    marginBottom: 4,
    marginLeft: 16,
  },
  closeIcon: {
    left: 33,
    top: 2,
    zIndex: 1000
  },
  // Touch target improvements (minimum 44px)
  iconButton: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentButtonContainer: {
    position: 'relative',
  },
  fileBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.background,
  },
  fileBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
export default ChatInput;
