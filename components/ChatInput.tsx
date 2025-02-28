import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';

const ATouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity);

export type Props = {
  onShouldSend: (message: string, type?: string) => void;
};

const ChatInput = ({ onShouldSend }: Props) => {
  const [message, setMessage] = useState('');
  const { bottom } = useSafeAreaInsets();
  const expanded = useSharedValue(0);
  const inputRef = useRef<TextInput>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async () => {
    try {
      const { status } = await Audio.getPermissionsAsync();
      if (status !== 'granted') {
        const { status: newStatus } = await Audio.requestPermissionsAsync();
        if (newStatus !== 'granted') {
          alert('Microphone permission not granted');
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
      await newRecording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await newRecording.startAsync();

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error('Recording error:', err);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        console.error('Failed to retrieve the recording URI.');
        return;
      }

      console.log('Audio file saved at:', uri);
      onShouldSend(uri, 'audio');
    } catch (err) {
      console.error('Error stopping the recording:', err);
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
    onShouldSend(message);
    setMessage('');
  };

  const onSelectFile = () => {
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images, // Дозволяє вибирати тільки зображення
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets[0].uri;
        console.log('Selected Image URI:', uri);
        onShouldSend(uri, 'image');
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
        const uri = result.assets[0].uri;
        console.log('Photo taken URI:', uri);
        onShouldSend(uri, 'image');
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

      console.log('Selected document:', result);
      onShouldSend(result.uri, 'file');
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };


  return (
    <BlurView intensity={90} tint="extraLight" style={{ paddingBottom: bottom, paddingTop: 10 }}>
      <View style={styles.row}>
        <ATouchableOpacity onPress={expandItems} style={[styles.roundBtn, expandButtonStyle]}>
          <Ionicons name="add" size={24} color={Colors.grey} />
        </ATouchableOpacity>

        <Animated.View style={[styles.buttonView, buttonViewStyle]}>
          <TouchableOpacity onPress={takePhoto}>
            <Ionicons name="camera-outline" size={24} color={Colors.grey} />
          </TouchableOpacity>

          <TouchableOpacity onPress={pickImageFromGallery}>
            <Ionicons name="image-outline" size={24} color={Colors.grey} />
          </TouchableOpacity>

          <TouchableOpacity onPress={pickDocument}>
            <Ionicons name="folder-outline" size={24} color={Colors.grey} />
          </TouchableOpacity>
        </Animated.View>

        <TextInput
          autoFocus
          ref={inputRef}
          placeholder="Message"
          style={styles.messageInput}
          onFocus={collapseItems}
          onChangeText={onChangeText}
          value={message}
          multiline
        />
        {message.length > 0 ? (
          <TouchableOpacity onPress={onSend}>
            <Ionicons name="arrow-up-circle" size={30} color={Colors.grey} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={isRecording ? stopRecording : startRecording}>
            <FontAwesome6 name="microphone" size={24} color={isRecording ? Colors.red : Colors.grey} />
          </TouchableOpacity>
        )}
      </View>
    </BlurView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  messageInput: {
    flex: 1,
    marginHorizontal: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    padding: 10,
    borderColor: Colors.greyLight,
    backgroundColor: Colors.light.background,
  },
  roundBtn: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: Colors.input,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonView: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
export default ChatInput;
