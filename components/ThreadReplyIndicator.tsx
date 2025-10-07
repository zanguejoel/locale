import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Role } from '@/utils/Interfaces';

interface ThreadReplyIndicatorProps {
  replyToMessageId?: string;
  replyToContent?: string;
  replyToRole?: Role;
  onPress?: () => void;
  onClear?: () => void;
  compact?: boolean;
}

const ThreadReplyIndicator: React.FC<ThreadReplyIndicatorProps> = ({
  replyToMessageId,
  replyToContent,
  replyToRole,
  onPress,
  onClear,
  compact = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (!replyToMessageId || !replyToContent) {
    return null;
  }

  const handlePress = () => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  };

  const handleClear = (event: any) => {
    if (onClear) {
      event.stopPropagation();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onClear();
    }
  };

  const senderLabel = replyToRole === Role.User ? 'You' : 'Assistant';

  if (compact) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.compactContainer}
        activeOpacity={0.7}
      >
        <Ionicons name="return-down-forward" size={12} color={theme.colors.primary} />
        <Text style={styles.compactText} numberOfLines={1}>
          Replying to {senderLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.container}
      activeOpacity={0.7}
      accessibilityLabel={`Replying to ${senderLabel}`}
      accessibilityRole="button"
    >
      <View style={styles.indicator} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="return-down-forward"
            size={14}
            color={theme.colors.primary}
          />
          <Text style={styles.senderLabel}>Replying to {senderLabel}</Text>
          {onClear && (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel="Cancel reply"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.replyContent} numberOfLines={2}>
          {replyToContent}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  indicator: {
    width: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: 10,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  senderLabel: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  clearButton: {
    padding: 2,
  },
  replyContent: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  compactText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontWeight: '500',
  },
});

export default ThreadReplyIndicator;

