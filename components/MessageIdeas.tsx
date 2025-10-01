import React, { useEffect, useRef } from 'react';
import Colors from '@/constants/Colors';
import { 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  View,
  Animated,
  Easing,
  Dimensions,
  useColorScheme
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/useTheme';

// Predefined messages with theme-aware gradients
const PredefinedMessages = [
  { 
    title: 'Stocks', 
    text: "Get current stock prices",
    lightGradient: ['#5B86E5', '#36D1DC'] as const,
    darkGradient: ['#2C2C2E', '#3A3A3C'] as const
  },
  { 
    title: 'News', 
    text: 'Give me a quick news update',
    lightGradient: ['#FA709A', '#FEE140'] as const,
    darkGradient: ['#2C2C2E', '#3A3A3C'] as const
  },
  { 
    title: 'Product Roadmap', 
    text: "Create a product roadmap template.",
    lightGradient: ['#30CBC8', '#667EEA'] as const,
    darkGradient: ['#2C2C2E', '#3A3A3C'] as const
  },
  { 
    title: 'Create Agenda', 
    text: "Make an agenda for my next meeting.",
    lightGradient: ['#F093FB', '#F5576C'] as const,
    darkGradient: ['#2C2C2E', '#3A3A3C'] as const
  },
];

type Props = {
  onSelectCard: (message: string) => void;
};

const MessageIdeas: React.FC<Props> = ({ onSelectCard }) => {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();
  const isDark = colorScheme === 'dark';
  
  // Create animated values for each card
  const fadeAnims = useRef(PredefinedMessages.map(() => new Animated.Value(0))).current;
  const scaleAnims = useRef(PredefinedMessages.map(() => new Animated.Value(0.95))).current;
  const cardPressAnimations = useRef(PredefinedMessages.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    // Staggered entrance animation
    PredefinedMessages.forEach((_, index) => {
      Animated.sequence([
        Animated.delay(index * 100), // Stagger the animations
        Animated.parallel([
          Animated.timing(fadeAnims[index], {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(scaleAnims[index], {
            toValue: 1,
            duration: 400, 
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
        ]),
      ]).start();
    });
  }, []);

  const handlePressIn = (index: number) => {
    Animated.spring(cardPressAnimations[index], {
      toValue: 0.95,
      friction: 5,
      tension: 300,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (index: number) => {
    Animated.spring(cardPressAnimations[index], {
      toValue: 1,
      friction: 3,
      tension: 200,
      useNativeDriver: true,
    }).start();
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={screenWidth * 0.72 + 16} // Snap to card width + margin
        decelerationRate="fast"
      >
        {PredefinedMessages.map((item, index) => (
          <Animated.View
            key={index}
            style={[
              styles.animatedContainer,
              {
                opacity: fadeAnims[index],
                transform: [
                  { scale: Animated.multiply(scaleAnims[index], cardPressAnimations[index]) }
                ],
              },
            ]}
          >
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.touchable}
              onPressIn={() => handlePressIn(index)}
              onPressOut={() => handlePressOut(index)}
              onPress={() => onSelectCard(`${item.text}`)}
            >
              <LinearGradient
                colors={isDark ? item.darkGradient : item.lightGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  <Text style={styles.cardText}>{item.text}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginHorizontal: 20,
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  animatedContainer: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 8,
  },
  touchable: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  card: {
    width: Dimensions.get('window').width * 0.72,
    padding: 18,
    borderRadius: 20,
    justifyContent: 'flex-end',
  },
  cardContent: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: '500',
    lineHeight: 18,
    letterSpacing: 0.1,
  },
});

export default MessageIdeas;