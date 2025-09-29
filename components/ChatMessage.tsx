import { memo, useState } from 'react';
import Colors from '@/constants/Colors';
import useMarkdownDisplay from '@/hooks/useMarkdownDisplay';
import { copyImageToClipboard, downloadAndSaveImage, downloadAndSaveVideo, shareImage } from '@/utils/Image';
import { Message, Role } from '@/utils/Interfaces';
import { Link } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  AccessibilityInfo,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Share,
  Alert,
} from 'react-native';
import * as ContextMenu from 'zeego/context-menu';
import { useCallback, useEffect, useRef } from 'react';
import { Audio, Video } from 'expo-av';

import { Ionicons } from '@expo/vector-icons';

import Feather from '@expo/vector-icons/Feather';
import AnimatedText from './AnimatedText';

import AudioPlayer from './AudioPlayer';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface ChatMessageProps extends Message {
  loading?: boolean;
  error?: boolean;
  onLongPress?: () => void;
  onPress?: () => void;
  onRetry?: () => void;
  streamingContent?: boolean; // Add flag for streaming content
  isSending?: boolean;
  streamWorking?: boolean
  sendingText?: string
  imageData?: string
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


const LoadingDots = memo(() => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const dotAnimations = [
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current
  ];
  const animationsRunning = useRef(false);

  useEffect(() => {

    if (animationsRunning.current) {
      return;
    }

    // Create standalone animations for smoother performance
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(300), // Add consistent delay between cycles
        ])
      );
    };

    // Create and start animations with different delays for a cascading effect
    const animations = [
      createDotAnimation(dotAnimations[0], 0),
      createDotAnimation(dotAnimations[1], 150),
      createDotAnimation(dotAnimations[2], 300)
    ];

    animationsRunning.current = true;
    animations.forEach(anim => anim.start());

    // Cleanup function to stop animations when component unmounts
    return () => {
      animations.forEach(anim => anim.stop());
      dotAnimations.forEach(dot => dot.setValue(0));
      animationsRunning.current = false;
    };
  }, []);

  const getTranslateY = (dot: Animated.Value) => {
    return dot.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -8],
    });
  };

  return (
    <View
      style={styles.loadingDotsContainer}
      accessibilityLabel="Loading message"
      testID="loading-dots-container"
    >
      {dotAnimations.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.loadingDot,
            {
              transform: [{ translateY: getTranslateY(dot) }]
            }
          ]}
          testID={`loading-dot-${index}`}
        />
      ))}
    </View>
  );
});

const ChatMessage = memo(({
  content,
  role,
  imageUrl,
  prompt,
  loading = false,
  error,
  files,
  onLongPress,
  onPress,
  onRetry,
  streamingContent = false,
  isSending,
  streamWorking,
  imageData,
  intermediate
}: ChatMessageProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const sound = useRef(new Audio.Sound());
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [imageAttempts, setImageAttempts] = useState(0);
  const [isLoadingDownloadVideo, setLoadingDownloadVideo] = useState(false)
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

  const MarkdownDisplay = useMarkdownDisplay();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const videoRef = useRef<Video>(null);

  const handleFullScreenVideo = () => {
    if (videoRef.current) {
      videoRef.current.presentFullscreenPlayer();
    } else {
      Alert.alert('Error', 'Video reference not available');
    }
  };
  // Force loading state to be a boolean
  const isLoading = loading === true;

  const isAudio = (uri: string) => {
    if (!uri) return false;
    const audioExtensions = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.amr'];
    return audioExtensions.some(ext => uri.toLowerCase().endsWith(ext));
  };

  const isImage = (uri?: string) => {
    if (!uri) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
    return imageExtensions.some(ext => uri.toLowerCase().endsWith(ext));
  };

  // Add subtle pulse animation for streaming content
  useEffect(() => {
    if (streamingContent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      Animated.timing(pulseAnim, { toValue: 1, duration: 0, useNativeDriver: true }).stop();
    };
  }, [streamingContent]);

  // Handle fading in content when loaded
  useEffect(() => {
    if (!isLoading && !contentLoaded) {
      const timer = setTimeout(() => {
        setContentLoaded(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, contentLoaded, fadeAnim]);

  // Reset content loaded state when loading changes
  useEffect(() => {
    if (isLoading) {
      setContentLoaded(false);
      fadeAnim.setValue(0);
    }
  }, [isLoading, fadeAnim]);

  // Retry loading image if it fails (up to 3 attempts)
  useEffect(() => {
    if (imageLoadError && imageAttempts < 3) {
      const timer = setTimeout(() => {
        setImageLoadError(false);
        setImageAttempts(prev => prev + 1);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [imageLoadError, imageAttempts]);

  const handlePress = useCallback(() => {
    onPress?.();
    if (Platform.OS === 'ios') {
      const message = role === Role.Bot ? 'Assistant message: ' : 'Your message: ';
      AccessibilityInfo.announceForAccessibility(message + content);
    }
  }, [content, role, onPress]);

  // Function to handle copying the message content
  const handleCopyText = useCallback(() => {
    Clipboard.setString(content);
    // Optional feedback to user
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('Message copied to clipboard');
    } else {
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  }, [content]);

  // Function to handle sharing the message content
  const handleShareText = useCallback(async () => {
    try {
      const result = await Share.share({
        message: content,
      });
    } catch (error) {
      console.error('Error sharing message:', error);
    }
  }, [content]);

  // Function to show the text context menu
  const showTextContextMenu = useCallback(() => {
    if (onLongPress) {
      onLongPress();
    }

    // For platforms with ActionSheet but without context menu (older Android versions)
    if (Platform.OS === 'android' && !ContextMenu.isAvailable) {
      Alert.alert(
        'Message Options',
        '',
        [
          { text: 'Copy', onPress: handleCopyText },
          { text: 'Share', onPress: handleShareText },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    }
  }, [onLongPress, handleCopyText, handleShareText]);

  const playAudio = async () => {
    try {
      if (isPlaying) {
        await sound.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.current.unloadAsync();

        await sound.current.loadAsync(
          { uri: content || files[0]?.s3_url },
          { progressUpdateIntervalMillis: 1 }
        );
        await sound.current.playAsync();
        setIsPlaying(true);
        sound.current.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
    }
  };


  const handleImageError = (error: any) => {
    setImageLoadError(true);
  };

  const instructionForImageChatDisplay = () => {

    if (isImage(imageData)) {
      return encodeURI(imageData)
    } else if (content !== '' && files?.length) {
      return files[0]?.s3_url
    }
  }

  const instructionForTextInImageChat = () => {
    if (isImage(content)) {
      return content
    } else {
      return content
    }
  }

  const renderImageContent = () => {


    if (imageLoadError && imageAttempts >= 3) {
      return (
        <View style={styles.imageErrorContainer}>
          <Ionicons name="image-outline" size={40} color={Colors.common.grey} />
          <Text style={styles.imageErrorText}>Failed to load image</Text>
          <TouchableOpacity
            style={styles.retryImageButton}
            onPress={() => {
              setImageLoadError(false);
              setImageAttempts(0);
            }}
          >
            <Text style={styles.retryImageText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Ensure URL is properly encoded
    const processedUrl = imageData ? instructionForImageChatDisplay() : `https://app-dev.odyssey.com/api/local-media?file=${encodeURI(files[0].file_path)}`;

    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Link
            href={`/(modal)/image/${encodeURIComponent(processedUrl)}?prompt=${encodeURIComponent(prompt || '')}`}
            asChild
          >
            <Pressable
              onLongPress={onLongPress}
              onPress={handlePress}
              accessible={true}
              accessibilityLabel={`Image preview. ${prompt}`}
              accessibilityRole="image"
              testID="image-preview-pressable"
            >
              <View style={styles.imageContainer} testID="image-container">
                {(imageLoadError || !contentLoaded) && (
                  <View style={styles.imageLoadingOverlay} testID="image-loading-overlay">
                    <ActivityIndicator size="large" color={Colors.common.primary} />
                    {imageLoadError && <Text style={styles.imageLoadingText}>Retrying...</Text>}
                  </View>
                )}
                <Image
                  source={{ uri: processedUrl, cache: 'force-cache' }}
                  style={styles.previewImage}
                  resizeMode="cover"
                  onError={handleImageError}
                  onLoad={() => {
                    setContentLoaded(true);
                  }}
                  testID="preview-image"
                />
              </View>
            </Pressable>
          </Link>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          {contextItems.map((item) => (
            <ContextMenu.Item
              key={item.id}
              onSelect={() => item.action(processedUrl)}
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
  };

  const renderAudio = () => {
    const handleSeek = (newProgress: number) => {
      if (sound.current && duration > 0) {
        const newPosition = newProgress * duration;

        sound.current.setPositionAsync(newPosition);
      }
    };

    return (
      <AudioPlayer
        handleSeek={handleSeek}
        duration={duration}
        position={position}
        handlePress={handlePress}
        onLongPress={onLongPress}
        role={role}
        playAudio={playAudio}
        isPlaying={isPlaying}
      />
    )
  };

  const renderVideo = () => {
    const videoUrl = files?.[0]?.s3_url;
    const handleDownloadVideo = async () => {
      try {
        setLoadingDownloadVideo(true)
        await downloadAndSaveVideo(videoUrl);
        Alert.alert("Success", "Video downloaded successfully");
      } catch (error) {
        Alert.alert("Error", "Failed to download video");
      } finally {
        setLoadingDownloadVideo(false)

      }
    };

    return (
      <View>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          useNativeControls
          isLooping
        />
        {isLoadingDownloadVideo && <ActivityIndicator style={styles.loadingVideo} size={'small'} color={Colors.light.background} />}
        <TouchableOpacity style={styles.fullScreenButton} onPress={handleFullScreenVideo}>
          <Feather name="maximize" size={15} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.downloadButton]}
          onPress={handleDownloadVideo}
        >
          <Feather name="download" size={15} color="#fff" />
        </TouchableOpacity>
      </View >
    );
  };

  const renderContent = () => {


    if (error && onRetry) {
      return (
        <View style={[styles.contentContainer, role === Role.Bot ? styles.botContent : styles.userContent]}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error generating response</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry} testID="retry-button">
              <Ionicons name="refresh-outline" size={14} color="white" />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }


    // Regular text content (markdown) with context menu
    if (ContextMenu) {
      return (
        <>
          {(!isAudio(content)) && (
            <ContextMenu.Root>
              <ContextMenu.Trigger>
                <Pressable
                  onLongPress={showTextContextMenu}
                  onPress={handlePress}
                  style={[
                    styles.contentContainer,
                    role === Role.Bot ? styles.botContent : styles.userContent,

                    streamingContent && styles.streamingContent,
                  ]}
                  accessible={true}
                  accessibilityLabel={`${role === Role.Bot ? 'Assistant' : 'Your'} message: ${content}`}
                  accessibilityRole="text"
                  testID="markdown-container"
                >
                  <Animated.View
                    style={[
                      styles.markdownContainer,
                      streamingContent && { transform: [] },
                      streamingContent && { backgroundColor: `transparent` },
                    ]}
                  >
                    <MarkdownDisplay>{content}</MarkdownDisplay>
                  </Animated.View>
                </Pressable>
              </ContextMenu.Trigger>
              <ContextMenu.Content>
                <ContextMenu.Item key='copy-text' onSelect={handleCopyText}>
                  <ContextMenu.ItemTitle>Copy</ContextMenu.ItemTitle>
                  <ContextMenu.ItemIcon
                    ios={{
                      name: 'doc.on.doc',
                      pointSize: 18,
                    }}
                  />
                </ContextMenu.Item>
                <ContextMenu.Item key='share-text' onSelect={handleShareText}>
                  <ContextMenu.ItemTitle>Share</ContextMenu.ItemTitle>
                  <ContextMenu.ItemIcon
                    ios={{
                      name: 'square.and.arrow.up',
                      pointSize: 18,
                    }}
                  />
                </ContextMenu.Item>
              </ContextMenu.Content>
            </ContextMenu.Root>
          )}

          {(isAudio(content) || files?.[0]?.file_type === 'voice') && (
            renderAudio()
          )}
          {(files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video') && content === '' && (
            renderVideo()
          )}


          {(isImage(imageData) || files?.[0]?.file_type === 'img' || (files?.[0]?.data_type === 'img' && content === '')) && renderImageContent()}
        </>
      );
    } else {
      // Fallback for devices without ContextMenu support
      return (
        <>
          <Pressable
            onLongPress={showTextContextMenu}
            onPress={handlePress}
            style={[
              styles.contentContainer,
              role === Role.Bot ? styles.botContent : styles.userContent,
              theme.isDark && {
                borderColor: theme.colors.light,
                borderWidth: 0.7,
              },
              streamingContent && styles.streamingContent,
            ]}
            accessible={true}
            accessibilityLabel={`${role === Role.Bot ? 'Assistant' : 'Your'} message: ${content}`}
            accessibilityRole="text"
            testID="markdown-container"
          >
            <Animated.View
              style={[
                styles.markdownContainer,
                streamingContent && { transform: [] },
                streamingContent && { backgroundColor: `transparent` },
              ]}
            >
              <MarkdownDisplay>{content}</MarkdownDisplay>
            </Animated.View>
          </Pressable>
          {(isAudio(content) || files?.[0]?.file_type === 'voice') && (
            renderAudio()
          )}
          {(isImage(imageData) || files?.[0]?.file_type === 'img' || (files?.[0]?.data_type === 'img' && content === '')) && renderImageContent()}
        </>)
    };
  }
  return (
    <Animated.View
      style={[
        styles.container,
        role === Role.Bot ? styles.botContainer : styles.userContainer,
      ]}
      testID={`message-${role === Role.Bot ? 'bot' : 'user'}`}
    >
      {isLoading ? (
        <>
          {intermediate ? (

            <AnimatedText text={intermediate?.toString()} />) : (
            <View
              style={[
                styles.contentContainer,
                styles.loadingContainer,

                role === Role.Bot ? styles.botContent : styles.userContent,

                // Make background more transparent when loading
                { backgroundColor: role === Role.Bot ? theme.colors.backgroundLight : 'rgba(200, 230, 255, 0.6)' }
              ]}
              testID="loading-animation-container"
            >
              <LoadingDots />
            </View>
          )}
        </>

      ) : (
        <View style={styles.messageContent} testID="message-content">
          {renderContent()}
        </View>
      )}
    </Animated.View>
  );
});

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
    paddingHorizontal: 16,
    maxWidth: '97%',
  },
  audioPlayer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  audioText: {
    marginLeft: 9,
    color: Colors.common.grey,
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
    //flex: 1,
    maxWidth: '100%',
  },
  videoContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  downloadButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 10,
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 100
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  customPlayer: {
    flexDirection: 'row',
    width: 200,
    paddingVertical: 8,
  },
  contentContainer: {
    borderRadius: BORDER_RADIUS,
    paddingHorizontal: 12,
    // minWidth: 60,
    maxWidth: '100%',
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
  streamingContent: {

  },
  markdownContainer: {
    width: '100%',
    alignSelf: 'flex-start',
  },
  botContent: {
    // backgroundColor: `${theme.colors.greyLight}20`,
    borderBottomLeftRadius: 4,
  },
  userContent: {
    backgroundColor: `${theme.colors.primary}20`,
    borderBottomRightRadius: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 22,
  },
  botText: {
    color: Colors.common.grey,
  },
  userText: {
    color: Colors.light.text,
  },
  loadingVideo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  video: {
    width: 260,
    height: 145,
    borderRadius: 12,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  fullScreenVideo: {
    flex: 1,
  },
  fullScreenButton: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',

    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  imageContainer: {
    marginTop: 12,
    position: 'relative',
    width: IMAGE_PREVIEW_SIZE,
    height: IMAGE_PREVIEW_SIZE,
    borderRadius: BORDER_RADIUS,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: BORDER_RADIUS,
  },
  imageLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageLoadingText: {
    color: '#ffffff',
    marginTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imageErrorContainer: {
    width: IMAGE_PREVIEW_SIZE,
    height: IMAGE_PREVIEW_SIZE,
    borderRadius: BORDER_RADIUS,
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
  },
  imageErrorText: {
    color: Colors.common.grey,
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryImageButton: {
    backgroundColor: Colors.common.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  retryImageText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 13,
  },
  loadingContainer: {
    minHeight: 40,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: Colors.common.primary,
    marginHorizontal: 3,
  },
  errorContainer: {
    alignItems: 'flex-start',
    width: '100%',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.common.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  retryText: {
    color: 'white',
    fontWeight: '500',
    marginLeft: 4,
    fontSize: 14,
  },
});

export default ChatMessage;