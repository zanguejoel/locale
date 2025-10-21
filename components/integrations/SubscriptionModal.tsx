/**
 * Subscription Modal Component
 * 
 * Modal for subscribing to premium integrations via Stripe
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration } from '@/types/integrations';
import IntegrationService from '@/utils/IntegrationService';
import IntegrationLogo from './IntegrationLogo';

interface SubscriptionModalProps {
  visible: boolean;
  integrations: Integration[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function SubscriptionModal({
  visible,
  integrations,
  onClose,
  onSuccess,
}: SubscriptionModalProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);

  const totalPrice = integrations.reduce((sum, int) => {
    const price = parseFloat(int.price || '0');
    return sum + price;
  }, 0);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const integrationIds = integrations.map((int) => int.id);
      const response = await IntegrationService.initiateIntegrationPayment(integrationIds);

      if (response.checkout_url) {
        // Open Stripe checkout in browser
        const supported = await Linking.canOpenURL(response.checkout_url);
        if (supported) {
          await Linking.openURL(response.checkout_url);
          onClose();
          // TODO: Handle callback and refresh after payment
        } else {
          throw new Error('Cannot open payment URL');
        }
      } else if (response.status === 200) {
        // Already subscribed
        Alert.alert(
          'Already Subscribed',
          'You are already subscribed to these integrations.',
          [{ text: 'OK', onPress: () => { onClose(); onSuccess?.(); } }]
        );
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start subscription');
    } finally {
      setLoading(false);
    }
  };

  if (integrations.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={loading}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Subscribe
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Premium Badge */}
          <View style={styles.premiumBadge}>
            <Ionicons name="star" size={48} color="#8B5CF6" />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>
            Unlock Premium Integrations
          </Text>

          <Text style={[styles.subtitle, { color: theme.colors.grey }]}>
            Get access to powerful integrations and boost your productivity
          </Text>

          {/* Integrations List */}
          <View style={styles.integrationsList}>
            {integrations.map((integration) => (
              <View
                key={integration.id}
                style={[styles.integrationItem, { backgroundColor: theme.colors.cardBackground }]}
              >
                <IntegrationLogo integration={integration} size={40} />
                <View style={styles.integrationInfo}>
                  <Text style={[styles.integrationName, { color: theme.colors.text }]}>
                    {integration.integration_name}
                  </Text>
                  <Text style={[styles.integrationPrice, { color: theme.colors.grey }]}>
                    ${integration.price}/month
                  </Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
            ))}
          </View>

          {/* Features */}
          <View style={[styles.featuresBox, { backgroundColor: theme.colors.cardBackground }]}>
            <Text style={[styles.featuresTitle, { color: theme.colors.text }]}>
              What's included:
            </Text>
            {[
              'Full integration access',
              'Unlimited API calls',
              'Priority support',
              'Cancel anytime',
            ].map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <Ionicons name="checkmark" size={20} color="#10B981" />
                <Text style={[styles.featureText, { color: theme.colors.text }]}>
                  {feature}
                </Text>
              </View>
            ))}
          </View>

          {/* Total Price */}
          <View style={[styles.totalBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>${totalPrice.toFixed(2)}/month</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.cardBackground }]}
            onPress={onClose}
            disabled={loading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
              Maybe Later
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.subscribeButton,
              { backgroundColor: '#8B5CF6', opacity: loading ? 0.6 : 1 },
            ]}
            onPress={handleSubscribe}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="card" size={20} color="#FFFFFF" />
                <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  premiumBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },
  integrationsList: {
    marginBottom: 20,
  },
  integrationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  integrationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  integrationName: {
    fontSize: 15,
    fontWeight: '600',
  },
  integrationPrice: {
    fontSize: 13,
    marginTop: 2,
  },
  featuresBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 8,
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginRight: 8,
  },
  subscribeButton: {
    marginLeft: 8,
    flexDirection: 'row',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default SubscriptionModal;

