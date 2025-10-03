import React from 'react';
import { 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  View,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

// Predefined messages with emojis
const PredefinedMessages = [
  { 
    icon: '📈',
    title: 'Stocks', 
    text: "Get current stock prices",
  },
  { 
    icon: '📰',
    title: 'News', 
    text: 'Give me a quick news update',
  },
  { 
    icon: '🗺️',
    title: 'Product Roadmap', 
    text: "Create a product roadmap template.",
  },
  { 
    icon: '📋',
    title: 'Create Agenda', 
    text: "Make an agenda for my next meeting.",
  },
];

type Props = {
  onSelectCard: (message: string) => void;
};

const MessageIdeas: React.FC<Props> = ({ onSelectCard }) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {PredefinedMessages.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.suggestionButton}
            onPress={() => onSelectCard(`${item.text}`)}
            activeOpacity={0.7}
          >
            <Text style={styles.suggestionEmoji}>{item.icon}</Text>
            <Text style={styles.suggestionText}>{item.title}</Text>
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

export default MessageIdeas;