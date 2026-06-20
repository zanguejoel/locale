import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Message, Role } from '@/utils/Interfaces';
import { GlassSurface } from './GlassSurface';

interface PinnedMessagesBarProps {
  pinnedMessages: Message[];
  onMessagePress: (messageId: string) => void;
  onUnpin: (messageId: string) => void;
}

const PinnedMessagesBar: React.FC<PinnedMessagesBarProps> = ({
  pinnedMessages,
  onMessagePress,
  onUnpin,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  if (pinnedMessages.length === 0) {
    return null;
  }

  const handleMessagePress = (messageId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onMessagePress(messageId);
  };

  const handleUnpin = (messageId: string, event: any) => {
    event.stopPropagation();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onUnpin(messageId);
  };

  return (
    <GlassSurface style={styles.container} borderRadius={0}>
      <View style={styles.header}>
        <Ionicons name="pin" size={14} color={theme.colors.primary} />
        <Text style={styles.headerText}>
          {pinnedMessages.length} Pinned Message{pinnedMessages.length !== 1 ? 's' : ''}
        </Text>
      </View>
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {pinnedMessages.map((message) => (
          <TouchableOpacity
            key={message.id}
            onPress={() => handleMessagePress(message.id!)}
            style={styles.messageCard}
            activeOpacity={0.7}
            accessibilityLabel={`Pinned message: ${message.content.substring(0, 50)}`}
            accessibilityRole="button"
          >
            <View style={styles.messageHeader}>
              <Ionicons
                name={message.role === Role.User ? 'person-circle' : 'chatbot'}
                size={12}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.messageRole}>
                {message.role === Role.User ? 'You' : 'Assistant'}
              </Text>
              <TouchableOpacity
                onPress={(e) => handleUnpin(message.id!, e)}
                style={styles.unpinButton}
                accessibilityLabel="Unpin message"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={14} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.messageContent} numberOfLines={2}>
              {message.content}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </GlassSurface>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 6,
    marginBottom: 8,
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    gap: 8,
  },
  messageCard: {
    width: 200,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  messageRole: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  unpinButton: {
    padding: 2,
  },
  messageContent: {
    fontSize: 13,
    color: theme.colors.text,
    lineHeight: 18,
  },
});

export default PinnedMessagesBar;

