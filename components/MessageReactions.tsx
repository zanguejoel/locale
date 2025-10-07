import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // User IDs who reacted
  hasReacted: boolean; // Whether current user has reacted
}

interface MessageReactionsProps {
  messageId: string;
  reactions?: MessageReaction[];
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

const REACTION_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'],
  },
  {
    name: 'Gestures',
    emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤝', '🙏', '💪', '🦾', '🦿', '🦵', '🦶'],
  },
  {
    name: 'Emotions',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟'],
  },
  {
    name: 'Symbols',
    emojis: ['✨', '⭐', '🌟', '💫', '🔥', '💯', '✅', '❌', '❗', '❓', '💬', '💭', '🗨️', '🗯️', '💢', '💥', '💨', '🎉', '🎊'],
  },
];

const MessageReactions: React.FC<MessageReactionsProps> = ({
  messageId,
  reactions = [],
  onAddReaction,
  onRemoveReaction,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(0);

  const handleReactionPress = (emoji: string, hasReacted: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    if (hasReacted) {
      onRemoveReaction(messageId, emoji);
    } else {
      onAddReaction(messageId, emoji);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    const existingReaction = reactions.find(r => r.emoji === emoji);
    handleReactionPress(emoji, existingReaction?.hasReacted || false);
    setShowPicker(false);
  };

  const handleAddReactionPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowPicker(true);
  };

  return (
    <View style={styles.container}>
      {reactions.length > 0 && (
        <View style={styles.reactionsContainer}>
          {reactions.map((reaction, index) => (
            <TouchableOpacity
              key={`${reaction.emoji}-${index}`}
              onPress={() => handleReactionPress(reaction.emoji, reaction.hasReacted)}
              style={[
                styles.reactionBubble,
                reaction.hasReacted && styles.reactionBubbleActive,
              ]}
              accessibilityLabel={`${reaction.emoji} ${reaction.count} ${reaction.hasReacted ? 'Remove your reaction' : 'React'}`}
              accessibilityRole="button"
            >
              <Text style={styles.reactionEmoji}>{reaction.emoji}</Text>
              <Text style={[
                styles.reactionCount,
                reaction.hasReacted && styles.reactionCountActive,
              ]}>
                {reaction.count}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={handleAddReactionPress}
        style={styles.addReactionButton}
        accessibilityLabel="Add reaction"
        accessibilityRole="button"
      >
        <Ionicons name="add-circle-outline" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      {/* Emoji Picker Modal */}
      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowPicker(false)}>
          <Pressable style={styles.pickerContainer} onPress={(e) => e.stopPropagation()}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Add Reaction</Text>
              <TouchableOpacity
                onPress={() => setShowPicker(false)}
                style={styles.closeButton}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Quick Reactions */}
            <View style={styles.quickReactionsContainer}>
              <Text style={styles.sectionTitle}>Quick Reactions</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReactionsScroll}>
                {QUICK_REACTIONS.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleEmojiSelect(emoji)}
                    style={styles.quickReactionButton}
                  >
                    <Text style={styles.quickReactionEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Category Tabs */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabsContainer}>
              {REACTION_CATEGORIES.map((category, index) => (
                <TouchableOpacity
                  key={category.name}
                  onPress={() => {
                    setSelectedCategory(index);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.categoryTab,
                    selectedCategory === index && styles.categoryTabActive,
                  ]}
                >
                  <Text style={[
                    styles.categoryTabText,
                    selectedCategory === index && styles.categoryTabTextActive,
                  ]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Emoji Grid */}
            <ScrollView style={styles.emojiGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.emojiGridContainer}>
                {REACTION_CATEGORIES[selectedCategory].emojis.map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleEmojiSelect(emoji)}
                    style={styles.emojiButton}
                  >
                    <Text style={styles.emojiText}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 4,
  },
  reactionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  reactionBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    gap: 4,
  },
  reactionBubbleActive: {
    backgroundColor: theme.colors.primary + '20',
    borderColor: theme.colors.primary,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  reactionCountActive: {
    color: theme.colors.primary,
  },
  addReactionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  quickReactionsContainer: {
    padding: 16,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  quickReactionsScroll: {
    flexDirection: 'row',
  },
  quickReactionButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 24,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  quickReactionEmoji: {
    fontSize: 24,
  },
  categoryTabsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.backgroundLight,
    marginRight: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  categoryTabActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryTabText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  categoryTabTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  emojiGrid: {
    paddingHorizontal: 16,
    maxHeight: 300,
  },
  emojiGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: 8,
  },
  emojiButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  emojiText: {
    fontSize: 28,
  },
});

export default MessageReactions;

