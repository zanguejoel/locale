import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import { useCredits } from '@/hooks/useCredits';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { CreditEvent } from '@/types/mixpanel';

interface CreditPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  source?: 'header_badge' | 'settings' | 'error_banner' | 'empty_state';
}

// Get web frontend URL from environment variable
const WEB_FRONTEND_URL = Constants.expoConfig?.extra?.webFrontendUrl || 'https://odysseytech.ai';
const CREDIT_PURCHASE_URL = `${WEB_FRONTEND_URL}/dashboard/settings?tab=usage`;

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  visible,
  onClose,
  source = 'header_badge',
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { credits } = useCredits();
  const { user } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  
  // Determine account type for analytics
  const accountType = user?.user_teams && user.user_teams.length > 0 ? 'BUSINESS' : 'PRO';

  // Track modal opened
  useEffect(() => {
    if (visible) {
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_MODAL_OPENED, {
        source,
        account_type: accountType,
        credits_remaining: credits?.remaining_credits,
      });
    }
  }, [visible, source, accountType, credits?.remaining_credits]);

  const handleOpenWebDashboard = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Track redirect to web
    mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_INITIATED, {
      source,
      account_type: accountType,
      credits_before: credits?.remaining_credits,
      payment_method: 'checkout',
      package_type: 'custom',
    });

    setIsOpening(true);

    try {
      const canOpen = await Linking.canOpenURL(CREDIT_PURCHASE_URL);
      if (canOpen) {
        await Linking.openURL(CREDIT_PURCHASE_URL);
        // Close modal after a brief moment
        setTimeout(() => {
          setIsOpening(false);
          onClose();
        }, 500);
      } else {
        throw new Error('Cannot open URL');
      }
    } catch (error) {
      setIsOpening(false);
      Alert.alert(
        'Unable to Open Browser',
        `Please visit ${WEB_FRONTEND_URL}/dashboard/settings?tab=usage in your browser to purchase credits.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Purchase Credits</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Current Balance */}
            {credits && (
              <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Ionicons name="wallet" size={24} color={theme.colors.primary} />
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                </View>
                <Text style={styles.balanceAmount}>
                  {credits.remaining_credits.toLocaleString()}
                </Text>
                <Text style={styles.balanceUnit}>credits</Text>
              </View>
            )}

            {/* Main Content */}
            <View style={styles.contentContainer}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <Ionicons name="globe-outline" size={64} color={theme.colors.primary} />
            </View>

            {/* Title */}
            <Text style={styles.title}>Purchase on Web</Text>

            {/* Description */}
            <Text style={styles.description}>
              Credit purchases are processed through our secure web dashboard for the best experience.
            </Text>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Secure Stripe payment processing</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Multiple payment methods accepted</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Instant credit activation</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
                <Text style={styles.featureText}>Works with all AI models</Text>
              </View>
            </View>

            {/* Info Box */}
            <View style={styles.infoBox}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.infoText}>
                Your credits will be available immediately after purchase and sync across all devices.
              </Text>
            </View>
          </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleOpenWebDashboard}
              disabled={isOpening}
              activeOpacity={0.8}
            >
              {isOpening ? (
                <View style={styles.buttonContent}>
                  <Text style={styles.buttonText}>Opening...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="open-outline" size={20} color="#fff" />
                  <Text style={styles.buttonText}>Open Web Dashboard</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </TouchableOpacity>

            <View style={styles.urlContainer}>
              <Ionicons name="link" size={14} color={theme.colors.greyLight} />
              <Text style={styles.urlText}>odysseytech.ai/dashboard/settings</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      paddingTop: 20,
      flex: 1,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Balance Card
    balanceCard: {
      backgroundColor: theme.colors.backgroundLight,
      marginHorizontal: 20,
      marginTop: 0,
      marginBottom: 12,
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 12,
    },
    balanceLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.greyLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    balanceAmount: {
      fontSize: 48,
      fontWeight: 'bold',
      color: theme.colors.primary,
      lineHeight: 56,
    },
    balanceUnit: {
      fontSize: 16,
      color: theme.colors.greyLight,
      marginTop: -4,
    },
    // Content
    contentContainer: {
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 20,
      alignItems: 'center',
    },
    iconContainer: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginBottom: 12,
      textAlign: 'center',
    },
    description: {
      fontSize: 16,
      color: theme.colors.greyLight,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: 28,
      paddingHorizontal: 10,
    },
    // Features
    featuresList: {
      width: '100%',
      gap: 14,
      marginBottom: 24,
    },
    featureItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    featureText: {
      fontSize: 15,
      color: theme.colors.text,
      flex: 1,
    },
    // Info Box
    infoBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.colors.primary + '10',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      width: '100%',
    },
    infoText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      flex: 1,
    },
    // Footer
    footer: {
      padding: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.greyLight + '30',
      gap: 12,
    },
    primaryButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingVertical: 18,
      paddingHorizontal: 20,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    buttonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    buttonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: 'transparent',
      borderRadius: 16,
      paddingVertical: 14,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: theme.colors.greyLight,
      fontSize: 16,
      fontWeight: '600',
    },
    urlContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginTop: 4,
    },
    urlText: {
      fontSize: 13,
      color: theme.colors.greyLight,
    },
  });

export default CreditPurchaseModal;
