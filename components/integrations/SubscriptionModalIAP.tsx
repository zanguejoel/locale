/**
 * Integration Subscription Modal (IAP Version)
 * 
 * Native in-app purchase for integrations using expo-iap
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import * as Haptics from 'expo-haptics';
import { useIAP } from '@/providers/IAPProvider';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';

export interface Integration {
  id: number;
  name: string;
  description?: string;
  price?: string;
  icon?: string;
}

interface SubscriptionModalIAPProps {
  visible: boolean;
  integrations: Integration[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubscriptionModalIAP({
  visible,
  integrations,
  onClose,
  onSuccess,
}: SubscriptionModalIAPProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { purchaseProduct, isLoading } = useIAP();
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Calculate total price
  const totalPrice = integrations.reduce((sum, int) => {
    const price = parseFloat(int.price || '0');
    return sum + price;
  }, 0);

  const handleSubscribe = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    setIsPurchasing(true);
    
    try {
      // For now, we'll use a single integration bundle product
      // In a real implementation, you'd either:
      // 1. Have a single product that grants access to multiple integrations
      // 2. Purchase each integration separately
      // 3. Have bundle products configured in the store
      
      // Example: Let's say we have a product for the first integration
      const firstIntegration = integrations[0];
      
      // Map integration to product ID (you'll need to configure this)
      // This is a simplified example
      const productId = `ai.odysseytech.integration.${firstIntegration.name.toLowerCase().replace(/\s+/g, '_')}`;
      
      console.log('[SubscriptionModalIAP] Purchasing integration:', productId);
      
      // Track purchase initiated
      mixpanelService.track('Integration Purchase Initiated', {
        integration_ids: integrations.map(i => i.id),
        integration_names: integrations.map(i => i.name),
        total_price: totalPrice,
      });

      // Make purchase
      const result = await purchaseProduct(productId);

      if (!result.success) {
        if (result.cancelled) {
          console.log('[SubscriptionModalIAP] Purchase cancelled');
          return;
        }
        throw new Error(result.error || 'Purchase failed');
      }

      console.log('[SubscriptionModalIAP] Purchase successful');

      // Track purchase success
      mixpanelService.track('Integration Purchase Success', {
        integration_ids: integrations.map(i => i.id),
        integration_names: integrations.map(i => i.name),
        total_price: totalPrice,
      });

      // Show success message
      Alert.alert(
        'Subscription Activated',
        `You now have access to ${integrations.map(i => i.name).join(', ')}`,
        [
          { 
            text: 'OK', 
            onPress: () => { 
              onClose(); 
              onSuccess?.(); 
            } 
          }
        ]
      );
    } catch (error: any) {
      console.error('[SubscriptionModalIAP] Purchase error:', error);
      
      // Track purchase error
      mixpanelService.track('Integration Purchase Failed', {
        integration_ids: integrations.map(i => i.id),
        error: error.message,
      });

      Alert.alert(
        'Purchase Failed', 
        error.message || 'Unable to complete purchase. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsPurchasing(false);
    }
  };

  if (integrations.length === 0) return null;

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
            <Text style={styles.headerTitle}>Subscribe to Integrations</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              disabled={isPurchasing || isLoading}
            >
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Info Banner */}
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle" size={20} color={theme.colors.primary} />
              <Text style={styles.infoBannerText}>
                Get instant access to these powerful integrations
              </Text>
            </View>

            {/* Integrations List */}
            <Text style={styles.sectionTitle}>Included Integrations</Text>
            <View style={styles.integrationsContainer}>
              {integrations.map((integration) => (
                <View key={integration.id} style={styles.integrationCard}>
                  <View style={styles.integrationIcon}>
                    <Ionicons name="extension-puzzle" size={24} color={theme.colors.primary} />
                  </View>
                  <View style={styles.integrationInfo}>
                    <Text style={styles.integrationName}>{integration.name}</Text>
                    {integration.description && (
                      <Text style={styles.integrationDescription}>
                        {integration.description}
                      </Text>
                    )}
                  </View>
                  {integration.price && (
                    <Text style={styles.integrationPrice}>${integration.price}/mo</Text>
                  )}
                </View>
              ))}
            </View>

            {/* Pricing Summary */}
            <View style={styles.pricingCard}>
              <View style={styles.pricingRow}>
                <Text style={styles.pricingLabel}>Total per month</Text>
                <Text style={styles.pricingAmount}>${totalPrice.toFixed(2)}</Text>
              </View>
              <View style={styles.pricingDivider} />
              <View style={styles.pricingFeatures}>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Cancel anytime</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Instant activation</Text>
                </View>
                <View style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
                  <Text style={styles.featureText}>Works on all devices</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                (isPurchasing || isLoading) && styles.subscribeButtonDisabled,
              ]}
              onPress={handleSubscribe}
              disabled={isPurchasing || isLoading}
              activeOpacity={0.8}
            >
              {isPurchasing || isLoading ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.buttonText}>Processing...</Text>
                </View>
              ) : (
                <View style={styles.buttonContent}>
                  <Ionicons name="card" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    Subscribe for ${totalPrice.toFixed(2)}/mo
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.secureInfo}>
              <Ionicons name="lock-closed" size={14} color={theme.colors.greyLight} />
              <Text style={styles.secureText}>
                Secure payment via {require('react-native').Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

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
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    closeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
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
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    // Integrations
    integrationsContainer: {
      gap: 12,
      marginBottom: 20,
    },
    integrationCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.backgroundLight,
      padding: 16,
      borderRadius: 12,
      gap: 12,
    },
    integrationIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    integrationInfo: {
      flex: 1,
    },
    integrationName: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 2,
    },
    integrationDescription: {
      fontSize: 13,
      color: theme.colors.greyLight,
    },
    integrationPrice: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    // Pricing
    pricingCard: {
      backgroundColor: theme.colors.backgroundLight,
      padding: 20,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.colors.primary + '30',
      marginBottom: 16,
    },
    pricingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    pricingLabel: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
    },
    pricingAmount: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.primary,
    },
    pricingDivider: {
      height: 1,
      backgroundColor: theme.colors.greyLight + '30',
      marginVertical: 16,
    },
    pricingFeatures: {
      gap: 10,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      fontSize: 14,
      color: theme.colors.text,
    },
    // Footer
    footer: {
      padding: 20,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: theme.colors.greyLight + '30',
      gap: 12,
    },
    subscribeButton: {
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
    subscribeButtonDisabled: {
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

export default SubscriptionModalIAP;

