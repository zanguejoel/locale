import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Image, Keyboard, Platform, TextInput as RNTextInput } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedKeyboard,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRef, useState, useEffect } from 'react';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GenerationOptionsState } from './GenerationOptions';
import { CHAT_INPUT } from '@/constants/ChatConstants';
import { handleError } from '@/utils/ErrorHandler';
import KeyboardAccessoryView from './KeyboardAccessoryView';
import AttachmentsModal from './AttachmentsModal';



// Keyboard accessory view ID for iOS
const INPUT_ACCESSORY_VIEW_ID = 'chatInputAccessory';

export type Props = {
  onShouldSend: (message: string, type?: string, operation?: string | null, additionalData?: string, options?: any) => void;
  fetchMessages?: (conversationId?: string) => void | Promise<void>
  selectedImage?: ImagePicker.ImagePickerAsset | null
  setSelectedImage?: (a: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset | null) => void,
  isLoading?: boolean
  onRecordingStateChange?: (isRecording: boolean, onCancel: () => void) => void;
  isLocal?: boolean; // To show/hide generation options
  messages?: any[]; // For export functionality
  conversationTitle?: string; // For export functionality
};

const ChatInput = ({ onShouldSend, fetchMessages, selectedImage, setSelectedImage, isLoading, onRecordingStateChange, isLocal = false, messages = [], conversationTitle }: Props) => {
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState<number>(CHAT_INPUT.MIN_HEIGHT);
  const keyboard = useAnimatedKeyboard();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Generation options state
  const [generationOptions, setGenerationOptions] = useState<GenerationOptionsState>({
    webSearch: false,
    generateImage: 'none',
    imageProvider: 'openai', // Changed from 'stability' to 'openai' (backend supports this)
    imageModel: 'gpt-image-1', // Changed from 'stable-diffusion-xl' to 'gpt-image-1'
    generateVideo: 'none',
  });

  // Attachments modal state
  const [showAttachmentsModal, setShowAttachmentsModal] = useState(false);

  // Notify parent about recording state changes
  useEffect(() => {
    if (onRecordingStateChange) {
      onRecordingStateChange(isRecording, cancelRecording);
    }
  }, [isRecording]);
  const startRecording = async () => {
    // Haptic feedback on recording start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          handleError(new Error('Microphone permission not granted'), 'Recording');
          return;
        }
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });

      const newRecording = new Audio.Recording();
      await newRecording.prepareToRecordAsync({
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
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      handleError(err, 'Recording');
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

      onShouldSend(uri, 'audio');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      handleError(err, 'Recording');
    } finally {
      setRecording(null);
    }
  };

  const cancelRecording = async () => {
    if (!recording) return;

    // Haptic feedback on cancel
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      // Don't send the recording, just discard it
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch (err) {
      handleError(err, 'Recording', { showAlert: false }); // Silent error for cancel
    } finally {
      setRecording(null);
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
    const options = !isLocal ? generationOptions : undefined;
    
    console.log('[ChatInput] Sending message with options:', JSON.stringify(options, null, 2));
    console.log('[ChatInput] Generation options state:', JSON.stringify(generationOptions, null, 2));
    
    if (selectedImage) {
      onShouldSend(selectedImage?.uri, 'image', null, message, options);
      fetchMessages?.()
    } else {
      onShouldSend(message, 'text', null, '', options);
    }
    setSelectedImage?.(null)
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
        quality: 1,
      });

      if (!result.canceled) {
        const assets = result.assets[0];
        setSelectedImage?.(assets)
        // onShouldSend(assets.uri, 'image');
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
        quality: 1,
      });

      if (!result.canceled) {
        const assets = result.assets[0];
        setSelectedImage?.(assets)

        // onShouldSend(uri, 'image');
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

      if (result.canceled) return;
      const assets = result.assets[0];
      setSelectedImage?.(assets)

      // onShouldSend(result.uri, 'file');
    } catch (error) {
      handleError(error, 'Document Picker');
    }
  };

  return (
    <View style={[styles.container]}>
      <View style={styles.inputContainer}>
        <View style={styles.row}>
          <TouchableOpacity 
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowAttachmentsModal(true);
            }} 
            style={styles.roundBtn}
            accessibilityLabel="Show attachments"
            accessibilityRole="button"
            accessibilityHint="Opens modal to show camera, gallery, and document options"
          >
            <Ionicons name="add" size={24} color={theme.colors.mutedForeground} />
          </TouchableOpacity>

          <TextInput
            // autoFocus
            ref={inputRef}
            placeholder="Message"
            style={[styles.messageInput, { height: inputHeight }]}
            placeholderTextColor={theme.colors.mutedForeground}
            onChangeText={onChangeText}
            value={message}
            multiline={true}
            onContentSizeChange={handleContentSizeChange}
            textAlignVertical="center"
            returnKeyType="default"
            blurOnSubmit={false}
            enablesReturnKeyAutomatically={true}
            inputAccessoryViewID={Platform.OS === 'ios' ? INPUT_ACCESSORY_VIEW_ID : undefined}
          />
          {message.length > 0 ? (
            <TouchableOpacity 
              disabled={isLoading} 
              onPress={onSend}
              accessibilityLabel="Send message"
              accessibilityRole="button"
              accessibilityHint="Sends your message"
              accessibilityState={{ disabled: isLoading }}
            >
              <Ionicons 
                name="arrow-up-circle" 
                size={30} 
                color={isLoading ? theme.colors.mutedForeground : theme.colors.primary} 
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              disabled={isLoading} 
              onPress={isRecording ? stopRecording : startRecording}
              accessibilityLabel={isRecording ? "Stop recording" : "Start voice recording"}
              accessibilityRole="button"
              accessibilityHint={isRecording ? "Stops and sends voice message" : "Starts voice recording"}
              accessibilityState={{ disabled: isLoading, selected: isRecording }}
            >
              <Ionicons name="mic-outline" size={30} color={isRecording ? theme.colors.red : (isLoading ? theme.colors.chatIcons : theme.colors.chatIcons)} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Attachments Modal (includes AI Options & Export) */}
      <AttachmentsModal
        visible={showAttachmentsModal}
        onClose={() => setShowAttachmentsModal(false)}
        onTakePhoto={takePhoto}
        onPickImage={pickImageFromGallery}
        onPickDocument={pickDocument}
        isLocal={isLocal}
        generationOptions={generationOptions}
        onGenerationOptionsChange={setGenerationOptions}
        messages={messages}
        conversationTitle={conversationTitle}
      />

      {/* iOS Keyboard Accessory View */}
      <KeyboardAccessoryView
        inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
        onDismiss={() => {
          Keyboard.dismiss();
          inputRef.current?.blur();
        }}
      />
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  inputContainer: {
    paddingTop: 10,
   // borderTopLeftRadius: 24,
    //borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  row: {
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  messageInput: {
    flex: 1,
    minHeight: CHAT_INPUT.MIN_HEIGHT,
    marginHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    color: theme.colors.text,
    borderColor: theme.colors.greyLight,
    backgroundColor: theme.colors.chatInputBg,
    fontSize: 16,
    lineHeight: 20,
  },
  roundBtn: {
    width: CHAT_INPUT.BUTTON_WIDTH,
    height: CHAT_INPUT.BUTTON_WIDTH,
    borderRadius: 20,
    backgroundColor: theme.colors.input,
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
});
export default ChatInput;
