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

// Predefined messages
const PredefinedMessages = [
  { 
    title: 'Image', 
    text: "Generate an image of a mountain landscape",
  },
  { 
    title: 'Video', 
    text: "Create a short product explainer video",
  },
  { 
    title: 'Analysis', 
    text: "Analyze my sales report data",
  },
  { 
    title: 'Stocks', 
    text: "What's the stock price trend for AAPL?",
  },
  { 
    title: 'PDF', 
    text: "Summarize this PDF document",
  },
  { 
    title: 'Calendar', 
    text: "Create a content calendar for social media",
  },
  { 
    title: 'Product Images', 
    text: "Generate product description images",
  },
  { 
    title: 'Email', 
    text: "Draft an email to reschedule a meeting",
  },
  { 
    title: 'Logo', 
    text: "Create a logo design concept",
  },
  { 
    title: 'News', 
    text: "Give me a quick news summary",
  },
  { 
    title: 'Audio', 
    text: "Transcribe and summarize this audio",
  },
  { 
    title: 'Presentation', 
    text: "Create a presentation outline",
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
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },
});

export default MessageIdeas;