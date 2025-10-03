/**
 * Swipeable Message Component
 * Wraps ChatMessage with swipe gesture actions
 */

import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Role } from '@/utils/Interfaces';

interface SwipeableMessageProps {
  children: React.ReactNode;
  messageId: string;
  role: Role;
  content: string;
  onCopy?: () => void;
  onDelete?: () => void;
  onRetry?: () => void;
  canRetry?: boolean;
}

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  messageId,
  role,
  content,
  onCopy,
  onDelete,
  onRetry,
  canRetry = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const swipeableRef = useRef<Swipeable>(null);

  const handleAction = (action: () => void) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    swipeableRef.current?.close();
    action();
  };

  // Right swipe actions (for user messages - swipe left to reveal)
  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (role !== Role.User) return null;

    const translateX = dragX.interpolate({
      inputRange: [-150, 0],
      outputRange: [0, 150],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.rightActions, { transform: [{ translateX }] }]}>
        {onCopy && (
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={() => handleAction(onCopy)}
          >
            <Ionicons name="copy-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
        )}
        
        {canRetry && onRetry && (
          <TouchableOpacity
            style={[styles.actionButton, styles.retryButton]}
            onPress={() => handleAction(onRetry)}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Retry</Text>
          </TouchableOpacity>
        )}
        
        {onDelete && (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleAction(onDelete)}
          >
            <Ionicons name="trash-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Delete</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  // Left swipe actions (for bot messages - swipe right to reveal)
  const renderLeftActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    if (role !== Role.Bot) return null;

    const translateX = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [-80, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.leftActions, { transform: [{ translateX }] }]}>
        {onCopy && (
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={() => handleAction(onCopy)}
          >
            <Ionicons name="copy-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      friction={2}
      rightThreshold={40}
      leftThreshold={40}
    >
      {children}
    </Swipeable>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingRight: 16,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 16,
  },
  actionButton: {
    width: 70,
    height: '80%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  copyButton: {
    backgroundColor: '#3b82f6', // Blue
  },
  retryButton: {
    backgroundColor: '#f59e0b', // Orange
  },
  deleteButton: {
    backgroundColor: '#ef4444', // Red
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default SwipeableMessage;

