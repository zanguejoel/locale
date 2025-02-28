import { memo, useState } from 'react';
import Colors from '@/constants/Colors';
import useMarkdownDisplay from '@/hooks/useMarkdownDisplay';
import { copyImageToClipboard, downloadAndSaveImage, shareImage } from '@/utils/Image';
import { Message, Role } from '@/utils/Interfaces';
import { Link } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ActivityIndicator,
  Pressable,
  Animated,
  AccessibilityInfo,
  Platform,
} from 'react-native';
import * as ContextMenu from 'zeego/context-menu';
import { useCallback, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import AntDesign from '@expo/vector-icons/AntDesign';
import Entypo from '@expo/vector-icons/Entypo';

interface ChatMessageProps extends Message {
  loading?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
}

const IMAGE_PREVIEW_SIZE = 240;
const BORDER_RADIUS = 15;

const contextItems = [
  {
    id: 'copy',
    title: 'Copy',
    systemIcon: 'doc.on.doc',
    action: (url: string) => copyImageToClipboard(url),
  },
  {
    id: 'save',
    title: 'Save to Photos',
    systemIcon: 'arrow.down.to.line',
    action: (url: string) => downloadAndSaveImage(url),
  },
  {
    id: 'share',
    title: 'Share',
    systemIcon: 'square.and.arrow.up',
    action: (url: string) => shareImage(url),
  },
] as const;

const ChatMessage = memo(({
  content,
  role,
  imageUrl,
  prompt,
  loading,
  onLongPress,
  onPress,
}: ChatMessageProps) => {

  const sound = useRef(new Audio.Sound());
  const [isPlaying, setIsPlaying] = useState(false);
  const MarkdownDisplay = useMarkdownDisplay();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isAudio = (uri: string) => {
    if (!uri) return false;

    const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.amr'];

    return audioExtensions.some(ext => uri.toLowerCase().endsWith(ext));
  };


  const isImage = (uri: string) => {
    if (!uri) return false;

    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];

    return imageExtensions.some(ext => uri.toLowerCase().endsWith(ext));
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePress = useCallback(() => {
    onPress?.();
    if (Platform.OS === 'ios') {
      const message = role === Role.Bot ? 'Assistant message: ' : 'Your message: ';
      AccessibilityInfo.announceForAccessibility(message + content);
    }
  }, [content, role, onPress]);

  const playAudio = async () => {
    try {
      if (isPlaying) {
        await sound.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.current.unloadAsync();
        await sound.current.loadAsync({ uri: content });
        await sound.current.playAsync();
        setIsPlaying(true);
        sound.current.setOnPlaybackStatusUpdate((status) => {
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };

  const renderImage = () => (
    <ContextMenu.Root>
      <ContextMenu.Trigger>
        <Link
          href={`/(chatStack)/(modal)/image/${encodeURIComponent(
            imageUrl!
          )}?prompt=${encodeURIComponent(prompt!)}`}
          asChild
        >
          <Pressable
            onLongPress={onLongPress}
            onPress={handlePress}
            accessible={true}
            accessibilityLabel={`Image preview. ${prompt}`}
            accessibilityRole="image"
          >
            <Image
              source={{ uri: imageUrl }}
              style={styles.previewImage}
              resizeMode="cover"
            />
          </Pressable>
        </Link>
      </ContextMenu.Trigger>
      <ContextMenu.Content>
        {contextItems.map((item) => (
          <ContextMenu.Item
            key={item.id}
            onSelect={() => item.action(imageUrl!)}
          >
            <ContextMenu.ItemTitle>{item.title}</ContextMenu.ItemTitle>
            <ContextMenu.ItemIcon
              ios={{
                name: item.systemIcon,
                pointSize: 18,
              }}
            />
          </ContextMenu.Item>
        ))}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );

  const renderContent = () => (
    <Pressable
      onLongPress={onLongPress}
      onPress={handlePress}
      style={[
        styles.contentContainer,
        role === Role.Bot ? styles.botContent : styles.userContent,
      ]}
      accessible={true}
      accessibilityLabel={`${role === Role.Bot ? 'Assistant' : 'Your'} message: ${content}`}
      accessibilityRole="text"
    >
      {isAudio(content) ? (
        <Pressable style={styles.audioPlayer} onPress={playAudio}>
          {!isPlaying ? (
            <View style={styles.audioPlayer}>
              <AntDesign name="caretright" size={14} color="black" />
              <Text style={styles.audioText}>Play Audio</Text>
            </View>
          ) : (
            <View style={styles.audioPlayer}>
              <Entypo name="controller-paus" size={14} color="black" />
              <Text style={styles.audioText}>Stop Audio</Text>
            </View>
          )}
        </Pressable>
      ) : isImage(content) ? (
        <Image
          source={{ uri: content }}
          style={styles.previewImage}
          resizeMode="cover"
        />
      ) : (
        <MarkdownDisplay>{content}</MarkdownDisplay>
      )}
    </Pressable>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim },
        role === Role.Bot ? styles.botContainer : styles.userContainer,
      ]}
    >

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.primary} size="small" />
        </View>
      ) : (
        <View style={styles.messageContent}>
          {content === '' && imageUrl ? renderImage() : renderContent()}
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    maxWidth: '90%',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  audioText: {
    marginLeft: 9
  },
  botContainer: {
    alignSelf: 'flex-start',
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  avatarContainer: {
    marginRight: 8,
  },
  messageContent: {
    flex: 1,
  },
  contentContainer: {
    borderRadius: BORDER_RADIUS,
    padding: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  botContent: {
    backgroundColor: `${Colors.greyLight}30`,
    borderBottomLeftRadius: 4,
  },
  userContent: {
    backgroundColor: `${Colors.primary}30`,
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  botText: {
    color: Colors.grey,
  },
  userText: {
    color: Colors.light,
  },
  previewImage: {
    width: IMAGE_PREVIEW_SIZE,
    height: IMAGE_PREVIEW_SIZE,
    borderRadius: BORDER_RADIUS,
  },
  loading: {
    height: 30,
    justifyContent: 'center',
    marginLeft: 8,
  },
});

export default ChatMessage;