import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassSurface } from './GlassSurface';

interface EnhancedEmptyStateProps {
  firstName?: string;
  modelName?: string;
  isLocal?: boolean;
  onSelectPrompt?: (text: string) => void;
}

/**
 * Starter prompts tuned to what the on-device Llama 3.2 1B (text-only) model can
 * actually do — no image/video/web/PDF tasks it can't fulfill.
 */
const STARTER_PROMPTS: { icon: keyof typeof Ionicons.glyphMap; label: string; prompt: string }[] = [
  { icon: 'bulb-outline', label: 'Explain a concept', prompt: 'Explain how something works in simple terms — start by asking me what topic.' },
  { icon: 'create-outline', label: 'Draft a message', prompt: 'Help me draft a short, friendly email. Ask me what it should be about.' },
  { icon: 'sparkles-outline', label: 'Brainstorm ideas', prompt: 'Brainstorm a list of creative ideas with me. Ask me the topic first.' },
  { icon: 'color-wand-outline', label: 'Rewrite text', prompt: 'Rewrite some text to make it clearer and more concise. Ask me to paste it.' },
  { icon: 'document-text-outline', label: 'Summarize text', prompt: 'Summarize a piece of text into key points. Ask me to paste it.' },
  { icon: 'git-compare-outline', label: 'Help me decide', prompt: 'Help me weigh the pros and cons of a decision. Ask me what I am deciding.' },
];

const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  firstName = 'there',
  modelName = 'AI',
  isLocal = false,
  onSelectPrompt,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Subtle entrance animation (no spinning — keep it calm and on-brand).
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        delay: 150,
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

  const handlePromptPress = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectPrompt?.(prompt);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* On-brand logo mark */}
      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: logoScale }] },
        ]}
      >
        <LinearGradient
          colors={theme.isDark ? ['#3b82f6', '#2563eb'] : ['#60a5fa', '#3b82f6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.logoGradient}
        >
          <Ionicons name="sparkles" size={44} color="#FFFFFF" />
        </LinearGradient>
      </Animated.View>

      {/* Greeting and description */}
      <Animated.View
        style={[
          styles.greetingContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.greeting}>
          {getGreeting()}, {firstName}! 👋
        </Text>
        <Text style={styles.subGreeting}>
          I'm Locale, ready to help you with anything.
        </Text>

        {isLocal && (
          <View style={styles.localBadge}>
            <Ionicons name="phone-portrait" size={14} color="#34C759" />
            <Text style={styles.localBadgeText}>Running locally on your device</Text>
          </View>
        )}
      </Animated.View>

      {/* Tappable starter prompts */}
      <Animated.View
        style={[
          styles.promptsContainer,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {STARTER_PROMPTS.map((item) => (
          <TouchableOpacity
            key={item.label}
            activeOpacity={0.8}
            onPress={() => handlePromptPress(item.prompt)}
            disabled={!onSelectPrompt}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={styles.promptChipTouchable}
          >
            <GlassSurface style={styles.promptChip} borderRadius={16}>
              <View style={styles.promptIconWrap}>
                <Ionicons name={item.icon} size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.promptLabel} numberOfLines={1}>{item.label}</Text>
            </GlassSurface>
          </TouchableOpacity>
        ))}
      </Animated.View>
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
    paddingTop: 56,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logoGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#3b82f6', // Solid base for efficient shadow calculation
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  greetingContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: {
    fontSize: 26,
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
  promptsContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  promptChipTouchable: {
    width: '47%',
  },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
  },
  promptIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(59, 130, 246, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    letterSpacing: -0.2,
  },
});

export default EnhancedEmptyState;
