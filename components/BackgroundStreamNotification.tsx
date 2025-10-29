/**
 * BackgroundStreamNotification - Custom notification for background stream completion
 * 
 * Displays a beautiful, animated notification when an AI response completes
 * in a background (unfocused) conversation.
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BackgroundStreamNotificationProps {
  visible: boolean;
  onDismiss: () => void;
  message?: string;
  chatTitle?: string;
  onPress?: () => void;
  isCombined?: boolean; // Is this a combined notification (multiple chats)?
  count?: number; // Number of conversations (for combined notifications)
}

const BackgroundStreamNotification: React.FC<BackgroundStreamNotificationProps> = ({
  visible,
  onDismiss,
  message = 'Response ready in background chat',
  chatTitle = 'Chat',
  onPress,
  isCombined = false,
  count,
}) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      // Slide down and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after 6 seconds (longer duration)
      const timer = setTimeout(() => {
        dismissNotification();
      }, 6000);

      return () => clearTimeout(timer);
    } else {
      dismissNotification();
    }
  }, [visible]);

  const dismissNotification = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handlePress = () => {
    if (onPress) {
      dismissNotification();
      // Small delay to let animation start before navigating
      setTimeout(() => {
        onPress();
      }, 100);
    } else {
      dismissNotification();
    }
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handlePress}
        style={styles.touchableContainer}
      >
        <BlurView intensity={80} tint="dark" style={styles.blurContainer}>
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              {isCombined ? (
                <Ionicons name="notifications" size={24} color="#10b981" />
              ) : (
                <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              )}
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {isCombined ? chatTitle : `${chatTitle} completed`}
              </Text>
              <Text style={styles.message}>{message}</Text>
              {isCombined && count && count > 3 && (
                <Text style={styles.count}>+{count - 3} more</Text>
              )}
            </View>
            <TouchableOpacity onPress={dismissNotification} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  touchableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  blurContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: '#d1d5db',
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  count: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '400',
    marginTop: 2,
  },
});

export default BackgroundStreamNotification;

