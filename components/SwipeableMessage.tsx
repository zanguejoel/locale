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
  onEdit?: () => void;
  onPin?: () => void;
  onReply?: () => void;
  canRetry?: boolean;
  isPinned?: boolean;
}

export const SwipeableMessage: React.FC<SwipeableMessageProps> = ({
  children,
  messageId,
  role,
  content,
  onCopy,
  onDelete,
  onRetry,
  onEdit,
  onPin,
  onReply,
  canRetry = false,
  isPinned = false,
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
      inputRange: [-280, 0],
      outputRange: [0, 280],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.rightActions, { transform: [{ translateX }] }]}>
        {onReply && (
          <TouchableOpacity
            style={[styles.actionButton, styles.replyButton]}
            onPress={() => handleAction(onReply)}
          >
            <Ionicons name="return-down-forward-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        )}

        {onEdit && (
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleAction(onEdit)}
          >
            <Ionicons name="create-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>
        )}
        
        {onCopy && (
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={() => handleAction(onCopy)}
          >
            <Ionicons name="copy-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Copy</Text>
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
      inputRange: [0, 150],
      outputRange: [-150, 0],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={[styles.leftActions, { transform: [{ translateX }] }]}>
        {onReply && (
          <TouchableOpacity
            style={[styles.actionButton, styles.replyButton]}
            onPress={() => handleAction(onReply)}
          >
            <Ionicons name="return-down-forward-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Reply</Text>
          </TouchableOpacity>
        )}
        
        {onCopy && (
          <TouchableOpacity
            style={[styles.actionButton, styles.copyButton]}
            onPress={() => handleAction(onCopy)}
          >
            <Ionicons name="copy-outline" size={20} color="#fff" />
            <Text style={styles.actionText}>Copy</Text>
          </TouchableOpacity>
        )}

        {onPin && (
          <TouchableOpacity
            style={[styles.actionButton, isPinned ? styles.unpinButton : styles.pinButton]}
            onPress={() => handleAction(onPin)}
          >
            <Ionicons name={isPinned ? "pin" : "pin-outline"} size={20} color="#fff" />
            <Text style={styles.actionText}>{isPinned ? 'Unpin' : 'Pin'}</Text>
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
  editButton: {
    backgroundColor: '#8b5cf6', // Purple
  },
  replyButton: {
    backgroundColor: '#10b981', // Green
  },
  pinButton: {
    backgroundColor: '#f59e0b', // Orange
  },
  unpinButton: {
    backgroundColor: '#64748b', // Gray
  },
  actionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
});

export default SwipeableMessage;

