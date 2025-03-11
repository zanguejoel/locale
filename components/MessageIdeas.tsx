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
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Extended predefined messages with icons
const PredefinedMessages = [
  { 
    title: 'Stocks', 
    text: "Get current stock prices",
    icon: '📈',
    gradient: ['#4F80FF', '#2E5BFF']
  },
  { 
    title: 'News', 
    text: 'Give me a quick news update',
    icon: '📰',
    gradient: ['#FF6B6B', '#FF4757']
  },
  { 
    title: 'Product Roadmap', 
    text: "Create a product roadmap template.",
    icon: '🗺️',
    gradient: ['#26C6DA', '#00ACC1'] 
  },
  { 
    title: 'Create Agenda', 
    text: "Make an agenda for my next meeting.",
    icon: '📝',
    gradient: ['#FFBB34', '#FFA000']
  },
];

type Props = {
  onSelectCard: (message: string) => void;
};

const MessageIdeas: React.FC<Props> = ({ onSelectCard }) => {
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
      <Text style={styles.sectionTitle}>Suggestions</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={screenWidth * 0.7 + 15} // Snap to card width + margin
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
                colors={item.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                <View style={styles.cardTop}>
                  <Text style={styles.icon}>{item.icon}</Text>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                </View>
                <Text style={styles.cardText}>{item.text}</Text>
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
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginHorizontal: 20,
    marginBottom: 12,
    color: Colors.darkText,
  },
  scrollContent: {
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  animatedContainer: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
    marginHorizontal: 5,
  },
  touchable: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  card: {
    width: Dimensions.get('window').width * 0.7,
    padding: 18,
    borderRadius: 14,
    height: 100,
    justifyContent: 'space-between',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  icon: {
    fontSize: 22,
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  cardText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
});

export default MessageIdeas;