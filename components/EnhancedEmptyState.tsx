import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCredits } from '@/hooks/useCredits';
import CreditPurchaseModal from './CreditPurchaseModal';

interface EnhancedEmptyStateProps {
  firstName?: string;
  modelName?: string;
  isLocal?: boolean;
}

const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  firstName = 'there',
  modelName = 'AI',
  isLocal = false,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { credits, isLoading: creditsLoading } = useCredits();
  const [showCreditPurchaseModal, setShowCreditPurchaseModal] = useState(false);
  
  // Animation refs
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoRotate = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // Content fade in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good morning';
    if (hour >= 12 && hour < 17) return 'Good afternoon';
    return 'Good evening';
  };


  const spin = logoRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Animated Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [
              { scale: logoScale },
              { rotate: spin },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradient}
        >
          <Ionicons 
            name="sparkles" 
            size={48} 
            color="#FFFFFF"
          />
        </LinearGradient>
      </Animated.View>

      {/* Greeting and Description */}
      <Animated.View
        style={[
          styles.greetingContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}! 👋
        </Text>
        <Text style={styles.subGreeting}>
          I'm Odyssey, ready to help you with anything.
        </Text>
        
        {/* Credits Display */}
        {!isLocal && (
          <TouchableOpacity
            style={styles.creditsBadge}
            onPress={async () => {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowCreditPurchaseModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.creditsIconContainer}>
              <Ionicons name="diamond" size={16} color={theme.colors.primary} />
            </View>
            {creditsLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : credits ? (
              <>
                <Text style={styles.creditsAmount}>
                  {credits.remaining_credits.toLocaleString()}
                </Text>
                <Text style={styles.creditsLabel}>credits available</Text>
              </>
            ) : null}
            <Ionicons name="add-circle" size={20} color={theme.colors.primary} style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        )}
        
        {isLocal && (
          <View style={styles.localBadge}>
            <Ionicons name="phone-portrait" size={14} color="#34C759" />
            <Text style={styles.localBadgeText}>Running locally on your device</Text>
          </View>
        )}
      </Animated.View>

      <CreditPurchaseModal
        visible={showCreditPurchaseModal}
        onClose={() => setShowCreditPurchaseModal(false)}
      />
    </ScrollView>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    paddingTop: 60,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea', // Solid background for efficient shadow calculation
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subGreeting: {
    fontSize: 16,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
    marginBottom: 12,
  },
  localBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.isDark ? '#1C3D1C' : '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  localBadgeText: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  creditsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary + '40',
  },
  creditsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  creditsLabel: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
  },
  capabilitiesContainer: {
    width: '100%',
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
  },
  capabilitiesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12,
  },
  capabilitiesList: {
    gap: 8,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capabilityText: {
    fontSize: 14,
    color: theme.colors.mutedForeground,
  },
});

export default EnhancedEmptyState;

