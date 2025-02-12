import { memo } from 'react';
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

interface ChatMessageProps extends Message {
  loading?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
}

const AVATAR_SIZE = 30;
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
  const MarkdownDisplay = useMarkdownDisplay();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
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
      <Text style={[
        styles.text,
        role === Role.Bot ? styles.botText : styles.userText,
      ]}>
        <MarkdownDisplay>{content}</MarkdownDisplay>
      </Text>
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