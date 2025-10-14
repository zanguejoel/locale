import { memo, useState, useMemo } from 'react';
import Colors from '@/constants/Colors';
import useMarkdownDisplay from '@/hooks/useMarkdownDisplay';
import { copyImageToClipboard, downloadAndSaveImage, downloadAndSaveVideo, shareImage } from '@/utils/Image';
import { Message, Role, MessageStatus } from '@/utils/Interfaces';
import { formatMessageTimestamp } from '@/utils/dateHelpers';
import { Link } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  Animated,
  Easing,
  AccessibilityInfo,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Share,
  Alert,
} from 'react-native';
import LazyImage from './LazyImage';
import { LinearGradient } from 'expo-linear-gradient';
import * as ContextMenu from 'zeego/context-menu';
import { useCallback, useEffect, useRef } from 'react';
import { Audio, Video } from 'expo-av';

import { Ionicons } from '@expo/vector-icons';

import Feather from '@expo/vector-icons/Feather';
import AnimatedText from './AnimatedText';

import AudioPlayer from './AudioPlayer';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { shadows } from '@/constants/Shadows';
import { isAudio, isImage } from '@/utils/FileTypeHelpers';
import { CHAT_MESSAGE } from '@/constants/ChatConstants';
import { handleErrorSilent } from '@/utils/ErrorHandler';

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
  intermediate?: string // Add intermediate prop for streaming
  additional_data?: Array<{
    data_type: string;
    data?: string;
    s3_url?: string;
    file_path?: string;
  }>;
  // Message grouping props
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  isOnlyInGroup?: boolean;
}

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

  // Single animated value for pulse effect
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Create smooth pulse animation
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      pulseAnim.stopAnimation();
    };
  }, [pulseAnim]);

  // Interpolate scale and opacity for pulse effect
  const scale = pulseAnim;
  const opacity = pulseAnim.interpolate({
    inputRange: [1, 1.3],
    outputRange: [0.6, 1],
  });

  return (
    <View
      style={styles.loadingDotsContainer}
      accessibilityLabel="Loading message"
      testID="loading-dots-container"
    >
      <Animated.View
        style={[
          styles.loadingDot,
          {
            transform: [{ scale }],
            opacity,
          }
        ]}
        testID="loading-dot"
      />
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
  intermediate,
  timestamp,
  status,
  additional_data,
  isFirstInGroup = false,
  isLastInGroup = false,
  isOnlyInGroup = false
}: ChatMessageProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [imageAttempts, setImageAttempts] = useState(0);
  const [isLoadingDownloadVideo, setLoadingDownloadVideo] = useState(false);
  const maxImageRetryAttempts = CHAT_MESSAGE.MAX_IMAGE_RETRY_ATTEMPTS
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  

  const MarkdownDisplay = useMarkdownDisplay();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const videoRef = useRef<Video>(null);
  
  // Initialize and cleanup audio
  useEffect(() => {
    // Initialize sound object only once
    const initSound = async () => {
      if (!soundRef.current) {
        soundRef.current = new Audio.Sound();
      }
    };
    initSound();
    
    // Cleanup on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(err => {
          handleErrorSilent(err, 'Audio Cleanup');
        });
        soundRef.current = null;
      }
    };
  }, []);

  const handleFullScreenVideo = () => {
    if (videoRef.current) {
      videoRef.current.presentFullscreenPlayer();
    } else {
      Alert.alert('Error', 'Video reference not available');
    }
  };
  // Force loading state to be a boolean
  const isLoading = Boolean(loading);

  // Add subtle pulse animation for streaming content
  useEffect(() => {
    if (streamingContent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.03,
            duration: CHAT_MESSAGE.ANIMATION.PULSE,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: CHAT_MESSAGE.ANIMATION.PULSE,
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
          duration: CHAT_MESSAGE.ANIMATION.FADE_IN,
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

  // Retry loading image if it fails (up to MAX_IMAGE_RETRY_ATTEMPTS)
  useEffect(() => {
    if (imageLoadError && imageAttempts < maxImageRetryAttempts) {
      const timer = setTimeout(() => {
        setImageLoadError(false);
        setImageAttempts(prev => prev + 1);
      }, CHAT_MESSAGE.IMAGE_RETRY_DELAY);
      return () => clearTimeout(timer);
    }
  }, [imageLoadError, imageAttempts, maxImageRetryAttempts]);

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
      // console.error('Error sharing message:', error);
    }
  }, [content]);

  // Function to show the text context menu
  const showTextContextMenu = useCallback(() => {
    if (onLongPress) {
      onLongPress();
    }

    // For platforms with ActionSheet but without context menu (older Android versions)
    // Note: Context menu is available on all platforms with zeego
    if (Platform.OS === 'android' && !ContextMenu) {
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
    if (!soundRef.current) return;
    
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        // Unload any previous audio
        await soundRef.current.unloadAsync();

        await soundRef.current.loadAsync(
          { uri: content || files?.[0]?.s3_url || '' },
          { progressUpdateIntervalMillis: 1 }
        );
        await soundRef.current.playAsync();
        setIsPlaying(true);
        soundRef.current.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying);
            if (status.didJustFinish) {
              setIsPlaying(false);
            }
          }
        });
      }
    } catch (error) {
      handleErrorSilent(error, 'Audio Player');
    }
  };


  const handleImageError = (error: any) => {
    setImageLoadError(true);
  };

  const instructionForImageChatDisplay = (overrideUrl?: string) => {
    // If override URL is provided (e.g., from additional_data), use it
    if (overrideUrl) {
      return overrideUrl;
    }
    // Priority: imageData > files s3_url > files file_path
    if (imageData && isImage(imageData)) {
      return imageData; // Already a URL, don't encode here
    } else if (files?.length && files[0]?.s3_url) {
      return files[0].s3_url; // Use S3 URL directly
    } 
    return '';
  }

  const instructionForTextInImageChat = () => {
    if (isImage(content)) {
      return content
    } else {
      return content
    }
  }

  // Render generated images and videos from additional_data
  const renderAdditionalData = () => {
    if (!additional_data || additional_data.length === 0) {
      // console.log('[ChatMessage] No additional_data to render');
      return null;
    }

    // Check if videos/images are already in files[] - if so, skip rendering from additional_data
    const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
    const hasFileImage = files?.[0]?.file_type === 'img';
    
    // Separate images and videos
    const images = additional_data.filter(item => item.data_type === 'img');
    const videos = additional_data.filter(item => item.data_type === 'video');
    
    // Skip videos if already in files[] (prevents duplicates)
    const videosToRender = hasFileVideo ? [] : videos;
    const imagesToRender = hasFileImage ? [] : images;
    
    console.log('[ChatMessage] renderAdditionalData - hasFileVideo:', hasFileVideo, 'hasFileImage:', hasFileImage);
    console.log('[ChatMessage] - Videos in additional_data:', videos.length, '→ Rendering:', videosToRender.length);
    console.log('[ChatMessage] - Images in additional_data:', images.length, '→ Rendering:', imagesToRender.length);
    
    // If nothing to render after filtering, return null
    if (videosToRender.length === 0 && imagesToRender.length === 0) {
      console.log('[ChatMessage] Nothing to render from additional_data (all media in files[])');
      return null;
    }
   
    return (
      <View style={styles.additionalDataContainer}>
        {/* Images - using same renderImageContent as regular images */}
        {imagesToRender.map((item, imageIndex) => {
          // Backend sends either "data" or "s3_url" as the image URL
          const imageUrl = item.data || item.s3_url || '';
          
          if (!imageUrl) {
            console.warn('[ChatMessage] Image item missing URL:', item);
            return null;
          }
          
          return (
            <View key={`generated-image-${imageIndex}`} style={styles.generatedMediaItem}>
              {renderImageContent(imageUrl)}
            </View>
          );
        })}
       
        {/* Videos - using same renderVideo as regular videos */}
        {videosToRender.map((item, videoIndex) => {
          // Backend sends either "data" or "s3_url" as the video URL
          const videoUrl = item.data || item.s3_url || '';
          
          if (!videoUrl) {
            console.warn('[ChatMessage] Video item missing URL:', item);
            return null;
          }
          
          return (
            <View key={`generated-video-${videoIndex}`} style={styles.generatedMediaItem}>
              {renderVideo(videoUrl)}
            </View>
          );
        })}
      </View>
    );
  };

  const renderImageContent = (overrideUrl?: string) => {
    if (imageLoadError && imageAttempts >= maxImageRetryAttempts) {
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

    // Get the image URL with proper priority handling
    const imageUrl = instructionForImageChatDisplay(overrideUrl);
    
    // console.log('[ChatMessage] renderImageContent - imageUrl:', imageUrl);
    // console.log('[ChatMessage] renderImageContent - files:', files);
    // console.log('[ChatMessage] renderImageContent - imageData:', imageData);

    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Link
            href={`/(modal)/image/${encodeURIComponent(imageUrl)}?prompt=${encodeURIComponent(prompt || '')}`}
            asChild
          >
            <Pressable
              onLongPress={onLongPress}
              onPress={handlePress}
              accessible={true}
              accessibilityLabel={`Image preview. ${prompt}`}
              accessibilityRole="image"
              testID="image-preview-pressable"
              style={{width: CHAT_MESSAGE.IMAGE_PREVIEW_SIZE}}
            >
              <LazyImage
                uri={imageUrl}
                style={styles.previewImage}
                containerStyle={styles.imageContainer}
                resizeMode="cover"
                onError={handleImageError}
                onLoad={() => {
                  setContentLoaded(true);
                }}
                threshold={600}
                showLoadingIndicator={true}
                priority="high"
                cachePolicy="memory-disk"
                testID="preview-image"
              />
            </Pressable>
          </Link>
        </ContextMenu.Trigger>
        <ContextMenu.Content>
          {contextItems.map((item) => (
            <ContextMenu.Item
              key={item.id}
              onSelect={() => item.action(imageUrl)}
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
      if (soundRef.current && duration > 0) {
        const newPosition = newProgress * duration;

        soundRef.current.setPositionAsync(newPosition);
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

  const renderVideo = (overrideUrl?: string) => {
    const videoUrl = overrideUrl || files?.[0]?.s3_url;
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
          source={{ uri: videoUrl || '' }}
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
                {role === Role.User ? (
                  // User message with gradient - includes text and media
                  <LinearGradient
                    colors={theme.isDark 
                      ? ['#1e3a8a', '#1e40af'] // Dark blue gradient for dark mode
                      : ['#3b82f6', '#2563eb'] // Light to darker blue gradient
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.contentContainer,
                      styles.userContent,
                      streamingContent && styles.streamingContent,
                    ]}
                  >
                    <Pressable
                      onLongPress={showTextContextMenu}
                      onPress={handlePress}
                      accessible={true}
                      accessibilityLabel={`Your message: ${content}`}
                      accessibilityRole="text"
                      testID="markdown-container"
                    >
                      {/* Render media first for user messages */}
                      {(() => {
                        const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
                        const hasFileImage = (imageData && isImage(imageData)) || files?.[0]?.file_type === 'img';
                        
                        return (
                          <>
                            {hasFileImage && (
                              <View style={styles.mediaInMessage}>
                                {renderImageContent()}
                              </View>
                            )}
                            {hasFileVideo && content === '' && (
                              <View style={styles.mediaInMessage}>
                                {renderVideo()}
                              </View>
                            )}
                          </>
                        );
                      })()}
                      
                      {/* Text content */}
                      {content && !isAudio(content) && (
                        <Animated.View
                          style={[
                            styles.markdownContainer,
                            streamingContent && { transform: [] },
                            streamingContent && { backgroundColor: `transparent` },
                          ]}
                        >
                          <View style={styles.userTextWrapper}>
                            <MarkdownDisplay additionalStyles={{
                              body: { color: '#FFFFFF' },
                              heading1: { color: '#FFFFFF' },
                              heading2: { color: '#FFFFFF' },
                              heading3: { color: '#FFFFFF' },
                              heading4: { color: '#FFFFFF' },
                              heading5: { color: '#FFFFFF' },
                              heading6: { color: '#FFFFFF' },
                              paragraph: { color: '#FFFFFF' },
                              text: { color: '#FFFFFF' },
                            }}>
                              {content}
                            </MarkdownDisplay>
                          </View>
                        </Animated.View>
                      )}
                      
                      {/* Audio content within message bubble */}
                      {(isAudio(content) || files?.[0]?.file_type === 'voice') && (
                        <View style={styles.audioInMessage}>
                          {renderAudio()}
                        </View>
                      )}
                    </Pressable>
                  </LinearGradient>
                ) : (
                  // Bot message without gradient - includes text and media
                  <Pressable
                    onLongPress={showTextContextMenu}
                    onPress={handlePress}
                    style={[
                      styles.contentContainer,
                      styles.botContent,
                      streamingContent && styles.streamingContent,
                    ]}
                    accessible={true}
                    accessibilityLabel={`Assistant message: ${content}`}
                    accessibilityRole="text"
                    testID="markdown-container"
                  >
                    {/* Text content first for bot */}
                    {content && !isAudio(content) && (
                      <Animated.View
                        style={[
                          styles.markdownContainer,
                          streamingContent && { transform: [] },
                          streamingContent && { backgroundColor: `transparent` },
                        ]}
                      >
                        <MarkdownDisplay>{content}</MarkdownDisplay>
                      </Animated.View>
                    )}
                    
                    {/* Render media after text for bot messages */}
                    {(() => {
                      const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
                      const hasFileImage = (imageData && isImage(imageData)) || files?.[0]?.file_type === 'img';
                      
                      return (
                        <>
                          {hasFileImage && (
                            <View style={styles.mediaInMessage}>
                              {renderImageContent()}
                            </View>
                          )}
                          {hasFileVideo && content === '' && (
                            <View style={styles.mediaInMessage}>
                              {renderVideo()}
                            </View>
                          )}
                        </>
                      );
                    })()}
                    
                    {/* Audio content within message bubble */}
                    {(isAudio(content) || files?.[0]?.file_type === 'voice') && (
                      <View style={styles.audioInMessage}>
                        {renderAudio()}
                      </View>
                    )}
                  </Pressable>
                )}
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
          
          {/* Render AI-generated content (additional_data) - shown outside message bubble */}
          {(() => {
            const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
            const hasFileImage = (imageData && isImage(imageData)) || files?.[0]?.file_type === 'img';
            const hasAdditionalVideo = additional_data && additional_data.some(item => item.data_type === 'video');
            const hasAdditionalImage = additional_data && additional_data.some(item => item.data_type === 'img');
            
            // Only render additional_data if no files[] media (prevents duplicates)
            // AI-generated content shown separately below message
            if (!hasFileVideo && !hasFileImage && (hasAdditionalVideo || hasAdditionalImage)) {
              return renderAdditionalData();
            }
            
            return null;
          })()}
        </>
      );
    } else {
      // Fallback for devices without ContextMenu support
      return (
        <>
          {role === Role.User ? (
            // User message with gradient - includes text and media
            <LinearGradient
              colors={theme.isDark 
                ? ['#1e3a8a', '#1e40af'] // Dark blue gradient for dark mode
                : ['#3b82f6', '#2563eb'] // Light to darker blue gradient
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.contentContainer,
                styles.userContent,
                streamingContent && styles.streamingContent,
              ]}
            >
              <Pressable
                onLongPress={showTextContextMenu}
                onPress={handlePress}
                accessible={true}
                accessibilityLabel={`Your message: ${content}`}
                accessibilityRole="text"
                testID="markdown-container"
              >
                {/* Render media first for user messages */}
                {(() => {
                  const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
                  const hasFileImage = (imageData && isImage(imageData)) || files?.[0]?.file_type === 'img';
                  
                  return (
                    <>
                      {hasFileImage && (
                        <View style={styles.mediaInMessage}>
                          {renderImageContent()}
                        </View>
                      )}
                      {hasFileVideo && content === '' && (
                        <View style={styles.mediaInMessage}>
                          {renderVideo()}
                        </View>
                      )}
                    </>
                  );
                })()}
                
                {/* Text content */}
                {content && !isAudio(content) && (
                  <Animated.View
                    style={[
                      styles.markdownContainer,
                      streamingContent && { transform: [] },
                      streamingContent && { backgroundColor: `transparent` },
                    ]}
                  >
                    <View style={styles.userTextWrapper}>
                      <MarkdownDisplay additionalStyles={{
                        body: { color: '#FFFFFF' },
                        heading1: { color: '#FFFFFF' },
                        heading2: { color: '#FFFFFF' },
                        heading3: { color: '#FFFFFF' },
                        heading4: { color: '#FFFFFF' },
                        heading5: { color: '#FFFFFF' },
                        heading6: { color: '#FFFFFF' },
                        paragraph: { color: '#FFFFFF' },
                        text: { color: '#FFFFFF' },
                      }}>
                        {content}
                      </MarkdownDisplay>
                    </View>
                  </Animated.View>
                )}
                
                {/* Audio content within message bubble */}
                {(isAudio(content) || files?.[0]?.file_type === 'voice') && (
                  <View style={styles.audioInMessage}>
                    {renderAudio()}
                  </View>
                )}
              </Pressable>
            </LinearGradient>
          ) : (
            // Bot message without gradient - includes text and media
            <Pressable
              onLongPress={showTextContextMenu}
              onPress={handlePress}
              style={[
                styles.contentContainer,
                styles.botContent,
                streamingContent && styles.streamingContent,
              ]}
              accessible={true}
              accessibilityLabel={`Assistant message: ${content}`}
              accessibilityRole="text"
              testID="markdown-container"
            >
              {/* Text content first for bot */}
              {content && !isAudio(content) && (
                <Animated.View
                  style={[
                    styles.markdownContainer,
                    streamingContent && { transform: [] },
                    streamingContent && { backgroundColor: `transparent` },
                  ]}
                >
                  <MarkdownDisplay>{content}</MarkdownDisplay>
                </Animated.View>
              )}
              
              {/* Render media after text for bot messages */}
              {(() => {
                const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
                const hasFileImage = (imageData && isImage(imageData)) || files?.[0]?.file_type === 'img';
                
                return (
                  <>
                    {hasFileImage && (
                      <View style={styles.mediaInMessage}>
                        {renderImageContent()}
                      </View>
                    )}
                    {hasFileVideo && content === '' && (
                      <View style={styles.mediaInMessage}>
                        {renderVideo()}
                      </View>
                    )}
                  </>
                );
              })()}
              
              {/* Audio content within message bubble */}
              {(isAudio(content) || files?.[0]?.file_type === 'voice') && (
                <View style={styles.audioInMessage}>
                  {renderAudio()}
                </View>
              )}
            </Pressable>
          )}
          
          {/* Render AI-generated content (additional_data) - shown outside message bubble */}
          {(() => {
            const hasFileVideo = files?.[0]?.file_type === 'video' || files?.[0]?.data_type === 'video';
            const hasFileImage = (imageData && isImage(imageData)) || files?.[0]?.file_type === 'img';
            const hasAdditionalVideo = additional_data && additional_data.some(item => item.data_type === 'video');
            const hasAdditionalImage = additional_data && additional_data.some(item => item.data_type === 'img');
            
            // Only render additional_data if no files[] media (prevents duplicates)
            if (!hasFileVideo && !hasFileImage && (hasAdditionalVideo || hasAdditionalImage)) {
              return renderAdditionalData();
            }
            
            return null;
          })()}
        </>)
    };
  }
  // Status indicator component
  const StatusIcon = () => {
    if (role === Role.Bot || !status) return null;
    
    const getStatusIcon = () => {
      switch (status) {
        case MessageStatus.Sending:
          return <View style={styles.statusDotEmpty} />;
        case MessageStatus.Sent:
          return <Ionicons name="checkmark" size={12} color={theme.colors.textSecondary} />;
        case MessageStatus.Delivered:
          return <Ionicons name="checkmark-done" size={12} color={theme.colors.primary} />;
        case MessageStatus.Failed:
          return <Ionicons name="alert-circle" size={12} color={theme.colors.destructive} />;
        default:
          return null;
      }
    };
    
    return getStatusIcon();
  };

  // Apply grouping styles
  const containerStyle = [
    styles.container,
    role === Role.Bot ? styles.botContainer : styles.userContainer,
    // Reduce spacing for grouped messages
    !isOnlyInGroup && !isFirstInGroup && styles.groupedMessage,
    isLastInGroup && styles.lastInGroup,
  ];

  // Check if we have streaming content to show alongside intermediate state
  const hasStreamingContent = content && content.length > 0 && content !== '...' && content.trim() !== '';
  
  return (
    <Animated.View
      style={containerStyle}
      testID={`message-${role === Role.Bot ? 'bot' : 'user'}`}
    >
     
      {isLoading ? (
        <View style={styles.loadingStateContainer}>
          {/* Show intermediate state indicator */}
          {intermediate ? (
            <View style={styles.intermediateContainer}>
              <View style={styles.intermediateIconContainer}>
                {intermediate.toLowerCase().includes('image') || intermediate.toLowerCase().includes('generating') ? (
                  <Ionicons name="images" size={20} color={theme.colors.primary} style={styles.intermediateIcon} />
                ) : intermediate.toLowerCase().includes('video') ? (
                  <Ionicons name="videocam" size={20} color={theme.colors.primary} style={styles.intermediateIcon} />
                ) : intermediate.toLowerCase().includes('search') ? (
                  <Ionicons name="search" size={20} color={theme.colors.primary} style={styles.intermediateIcon} />
                ) : (
                  <LoadingDots />
                )}
              </View>
              <AnimatedText text={intermediate?.toString()} />
            </View>
          ) : (
            <View style={[styles.intermediateContainer, {backgroundColor: 'transparent', borderWidth: 0}]}>
              <View style={styles.intermediateIconContainer}>
                <LoadingDots />
              </View>
            </View>
          )}
          
          {/* Show streaming content below intermediate state if it exists */}
          {hasStreamingContent && (
            <View style={[styles.messageWrapper, styles.streamingContentWrapper]}>
              <View style={styles.messageContent} testID="message-content">
                {renderContent()}
              </View>
            </View>
          )}
        </View>

      ) : (
        <View style={styles.messageWrapper}>
          <View style={styles.messageContent} testID="message-content">
            {renderContent()}
          </View>
          {/* Only show timestamp on last message in group or standalone messages */}
          {(timestamp || status) && (isLastInGroup || isOnlyInGroup) && (
            <View style={[styles.metaContainer, role === Role.User ? styles.metaUser : styles.metaBot]}>
              {timestamp && (
                <Text style={styles.timestamp}>
                  {formatMessageTimestamp(timestamp)}
                </Text>
              )}
              <StatusIcon />
            </View>
          )}
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
  },
  groupedMessage: {
    marginTop: 2, // Reduced spacing for grouped messages
  },
  lastInGroup: {
    marginBottom: 12, // Extra space after group ends
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
    width: '100%', // Full width for bot messages (padding is on parent)
  },
  userContainer: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
    maxWidth: '80%', // Better readability constraint
  },
  avatarContainer: {
    marginRight: 8,
  },
  messageContent: {
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
    borderRadius: CHAT_MESSAGE.MESSAGE_BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  streamingContent: {
    opacity: 0.95,
  },
  markdownContainer: {
    width: '100%',
    alignSelf: 'flex-start',
  },
  mediaInMessage: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  audioInMessage: {
    width: '100%',
  },
  userTextWrapper: {
    width: '100%',
  },
  botContent: {
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    borderBottomLeftRadius: CHAT_MESSAGE.TAIL_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    ...shadows.sm,
  },
  userContent: {
    backgroundColor: theme.colors.primary, // Solid background for efficient shadow calculation
    borderBottomRightRadius: CHAT_MESSAGE.TAIL_BORDER_RADIUS,
    // Enhanced shadow for user messages with primary color tint
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    paddingVertical: 12,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
  },
  botText: {
    color: theme.colors.text,
  },
  userText: {
    color: '#FFFFFF', // White text on primary blue background
    fontWeight: '500',
  },
  loadingVideo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  },
  video: {
    width: CHAT_MESSAGE.VIDEO.WIDTH,
    height: CHAT_MESSAGE.VIDEO.HEIGHT,
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
    width: CHAT_MESSAGE.IMAGE_PREVIEW_SIZE,
    height: CHAT_MESSAGE.IMAGE_PREVIEW_SIZE,
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    overflow: 'hidden',
    alignSelf: 'center',
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
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
    width: CHAT_MESSAGE.IMAGE_PREVIEW_SIZE,
    height: CHAT_MESSAGE.IMAGE_PREVIEW_SIZE,
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
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
    width: CHAT_MESSAGE.LOADING_DOTS.SIZE,
    height: CHAT_MESSAGE.LOADING_DOTS.SIZE,
    borderRadius: 5,
    backgroundColor: Colors.common.primary,
    marginHorizontal: CHAT_MESSAGE.LOADING_DOTS.SPACING,
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
  messageWrapper: {
    maxWidth: '100%',
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 4,
  },
  metaUser: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  metaBot: {
    alignSelf: 'flex-start',
    justifyContent: 'flex-start',
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
  statusDotEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: theme.colors.textSecondary,
  },
  // Additional data styles for generated content
  additionalDataContainer: {
    marginTop: 12,
    width: '100%',
  },
  generatedMediaItem: {
    marginBottom: 12,
  },
  // Image Grid Layouts
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
    width: '100%',
  },
  // Videos Container
  videosContainer: {
    width: '100%',
    gap: 8,
  },
  singleImageGrid: {
    width: '100%',
    flexDirection: 'column', // Stack vertically for single images
  },
  twoImageGrid: {
    justifyContent: 'space-between',
    flexDirection: 'row',
  },
  multiImageGrid: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
  },
  // Image Wrapper Sizes - Optimized with aspect ratios
  imageWrapper: {
    
    position: 'relative',
    overflow: 'hidden',
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    backgroundColor: '#f5f5f5',
  },
  singleImageWrapper: {
    width: '100%',
    aspectRatio: 16 / 9,  // Widescreen aspect ratio for single images
    maxHeight: 280,       // Maximum height constraint
  },
  twoImageWrapper: {
    width: '48%',
    aspectRatio: 1,       // Square aspect ratio for two images
    maxHeight: 200,       // Reasonable max height
  },
  multiImageWrapper: {
    width: '31%',
    aspectRatio: 1,       // Square aspect ratio for grid
    maxHeight: 150,       // Smaller for grid layout
  },
  // Generated Image
  generatedImage: {
    width: '100%',
    height: '100%',
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    backgroundColor: '#f5f5f5',
  },
  // Loading Skeleton
  imageSkeleton: {
    ...Platform.select({
      ios: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      },
      android: {
        ...StyleSheet.absoluteFillObject,
      },
      default: StyleSheet.absoluteFillObject,
    }),
    backgroundColor: theme.colors.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
  },
  imageHidden: {
    opacity: 0,
  },
  // Error State
  imageErrorState: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    padding: 8,
    gap: 6,
  },
  imageErrorStateText: {
    fontSize: 11,
    color: Colors.common.grey,
    textAlign: 'center',
    fontWeight: '500',
  },
  // Image Counter Badge
  imageCounterBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  // Generation Badge
  generationBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(138, 43, 226, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  generationBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  // Video Styles
  generatedVideoContainer: {
    width: CHAT_MESSAGE.GENERATED.VIDEO_WIDTH,
    height: CHAT_MESSAGE.GENERATED.VIDEO_HEIGHT,
    borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    marginTop: 8,
  },
  generatedVideo: {
    width: '100%',
    height: '100%',
  },
  videoFullscreenButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 8,
  },
  downloadVideoButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 8,
  },
  downloadProgressContainer: {
    minWidth: 40,
    minHeight: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  downloadProgressText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  // Intermediate state styles
  loadingStateContainer: {
    flexDirection: 'column',
    gap: 12, // Space between intermediate state and streaming content
    alignItems: 'flex-start',
  },
  intermediateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? 'rgba(138, 43, 226, 0.1)' : 'rgba(138, 43, 226, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: CHAT_MESSAGE.MESSAGE_BORDER_RADIUS,
    borderWidth: 1,
    borderColor: theme.isDark ? 'rgba(138, 43, 226, 0.3)' : 'rgba(138, 43, 226, 0.2)',
    maxWidth: '100%',
  },
  intermediateIconContainer: {
    // marginRight: 8,
  },
  intermediateIcon: {
    opacity: 0.8,
  },
  streamingContentWrapper: {
    marginTop: 8, // Additional spacing for streaming content when shown with intermediate
  },
});

export default ChatMessage;