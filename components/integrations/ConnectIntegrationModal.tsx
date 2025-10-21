/**
 * Connect Integration Modal Component
 * 
 * Modal for connecting integrations via OAuth or API key
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration } from '@/types/integrations';
import IntegrationLogo from './IntegrationLogo';
import useIntegrationConnection from '@/hooks/useIntegrationConnection';

interface ConnectIntegrationModalProps {
  visible: boolean;
  integration: Integration | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConnectIntegrationModal({
  visible,
  integration,
  onClose,
  onSuccess,
}: ConnectIntegrationModalProps) {
  const theme = useTheme();
  const { connecting, error, connectOAuthIntegration, clearError } = useIntegrationConnection();

  const handleClose = () => {
    clearError();
    onClose();
  };

  const handleConnect = async () => {
    if (!integration) return;

    if (integration.authType === 'oauth') {
      // OAuth flow
      const success = await connectOAuthIntegration(integration);
      if (success) {
        Alert.alert(
          'Success',
          `${integration.integration_name} connected successfully!`,
          [
            {
              text: 'OK',
              onPress: () => {
                handleClose();
                onSuccess?.();
              },
            },
          ]
        );
      } else if (error) {
        Alert.alert('Connection Failed', error);
      }
    } else if (integration.authType === 'apiKey') {
      // API key flow - need configuration modal
      Alert.alert(
        'Configuration Required',
        `${integration.integration_name} requires API credentials. Please configure in settings.`,
        [{ text: 'OK' }]
      );
      handleClose();
    }
  };

  if (!integration) return null;

  const isPremium = integration.price && parseFloat(integration.price) > 0;
  const needsSubscription = isPremium && !integration.is_subscribed;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.closeButton}
            disabled={connecting}
          >
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Connect Integration
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Integration Info */}
          <View style={styles.integrationInfo}>
            <IntegrationLogo integration={integration} size={80} />
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {integration.integration_name}
            </Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={16} color="#8B5CF6" />
                <Text style={styles.premiumText}>Premium · ${integration.price}/mo</Text>
              </View>
            )}
            <Text style={[styles.description, { color: theme.colors.grey }]}>
              {integration.description || 'No description available'}
            </Text>
          </View>

          {/* Auth Type Info */}
          <View style={[styles.infoBox, { backgroundColor: theme.colors.cardBackground }]}>
            <View style={styles.infoRow}>
              <Ionicons
                name={integration.authType === 'oauth' ? 'shield-checkmark' : 'key'}
                size={20}
                color={theme.colors.tint}
              />
              <Text style={[styles.infoText, { color: theme.colors.text }]}>
                {integration.authType === 'oauth'
                  ? 'Secure OAuth authentication'
                  : 'API Key authentication'}
              </Text>
            </View>
            <Text style={[styles.infoSubtext, { color: theme.colors.grey }]}>
              {integration.authType === 'oauth'
                ? 'You\'ll be redirected to authenticate securely with your account'
                : 'You\'ll need to provide API credentials from your account'}
            </Text>
          </View>

          {/* Error Message */}
          {error && (
            <View style={[styles.errorBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
              <Ionicons name="warning" size={20} color="#EF4444" />
              <Text style={[styles.errorText, { color: '#EF4444' }]}>{error}</Text>
            </View>
          )}

          {/* Premium Warning */}
          {needsSubscription && (
            <View style={[styles.warningBox, { backgroundColor: 'rgba(139, 92, 246, 0.1)' }]}>
              <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
              <Text style={[styles.warningText, { color: '#8B5CF6' }]}>
                This is a premium integration. Subscribe to unlock.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.cardBackground }]}
            onPress={handleClose}
            disabled={connecting}
          >
            <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.connectButton,
              { backgroundColor: theme.colors.tint, opacity: connecting || needsSubscription ? 0.6 : 1 },
            ]}
            onPress={handleConnect}
            disabled={connecting || needsSubscription}
          >
            {connecting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.connectButtonText}>
                {needsSubscription ? 'Subscribe First' : 'Connect'}
              </Text>
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
  },
  contentContainer: {
    padding: 20,
  },
  integrationInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 16,
    textAlign: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 8,
  },
  premiumText: {
    color: '#8B5CF6',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 12,
  },
  infoBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoSubtext: {
    fontSize: 13,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
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
  connectButton: {
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  connectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConnectIntegrationModal;

