import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';

export type ErrorType = 'network' | 'api' | 'permission' | 'model' | 'generic';

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
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in animation
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 150,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto hide
    if (autoHide && autoHideDuration) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
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
          icon: 'wifi-off' as const,
          color: '#FF9500',
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
          defaultMessage: 'Model unavailable. Please try a different model.',
          defaultAction: {
            text: 'Change Model',
            onPress: () => {},
          },
        };
      default:
        return {
          icon: 'information-circle' as const,
          color: '#007AFF',
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

  return (
    <Animated.View
      style={[
        styles.container,
        { 
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={[styles.banner, { borderLeftColor: config.color }]}>
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.color + '20' }]}>
          <Ionicons name={config.icon} size={24} color={config.color} />
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={styles.messageText}>{message || config.defaultMessage}</Text>
        </View>

        {/* Action Button */}
        {displayAction && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: config.color }]}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              displayAction.onPress();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.actionText}>{displayAction.text}</Text>
          </TouchableOpacity>
        )}

        {/* Dismiss Button */}
        {onDismiss && (
          <TouchableOpacity
            style={styles.dismissButton}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              handleDismiss();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={20} color={theme.colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingHorizontal: 16,
    paddingTop: 60, // Account for safe area
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  messageContainer: {
    flex: 1,
    marginRight: 8,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 18,
    color: theme.colors.text,
    fontWeight: '500',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    minHeight: 44, // Touch target
    justifyContent: 'center',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissButton: {
    width: 44, // Touch target
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ErrorBanner;

