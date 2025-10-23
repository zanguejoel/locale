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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ApplePayButton, ApplePayButtonType, ApplePayButtonStyle } from '@stripe/stripe-react-native';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import { useCreditsWithApplePay, ApplePayPurchaseOptions } from '@/hooks/useCreditsWithApplePay';
import { CREDIT_PACKAGES, AccountType } from '@/hooks/useCredits';
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

interface CreditPackage {
  amount: number;
  cost: number;
  label: string;
  popular?: boolean;
}

// Get web frontend URL from environment variable
const WEB_FRONTEND_URL = Constants.expoConfig?.extra?.webFrontendUrl || 'https://odysseytech.ai';
const CREDIT_PURCHASE_URL = `${WEB_FRONTEND_URL}/dashboard/settings?tab=usage`;

const CreditPurchaseModalWithApplePay: React.FC<CreditPurchaseModalProps> = ({
  visible,
  onClose,
  onSuccess,
  source = 'header_badge',
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const {
    credits,
    isApplePaySupported,
    isProcessingApplePay,
    purchaseCreditsWithApplePay,
    canUseApplePayForAmount,
    getApplePayStatus,
  } = useCreditsWithApplePay();
  
  const { user } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  
  // Determine account type
  const accountType: AccountType = user?.user_teams && user.user_teams.length > 0 ? 'BUSINESS' : 'PRO';
  const availablePackages = CREDIT_PACKAGES[accountType];

  // Track modal opened
  useEffect(() => {
    if (visible) {
      const applePayStatus = getApplePayStatus();
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_MODAL_OPENED, {
        source,
        account_type: accountType,
        credits_remaining: credits?.remaining_credits,
        apple_pay_supported: applePayStatus.isSupported,
        apple_pay_available: applePayStatus.isAvailable,
      });
    }
  }, [visible, source, accountType, credits?.remaining_credits]);

  const handleApplePayPurchase = async (pkg: CreditPackage) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Track Apple Pay purchase attempt
    mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_INITIATED, {
      source,
      account_type: accountType,
      credits_before: credits?.remaining_credits,
      payment_method: 'apple_pay',
      package_type: 'standard',
      credits: pkg.amount,
      cost: pkg.cost,
    });

    try {
      const result = await purchaseCreditsWithApplePay({
        creditAmount: pkg.amount,
        cost: pkg.cost,
        useApplePay: true,
      });

      if (result.success && result.completed) {
        // Track successful purchase
        mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_COMPLETED, {
          source,
          account_type: accountType,
          payment_method: 'apple_pay',
          credits: pkg.amount,
          cost: pkg.cost,
          credits_after: (credits?.remaining_credits || 0) + pkg.amount,
        });

        onSuccess?.();
        onClose();
      } else if (!result.success && !result.message.toLowerCase().includes('cancel')) {
        // Track failed purchase (but not cancellations)
        mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_FAILED, {
          source,
          account_type: accountType,
          payment_method: 'apple_pay',
          error: result.message,
          credits: pkg.amount,
          cost: pkg.cost,
        });
      }
    } catch (error) {
      console.error('[CreditPurchaseModal] Apple Pay purchase error:', error);
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_FAILED, {
        source,
        account_type: accountType,
        payment_method: 'apple_pay',
        error: error instanceof Error ? error.message : 'Unknown error',
        credits: pkg.amount,
        cost: pkg.cost,
      });
    }
  };

  const handleRegularPurchase = async (pkg: CreditPackage) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Track regular purchase attempt
    mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_INITIATED, {
      source,
      account_type: accountType,
      credits_before: credits?.remaining_credits,
      payment_method: 'checkout',
      package_type: 'standard',
      credits: pkg.amount,
      cost: pkg.cost,
    });

    try {
      const result = await purchaseCreditsWithApplePay({
        creditAmount: pkg.amount,
        cost: pkg.cost,
        useApplePay: false,
      });

      if (result.success && result.checkoutUrl) {
        // Handle web redirect for regular Stripe checkout
        await handleOpenWebDashboard();
      } else if (result.success && result.completed) {
        // Direct completion (saved payment method)
        mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_COMPLETED, {
          source,
          account_type: accountType,
          payment_method: 'saved_card',
          credits: pkg.amount,
          cost: pkg.cost,
        });
        
        onSuccess?.();
        onClose();
      }
    } catch (error) {
      console.error('[CreditPurchaseModal] Regular purchase error:', error);
      mixpanelService.trackCredit(CreditEvent.CREDIT_PURCHASE_FAILED, {
        source,
        account_type: accountType,
        payment_method: 'checkout',
        error: error instanceof Error ? error.message : 'Unknown error',
        credits: pkg.amount,
        cost: pkg.cost,
      });
    }
  };

  const handleOpenWebDashboard = async () => {
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

  const renderPackageCard = (pkg: CreditPackage, index: number) => {
    const canUseApplePay = canUseApplePayForAmount(pkg.cost);
    const isProcessing = isProcessingApplePay && selectedPackage?.amount === pkg.amount;

    return (
      <View key={index} style={styles.packageCard}>
        {pkg.popular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>Most Popular</Text>
          </View>
        )}
        
        <View style={styles.packageHeader}>
          <Text style={styles.packageCredits}>{pkg.amount.toLocaleString()} Credits</Text>
          <Text style={styles.packageCost}>${pkg.cost}</Text>
          <Text style={styles.packageValue}>${(pkg.cost / pkg.amount * 1000).toFixed(2)} per 1K credits</Text>
        </View>

        {/* Apple Pay Button (iOS only) */}
        {Platform.OS === 'ios' && isApplePaySupported && canUseApplePay && (
          <View style={styles.paymentButtonContainer}>
            {isProcessing ? (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <Text style={styles.processingText}>Processing...</Text>
              </View>
            ) : (
              <ApplePayButton
                style={styles.applePayButton}
                type={ApplePayButtonType.Buy}
                buttonStyle={ApplePayButtonStyle.Black}
                onPress={() => {
                  setSelectedPackage(pkg);
                  handleApplePayPurchase(pkg);
                }}
                disabled={isProcessingApplePay}
              />
            )}
          </View>
        )}

        {/* Regular Purchase Button */}
        <TouchableOpacity
          style={[
            styles.purchaseButton,
            (isApplePaySupported && canUseApplePay && Platform.OS === 'ios') && styles.secondaryButton,
            isProcessing && styles.disabledButton,
          ]}
          onPress={() => {
            setSelectedPackage(pkg);
            handleRegularPurchase(pkg);
          }}
          disabled={isProcessing || isOpening}
        >
          <Text style={[
            styles.purchaseButtonText,
            (isApplePaySupported && canUseApplePay && Platform.OS === 'ios') && styles.secondaryButtonText,
          ]}>
            {(isApplePaySupported && canUseApplePay && Platform.OS === 'ios') 
              ? 'Other Payment Methods' 
              : 'Purchase Credits'
            }
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!visible) return null;

  const totalCredits = (credits?.subscription_credits || 0) + (credits?.custom_credits || 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Purchase Credits</Text>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.closeButton}
              disabled={isProcessingApplePay || isOpening}
            >
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Current Balance */}
            <View style={styles.balanceCard}>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                <Text style={styles.balanceLabel}>Current Balance</Text>
              </View>
              <Text style={styles.balanceAmount}>
                {totalCredits.toLocaleString()} Credits
              </Text>
              {credits && (
                <Text style={styles.balanceBreakdown}>
                  {credits.subscription_credits.toLocaleString()} subscription + {credits.custom_credits.toLocaleString()} purchased
                </Text>
              )}
            </View>

            {/* Apple Pay Benefits (iOS only) */}
            {Platform.OS === 'ios' && isApplePaySupported && (
              <View style={styles.benefitsCard}>
                <View style={styles.benefitsHeader}>
                  <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
                  <Text style={styles.benefitsTitle}>Apple Pay Benefits</Text>
                </View>
                <View style={styles.benefitsList}>
                  <Text style={styles.benefitItem}>✓ Secure with Touch ID or Face ID</Text>
                  <Text style={styles.benefitItem}>✓ No card details required</Text>
                  <Text style={styles.benefitItem}>✓ Instant processing</Text>
                  <Text style={styles.benefitItem}>✓ Transaction history in Wallet app</Text>
                </View>
              </View>
            )}

            {/* Credit Packages */}
            <View style={styles.packagesContainer}>
              <Text style={styles.packagesTitle}>Choose Your Package</Text>
              {availablePackages.map((pkg, index) => renderPackageCard(pkg, index))}
            </View>

            {/* Custom Amount Option */}
            <TouchableOpacity
              style={styles.customAmountButton}
              onPress={handleOpenWebDashboard}
              disabled={isOpening || isProcessingApplePay}
            >
              <View style={styles.customAmountContent}>
                <Ionicons name="globe" size={20} color={theme.colors.primary} />
                <View style={styles.customAmountText}>
                  <Text style={styles.customAmountTitle}>Need a Custom Amount?</Text>
                  <Text style={styles.customAmountSubtitle}>Visit our web dashboard for flexible credit packages</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
              </View>
            </TouchableOpacity>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Ionicons name="information-circle" size={16} color={theme.colors.primary} />
                <Text style={styles.infoText}>Credits never expire and sync across all devices</Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="shield" size={16} color={theme.colors.primary} />
                <Text style={styles.infoText}>Secure payment processing by Stripe</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
  },
  balanceCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    fontWeight: '500',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  balanceBreakdown: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  benefitsCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.success + '20',
  },
  benefitsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginLeft: 8,
  },
  benefitsList: {
    gap: 6,
  },
  benefitItem: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
  },
  packagesContainer: {
    marginBottom: 20,
  },
  packagesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  packageCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  popularBadge: {
    position: 'absolute',
    top: -8,
    right: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    zIndex: 1,
  },
  popularText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageHeader: {
    marginBottom: 16,
  },
  packageCredits: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  packageCost: {
    fontSize: 18,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 2,
  },
  packageValue: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  paymentButtonContainer: {
    marginBottom: 8,
  },
  applePayButton: {
    height: 50,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    backgroundColor: theme.colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  processingText: {
    marginLeft: 8,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  purchaseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  disabledButton: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: theme.colors.primary,
  },
  customAmountButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  customAmountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customAmountText: {
    flex: 1,
    marginLeft: 12,
  },
  customAmountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  customAmountSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  infoSection: {
    paddingBottom: 20,
    gap: 8,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
    flex: 1,
  },
});

export default CreditPurchaseModalWithApplePay;

