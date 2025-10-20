import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

export type ErrorType = 'network' | 'api' | 'permission' | 'model' | 'credit' | 'generic';

interface ErrorBannerProps {
  type: ErrorType;
  message: string;
  action?: {
    text: string;
    onPress: () => void;
  };
  onDismiss?: () => void;
  autoHide?: boolean;
  autoHideDuration?: number;
}

const ErrorBanner: React.FC<ErrorBannerProps> = ({
  type,
  message,
  action,
  onDismiss,
  autoHide = false,
  autoHideDuration = 5000,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Enhanced slide in animation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 180,
        mass: 0.8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }),
    ]).start();

    // Auto hide with progress bar
    if (autoHide && autoHideDuration) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: autoHideDuration,
        useNativeDriver: false,
      }).start();

      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss?.();
    });
  };

  const getErrorConfig = () => {
    switch (type) {
      case 'network':
        return {
          icon: 'cloud-offline-outline' as const,
          color: '#FF9500',
          gradient: ['#FF9500', '#FF8000'],
          title: 'Connection Lost',
          defaultMessage: 'No internet connection. Please check your network.',
          defaultAction: {
            text: 'Retry',
            onPress: () => {},
          },
        };
      case 'api':
        return {
          icon: 'warning' as const,
          color: '#FF3B30',
          gradient: ['#FF3B30', '#FF1F1A'],
          title: 'Service Error',
          defaultMessage: 'Something went wrong. Please try again.',
          defaultAction: {
            text: 'Contact Support',
            onPress: () => {
              Linking.openURL('mailto:support@example.com');
            },
          },
        };
      case 'permission':
        return {
          icon: 'lock-closed' as const,
          color: '#FF9500',
          gradient: ['#FF9500', '#FF8000'],
          title: 'Permission Required',
          defaultMessage: 'Permission required to continue.',
          defaultAction: {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        };
      case 'model':
        return {
          icon: 'alert-circle' as const,
          color: '#FF9500',
          gradient: ['#FF9500', '#FF8000'],
          title: 'Model Unavailable',
          defaultMessage: 'Model unavailable. Please try a different model.',
          defaultAction: {
            text: 'Change Model',
            onPress: () => {},
          },
        };
      case 'credit':
        return {
          icon: 'card' as const,
          color: '#FF3B30',
          gradient: ['#FF3B30', '#FF1F1A'],
          title: 'Credit Limit Reached',
          defaultMessage: 'You have reached your credit limit.',
          defaultAction: {
            text: 'Upgrade',
            onPress: () => {
              Linking.openURL('https://www.odysseytech.ai/dashboard/settings?tab=usage');
            },
          },
        };
      default:
        return {
          icon: 'information-circle' as const,
          color: '#007AFF',
          gradient: ['#007AFF', '#0051D5'],
          title: 'Notice',
          defaultMessage: 'An error occurred.',
          defaultAction: {
            text: 'OK',
            onPress: () => {},
          },
        };
    }
  };

  const config = getErrorConfig();
  const displayAction = action || config.defaultAction;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          transform: [
            { translateY: slideAnim },
            { scale: scaleAnim },
          ],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.bannerWrapper}>
        {/* Enhanced Banner with blur effect on iOS */}
        {Platform.OS === 'ios' ? (
          <BlurView 
            intensity={80} 
            tint={theme.colors.background === '#FFFFFF' ? 'light' : 'dark'} 
            style={styles.blurContainer}
          >
            <View style={[styles.banner, { borderTopColor: config.color }]}>
              {renderBannerContent()}
            </View>
          </BlurView>
        ) : (
          <View style={[styles.banner, styles.androidBanner, { borderTopColor: config.color }]}>
            {renderBannerContent()}
          </View>
        )}
        
        {/* Progress Bar for auto-hide */}
        {autoHide && (
          <Animated.View 
            style={[
              styles.progressBar,
              { 
                width: progressWidth,
                backgroundColor: config.color,
              }
            ]} 
          />
        )}
      </View>
    </Animated.View>
  );

  function renderBannerContent() {
    return (
      <>
        {/* Close Button - Top Right */}
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleDismiss();
            }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        )}

        {/* Icon and Message - Center */}
        <View style={styles.contentCenter}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
            <View style={[styles.iconInner, { backgroundColor: config.color + '25' }]}>
              <Ionicons name={config.icon} size={32} color={config.color} />
            </View>
          </View>

          <View style={styles.messageContainer}>
            <Text style={styles.titleText}>{config.title}</Text>
            <Text style={styles.messageText} numberOfLines={4}>
              {message || config.defaultMessage}
            </Text>
          </View>
        </View>

        {/* Action Button - Bottom */}
        {displayAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: config.color }]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              displayAction.onPress();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.actionText}>{displayAction.text}</Text>
          </TouchableOpacity>
        )}
      </>
    );
  }
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
  },
  bannerWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: theme.colors.card, // Solid background for efficient shadow calculation
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  blurContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'column',
    backgroundColor: theme.colors.card + 'F0',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderTopWidth: 4,
    minHeight: 140,
    position: 'relative',
  },
  androidBanner: {
    backgroundColor: theme.colors.card,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: theme.colors.background + '60',
    zIndex: 10,
  },
  contentCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
  },
  titleText: {
    fontSize: 17,
    lineHeight: 22,
    color: theme.colors.text,
    fontWeight: '700',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
    color: theme.colors.mutedForeground,
    fontWeight: '500',
    textAlign: 'center',
  },
  actionButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    minHeight: 50,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // Background is set dynamically by config.color
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    opacity: 0.6,
  },
});

export default ErrorBanner;

