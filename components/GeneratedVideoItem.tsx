import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import Colors from '@/constants/Colors';
import { CHAT_MESSAGE } from '@/constants/ChatConstants';
import { downloadAndSaveVideo } from '@/utils/Image';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';

interface GeneratedVideoItemProps {
  videoUrl: string;
  index: number;
  totalVideos: number;
  onError?: (index: number, error: Error) => void;
}

const GeneratedVideoItem: React.FC<GeneratedVideoItemProps> = ({
  videoUrl,
  index,
  totalVideos,
  onError,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const videoRef = useRef<Video>(null);
  const loadStartTime = useRef<number>(Date.now());

  const handleLoadStart = useCallback(() => {
    setIsLoading(true);
    loadStartTime.current = Date.now();
  }, []);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    
    // Track successful video load
    const loadTime = Date.now() - loadStartTime.current;
    mixpanelService.track('Video Loaded Successfully', {
      source: 'generated_video',
      video_url: videoUrl,
      load_time_ms: loadTime,
      video_index: index,
      total_videos: totalVideos,
    }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
  }, [videoUrl, index, totalVideos]);

  const handleError = useCallback((error: string) => {
    console.error(`[GeneratedVideoItem] Video load error:`, error);
    setIsLoading(false);
    setHasError(true);
    
    // Track video load failure
    mixpanelService.track('Video Load Failed', {
      source: 'generated_video',
      video_url: videoUrl,
      error_message: error,
      video_index: index,
    }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
    
    onError?.(index, new Error(error));
  }, [videoUrl, index, onError]);

  const handlePlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      if (status.didJustFinish) {
        // Video finished playing
        console.log('[GeneratedVideoItem] Video playback finished');
      }
    } else if ('error' in status) {
      handleError(status.error || 'Unknown playback error');
    }
  }, [handleError]);

  const handleFullScreen = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.presentFullscreenPlayer();
    }
  }, []);

  const handleDownload = useCallback(async () => {
    const startTime = Date.now();
    try {
      setIsDownloading(true);
      await downloadAndSaveVideo(videoUrl);
      Alert.alert('Success', 'Video saved to gallery');
      
      // Track successful download
      const downloadTime = Date.now() - startTime;
      mixpanelService.track('Video Downloaded', {
        source: 'generated_video',
        video_url: videoUrl,
        download_time_ms: downloadTime,
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
    } catch (error) {
      console.error('[GeneratedVideoItem] Video download failed:', error);
      Alert.alert('Error', 'Failed to save video. Please try again.');
      
      // Track download failure
      mixpanelService.track('Video Download Failed', {
        source: 'generated_video',
        video_url: videoUrl,
        error_message: error instanceof Error ? error.message : String(error),
      }).catch(() => {});
    } finally {
      setIsDownloading(false);
    }
  }, [videoUrl]);

  // Show error state
  if (hasError) {
    return (
      <View style={styles.videoContainer}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={Colors.common.grey} />
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setIsLoading(true);
            }}
            accessibilityLabel="Retry loading video"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.videoContainer}>
      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}

      {/* Video Player */}
      <Video
        ref={videoRef}
        source={{ uri: videoUrl }}
        style={styles.video}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={() => handleError('Failed to load video')}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
      
      {/* Generation Badge */}
      <View style={styles.generationBadge}>
        <Ionicons name="sparkles" size={12} color="#FFFFFF" />
      </View>
      
      {/* Video Counter (for multiple videos) */}
      {totalVideos > 1 && (
        <View style={styles.videoCounterBadge}>
          <Ionicons name="videocam" size={12} color="#FFFFFF" />
        </View>
      )}
      
      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Fullscreen Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleFullScreen}
          accessibilityLabel="Open fullscreen"
          accessibilityRole="button"
        >
          <Ionicons name="expand" size={20} color="#FFFFFF" />
        </TouchableOpacity>
        
        {/* Download Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDownload}
          disabled={isDownloading}
          accessibilityLabel="Download video"
          accessibilityRole="button"
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="download" size={20} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    videoContainer: {
      position: 'relative',
      width: '100%',
      aspectRatio: 16 / 9,
      backgroundColor: '#000',
      borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
      overflow: 'hidden',
      marginTop: 8,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        },
        android: {
          elevation: 4,
        },
      }),
    },
    video: {
      width: '100%',
      height: '100%',
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
      backgroundColor: theme.colors.backgroundLight,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    generationBadge: {
      position: 'absolute',
      top: 12,
      left: 12,
      backgroundColor: 'rgba(138, 43, 226, 0.85)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 2,
    },
    videoCounterBadge: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 2,
    },
    actionsContainer: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      flexDirection: 'row',
      gap: 8,
      zIndex: 2,
    },
    actionButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          backdropFilter: 'blur(10px)',
        },
      }),
    },
  });

export default GeneratedVideoItem;

