import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity, Image, Keyboard, KeyboardAvoidingView, Platform } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRef, useState, useEffect } from 'react';

import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import GenerationOptions, { GenerationOptionsState } from './GenerationOptions';
import { CHAT_INPUT } from '@/constants/ChatConstants';
import { handleError } from '@/utils/ErrorHandler';


const ATouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export type Props = {
  onShouldSend: (message: string, type?: string, operation?: string | null, additionalData?: string, options?: any) => void;
  fetchMessages?: (conversationId?: string) => void | Promise<void>
  selectedImage?: ImagePicker.ImagePickerAsset | null
  setSelectedImage?: (a: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset | null) => void,
  isLoading?: boolean
  onRecordingStateChange?: (isRecording: boolean, onCancel: () => void) => void;
  isLocal?: boolean; // To show/hide generation options
};

const ChatInput = ({ onShouldSend, fetchMessages, selectedImage, setSelectedImage, isLoading, onRecordingStateChange, isLocal = false }: Props) => {
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const styles = getStyles(theme);

  const expanded = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(CHAT_INPUT.MIN_HEIGHT);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  // Generation options state
  const [showGenerationOptions, setShowGenerationOptions] = useState(false);
  const [generationOptions, setGenerationOptions] = useState<GenerationOptionsState>({
    webSearch: false,
    generateImage: 'none',
    imageProvider: 'stability',
    imageModel: 'stable-diffusion-xl',
    generateVideo: 'none',
  });

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

  const expandItems = () => {
    expanded.value = withTiming(1, { duration: CHAT_INPUT.ANIMATION_DURATION });
  };

  const collapseItems = () => {
    expanded.value = withTiming(0, { duration: CHAT_INPUT.ANIMATION_DURATION });
  };

  const expandButtonStyle = useAnimatedStyle(() => {
    const opacityInterpolation = interpolate(expanded.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    const widthInterpolation = interpolate(expanded.value, [0, 1], [CHAT_INPUT.BUTTON_WIDTH, 0], Extrapolation.CLAMP);

    return {
      opacity: opacityInterpolation,
      width: widthInterpolation,
    };
  });

  const buttonViewStyle = useAnimatedStyle(() => {
    // Adjust width based on whether we're showing generation options (4 buttons vs 3)
    const maxWidth = !isLocal ? CHAT_INPUT.BUTTON_VIEW_WIDTH_CLOUD : CHAT_INPUT.BUTTON_VIEW_WIDTH_LOCAL;
    const widthInterpolation = interpolate(expanded.value, [0, 1], [0, maxWidth], Extrapolation.CLAMP);
    return {
      width: widthInterpolation,
      opacity: expanded.value,
    };
  });

  const onChangeText = (text: string) => {
    collapseItems();
    setMessage(text);
  };

  const onSend = () => {
    // Haptic feedback on send
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    Keyboard.dismiss();
    
    // Prepare generation options for cloud models (skip for local)
    const options = !isLocal ? generationOptions : undefined;
    
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

  const handleOpenGenerationOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGenerationOptions(true);
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
          <ATouchableOpacity 
            onPress={expandItems} 
            style={[styles.roundBtn, expandButtonStyle]}
            accessibilityLabel="Show more options"
            accessibilityRole="button"
            accessibilityHint="Expands to show camera, gallery, and document options"
          >
            <Ionicons name="add" size={24} color={theme.colors.mutedForeground} />
          </ATouchableOpacity>

          <Animated.View style={[styles.buttonView, buttonViewStyle]}>
            <TouchableOpacity 
              onPress={takePhoto}
              accessibilityLabel="Take photo"
              accessibilityRole="button"
              accessibilityHint="Opens camera to take a photo"
            >
              <Ionicons name="camera-outline" size={24} color={theme.colors.chatIcons} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={pickImageFromGallery}
              accessibilityLabel="Pick image from gallery"
              accessibilityRole="button"
              accessibilityHint="Opens photo gallery to select an image"
            >
              <Ionicons name="image-outline" size={24} color={theme.colors.chatIcons} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={pickDocument}
              accessibilityLabel="Pick document"
              accessibilityRole="button"
              accessibilityHint="Opens file picker to select a document"
            >
              <Ionicons name="folder-outline" size={24} color={theme.colors.chatIcons} />
            </TouchableOpacity>

            {/* Generation options button - only for cloud models */}
            {!isLocal && (
              <TouchableOpacity 
                onPress={handleOpenGenerationOptions}
                accessibilityLabel={hasActiveOptions ? "Generation options active" : "Generation options"}
                accessibilityRole="button"
                accessibilityHint="Configure image and video generation options"
                accessibilityState={{ selected: hasActiveOptions }}
              >
                <Ionicons 
                  name="sparkles" 
                  size={24} 
                  color={hasActiveOptions ? theme.colors.primary : theme.colors.chatIcons} 
                />
              </TouchableOpacity>
            )}
          </Animated.View>

          <TextInput
            // autoFocus
            ref={inputRef}
            placeholder="Message"
            style={[styles.messageInput]}
            placeholderTextColor={theme.colors.mutedForeground}
            onFocus={collapseItems}
            onChangeText={onChangeText}
            value={message}
            multiline={true}
          />
          {message.length > 0 ? (
            <ATouchableOpacity 
              disabled={isLoading} 
              onPress={onSend}
              style={{ transform: [{ scale: 1 }] }}
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
            </ATouchableOpacity>
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

      {/* Generation Options Modal */}
      <GenerationOptions
        visible={showGenerationOptions}
        onClose={() => setShowGenerationOptions(false)}
        options={generationOptions}
        onOptionsChange={setGenerationOptions}
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
    maxHeight: CHAT_INPUT.MAX_HEIGHT,
    marginHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 10,
    color: theme.colors.text,
    borderColor: theme.colors.greyLight,
    backgroundColor: theme.colors.chatInputBg,
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
});
export default ChatInput;
