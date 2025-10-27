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
import * as Haptics from 'expo-haptics';

import { Ionicons } from '@expo/vector-icons';

import Feather from '@expo/vector-icons/Feather';
import AnimatedText from './AnimatedText';

import AudioPlayer from './AudioPlayer';
import DocumentPreview from './DocumentPreview';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { shadows } from '@/constants/Shadows';
import { isAudio, isImage, isDocument } from '@/utils/FileTypeHelpers';
import { CHAT_MESSAGE } from '@/constants/ChatConstants';
import { handleErrorSilent } from '@/utils/ErrorHandler';
import { extractArtifactsFromMessage, stripArtifactTags, parseContentSegments, ContentSegment } from '@/utils/ArtifactParser';
import ArtifactIndicator from './artifacts/ArtifactIndicator';
import { Artifact } from '@/utils/ArtifactTypes';
import { extractThinkingFromStream, stripThinkingTags, hasThinkingTags } from '@/utils/ThinkingParser';
import ThinkingBlock from './ThinkingBlock';
import { extractReasoningFromStream, stripReasoningTags, hasReasoningTags } from '@/utils/ReasoningParser';
import ReasoningBlock from './ReasoningBlock';
import { useChat } from '@/hooks/useChat';

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
  // intermediate removed - accessed directly from context
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
  // Artifact props
  onArtifactPress?: (artifact: Artifact, allMessageArtifacts?: Artifact[]) => void;
  artifacts?: Artifact[];
  streamingArtifact?: Artifact | null; // NEW: For real-time streaming display
  // Reasoning props
  streamingReasoning?: string; // For real-time reasoning display during streaming
  // Action handlers
  onCopy?: () => void;
  onPin?: () => void;
  isPinned?: boolean;
  canRetry?: boolean;
  // Feedback handlers
  onLike?: () => void;
  onDislike?: () => void;
  reaction?: 'like' | 'dislike' | null;
  chat_id?: string; // Required for like/dislike actions
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

// Streaming indicator cursor that appears at the end of streaming content
const StreamingCursor = memo(() => {
  const theme = useTheme();
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 530,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 530,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );

    animation.start();

    return () => {
      animation.stop();
      opacityAnim.stopAnimation();
    };
  }, [opacityAnim]);

  return (
    <Animated.Text
      style={{
        color: theme.colors.text,
        fontSize: 16,
        marginLeft: 2,
        opacity: opacityAnim,
        fontWeight: 'bold',
      }}
      accessibilityLabel="Streaming in progress"
    >
      ▊
    </Animated.Text>
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
  timestamp,
  status,
  additional_data,
  isFirstInGroup = false,
  isLastInGroup = false,
  isOnlyInGroup = false,
  onArtifactPress,
  artifacts: providedArtifacts,
  streamingArtifact,
  onCopy,
  onPin,
  isPinned = false,
  canRetry = false,
  onLike,
  onDislike,
  reaction,
  streamingReasoning,
  chat_id,
}: ChatMessageProps) => {
  
  // Access intermediate state directly from context
  const { intermediate, isSending: contextIsSending } = useChat();
  const theme = useTheme();
  const styles = getStyles(theme);
  
  // Compute actual loading state based on content arrival
  // 
  // Show loading UI (dots/intermediate) ONLY when:
  // 1. loading prop is true (indicates this is the last bot message being generated)
  // 2. AND no content has arrived yet (!hasContent)
  // 3. AND no additional data has arrived (images, files, etc.)
  // 
  // Once streaming begins and content arrives:
  // - Hide loading dots immediately
  // - Show the streaming content
  // - Intermediate state (if present) will be shown above the content
  // 
  // For image/file generation (no text content):
  // - Show loading dots + intermediate ("Generating image...")
  // - When additional_data arrives, hide loading and show the image
  // 
  // This creates a smooth transition:
  // 1. Loading dots → 2. Intermediate state + content/files → 3. Just content/files
  const hasContent = content && content.trim().length > 0;
  const hasAdditionalData = (additional_data && additional_data.length > 0) || (files && files.length > 0);
  const hasAnyContent = hasContent || hasAdditionalData;
  const shouldShowLoading = loading && !hasAnyContent;

  // Extract thinking blocks from content
  const thinkingData = useMemo(() => {
    if (role === Role.Bot && content && hasThinkingTags(content)) {
      return extractThinkingFromStream(content);
    }
    return { thinking: null, contentWithoutThinking: content };
  }, [content, role]);

  // Extract reasoning blocks from content (handles both streaming and historical messages)
  const reasoningData = useMemo(() => {
    if (role === Role.Bot && thinkingData.contentWithoutThinking && hasReasoningTags(thinkingData.contentWithoutThinking)) {
      const extracted = extractReasoningFromStream(thinkingData.contentWithoutThinking);
      if (extracted.reasoning) {
        console.log('[ChatMessage] 🧠 Extracted reasoning from content:', {
          isComplete: extracted.reasoning.isComplete,
          contentLength: extracted.reasoning.content.length,
          source: extracted.reasoning.isComplete ? 'historical/completed' : 'streaming'
        });
      }
      return extracted;
    }
    return { reasoning: null, contentWithoutReasoning: thinkingData.contentWithoutThinking };
  }, [thinkingData.contentWithoutThinking, role]);

  // Parse content into segments (text and artifacts) to preserve original positions
  // Use content without thinking and reasoning tags for display
  const contentSegments = useMemo(() => {
    // Parse into segments for bot messages - preserves artifact positions
    if (role === Role.Bot && reasoningData.contentWithoutReasoning) {
      const segments = parseContentSegments(reasoningData.contentWithoutReasoning, 'message-' + (timestamp || Date.now()));
      if (segments.length > 0) {
        const artifactCount = segments.filter(s => s.type === 'artifact').length;
        console.log('[ChatMessage] ✅ Parsed content into', segments.length, 'segments (', artifactCount, 'artifacts)');
      }
      return segments;
    }
    return [{ type: 'text' as const, content: reasoningData.contentWithoutReasoning }];
  }, [reasoningData.contentWithoutReasoning, role, timestamp]);

  // Extract all artifacts from segments for external use (e.g., passing to parent)
  // Combine finalized artifacts with streaming artifact if applicable
  const messageArtifacts = useMemo(() => {
    // Get artifacts from content segments
    const segmentArtifacts = contentSegments
      .filter((seg): seg is Extract<ContentSegment, { type: 'artifact' }> => seg.type === 'artifact')
      .map(seg => seg.artifact);
    
    // If we have a streaming artifact and it belongs to this message (last bot message)
    // add it to the artifacts list for real-time display
    if (streamingArtifact && role === Role.Bot && isSending) {
      // Check if streaming artifact is already in the list (avoid duplicates)
      const hasStreamingArtifact = segmentArtifacts.some(a => a.id === streamingArtifact.id);
      if (!hasStreamingArtifact) {
        return [...segmentArtifacts, streamingArtifact];
      }
    }
    
    // Also include artifacts passed as prop (from useChat context)
    if (providedArtifacts && providedArtifacts.length > 0) {
      // Merge with segment artifacts, avoiding duplicates
      const allArtifacts = [...segmentArtifacts];
      providedArtifacts.forEach((artifact: Artifact) => {
        if (!allArtifacts.some(a => a.id === artifact.id)) {
          allArtifacts.push(artifact);
        }
      });
      return allArtifacts;
    }
    
    return segmentArtifacts;
  }, [contentSegments, streamingArtifact, providedArtifacts, role, isSending]);

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [contentLoaded, setContentLoaded] = useState(false);
  const [imageAttempts, setImageAttempts] = useState(0);
  const [isLoadingDownloadVideo, setLoadingDownloadVideo] = useState(false);
  const maxImageRetryAttempts = CHAT_MESSAGE.MAX_IMAGE_RETRY_ATTEMPTS
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [showVideoControls, setShowVideoControls] = useState(false);
  

  const MarkdownDisplay = useMarkdownDisplay();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const videoRef = useRef<Video>(null);
  
  // Initialize audio and setup status callback once
  useEffect(() => {
    // Initialize sound object only once
    const initSound = async () => {
      if (!soundRef.current) {
        soundRef.current = new Audio.Sound();
        
        // Set up status callback once during initialization
        soundRef.current.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setDuration(status.durationMillis || 0);
            setPosition(status.positionMillis || 0);
            setIsPlaying(status.isPlaying);
            
            if (status.didJustFinish) {
              setIsPlaying(false);
              setPosition(0);
            }
          } else if ('error' in status) {
            console.error('[ChatMessage] Audio playback error:', status.error);
            setIsPlaying(false);
            setIsAudioLoaded(false);
          }
        });
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

  const handleVideoPlayPause = async () => {
    if (videoRef.current) {
      try {
        const status = await videoRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await videoRef.current.pauseAsync();
            setIsVideoPlaying(false);
            setShowVideoControls(true);
          } else {
            await videoRef.current.playAsync();
            setIsVideoPlaying(true);
            // Hide controls after a delay when playing
            setTimeout(() => setShowVideoControls(false), 2000);
          }
        }
      } catch (error) {
        console.error('[ChatMessage] Video play/pause error:', error);
      }
    }
  };

  const handleVideoPress = () => {
    // Toggle controls visibility
    setShowVideoControls(!showVideoControls);
    // Auto-hide controls after 3 seconds if video is playing
    if (isVideoPlaying) {
      setTimeout(() => setShowVideoControls(false), 3000);
    }
  };
  
  // Debug: Monitor loading and intermediate state changes
  useEffect(() => {
    if (__DEV__ && role === Role.Bot && (intermediate || loading)) {
      console.log('[ChatMessage] 🎨 Loading state:', {
        shouldShowLoading,
        loading,
        hasContent,
        hasAdditionalData,
        hasAnyContent,
        contentLength: content?.length || 0,
        additionalDataCount: additional_data?.length || 0,
        filesCount: files?.length || 0,
        intermediate: intermediate || 'none',
        contextIsSending,
      });
    }
  }, [intermediate, loading, role, contextIsSending, shouldShowLoading, hasContent, hasAdditionalData, hasAnyContent, content, additional_data, files]);

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
    if (!shouldShowLoading && !contentLoaded) {
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
  }, [shouldShowLoading, contentLoaded, fadeAnim]);

  // Reset content loaded state when loading changes
  useEffect(() => {
    if (shouldShowLoading) {
      setContentLoaded(false);
      fadeAnim.setValue(0);
    }
  }, [shouldShowLoading, fadeAnim]);

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
    let textToCopy = content;
    
    // For user messages with media, check prompt field or content
    if (role === Role.User && (imageData || files?.length)) {
      if (prompt) {
        textToCopy = prompt;
      } else if (content && !isFilePath(content)) {
        textToCopy = content;
      } else {
        textToCopy = '';
      }
    }
    
    Clipboard.setString(textToCopy);
    // Optional feedback to user
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility('Message copied to clipboard');
    } else {
      Alert.alert('Copied', 'Message copied to clipboard');
    }
  }, [content, role, prompt, imageData, files]);

  // Function to handle sharing the message content
  const handleShareText = useCallback(async () => {
    try {
      let textToShare = content;
      
      // For user messages with media, check prompt field or content
      if (role === Role.User && (imageData || files?.length)) {
        if (prompt) {
          textToShare = prompt;
        } else if (content && !isFilePath(content)) {
          textToShare = content;
        } else {
          textToShare = '';
        }
      }
      
      const result = await Share.share({
        message: textToShare,
      });
    } catch (error) {
      // console.error('Error sharing message:', error);
    }
  }, [content, role, prompt, imageData, files]);

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
    if (!soundRef.current) {
      console.warn('[ChatMessage] Sound ref not initialized');
      return;
    }
    
    try {
      if (isPlaying) {
        // Pause the audio
        console.log('[ChatMessage] Pausing audio');
        await soundRef.current.pauseAsync();
        // State will be updated by the status callback
      } else {
        // If audio not loaded, load it first
        if (!isAudioLoaded) {
          console.log('[ChatMessage] Loading audio for first time');
          const audioUri = content || imageData || files?.[0]?.s3_url || '';
          
          if (!audioUri) {
            console.error('[ChatMessage] No audio URI available');
            return;
          }

          await soundRef.current.loadAsync(
            { uri: audioUri },
            { progressUpdateIntervalMillis: 100 }
          );
          setIsAudioLoaded(true);
        }
        
        // Play or resume audio
        console.log('[ChatMessage] Playing/resuming audio');
        await soundRef.current.playAsync();
        // State will be updated by the status callback
      }
    } catch (error) {
      console.error('[ChatMessage] Audio playback error:', error);
      handleErrorSilent(error, 'Audio Player');
      setIsPlaying(false);
      setIsAudioLoaded(false);
      
      // Try to recover by unloading
      try {
        await soundRef.current.unloadAsync();
      } catch (unloadError) {
        // Ignore unload errors
      }
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

  // Helper function to check if content is a file path
  const isFilePath = (text: string): boolean => {
    if (!text) return false;
    return text.startsWith('file://') || 
           text.startsWith('/') || 
           text.includes('CoreSimulator') ||
           text.includes('Library/Caches');
  };

  // Helper function to extract filename from path
  const getFileNameFromPath = (path: string): string => {
    if (!path) return '';
    const parts = path.split('/');
    const fileName = parts[parts.length - 1];
    // Remove any query parameters or hash
    return fileName.split('?')[0].split('#')[0];
  };

  // Get the display text for user messages
  const getDisplayText = (): string => {
    // For user messages with media files:
    // Priority: prompt field > content (if not a file path) > empty
    if (role === Role.User && (imageData || files?.length)) {
      // If we have a prompt field, use it
      if (prompt) {
        return prompt;
      }
      // If content is not a file path, use it (it might be the prompt text)
      if (content && !isFilePath(content)) {
        return content;
      }
      // No text prompt - just show the file
      return '';
    }
    
    // For non-file messages, return content normally
    return content;
  };

  // Render generated images and videos from additional_data
  const renderAdditionalData = () => {
    if (!additional_data || additional_data.length === 0) {
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
    
    // If nothing to render after filtering, return null
    if (videosToRender.length === 0 && imagesToRender.length === 0) {
      return null;
    }
    
    return (
      <View style={styles.additionalDataContainer}>
        {/* Images - using same renderImageContent as regular images */}
        {imagesToRender.map((item, imageIndex) => {
          // Backend sends either "data" or "s3_url" as the image URL
          const imageUrl = item.data || item.s3_url || '';
          
          if (!imageUrl) {
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

    return (
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Link
            href={`/(modal)/image/${encodeURIComponent(imageUrl)}?prompt=${encodeURIComponent(prompt || '')}`}
            asChild
          >
            <Pressable
              onLongPress={onLongPress}
              // ✅ REMOVED onPress={handlePress} to allow Link navigation to work
              // The Link component handles the press for fullscreen navigation
              accessible={true}
              accessibilityLabel={`Image preview. ${prompt}`}
              accessibilityRole="image"
              testID="image-preview-pressable"
              style={{width: '100%'}}
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
    const handleSeek = async (newProgress: number) => {
      if (soundRef.current && isAudioLoaded && duration > 0) {
        try {
          const newPosition = newProgress * duration;
          await soundRef.current.setPositionAsync(newPosition);
        } catch (error) {
          console.error('[ChatMessage] Seek error:', error);
        }
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
      <Pressable onPress={handleVideoPress} style={styles.videoWrapper}>
        <Video
          ref={videoRef}
          source={{ uri: videoUrl || '' }}
          style={styles.video}
          useNativeControls={false}
          isLooping
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded) {
              setIsVideoPlaying(status.isPlaying);
            }
          }}
        />
        
        {/* Play/Pause Button Overlay - Always visible when paused or controls shown */}
        {(!isVideoPlaying || showVideoControls) && (
          <Pressable 
            style={styles.videoPlayButton}
            onPress={handleVideoPlayPause}
          >
            <View style={styles.videoPlayButtonCircle}>
              <Ionicons 
                name={isVideoPlaying ? "pause" : "play"} 
                size={32} 
                color="#fff" 
                style={!isVideoPlaying && { marginLeft: 3 }} // Adjust play icon position
              />
            </View>
          </Pressable>
        )}
        
        {/* Loading Indicator */}
        {isLoadingDownloadVideo && (
          <View style={styles.loadingVideo}>
            <ActivityIndicator size={'large'} color={Colors.light.background} />
          </View>
        )}
        
        {/* Control Buttons - Show when controls are visible */}
        {showVideoControls && (
          <>
            <TouchableOpacity 
              style={styles.fullScreenButton} 
              onPress={handleFullScreenVideo}
            >
              <Feather name="maximize" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.downloadButton]}
              onPress={handleDownloadVideo}
            >
              <Feather name="download" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </Pressable>
    );
  };

  const renderDocument = () => {
    // Get document info from files array or imageData
    const fileUri = files?.[0]?.s3_url || imageData || content;
    const fileName = files?.[0]?.name || getFileNameFromPath(fileUri) || 'Document';
    const fileSize = (files?.[0] as any)?.size; // Type assertion for size property
    const mimeType = files?.[0]?.file_type || files?.[0]?.data_type;

    const handleDocumentPress = () => {
      // TODO: Implement document opening/downloading
      Alert.alert('Document', `Open ${fileName}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open', onPress: () => console.log('Open document:', fileUri) },
      ]);
    };

    return (
      <DocumentPreview
        fileName={fileName}
        fileSize={fileSize}
        fileUri={fileUri}
        mimeType={mimeType}
        role={role}
        onPress={handleDocumentPress}
        onLongPress={onLongPress}
      />
    );
  };

  // Render content segments inline (text and artifacts in original order)
  const renderContentSegments = () => {
    return contentSegments.map((segment, index) => {
      if (segment.type === 'text') {
        // Render text segment
        const textContent = segment.content;
        if (!textContent || textContent.trim() === '') return null;
        
        return (
          <View key={`text-${index}`} style={styles.segmentContainer}>
            <MarkdownDisplay>{textContent}</MarkdownDisplay>
          </View>
        );
      } else {
        // Render artifact indicator inline
        return (
          <View key={`artifact-${index}`} style={styles.segmentContainer}>
            <ArtifactIndicator
              artifact={segment.artifact}
              onPress={() => onArtifactPress?.(segment.artifact, messageArtifacts)}
            />
          </View>
        );
      }
    });
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
                      accessibilityLabel={`Your message: ${getDisplayText()}`}
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
                      {(() => {
                        const displayText = getDisplayText();
                        return displayText && !isAudio(displayText) && (
                          <Animated.View
                            style={[
                              styles.markdownContainer,
                              streamingContent && { transform: [] },
                              streamingContent && { backgroundColor: `transparent` },
                            ]}
                          >
                            <View style={styles.userTextWrapper}>
                              <MarkdownDisplay additionalStyles={{
                                body: { color: '#FFFFFF', lineHeight: 28 },
                                heading1: { color: '#FFFFFF' },
                                heading2: { color: '#FFFFFF' },
                                heading3: { color: '#FFFFFF' },
                                heading4: { color: '#FFFFFF' },
                                heading5: { color: '#FFFFFF' },
                                heading6: { color: '#FFFFFF' },
                                paragraph: { color: '#FFFFFF', lineHeight: 28 },
                                text: { color: '#FFFFFF', lineHeight: 28 },
                              }}>
                                {displayText}
                              </MarkdownDisplay>
                            </View>
                          </Animated.View>
                        );
                      })()}
                      
                      {/* Audio content within message bubble */}
                      {(isAudio(content) || isAudio(imageData || '') || files?.[0]?.file_type === 'voice') && (
                        <View style={styles.audioInMessage}>
                          {renderAudio()}
                        </View>
                      )}
                      
                      {/* Document content within message bubble */}
                      {(isDocument(content) || isDocument(imageData || '') || files?.[0]?.file_type === 'document') && (
                        <View style={styles.documentInMessage}>
                          {renderDocument()}
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
                    {/* Render thinking block if present */}
                    {thinkingData.thinking && (
                      <ThinkingBlock
                        content={thinkingData.thinking.content}
                        isStreaming={!thinkingData.thinking.isComplete}
                      />
                    )}
                    
                    {/* 
                      Render reasoning block if present
                      Sources:
                      1. streamingReasoning: Real-time reasoning during active streaming
                      2. reasoningData.reasoning: Extracted from historical/completed messages
                    */}
                    {(() => {
                      const hasStreamingReasoning = streamingReasoning && streamingReasoning.trim().length > 0;
                      const hasHistoricalReasoning = reasoningData.reasoning && reasoningData.reasoning.content.trim().length > 0;
                      
                      if (hasStreamingReasoning || hasHistoricalReasoning) {
                        console.log('[ChatMessage] 🧠 Rendering reasoning block:', {
                          hasStreamingReasoning,
                          hasHistoricalReasoning,
                          streamingReasoningLength: streamingReasoning?.length || 0,
                          historicalReasoningLength: reasoningData.reasoning?.content.length || 0,
                        });
                      }
                      
                      return (hasStreamingReasoning || hasHistoricalReasoning) && (
                        <ReasoningBlock
                          content={streamingReasoning || reasoningData.reasoning?.content || ''}
                          isStreaming={hasStreamingReasoning || !reasoningData.reasoning?.isComplete}
                        />
                      );
                    })()}
                    
                    {/* Render content segments inline (text and artifacts in original order) */}
                    {contentSegments.length > 0 && !isAudio(content) && !isAudio(imageData || '') && (
                      <View style={styles.botMessageWrapper}>
                        <Animated.View
                          style={[
                            styles.markdownContainer,
                            streamingContent && { transform: [] },
                            streamingContent && { backgroundColor: `transparent` },
                            isSending && { width: 'auto', flex: 1 }, // Allow space for dot when streaming
                          ]}
                        >
                          {renderContentSegments()}
                        </Animated.View>
                        {/* Show streaming cursor when actively sending */}
                        {isSending && <StreamingCursor />}
                      </View>
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
                    {(isAudio(content) || isAudio(imageData || '') || files?.[0]?.file_type === 'voice') && (
                      <View style={styles.audioInMessage}>
                        {renderAudio()}
                      </View>
                    )}
                    
                    {/* Document content within message bubble */}
                    {(isDocument(content) || isDocument(imageData || '') || files?.[0]?.file_type === 'document') && (
                      <View style={styles.documentInMessage}>
                        {renderDocument()}
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
                accessibilityLabel={`Your message: ${getDisplayText()}`}
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
                {(() => {
                  const displayText = getDisplayText();
                  return displayText && !isAudio(displayText) && (
                    <Animated.View
                      style={[
                        styles.markdownContainer,
                        streamingContent && { transform: [] },
                        streamingContent && { backgroundColor: `transparent` },
                      ]}
                    >
                      <View style={styles.userTextWrapper}>
                        <MarkdownDisplay additionalStyles={{
                          body: { color: '#FFFFFF', lineHeight: 28 },
                          heading1: { color: '#FFFFFF' },
                          heading2: { color: '#FFFFFF' },
                          heading3: { color: '#FFFFFF' },
                          heading4: { color: '#FFFFFF' },
                          heading5: { color: '#FFFFFF' },
                          heading6: { color: '#FFFFFF' },
                          paragraph: { color: '#FFFFFF', lineHeight: 28 },
                          text: { color: '#FFFFFF', lineHeight: 28 },
                        }}>
                          {displayText}
                        </MarkdownDisplay>
                      </View>
                    </Animated.View>
                  );
                })()}
                
                {/* Audio content within message bubble */}
                {(isAudio(content) || isAudio(imageData || '') || files?.[0]?.file_type === 'voice') && (
                  <View style={styles.audioInMessage}>
                    {renderAudio()}
                  </View>
                )}
                
                {/* Document content within message bubble */}
                {(isDocument(content) || isDocument(imageData || '') || files?.[0]?.file_type === 'document') && (
                  <View style={styles.documentInMessage}>
                    {renderDocument()}
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
              {/* Render content segments inline (text and artifacts in original order) */}
              {contentSegments.length > 0 && !isAudio(content) && !isAudio(imageData || '') && (
                <View style={styles.botMessageWrapper}>
                  <Animated.View
                    style={[
                      styles.markdownContainer,
                      streamingContent && { transform: [] },
                      streamingContent && { backgroundColor: `transparent` },
                      isSending && { width: 'auto', flex: 1 }, // Allow space for dot when streaming
                    ]}
                  >
                    {renderContentSegments()}
                  </Animated.View>
                  {/* Show streaming cursor when actively sending */}
                  {isSending && <StreamingCursor />}
                </View>
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
              {(isAudio(content) || isAudio(imageData || '') || files?.[0]?.file_type === 'voice') && (
                <View style={styles.audioInMessage}>
                  {renderAudio()}
                </View>
              )}
              
              {/* Document content within message bubble */}
              {(isDocument(content) || isDocument(imageData || '') || files?.[0]?.file_type === 'document') && (
                <View style={styles.documentInMessage}>
                  {renderDocument()}
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
  
  // Render action icons below message
  const renderActionIcons = () => {
    // Don't show actions while loading or sending
    if (shouldShowLoading || isSending) return null;
    
    const actions: Array<{
      key: string;
      icon: any;
      label: string;
      onPress: () => void;
      color: string;
      isActive?: boolean;
    }> = [];
    
    // Check if message has media content
    const hasMedia = !!(
      (imageData && (isImage(imageData) || isAudio(imageData) || isDocument(imageData))) ||
      (files && files.length > 0) ||
      (additional_data && additional_data.length > 0 && additional_data.some(item => 
        item.data_type === 'img' || item.data_type === 'video' || item.data_type === 'voice' || item.data_type === 'document'
      ))
    );
    
    // Like/Dislike actions - only for bot messages with chat_id
    if (role === Role.Bot && chat_id) {
      if (onLike) {
        actions.push({
          key: 'like',
          icon: reaction === 'like' ? 'thumbs-up' : 'thumbs-up-outline',
          label: 'Like',
          onPress: onLike,
          color: reaction === 'like' ? '#10b981' : theme.colors.textSecondary, // Green when active
          isActive: reaction === 'like',
        });
      }
      
      if (onDislike) {
        actions.push({
          key: 'dislike',
          icon: reaction === 'dislike' ? 'thumbs-down' : 'thumbs-down-outline',
          label: 'Dislike',
          onPress: onDislike,
          color: reaction === 'dislike' ? '#ef4444' : theme.colors.textSecondary, // Red when active
          isActive: reaction === 'dislike',
        });
      }
    }
    
    // Copy action - available for non-media messages only
    if (onCopy && !hasMedia) {
      actions.push({
        key: 'copy',
        icon: 'copy-outline',
        label: 'Copy',
        onPress: onCopy,
        color: theme.colors.primary,
      });
    }
    
    // Pin action - available for all messages (HIDDEN)
    // if (onPin) {
    //   actions.push({
    //     key: 'pin',
    //     icon: isPinned ? 'pin' : 'pin-outline',
    //     label: isPinned ? 'Unpin' : 'Pin',
    //     onPress: onPin,
    //     color: isPinned ? theme.colors.orange : theme.colors.textSecondary,
    //   });
    // }
    
    // Retry action - only for user messages that failed (backend error)
    if (error && onRetry && role === Role.User) {
      actions.push({
        key: 'retry',
        icon: 'refresh-outline',
        label: 'Retry',
        onPress: onRetry,
        color: theme.colors.orange,
      });
    }
    
    if (actions.length === 0) return null;
    
    return (
      <View style={[styles.actionIconsContainer, role === Role.User ? styles.actionIconsUser : styles.actionIconsBot]}>
        {actions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={styles.actionIconButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              action.onPress();
            }}
            activeOpacity={0.6}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <Ionicons name={action.icon} size={16} color={action.color} />
            <Text style={[styles.actionIconLabel, { color: action.color }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
  
  return (
    <Animated.View
      style={containerStyle}
      testID={`message-${role === Role.Bot ? 'bot' : 'user'}`}
    >
     
      {shouldShowLoading ? (
        // Case 1 & 2: No content yet - show loading dots with/without intermediate
        <View style={styles.loadingStateContainer}>
          {intermediate ? (
            <View style={styles.intermediateContainer}>
              <View style={styles.intermediateIconContainer}>
                  {intermediate.toLowerCase().includes('image') || intermediate.toLowerCase().includes('generating') ? (
                    <Ionicons name="images" size={20} color={theme.colors.text} style={styles.intermediateIcon} />
                  ) : intermediate.toLowerCase().includes('video') ? (
                    <Ionicons name="videocam" size={20} color={theme.colors.text} style={styles.intermediateIcon} />
                  ) : intermediate.toLowerCase().includes('search') ? (
                    <Ionicons name="search" size={20} color={theme.colors.text} style={styles.intermediateIcon} />
                  ) : (
                    <LoadingDots />
                  )}
              </View>
              <AnimatedText text={intermediate?.toString()} />
            </View>
          ) : (
            <View style={styles.intermediateContainer}>
              <View style={styles.intermediateIconContainer}>
                <LoadingDots />
              </View>
            </View>
          )}
        </View>
      ) : (
        // Case 3 & 4: Content has arrived - show content with optional intermediate above
        <View style={styles.messageWrapper}>
          {/* Show intermediate state above content during streaming 
              (e.g., "Searching...", "Generating image..." while content is streaming) */}
          {intermediate && isSending && (
            <View style={styles.intermediateContainer}>
              <View style={styles.intermediateIconContainer}>
                  {intermediate.toLowerCase().includes('image') || intermediate.toLowerCase().includes('generating') ? (
                    <Ionicons name="images" size={20} color={theme.colors.text} style={styles.intermediateIcon} />
                  ) : intermediate.toLowerCase().includes('video') ? (
                    <Ionicons name="videocam" size={20} color={theme.colors.text} style={styles.intermediateIcon} />
                  ) : intermediate.toLowerCase().includes('search') ? (
                    <Ionicons name="search" size={20} color={theme.colors.text} style={styles.intermediateIcon} />
                  ) : (
                    <LoadingDots />
                  )}
              </View>
              <AnimatedText text={intermediate?.toString()} />
            </View>
          )}
          
          {/* Message content */}
          <View style={styles.messageContent} testID="message-content">
            {renderContent()}
          </View>
          
          {/* Action Icons */}
          {renderActionIcons()}
          
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

/**
 * Custom comparison function for ChatMessage memoization
 * Optimized for smooth streaming performance while allowing critical updates
 * 
 * Strategy:
 * - Compare critical props that affect rendering
 * - Allow streaming content updates
 * - Allow image/file updates
 * - Prevent re-renders for unchanged content
 * 
 * Returns TRUE if props are equal (skip re-render)
 * Returns FALSE if props differ (allow re-render)
 */
const areChatMessagePropsEqual = (
  prev: ChatMessageProps,
  next: ChatMessageProps
): boolean => {
  // Always update if content changed (streaming updates)
  if (prev.content !== next.content) return false;
  
  // Always update if loading state changed
  if (prev.loading !== next.loading) return false;
  
  // Always update if error state changed
  if (prev.error !== next.error) return false;
  
  // Always update if reaction changed
  if (prev.reaction !== next.reaction) return false;
  
  // Always update if streaming state changed
  if (prev.streamingContent !== next.streamingContent) return false;
  if (prev.isSending !== next.isSending) return false;
  if (prev.streamWorking !== next.streamWorking) return false;
  
  // Always update if status changed
  if (prev.status !== next.status) return false;
  
  // Always update if pin state changed
  if (prev.isPinned !== next.isPinned) return false;
  
  // Check for image changes (URL, data, or error state)
  if (prev.imageUrl !== next.imageUrl) return false;
  if (prev.imageData !== next.imageData) return false;
  
  // Check for file changes
  if (prev.files?.length !== next.files?.length) return false;
  if (prev.files && next.files) {
    for (let i = 0; i < prev.files.length; i++) {
      if (prev.files[i].s3_url !== next.files[i].s3_url) return false;
      if (prev.files[i].file_path !== next.files[i].file_path) return false;
    }
  }
  
  // Check for artifact changes
  if (prev.artifacts?.length !== next.artifacts?.length) return false;
  if (prev.streamingArtifact?.id !== next.streamingArtifact?.id) return false;
  if (prev.streamingArtifact?.content !== next.streamingArtifact?.content) return false;
  
  // Check for reasoning changes
  if (prev.streamingReasoning !== next.streamingReasoning) return false;
  
  // Check for additional_data changes (images, files, etc.)
  if (prev.additional_data?.length !== next.additional_data?.length) return false;
  if (prev.additional_data && next.additional_data) {
    for (let i = 0; i < prev.additional_data.length; i++) {
      // Check if URLs changed (critical for image/file updates)
      if (prev.additional_data[i].s3_url !== next.additional_data[i].s3_url) return false;
      if (prev.additional_data[i].file_path !== next.additional_data[i].file_path) return false;
      if (prev.additional_data[i].data_type !== next.additional_data[i].data_type) return false;
    }
  }
  
  // Check timestamp changes (affects formatting)
  if (prev.timestamp !== next.timestamp) return false;
  
  // Check grouping changes (affects layout)
  if (prev.isFirstInGroup !== next.isFirstInGroup) return false;
  if (prev.isLastInGroup !== next.isLastInGroup) return false;
  if (prev.isOnlyInGroup !== next.isOnlyInGroup) return false;
  
  // Check chat_id changes (affects like/dislike visibility)
  if (prev.chat_id !== next.chat_id) return false;
  
  // All critical props are equal - skip re-render
  return true;
};

// Export memoized component with custom comparison
const MemoizedChatMessage = memo(ChatMessage, areChatMessagePropsEqual);

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
    // Clean design - full opacity for streaming content
    opacity: 1,
  },
  markdownContainer: {
    width: '100%',
    alignSelf: 'flex-start',
  },
  botMessageWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
    flexWrap: 'nowrap',
  },
  mediaInMessage: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  audioInMessage: {
    width: '100%',
  },
  documentInMessage: {
    width: '100%',
    marginTop: 8,
  },
  userTextWrapper: {
    width: '100%',
  },
  botContent: {
    // Clean, borderless design for bot messages
    backgroundColor: 'transparent',
    borderBottomLeftRadius: CHAT_MESSAGE.TAIL_BORDER_RADIUS,
    borderWidth: 0,
    borderColor: 'transparent',
    // No shadows for clean look
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
    lineHeight: 28,
  },
  loadingVideo: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
  },
  videoWrapper: {
    width: '100%',
    aspectRatio: 16 / 9, // Widescreen aspect ratio
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  videoPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -35 }, { translateY: -35 }],
    zIndex: 10,
  },
  videoPlayButtonCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.9)',
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
    width: '100%',
    height: 200,
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
    width: '100%',
    height: 200,
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
    backgroundColor: theme.colors.text,
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
    width: '100%',
    aspectRatio: 16 / 9, // Widescreen aspect ratio for generated videos
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
    // Clean, borderless design for intermediate state
    backgroundColor: 'transparent',
    paddingHorizontal: 0, // Remove horizontal padding for cleaner look
    paddingVertical: 12,
    borderRadius: CHAT_MESSAGE.MESSAGE_BORDER_RADIUS,
    borderWidth: 0,
    borderColor: 'transparent',
    maxWidth: '100%',
  },
  intermediateIconContainer: {
    marginRight: 12, // Space between icon/loading dots and intermediate text
  },
  intermediateIcon: {
    opacity: 0.8,
  },
  streamingContentWrapper: {
    marginTop: 8, // Additional spacing for streaming content when shown with intermediate
  },
  artifactsContainer: {
    marginTop: 12,
    gap: 8,
  },
  segmentContainer: {
    width: '100%',
    marginBottom: 4,
  },
  // Action Icons Styles
  actionIconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  actionIconsUser: {
    justifyContent: 'flex-end',
  },
  actionIconsBot: {
    justifyContent: 'flex-start',
  },
  actionIconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    minHeight: 28,
  },
  actionIconLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default MemoizedChatMessage;