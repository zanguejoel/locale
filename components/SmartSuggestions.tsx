/**
 * Smart Suggestions Component
 * Shows contextual follow-up suggestions after bot responses
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';

interface SmartSuggestionsProps {
  onSelectSuggestion: (suggestion: string) => void;
  context?: 'default' | 'code' | 'explanation' | 'creative';
}

/**
 * Get contextual suggestions based on conversation context
 */
const getSuggestions = (context: 'default' | 'code' | 'explanation' | 'creative' = 'default') => {
  const suggestionMap = {
    default: [
      { icon: '💬', text: 'Tell me more', prompt: 'Can you tell me more about that?' },
      { icon: '📖', text: 'Explain further', prompt: 'Can you explain that in more detail?' },
      { icon: '💡', text: 'Give an example', prompt: 'Can you give me an example?' },
      { icon: '❓', text: 'Why?', prompt: 'Why is that?' },
    ],
    code: [
      { icon: '💻', text: 'Show code', prompt: 'Can you show me the code for that?' },
      { icon: '🐛', text: 'Debug this', prompt: 'How do I debug this?' },
      { icon: '⚡', text: 'Optimize', prompt: 'How can I optimize this?' },
      { icon: '📚', text: 'Best practices', prompt: 'What are the best practices for this?' },
    ],
    explanation: [
      { icon: '🎓', text: 'Simplify', prompt: 'Can you explain that more simply?' },
      { icon: '📊', text: 'Show diagram', prompt: 'Can you describe this visually?' },
      { icon: '🔗', text: 'Related topics', prompt: 'What related topics should I know about?' },
      { icon: '📝', text: 'Summary', prompt: 'Can you summarize the key points?' },
    ],
    creative: [
      { icon: '✨', text: 'More ideas', prompt: 'Give me more ideas like this' },
      { icon: '🎨', text: 'Different angle', prompt: 'Can you approach this from a different angle?' },
      { icon: '🚀', text: 'Expand on this', prompt: 'Can you expand on this idea?' },
      { icon: '💭', text: 'Alternatives', prompt: 'What are some alternatives?' },
    ],
  };

  return suggestionMap[context] || suggestionMap.default;
};

export const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ 
  onSelectSuggestion,
  context = 'default'
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const suggestions = getSuggestions(context);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick replies</Text>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionButton}
            onPress={() => onSelectSuggestion(suggestion.prompt)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionEmoji}>{suggestion.icon}</Text>
            <Text style={styles.suggestionText}>{suggestion.text}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  suggestionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  suggestionEmoji: {
    fontSize: 16,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
});

export default SmartSuggestions;

