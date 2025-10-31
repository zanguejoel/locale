/**
 * Plans & Pricing (IAP Version)
 * 
 * Native in-app purchase subscriptions using expo-iap
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import { GradientBackground } from '@/components/GradientBackground';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { SubscriptionEvent } from '@/types/mixpanel';
import { useSubscription } from '@/hooks/useSubscription';
import { useIAPSubscription } from '@/hooks/useIAPSubscription';
import * as Haptics from 'expo-haptics';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface DisplayPlan {
  title: string;
  identifier: string;
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  features: PlanFeature[];
  highlighted: boolean;
}

const Page = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { 
    subscriptionPackages, 
    isPurchasing, 
    isRestoring,
    purchaseSubscription, 
    restoreSubscriptions 
  } = useIAPSubscription();
  
  const [selectedPeriod, setSelectedPeriod] = useState<'monthly' | 'yearly'>('monthly');

  // Track plans page opened
  useEffect(() => {
    mixpanelService.trackSubscription(SubscriptionEvent.PLANS_PAGE_OPENED, {
      source: 'settings',
    });
  }, []);

  // Get current subscription tier
  const currentTier = subscription?.tier?.toUpperCase() || 'FREE';

  // Define plan features for display
  const displayPlans: DisplayPlan[] = [
    {
      title: 'Free',
      identifier: 'free',
      tier: 'FREE',
      features: [
        { text: 'Basic chat functionality', included: true },
        { text: 'Limited message history', included: true },
        { text: 'Standard AI models', included: true },
        { text: 'Advanced AI models', included: false },
        { text: 'Image generation', included: false },
        { text: 'Priority support', included: false },
      ],
      highlighted: false,
    },
    {
      title: 'Pro',
      identifier: 'pro',
      tier: 'PRO',
      features: [
        { text: '1000 Chat credits', included: true },
        { text: 'Document analysis', included: true },
        { text: 'AI Task Delegation', included: true },
        { text: 'Email & chat support', included: true },
      ],
      highlighted: true,
    },
    {
      title: 'Business',
      identifier: 'business',
      tier: 'BUSINESS',
      features: [
        { text: 'Everything in Pro, plus:', included: true },
        { text: '1250 Chat credits per user', included: true },
        { text: 'Team collaboration features', included: true },
        { text: 'Custom data integration', included: true },
        { text: 'Workflows', included: true },
        { text: 'Priority support', included: true },
      ],
      highlighted: false,
    },
  ];

  // Get product for a tier and period
  const getProductForPlan = (tier: 'PRO' | 'BUSINESS', period: 'monthly' | 'yearly') => {
    return subscriptionPackages.find(
      (pkg) => pkg.tier === tier && pkg.period === period
    );
  };

  // Handle subscription purchase
  const handleSubscribe = async (tier: 'PRO' | 'BUSINESS') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const product = getProductForPlan(tier, selectedPeriod);
    
    if (!product) {
      Alert.alert('Error', 'Product not available. Please try again later.');
      return;
    }

    const result = await purchaseSubscription(product.productId, 'plans_page');

    if (result.success) {
      // Success handled in hook
    }
  };

  // Handle restore purchases
  const handleRestore = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await restoreSubscriptions();
  };

  // Render feature
  const renderFeature = (feature: PlanFeature, index: number) => (
    <View key={index} style={styles.featureRow}>
      <Ionicons
        name={feature.included ? 'checkmark-circle' : 'close-circle-outline'}
        size={20}
        color={feature.included ? theme.colors.primary : theme.colors.greyLight}
        style={styles.featureIcon}
      />
      <Text
        style={[
          styles.featureText,
          !feature.included && styles.featureTextDisabled,
        ]}
      >
        {feature.text}
      </Text>
    </View>
  );

  // Render plan card
  const renderPlan = (plan: DisplayPlan) => {
    const isCurrentPlan = plan.tier === currentTier;
    const isFree = plan.tier === 'FREE';
    const product = isFree ? null : getProductForPlan(plan.tier as 'PRO' | 'BUSINESS', selectedPeriod);

    return (
      <View
        key={plan.identifier}
        style={[
          styles.planCard,
          plan.highlighted && styles.planCardHighlighted,
          isCurrentPlan && styles.planCardCurrent,
        ]}
      >
        {plan.highlighted && !isCurrentPlan && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>MOST POPULAR</Text>
          </View>
        )}

        {isCurrentPlan && (
          <View style={styles.currentPlanBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.currentPlanIcon} />
            <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
          </View>
        )}

        <View style={styles.planHeader}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <View style={styles.priceContainer}>
            {isFree ? (
              <>
                <Text style={styles.planPrice}>$0</Text>
                <Text style={styles.planPeriod}>/forever</Text>
              </>
            ) : product ? (
              <>
                <Text style={styles.planPrice}>{product.price}</Text>
                <Text style={styles.planPeriod}>/{selectedPeriod === 'monthly' ? 'month' : 'year'}</Text>
              </>
            ) : (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            )}
          </View>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => renderFeature(feature, index))}
        </View>

        {!isFree && !isCurrentPlan && product && (
          <Pressable
            style={({ pressed }) => [
              styles.subscribeButton,
              plan.highlighted && styles.subscribeButtonHighlighted,
              pressed && styles.subscribeButtonPressed,
              (isPurchasing || isLoadingSubscription) && styles.subscribeButtonDisabled,
            ]}
            onPress={() => handleSubscribe(plan.tier as 'PRO' | 'BUSINESS')}
            disabled={isPurchasing || isLoadingSubscription}
          >
            {isPurchasing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <GradientBackground variant="background">
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {/* Period Selector */}
            <View style={styles.periodSelector}>
              <Pressable
                style={[
                  styles.periodButton,
                  selectedPeriod === 'monthly' && styles.periodButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod('monthly');
                }}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === 'monthly' && styles.periodButtonTextActive,
                  ]}
                >
                  Monthly
                </Text>
              </Pressable>
              
              <Pressable
                style={[
                  styles.periodButton,
                  selectedPeriod === 'yearly' && styles.periodButtonActive,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedPeriod('yearly');
                }}
              >
                <View style={styles.periodButtonContent}>
                  <Text
                    style={[
                      styles.periodButtonText,
                      selectedPeriod === 'yearly' && styles.periodButtonTextActive,
                    ]}
                  >
                    Yearly
                  </Text>
                  <View style={styles.saveBadge}>
                    <Text style={styles.saveText}>Save 20%</Text>
                  </View>
                </View>
              </Pressable>
            </View>

            {/* Plans */}
            <View style={styles.plansContainer}>
              {displayPlans.map(plan => renderPlan(plan))}
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>All plans include:</Text>
                <Text style={styles.infoText}>• Access across web and mobile</Text>
                <Text style={styles.infoText}>• Regular updates and improvements</Text>
                <Text style={styles.infoText}>• Secure and private conversations</Text>
                <Text style={styles.infoText}>• Cancel anytime</Text>
              </View>
            </View>

            {/* Restore Button */}
            <Pressable
              style={({ pressed }) => [
                styles.restoreButton,
                pressed && styles.restoreButtonPressed,
              ]}
              onPress={handleRestore}
              disabled={isRestoring}
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Ionicons name="refresh" size={20} color={theme.colors.primary} />
                  <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                </>
              )}
            </Pressable>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Need help? Contact us at{' '}
                <Text style={styles.footerLink}>support@odysseytech.ai</Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    // Period Selector
    periodSelector: {
      flexDirection: 'row',
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      padding: 4,
      marginBottom: 24,
    },
    periodButton: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    periodButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    periodButtonContent: {
      alignItems: 'center',
    },
    periodButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.greyLight,
    },
    periodButtonTextActive: {
      color: '#fff',
    },
    saveBadge: {
      backgroundColor: '#10B981',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 4,
    },
    saveText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    // Plans
    plansContainer: {
      gap: 20,
      marginBottom: 32,
    },
    planCard: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 16,
      padding: 24,
      borderWidth: 2,
      borderColor: 'transparent',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    planCardHighlighted: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.backgroundLight,
    },
    planCardCurrent: {
      borderColor: '#10B981',
      borderWidth: 2,
    },
    popularBadge: {
      position: 'absolute',
      top: -12,
      left: 20,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    popularText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    currentPlanBadge: {
      position: 'absolute',
      top: -12,
      left: 20,
      backgroundColor: '#10B981',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    currentPlanText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    currentPlanIcon: {
      marginRight: 2,
    },
    planHeader: {
      marginBottom: 20,
    },
    planTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 8,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    planPrice: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    planPeriod: {
      fontSize: 16,
      color: theme.colors.greyLight,
      marginLeft: 4,
    },
    featuresContainer: {
      marginBottom: 24,
      gap: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    featureIcon: {
      marginRight: 12,
    },
    featureText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    featureTextDisabled: {
      color: theme.colors.greyLight,
      textDecorationLine: 'line-through',
    },
    subscribeButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subscribeButtonHighlighted: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    subscribeButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    subscribeButtonDisabled: {
      opacity: 0.5,
    },
    subscribeButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    // Info Box
    infoBox: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      padding: 20,
      flexDirection: 'row',
      gap: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: theme.colors.greyLight,
    },
    infoContent: {
      flex: 1,
    },
    infoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.greyLight,
      marginBottom: 4,
    },
    // Restore Button
    restoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundLight,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      marginBottom: 24,
    },
    restoreButtonPressed: {
      opacity: 0.7,
    },
    restoreButtonText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    // Footer
    footer: {
      alignItems: 'center',
      paddingVertical: 20,
    },
    footerText: {
      fontSize: 14,
      color: theme.colors.greyLight,
      textAlign: 'center',
    },
    footerLink: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
  });

export default Page;

