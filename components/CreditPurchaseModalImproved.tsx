import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import { CREDIT_PACKAGES, CREDITS_PER_DOLLAR, AccountType, useCredits } from '@/hooks/useCredits';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';

interface CreditPurchaseModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CreditPurchaseModal: React.FC<CreditPurchaseModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { credits, isPurchasing, purchaseCredits } = useCredits();
  const { user } = useAuth();
  
  // Determine account type (PRO or BUSINESS) based on user's teams
  // If user has teams, they're BUSINESS, otherwise PRO
  const accountType: AccountType = user?.user_teams && user.user_teams.length > 0 ? 'BUSINESS' : 'PRO';
  const creditPackages = CREDIT_PACKAGES[accountType];
  
  const [customAmount, setCustomAmount] = useState('');
  const [useCustomAmount, setUseCustomAmount] = useState(false);
  const [selectedPackageIndex, setSelectedPackageIndex] = useState<number | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleSelectPackage = async (index: number) => {
    setSelectedPackageIndex(index);
    setUseCustomAmount(false);
    setCustomAmount('');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
    setUseCustomAmount(true);
    setSelectedPackageIndex(null);
  };

  const getSelectedAmount = (): number | null => {
    if (useCustomAmount && customAmount) {
      return parseInt(customAmount);
    }
    if (selectedPackageIndex !== null) {
      return creditPackages[selectedPackageIndex].amount;
    }
    return null;
  };

  const getSelectedCost = (): number | null => {
    const amount = getSelectedAmount();
    if (!amount) return null;
    
    if (useCustomAmount) {
      return amount / CREDITS_PER_DOLLAR;
    }
    if (selectedPackageIndex !== null) {
      return creditPackages[selectedPackageIndex].cost;
    }
    return null;
  };

  const handlePurchase = async () => {
    const amount = getSelectedAmount();
    const cost = getSelectedCost();

    if (!amount || !cost) {
      Alert.alert('Error', 'Please select a package or enter a custom amount');
      return;
    }

    // Validate minimum amount
    if (amount < 500) {
      Alert.alert('Minimum Amount', 'The minimum credit purchase amount is 500 credits ($10)');
      return;
    }

    // Validate minimum cost
    if (cost < 10) {
      Alert.alert('Minimum Cost', 'The minimum credit cost is $10.00');
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const result = await purchaseCredits(amount, cost);

    if (result.success) {
      if (result.completed) {
        // Payment completed immediately (user has default payment method)
        Alert.alert(
          'Success!',
          `${amount.toLocaleString()} credits have been added to your account.`,
          [
            {
              text: 'OK',
              onPress: () => {
                onSuccess?.();
                onClose();
              },
            },
          ]
        );
      } else if (result.checkoutUrl) {
        // Need to complete payment on web
        Alert.alert(
          'Complete Payment',
          'You will be redirected to complete your payment securely via Stripe.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
            },
            {
              text: 'Continue',
              onPress: async () => {
                try {
                  const canOpen = await Linking.canOpenURL(result.checkoutUrl!);
                  if (canOpen) {
                    await Linking.openURL(result.checkoutUrl!);
                    onClose();
                  }
                } catch (error) {
                  Alert.alert('Error', 'Unable to open payment page');
                }
              },
            },
          ]
        );
      }
    } else {
      Alert.alert('Error', result.message || 'Failed to purchase credits');
    }
  };

  const selectedAmount = getSelectedAmount();
  const selectedCost = getSelectedCost();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Add Credits</Text>
                <TouchableOpacity
                  onPress={() => setShowInfo(!showInfo)}
                  style={styles.infoButton}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Info Banner - Collapsible */}
            {showInfo && (
              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>{accountType} Credit Packages</Text>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Rate:</Text>
                  <Text style={styles.infoValue}>{CREDITS_PER_DOLLAR} credits = $1</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Minimum:</Text>
                  <Text style={styles.infoValue}>500 credits ($10)</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Expiration:</Text>
                  <Text style={styles.infoValue}>
                    {accountType === 'PRO' 
                      ? 'Expires after 1 month from purchase' 
                      : 'Expires after 30 days or renewal cycle'}
                  </Text>
                </View>
              </View>
            )}

            {/* Current Balance */}
            {credits && (
              <View style={styles.balanceCard}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Current Balance:</Text>
                  <Text style={styles.balanceAmount}>
                    {credits.remaining_credits.toLocaleString()} credits
                  </Text>
                </View>
                {credits.subscription_credits > 0 && credits.custom_credits > 0 && (
                  <View style={styles.balanceBreakdown}>
                    <Text style={styles.balanceBreakdownText}>
                      {credits.subscription_credits.toLocaleString()} from subscription + {credits.custom_credits.toLocaleString()} purchased
                    </Text>
                  </View>
                )}
              </View>
            )}

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Description */}
              <Text style={styles.description}>
                Enter the amount of credits you want to add ({CREDITS_PER_DOLLAR} credits = $1)
              </Text>

              {/* Custom Amount Input */}
              <View style={styles.inputSection}>
                <Text style={styles.inputLabel}>Custom Amount</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount (min. 500)"
                    placeholderTextColor={theme.colors.greyLight}
                    keyboardType="number-pad"
                    value={customAmount}
                    onChangeText={handleCustomAmountChange}
                    maxLength={6}
                  />
                  {customAmount && parseInt(customAmount) >= 500 && (
                    <View style={styles.inputBadge}>
                      <Text style={styles.inputBadgeText}>
                        ${(parseInt(customAmount) / CREDITS_PER_DOLLAR).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
                {customAmount && parseInt(customAmount) < 500 && (
                  <Text style={styles.errorText}>Minimum amount is 500 credits</Text>
                )}
              </View>

              {/* OR Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR SELECT A PACKAGE</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Package Selection */}
              <View style={styles.packagesContainer}>
                {creditPackages.map((pkg, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.packageCard,
                      selectedPackageIndex === index && !useCustomAmount && styles.packageCardSelected,
                      pkg.popular && styles.packageCardPopular,
                    ]}
                    onPress={() => handleSelectPackage(index)}
                    activeOpacity={0.7}
                  >
                    {pkg.popular && (
                      <View style={styles.popularBadge}>
                        <Ionicons name="star" size={10} color="#fff" />
                        <Text style={styles.popularBadgeText}>POPULAR</Text>
                      </View>
                    )}
                    
                    <View style={styles.packageContent}>
                      <Text style={styles.packageLabel}>{pkg.label}</Text>
                      <Text style={styles.packageRate}>
                        ${(pkg.cost / pkg.amount).toFixed(3)}/credit
                      </Text>
                    </View>

                    {selectedPackageIndex === index && !useCustomAmount && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              {/* Features */}
              <View style={styles.featuresContainer}>
                <Text style={styles.featuresTitle}>What's included:</Text>
                {[
                  'No monthly commitment',
                  'Works with all AI models',
                  'Priority processing',
                  'Image & video generation',
                  'Unused credits expire per tier policy',
                ].map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            {/* Purchase Button */}
            <View style={styles.footer}>
              {selectedAmount && selectedCost && (
                <View style={styles.costSummary}>
                  <Text style={styles.costSummaryLabel}>
                    {selectedAmount.toLocaleString()} credits
                  </Text>
                  <Text style={styles.costSummaryAmount}>
                    ${selectedCost.toFixed(2)}
                  </Text>
                </View>
              )}
              
              <TouchableOpacity
                style={[
                  styles.purchaseButton,
                  (!selectedAmount || !selectedCost || isPurchasing) && styles.purchaseButtonDisabled,
                ]}
                onPress={handlePurchase}
                disabled={!selectedAmount || !selectedCost || isPurchasing}
                activeOpacity={0.8}
              >
                {isPurchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card" size={20} color="#fff" style={styles.purchaseButtonIcon} />
                    <Text style={styles.purchaseButtonText}>
                      {selectedAmount && selectedCost
                        ? `Purchase for $${selectedCost.toFixed(2)}`
                        : 'Select amount or package'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              
              <Text style={styles.securePaymentText}>
                <Ionicons name="lock-closed" size={12} color={theme.colors.greyLight} />
                {' '}Secure payment via Stripe
              </Text>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
      maxHeight: '90%',
      paddingTop: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.greyLight,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    infoButton: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    infoCard: {
      backgroundColor: theme.colors.backgroundLight,
      margin: 20,
      marginBottom: 0,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    infoTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    infoLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.greyLight,
    },
    infoValue: {
      fontSize: 12,
      color: theme.colors.text,
      flex: 1,
      textAlign: 'right',
    },
    balanceCard: {
      backgroundColor: theme.colors.primary + '10',
      margin: 20,
      marginBottom: 0,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
    },
    balanceRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    balanceLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.text,
    },
    balanceAmount: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    balanceBreakdown: {
      marginTop: 8,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.primary + '20',
    },
    balanceBreakdownText: {
      fontSize: 11,
      color: theme.colors.greyLight,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
    },
    description: {
      fontSize: 14,
      color: theme.colors.greyLight,
      marginBottom: 20,
      lineHeight: 20,
    },
    inputSection: {
      marginBottom: 24,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      position: 'relative',
    },
    input: {
      flex: 1,
      backgroundColor: theme.colors.backgroundLight,
      borderWidth: 2,
      borderColor: theme.colors.greyLight,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
      color: theme.colors.text,
    },
    inputBadge: {
      position: 'absolute',
      right: 12,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
    },
    inputBadgeText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },
    errorText: {
      fontSize: 12,
      color: theme.colors.destructive,
      marginTop: 4,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.greyLight,
    },
    dividerText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.greyLight,
      marginHorizontal: 12,
    },
    packagesContainer: {
      gap: 12,
      marginBottom: 24,
    },
    packageCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      padding: 16,
      borderWidth: 2,
      borderColor: 'transparent',
      position: 'relative',
    },
    packageCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '10',
    },
    packageCardPopular: {
      borderColor: theme.colors.primary + '60',
    },
    popularBadge: {
      position: 'absolute',
      top: -8,
      left: 12,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    popularBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
    },
    packageContent: {
      flex: 1,
    },
    packageLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 4,
    },
    packageRate: {
      fontSize: 12,
      color: theme.colors.greyLight,
    },
    selectedIndicator: {
      marginLeft: 12,
    },
    featuresContainer: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    featuresTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 10,
    },
    featureText: {
      fontSize: 13,
      color: theme.colors.text,
      flex: 1,
    },
    footer: {
      padding: 20,
      borderTopWidth: 1,
      borderTopColor: theme.colors.greyLight,
      gap: 12,
    },
    costSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
    },
    costSummaryLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    costSummaryAmount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    purchaseButton: {
      backgroundColor: theme.colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    purchaseButtonDisabled: {
      backgroundColor: theme.colors.greyLight,
      opacity: 0.5,
    },
    purchaseButtonIcon: {
      marginRight: 4,
    },
    purchaseButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
    },
    securePaymentText: {
      fontSize: 12,
      color: theme.colors.greyLight,
      textAlign: 'center',
    },
  });

export default CreditPurchaseModal;

