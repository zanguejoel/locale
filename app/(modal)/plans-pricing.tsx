import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import { GradientBackground } from '@/components/GradientBackground';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { SubscriptionEvent } from '@/types/mixpanel';
import { useEffect } from 'react';
import { useSubscription } from '@/hooks/useSubscription';

const WEB_PLANS_URL = 'https://www.odysseytech.ai/dashboard/settings?tab=plans';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  title: string;
  identifier: string;
  price: string;
  period: string;
  features: PlanFeature[];
  highlighted: boolean;
  isCurrentPlan?: boolean;
}

const Page = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();
  const { subscription, isLoading: isLoadingSubscription } = useSubscription();

  // Track plans page opened
  useEffect(() => {
    mixpanelService.trackSubscription(SubscriptionEvent.PLANS_PAGE_OPENED, {
      source: 'settings',
    });
  }, []);

  // Helper function to map subscription tier to plan identifier
  const getCurrentPlanId = (): string => {
    if (!subscription) return 'free';
    
    const tier = subscription.tier.toUpperCase();
    
    // Map backend tiers to plan identifiers
    if (tier === 'FREE') return 'free';
    if (tier === 'PRO' || tier === 'PERSONAL') return 'pro';
    if (tier === 'BUSINESS' || tier === 'TEAM') return 'business';
    
    // Default to free for unknown tiers
    return 'free';
  };

  // Get the current plan identifier
  const currentPlanId = getCurrentPlanId();

  // Define plans for display purposes
  const plans: Plan[] = [
    {
      title: 'Free',
      identifier: 'free',
      price: '$0',
      period: 'forever',
      features: [
        { text: 'Basic chat functionality', included: true },
        { text: 'Limited message history', included: true },
        { text: 'Standard AI models', included: true },
        { text: 'Advanced AI models', included: false },
        { text: 'Image generation', included: false },
        { text: 'Priority support', included: false },
      ],
      highlighted: false,
      isCurrentPlan: currentPlanId === 'free',
    },
    {
      title: 'Pro',
      identifier: 'pro',
      price: '$20',
      period: 'month',
      features: [
        { text: '1000 Chat credits', included: true },
        { text: 'Document analysis', included: true },
        { text: 'AI Task Delegation', included: true },
        { text: 'Email & chat support', included: true },
      ],
      highlighted: true,
      isCurrentPlan: currentPlanId === 'pro',
    },
    {
      title: 'Business',
      identifier: 'business',
      price: '$40',
      period: 'seat/month',
      features: [
        { text: 'Everything in Pro, plus:', included: true },
        { text: '1250 Chat credits per user', included: true },
        { text: 'Team collaboration features', included: true },
        { text: 'Custom data integration', included: true },
        { text: 'Workflows', included: true },
        { text: 'Priority support', included: true },
      ],
      highlighted: false,
      isCurrentPlan: currentPlanId === 'business',
    },
  ];

  const handleManageSubscription = async () => {
    try {
      // Track web dashboard opened
      await mixpanelService.trackSubscription(SubscriptionEvent.WEB_DASHBOARD_OPENED, {
        source: 'plans_page',
      });
      
      const canOpen = await Linking.canOpenURL(WEB_PLANS_URL);
      if (canOpen) {
        await Linking.openURL(WEB_PLANS_URL);
      }
    } catch (error) {
      // console.error('Error opening URL:', error);
    }
  };

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

  const renderPlan = (plan: Plan) => (
    <View
      key={plan.identifier}
      style={[
        styles.planCard,
        plan.highlighted && styles.planCardHighlighted,
        plan.isCurrentPlan && styles.planCardCurrent,
      ]}
    >
      {plan.highlighted && !plan.isCurrentPlan && (
        <View style={styles.popularBadge}>
          <Text style={styles.popularText}>MOST POPULAR</Text>
        </View>
      )}

      {plan.isCurrentPlan && (
        <View style={styles.currentPlanBadge}>
          <Ionicons name="checkmark-circle" size={16} color="#fff" style={styles.currentPlanIcon} />
          <Text style={styles.currentPlanText}>CURRENT PLAN</Text>
        </View>
      )}

      <View style={styles.planHeader}>
        <Text style={styles.planTitle}>{plan.title}</Text>
        <View style={styles.priceContainer}>
          <Text style={styles.planPrice}>{plan.price}</Text>
          <Text style={styles.planPeriod}>/{plan.period}</Text>
        </View>
      </View>

      <View style={styles.featuresContainer}>
        {plan.features.map((feature, index) => renderFeature(feature, index))}
      </View>
    </View>
  );

  return (
    <GradientBackground variant="background">
      <SafeAreaView style={styles.safeArea}>
       
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {/* Web Management Banner */}
            <View style={styles.webBanner}>
              <View style={styles.webBannerIcon}>
                <Ionicons name="globe-outline" size={32} color={theme.colors.primary} />
              </View>
              <View style={styles.webBannerContent}>
                <Text style={styles.webBannerTitle}>Manage on Web</Text>
                <Text style={styles.webBannerText}>
                  To subscribe or manage your membership, please visit our web dashboard for a seamless experience.
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.webButton,
                pressed && styles.webButtonPressed,
              ]}
              onPress={handleManageSubscription}
            >
              <Ionicons name="open-outline" size={20} color="#fff" style={styles.webButtonIcon} />
              <Text style={styles.webButtonText}>Open Web Dashboard</Text>
            </Pressable>

            <View style={styles.plansContainer}>
              {plans.map(plan => renderPlan(plan))}
            </View>

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
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.greyLight,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 40,
    },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    contentContainer: {
      padding: 20,
      paddingBottom: 40,
    },
    pageTitle: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    pageSubtitle: {
      fontSize: 16,
      color: theme.colors.greyLight,
      textAlign: 'center',
      marginBottom: 32,
    },
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
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    planCardHighlighted: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.backgroundLight,
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
    planCardCurrent: {
      borderColor: '#10B981',
      borderWidth: 2,
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
    webBanner: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 2,
      borderColor: theme.colors.primary,
      flexDirection: 'row',
      gap: 16,
      alignItems: 'center',
    },
    webBannerIcon: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    webBannerContent: {
      flex: 1,
    },
    webBannerTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 6,
    },
    webBannerText: {
      fontSize: 14,
      color: theme.colors.greyLight,
      lineHeight: 20,
    },
    webButton: {
      backgroundColor: theme.colors.primary,
      paddingVertical: 16,
      paddingHorizontal: 24,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 32,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    webButtonPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    webButtonIcon: {
      marginRight: 8,
    },
    webButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
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

