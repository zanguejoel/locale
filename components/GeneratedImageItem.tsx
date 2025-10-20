import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import LazyImage from './LazyImage';
import Colors from '@/constants/Colors';
import { CHAT_MESSAGE } from '@/constants/ChatConstants';
import { Link } from 'expo-router';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';

interface GeneratedImageItemProps {
  imageUrl: string;
  index: number;
  layoutType: 'single' | 'double' | 'grid';
  totalImages: number;
  onPress?: (imageUrl: string) => void;
  onDownload?: (imageUrl: string) => void;
  onShare?: (imageUrl: string) => void;
  onError?: (index: number, error: Error) => void;
}

const GeneratedImageItem: React.FC<GeneratedImageItemProps> = ({
  imageUrl,
  index,
  layoutType,
  totalImages,
  onPress,
  onDownload,
  onShare,
  onError,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme, layoutType);
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [imageKey, setImageKey] = useState(0);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff

  // Animate image appearance
  useEffect(() => {
    if (!isLoading && !hasError) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading, hasError]);

  const loadStartTime = useRef<number>(Date.now());

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
    
    // Track successful image load
    const loadTime = Date.now() - loadStartTime.current;
    mixpanelService.track('Image Loaded Successfully', {
      source: 'generated_image',
      image_url: imageUrl,
      load_time_ms: loadTime,
      retry_count: retryCount,
      layout_type: layoutType,
      image_index: index,
      total_images: totalImages,
    }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
  }, [imageUrl, retryCount, layoutType, index, totalImages]);

  const handleError = useCallback((error: any) => {
    console.error(`[GeneratedImageItem] Image load error (attempt ${retryCount + 1}):`, error);
    
    // Check for specific error types
    const errorString = String(error?.error || error?.message || error);
    const is403Error = errorString.includes('403') || errorString.includes('Forbidden');
    const is404Error = errorString.includes('404') || errorString.includes('Not Found');
    
    if (is403Error) {
      console.error('[GeneratedImageItem] 🚫 403 FORBIDDEN - S3 permissions issue. Backend needs to fix presigned URL generation.');
    } else if (is404Error) {
      console.error('[GeneratedImageItem] 🚫 404 NOT FOUND - Image does not exist on S3. Backend upload may have failed.');
    }
    
    const isFinalFailure = retryCount >= MAX_RETRIES;
    
    // Track image load failure
    mixpanelService.track('Image Load Failed', {
      source: 'generated_image',
      image_url: imageUrl,
      error_message: errorString,
      error_type: is403Error ? '403_forbidden' : is404Error ? '404_not_found' : 'unknown',
      retry_count: retryCount,
      final_failure: isFinalFailure,
      layout_type: layoutType,
      image_index: index,
    }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
    
    if (retryCount < MAX_RETRIES) {
      // Schedule retry with exponential backoff
      const delay = RETRY_DELAYS[retryCount] || 4000;
      setTimeout(() => {
        console.log(`[GeneratedImageItem] Retrying image load (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
        setRetryCount(prev => prev + 1);
        setHasError(false);
        setImageKey(prev => prev + 1); // Force re-render
        loadStartTime.current = Date.now(); // Reset timer for retry
      }, delay);
    } else {
      // Max retries reached
      setHasError(true);
      setIsLoading(false);
      onError?.(index, new Error('Failed to load image after multiple attempts'));
    }
  }, [retryCount, index, onError, imageUrl, layoutType]);

  const handleManualRetry = useCallback(() => {
    console.log('[GeneratedImageItem] Manual retry triggered');
    setRetryCount(0);
    setHasError(false);
    setIsLoading(true);
    setImageKey(prev => prev + 1);
  }, []);

  const handleImagePress = useCallback(() => {
    if (!hasError && !isLoading) {
      onPress?.(imageUrl);
    }
  }, [imageUrl, hasError, isLoading, onPress]);

  // Get image dimensions based on layout type
  const getImageDimensions = (): {
    width: string | number;
    aspectRatio: number;
    maxHeight: number;
  } => {
    switch (layoutType) {
      case 'single':
        return {
          width: '100%' as const,
          aspectRatio: 16 / 9,
          maxHeight: 280,
        };
      case 'double':
        return {
          width: '48%' as const,
          aspectRatio: 1,
          maxHeight: 200,
        };
      case 'grid':
        return {
          width: '31%' as const,
          aspectRatio: 1,
          maxHeight: 150,
        };
    }
  };

  const dimensions = getImageDimensions();
  const dimensionStyles: any = dimensions; // Type assertion for React Native style compatibility

  // Show loading skeleton
  if (isLoading && !hasError) {
    return (
      <View style={[styles.imageWrapper, dimensionStyles]}>
        <View style={styles.loadingSkeleton}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  // Show error state
  if (hasError) {
    return (
      <View style={[styles.imageWrapper, dimensionStyles, styles.errorWrapper]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={32} color={Colors.common.grey} />
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleManualRetry}
            accessibilityLabel="Retry loading image"
            accessibilityRole="button"
          >
            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.imageWrapper,
        dimensionStyles,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      <Link
        href={`/(modal)/image/${encodeURIComponent(imageUrl)}`}
        asChild
      >
        <TouchableOpacity
          // ✅ REMOVED onPress={handleImagePress} to allow Link navigation to fullscreen
          // The Link component handles the press automatically for fullscreen view
          activeOpacity={0.9}
          accessibilityLabel={`Generated image ${index + 1} of ${totalImages}`}
          accessibilityRole="image"
        >
          <LazyImage
            key={imageKey}
            uri={imageUrl}
            style={styles.image}
            resizeMode="cover"
            onLoad={handleLoadEnd}
            onError={handleError}
            threshold={600}
            showLoadingIndicator={false} // We handle loading state ourselves
            priority="high"
            cachePolicy="memory-disk"
          />
          
          {/* Generation Badge */}
          <View style={styles.generationBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
          </View>
          
          {/* Image Counter (for multi-image layouts) */}
          {totalImages > 1 && (
            <View style={styles.imageCounterBadge}>
              <Ionicons name="images" size={10} color="#FFFFFF" />
            </View>
          )}
          
          {/* Action Buttons Overlay */}
          <View style={styles.actionsOverlay}>
            {onDownload && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onDownload(imageUrl)}
                accessibilityLabel="Download image"
                accessibilityRole="button"
              >
                <Ionicons name="download" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            
            {onShare && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => onShare(imageUrl)}
                accessibilityLabel="Share image"
                accessibilityRole="button"
              >
                <Ionicons name="share-social" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Link>
    </Animated.View>
  );
};

const getStyles = (theme: Theme, layoutType: 'single' | 'double' | 'grid') =>
  StyleSheet.create({
    imageWrapper: {
      position: 'relative',
      overflow: 'hidden',
      borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
      backgroundColor: theme.colors.backgroundLight,
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
    image: {
      width: '100%',
      height: '100%',
      borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    },
    loadingSkeleton: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: CHAT_MESSAGE.BORDER_RADIUS,
    },
    errorWrapper: {
      borderWidth: 1,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      borderStyle: 'dashed',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
    },
    retryButton: {
      backgroundColor: theme.colors.primary,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
    },
    generationBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      backgroundColor: 'rgba(138, 43, 226, 0.85)',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    imageCounterBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      width: 24,
      height: 24,
      borderRadius: 12,
      justifyContent: 'center',
      alignItems: 'center',
    },
    actionsOverlay: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      gap: 8,
    },
    actionButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      ...Platform.select({
        ios: {
          backdropFilter: 'blur(10px)',
        },
      }),
    },
  });

export default GeneratedImageItem;

