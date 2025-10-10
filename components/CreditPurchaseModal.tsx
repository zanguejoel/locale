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
  Animated,
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

type TabType = 'packages' | 'custom';

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
  
  const [activeTab, setActiveTab] = useState<TabType>('packages');
  const [customAmount, setCustomAmount] = useState('');
  const [selectedPackageIndex, setSelectedPackageIndex] = useState<number | null>(1); // Default to popular package
  const [showInfo, setShowInfo] = useState(false);

  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Clear selections when switching tabs
    if (tab === 'packages') {
      setCustomAmount('');
      if (selectedPackageIndex === null) {
        setSelectedPackageIndex(1); // Default to popular
      }
    } else {
      setSelectedPackageIndex(null);
    }
  };

  const handleSelectPackage = async (index: number) => {
    setSelectedPackageIndex(index);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleCustomAmountChange = (text: string) => {
    // Only allow numbers
    const numericValue = text.replace(/[^0-9]/g, '');
    setCustomAmount(numericValue);
  };

  const getSelectedAmount = (): number | null => {
    if (activeTab === 'custom' && customAmount) {
      return parseInt(customAmount);
    }
    if (activeTab === 'packages' && selectedPackageIndex !== null) {
      return creditPackages[selectedPackageIndex].amount;
    }
    return null;
  };

  const getSelectedCost = (): number | null => {
    const amount = getSelectedAmount();
    if (!amount) return null;
    
    if (activeTab === 'custom') {
      return amount / CREDITS_PER_DOLLAR;
    }
    if (activeTab === 'packages' && selectedPackageIndex !== null) {
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
              <Text style={styles.headerTitle}>Purchase Credits</Text>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Current Balance */}
            {credits && (
              <View style={styles.balanceCard}>
                <View style={styles.balanceHeader}>
                  <Ionicons name="wallet" size={20} color={theme.colors.primary} />
                  <Text style={styles.balanceLabel}>Current Balance</Text>
                </View>
                <Text style={styles.balanceAmount}>
                  {credits.remaining_credits.toLocaleString()}
                </Text>
                <Text style={styles.balanceUnit}>credits</Text>
              </View>
            )}

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, activeTab === 'packages' && styles.tabActive]}
                onPress={() => handleTabChange('packages')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="grid" 
                  size={18} 
                  color={activeTab === 'packages' ? theme.colors.primary : theme.colors.greyLight} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === 'packages' && styles.tabTextActive
                ]}>
                  Quick Select
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.tab, activeTab === 'custom' && styles.tabActive]}
                onPress={() => handleTabChange('custom')}
                activeOpacity={0.7}
              >
                <Ionicons 
                  name="create" 
                  size={18} 
                  color={activeTab === 'custom' ? theme.colors.primary : theme.colors.greyLight} 
                />
                <Text style={[
                  styles.tabText,
                  activeTab === 'custom' && styles.tabTextActive
                ]}>
                  Custom Amount
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {activeTab === 'packages' ? (
                <>
                  {/* Package Selection */}
                  <View style={styles.packagesContainer}>
                    {creditPackages.map((pkg, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.packageCard,
                          selectedPackageIndex === index && styles.packageCardSelected,
                        ]}
                        onPress={() => handleSelectPackage(index)}
                        activeOpacity={0.7}
                      >
                        {'popular' in pkg && pkg.popular && (
                          <View style={styles.popularBadge}>
                            <Ionicons name="star" size={12} color="#fff" />
                            <Text style={styles.popularBadgeText}>POPULAR</Text>
                          </View>
                        )}
                        
                        <View style={styles.packageMainContent}>
                          <View style={styles.packageAmountContainer}>
                            <Text style={styles.packageAmount}>
                              {pkg.amount.toLocaleString()}
                            </Text>
                            <Text style={styles.packageAmountLabel}>credits</Text>
                          </View>
                          
                          <View style={styles.packageDivider} />
                          
                          <View style={styles.packageCostContainer}>
                            <Text style={styles.packageCost}>${pkg.cost}</Text>
                            <Text style={styles.packageRate}>
                              ${(pkg.cost / pkg.amount).toFixed(3)}/credit
                            </Text>
                          </View>
                        </View>

                        {selectedPackageIndex === index && (
                          <View style={styles.selectedIndicator}>
                            <Ionicons name="checkmark-circle" size={28} color={theme.colors.primary} />
                          </View>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Info Section */}
                  <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                      <Ionicons name="time-outline" size={16} color={theme.colors.greyLight} />
                      <Text style={styles.infoText}>
                        {accountType === 'PRO' 
                          ? 'Credits expire after 1 month' 
                          : 'Expires after 30 days or renewal'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Ionicons name="flash-outline" size={16} color={theme.colors.greyLight} />
                      <Text style={styles.infoText}>
                        Works with all AI models
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  {/* Custom Amount Input */}
                  <View style={styles.customInputSection}>
                    <Text style={styles.customInputLabel}>
                      How many credits do you need?
                    </Text>
                    <Text style={styles.customInputHint}>
                      {CREDITS_PER_DOLLAR} credits = $1.00
                    </Text>
                    
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.input}
                        placeholder="0"
                        placeholderTextColor={theme.colors.greyLight}
                        keyboardType="number-pad"
                        value={customAmount}
                        onChangeText={handleCustomAmountChange}
                        maxLength={6}
                        autoFocus={activeTab === 'custom'}
                      />
                      <Text style={styles.inputSuffix}>credits</Text>
                    </View>
                    
                    {customAmount && parseInt(customAmount) >= 500 && (
                      <View style={styles.costPreview}>
                        <Text style={styles.costPreviewLabel}>Total Cost:</Text>
                        <Text style={styles.costPreviewAmount}>
                          ${(parseInt(customAmount) / CREDITS_PER_DOLLAR).toFixed(2)}
                        </Text>
                      </View>
                    )}
                    
                    {customAmount && parseInt(customAmount) < 500 && (
                      <View style={styles.errorContainer}>
                        <Ionicons name="alert-circle" size={16} color={theme.colors.destructive} />
                        <Text style={styles.errorText}>Minimum amount is 500 credits ($10)</Text>
                      </View>
                    )}

                    {!customAmount && (
                      <View style={styles.hintContainer}>
                        <Ionicons name="information-circle-outline" size={16} color={theme.colors.primary} />
                        <Text style={styles.hintText}>Minimum purchase is 500 credits ($10.00)</Text>
                      </View>
                    )}
                  </View>

                  {/* Quick Suggestions */}
                  <Text style={styles.suggestionsTitle}>Quick Suggestions</Text>
                  <View style={styles.suggestionsContainer}>
                    {[500, 1000, 2500, 5000].map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        style={styles.suggestionChip}
                        onPress={() => setCustomAmount(amount.toString())}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.suggestionText}>
                          {amount.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            {/* Purchase Button */}
            <View style={styles.footer}>
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
                  <View style={styles.purchaseButtonContent}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.purchaseButtonText}>Processing...</Text>
                  </View>
                ) : (
                  <View style={styles.purchaseButtonContent}>
                    {selectedAmount && selectedCost ? (
                      <>
                        <View style={styles.purchaseButtonLeft}>
                          <Ionicons name="card" size={22} color="#fff" />
                          <Text style={styles.purchaseButtonText}>Purchase</Text>
                        </View>
                        <View style={styles.purchaseButtonRight}>
                          <Text style={styles.purchaseButtonAmount}>
                            ${selectedCost.toFixed(2)}
                          </Text>
                          <Ionicons name="arrow-forward" size={18} color="#fff" />
                        </View>
                      </>
                    ) : (
                      <Text style={styles.purchaseButtonText}>
                        Select an amount to continue
                      </Text>
                    )}
                  </View>
                )}
              </TouchableOpacity>
              
              <View style={styles.securePaymentContainer}>
                <Ionicons name="lock-closed" size={14} color={theme.colors.greyLight} />
                <Text style={styles.securePaymentText}>
                  Secure payment via Stripe
                </Text>
              </View>
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
      maxHeight: '80%',
      paddingTop: 20,
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
      marginTop: 12,
      padding: 16,
      borderRadius: 16,
      alignItems: 'center',
    },
    balanceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    balanceLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.greyLight,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    balanceAmount: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.primary,
      lineHeight: 42,
    },
    balanceUnit: {
      fontSize: 14,
      color: theme.colors.greyLight,
      marginTop: -4,
    },
    // Tab Switcher
    tabContainer: {
      flexDirection: 'row',
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 8,
      gap: 8,
    },
    tabActive: {
      backgroundColor: theme.colors.background,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.greyLight,
    },
    tabTextActive: {
      color: theme.colors.primary,
    },
    // Scroll View
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 20,
    },
    // Package Cards
    packagesContainer: {
      gap: 12,
    },
    packageCard: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 16,
      padding: 16,
      borderWidth: 2,
      borderColor: theme.colors.backgroundLight,
      position: 'relative',
      minHeight: 90,
    },
    packageCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '08',
    },
    popularBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
    },
    popularBadgeText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    packageMainContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      flex: 1,
    },
    packageAmountContainer: {
      flex: 1,
    },
    packageAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    packageAmountLabel: {
      fontSize: 12,
      color: theme.colors.greyLight,
      marginTop: 2,
    },
    packageDivider: {
      width: 1,
      height: 36,
      backgroundColor: theme.colors.greyLight + '40',
    },
    packageCostContainer: {
      flex: 1,
      alignItems: 'flex-end',
    },
    packageCost: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    packageRate: {
      fontSize: 10,
      color: theme.colors.greyLight,
      marginTop: 2,
    },
    selectedIndicator: {
      position: 'absolute',
      top: 12,
      right: 12,
    },
    // Info Section
    infoSection: {
      marginTop: 20,
      gap: 12,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    infoText: {
      fontSize: 13,
      color: theme.colors.greyLight,
      flex: 1,
    },
    // Custom Input
    customInputSection: {
      gap: 16,
    },
    customInputLabel: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
    },
    customInputHint: {
      fontSize: 14,
      color: theme.colors.greyLight,
      marginTop: -8,
    },
    inputWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 16,
      borderWidth: 2,
      borderColor: theme.colors.greyLight + '60',
      paddingHorizontal: 20,
      paddingVertical: 16,
      gap: 12,
    },
    input: {
      flex: 1,
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.text,
      padding: 0,
      minHeight: 40,
    },
    inputSuffix: {
      fontSize: 16,
      color: theme.colors.greyLight,
      fontWeight: '600',
    },
    costPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.primary + '10',
      padding: 16,
      borderRadius: 12,
    },
    costPreviewLabel: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    costPreviewAmount: {
      fontSize: 24,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.destructive + '10',
      padding: 12,
      borderRadius: 12,
    },
    errorText: {
      fontSize: 13,
      color: theme.colors.destructive,
      flex: 1,
    },
    hintContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.primary + '10',
      padding: 12,
      borderRadius: 12,
    },
    hintText: {
      fontSize: 13,
      color: theme.colors.primary,
      flex: 1,
    },
    // Suggestions
    suggestionsTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginTop: 24,
      marginBottom: 12,
    },
    suggestionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    suggestionChip: {
      backgroundColor: theme.colors.backgroundLight,
      paddingHorizontal: 20,
      paddingVertical: 12,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.colors.greyLight + '40',
    },
    suggestionText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
    },
    // Footer
    footer: {
      padding: 16,
      paddingTop: 14,
      borderTopWidth: 1,
      borderTopColor: theme.colors.greyLight + '30',
      gap: 10,
    },
    purchaseButton: {
      backgroundColor: theme.colors.primary,
      borderRadius: 16,
      paddingVertical: 16,
      paddingHorizontal: 20,
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    purchaseButtonDisabled: {
      backgroundColor: theme.colors.greyLight,
      opacity: 0.6,
      shadowOpacity: 0,
    },
    purchaseButtonContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    purchaseButtonLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    purchaseButtonRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    purchaseButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '600',
    },
    purchaseButtonAmount: {
      color: '#fff',
      fontSize: 20,
      fontWeight: 'bold',
    },
    securePaymentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    securePaymentText: {
      fontSize: 12,
      color: theme.colors.greyLight,
    },
  });

export default CreditPurchaseModal;

