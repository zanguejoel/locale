/**
 * Credit Purchase Modal (IAP Version)
 * 
 * Native in-app purchase modal for credits using expo-iap
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import { useCredits } from '@/hooks/useCredits';
import { useIAPCredits } from '@/hooks/useIAPCredits';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/hooks/useAuth';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { CreditEvent } from '@/types/mixpanel';

interface CreditPurchaseModalIAPProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  source?: 'header_badge' | 'settings' | 'error_banner' | 'empty_state';
}

const CreditPurchaseModalIAP: React.FC<CreditPurchaseModalIAPProps> = ({
  visible,
  onClose,
  onSuccess,
  source = 'header_badge',
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { credits } = useCredits();
  const { user } = useAuth();
  const { creditPackages, isPurchasing, purchaseCredits } = useIAPCredits();
  const [selectedPackageId, setSelectedPackageId] = useState<string | null>(null);
  
  // Determine account type
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

  // Filter packages based on account type
  const availablePackages = creditPackages.filter((pkg) => {
    // For now, show all packages. You can filter by tier if needed
    return true;
  });

  const handlePackageSelect = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedPackageId(productId);
  };

  const handlePurchase = async () => {
    if (!selectedPackageId) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await purchaseCredits(selectedPackageId, source);

    if (result.success) {
      onSuccess?.();
      onClose();
    }
    // Error handling is done in the hook
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
              disabled={isPurchasing}
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

            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.infoBannerText}>
                Credits never expire and work with all AI models
              </Text>
            </View>

            {/* Credit Packages */}
            <Text style={styles.sectionTitle}>Select a Package</Text>
            
            {availablePackages.length === 0 ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.emptyText}>Loading packages...</Text>
              </View>
            ) : (
              <View style={styles.packagesContainer}>
                {availablePackages.map((pkg) => (
                  <TouchableOpacity
                    key={pkg.productId}
                    style={[
                      styles.packageCard,
                      selectedPackageId === pkg.productId && styles.packageCardSelected,
                      pkg.popular && styles.packageCardPopular,
                    ]}
                    onPress={() => handlePackageSelect(pkg.productId)}
                    disabled={isPurchasing}
                    activeOpacity={0.7}
                  >
                    {pkg.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>POPULAR</Text>
                      </View>
                    )}

                    {selectedPackageId === pkg.productId && (
                      <View style={styles.selectedBadge}>
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      </View>
                    )}

                    <View style={styles.packageContent}>
                      <Text style={styles.packageCredits}>
                        {pkg.credits.toLocaleString()}
                      </Text>
                      <Text style={styles.packageCreditsLabel}>Credits</Text>
                      
                      <View style={styles.packageDivider} />
                      
                      <Text style={styles.packagePrice}>{pkg.price}</Text>
                      <Text style={styles.packageDescription}>{pkg.description}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Rate Info */}
            <View style={styles.rateInfo}>
              <Ionicons name="star" size={16} color={theme.colors.primary} />
              <Text style={styles.rateText}>50 credits = $1 USD</Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.purchaseButton,
                (!selectedPackageId || isPurchasing) && styles.purchaseButtonDisabled,
              ]}
              onPress={handlePurchase}
              disabled={!selectedPackageId || isPurchasing}
              activeOpacity={0.8}
            >
              {isPurchasing ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {selectedPackageId 
                      ? `Purchase ${availablePackages.find(p => p.productId === selectedPackageId)?.price}`
                      : 'Select a Package'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.secureInfo}>
              <Ionicons name="lock-closed" size={14} color={theme.colors.greyLight} />
              <Text style={styles.secureText}>
                Secure payment via {' '}
                {require('react-native').Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
              </Text>
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
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 20,
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
      padding: 20,
      borderRadius: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.primary + '20',
      marginBottom: 16,
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
    // Info Banner
    infoBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.colors.primary + '10',
      padding: 12,
      borderRadius: 12,
      marginBottom: 20,
    },
    infoBannerText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    // Section
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 16,
    },
    // Packages
    packagesContainer: {
      gap: 12,
      marginBottom: 16,
    },
    packageCard: {
      backgroundColor: theme.colors.backgroundLight,
      borderRadius: 16,
      padding: 20,
      borderWidth: 2,
      borderColor: theme.colors.greyLight + '30',
      position: 'relative',
    },
    packageCardSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primary + '05',
    },
    packageCardPopular: {
      borderColor: theme.colors.primary + '50',
    },
    popularBadge: {
      position: 'absolute',
      top: -10,
      right: 16,
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
    },
    popularText: {
      color: '#fff',
      fontSize: 10,
      fontWeight: 'bold',
      letterSpacing: 0.5,
    },
    selectedBadge: {
      position: 'absolute',
      top: 16,
      right: 16,
    },
    packageContent: {
      alignItems: 'center',
    },
    packageCredits: {
      fontSize: 36,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    packageCreditsLabel: {
      fontSize: 14,
      color: theme.colors.greyLight,
      marginBottom: 12,
    },
    packageDivider: {
      width: '100%',
      height: 1,
      backgroundColor: theme.colors.greyLight + '30',
      marginVertical: 12,
    },
    packagePrice: {
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.primary,
      marginBottom: 4,
    },
    packageDescription: {
      fontSize: 13,
      color: theme.colors.greyLight,
      textAlign: 'center',
    },
    // Rate Info
    rateInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginBottom: 8,
    },
    rateText: {
      fontSize: 14,
      color: theme.colors.greyLight,
    },
    // Empty State
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
    },
    emptyText: {
      fontSize: 14,
      color: theme.colors.greyLight,
      marginTop: 12,
    },
    // Footer
    footer: {
      padding: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.greyLight + '30',
      gap: 12,
    },
    purchaseButton: {
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
    purchaseButtonDisabled: {
      backgroundColor: theme.colors.greyLight,
      opacity: 0.5,
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
    secureInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    secureText: {
      fontSize: 12,
      color: theme.colors.greyLight,
    },
  });

export default CreditPurchaseModalIAP;

