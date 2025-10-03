import Colors from '@/constants/Colors';
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
import { isLoaded } from 'expo-font';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';


const ATouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

const MIN_HEIGHT = 40;

export type Props = {
  onShouldSend: (message: string, type?: string, operation?: string | null, additionalData?: string) => void;
  fetchMessages?: (conversationId?: string) => void | Promise<void>
  selectedImage?: ImagePicker.ImagePickerAsset | null
  setSelectedImage?: (a: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset | null) => void,
  isLoading?: boolean
  onRecordingStateChange?: (isRecording: boolean, onCancel: () => void) => void;
};

const ChatInput = ({ onShouldSend, fetchMessages, selectedImage, setSelectedImage, isLoading, onRecordingStateChange }: Props) => {
  const [message, setMessage] = useState('');
  const theme = useTheme();
  const styles = getStyles(theme);

  const expanded = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);
  const [inputHeight, setInputHeight] = useState(MIN_HEIGHT);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

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
          alert('Microphone permission not granted');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 128000,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
        console.error('Failed to retrieve the recording URI.');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      onShouldSend(uri, 'audio');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Error stopping the recording:', err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      console.error('Error canceling the recording:', err);
    } finally {
      setRecording(null);
    }
  };

  const expandItems = () => {
    expanded.value = withTiming(1, { duration: 400 });
  };

  const collapseItems = () => {
    expanded.value = withTiming(0, { duration: 400 });
  };

  const expandButtonStyle = useAnimatedStyle(() => {
    const opacityInterpolation = interpolate(expanded.value, [0, 1], [1, 0], Extrapolation.CLAMP);
    const widthInterpolation = interpolate(expanded.value, [0, 1], [30, 0], Extrapolation.CLAMP);

    return {
      opacity: opacityInterpolation,
      width: widthInterpolation,
    };
  });

  const buttonViewStyle = useAnimatedStyle(() => {
    const widthInterpolation = interpolate(expanded.value, [0, 1], [0, 100], Extrapolation.CLAMP);
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
    if (selectedImage) {
      onShouldSend(selectedImage?.uri, 'image', null, message);
      fetchMessages?.()
    } else {
      onShouldSend(message);
    }
    setSelectedImage?.(null)
    setMessage('');
    setInputHeight(MIN_HEIGHT);

  };

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
      console.error('Error picking image from gallery:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access camera is required!');
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
      console.error('Error taking photo:', error);
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
      console.error('Error picking document:', error);
    }
  };


  return (
    <View style={[styles.container]}>
      <View style={styles.inputContainer}>
        <View style={styles.row}>
          <ATouchableOpacity onPress={expandItems} style={[styles.roundBtn, expandButtonStyle]}>
            <Ionicons name="add" size={24} color={theme.colors.grey} />
          </ATouchableOpacity>

          <Animated.View style={[styles.buttonView, buttonViewStyle]}>
            <TouchableOpacity onPress={takePhoto}>
              <Ionicons name="camera-outline" size={24} color={theme.colors.chatIcons} />
            </TouchableOpacity>

            <TouchableOpacity onPress={pickImageFromGallery}>
              <Ionicons name="image-outline" size={24} color={theme.colors.chatIcons} />
            </TouchableOpacity>

            <TouchableOpacity onPress={pickDocument}>
              <Ionicons name="folder-outline" size={24} color={theme.colors.chatIcons} />
            </TouchableOpacity>
          </Animated.View>

          <TextInput
            // autoFocus
            ref={inputRef}
            placeholder="Message"
            style={[styles.messageInput]}
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
            >
              <Ionicons 
                name="arrow-up-circle" 
                size={30} 
                color={isLoading ? theme.colors.grey : theme.colors.primary} 
              />
            </ATouchableOpacity>
          ) : (
            <TouchableOpacity disabled={isLoading} onPress={isRecording ? stopRecording : startRecording}>
              <Ionicons name="mic-outline" size={30} color={isRecording ? theme.colors.red : (isLoading ? theme.colors.chatIcons : theme.colors.chatIcons)} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundLight
  },
  inputContainer: {
    paddingTop: 10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    maxHeight: 75,
    marginHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 10,
    color: theme.colors.text,
    borderColor: theme.colors.greyLight,
    backgroundColor: theme.colors.chatInputBg,
  },
  roundBtn: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: Colors.common.input,
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
  }
});
export default ChatInput;
