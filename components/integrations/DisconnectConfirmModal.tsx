/**
 * Disconnect Confirm Modal Component
 * 
 * Confirmation dialog for disconnecting an integration
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration } from '@/types/integrations';
import { useIntegrations } from '@/contexts/IntegrationsContext';
import IntegrationLogo from './IntegrationLogo';

interface DisconnectConfirmModalProps {
  visible: boolean;
  integration: Integration | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DisconnectConfirmModal({
  visible,
  integration,
  onClose,
  onSuccess,
}: DisconnectConfirmModalProps) {
  const theme = useTheme();
  const { disconnectIntegration } = useIntegrations();
  const [loading, setLoading] = useState(false);

  const handleDisconnect = async () => {
    if (!integration) return;

    setLoading(true);
    try {
      await disconnectIntegration(integration.id);
      Alert.alert(
        'Disconnected',
        `${integration.integration_name} has been disconnected`,
        [
          {
            text: 'OK',
            onPress: () => {
              onClose();
              onSuccess?.();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to disconnect integration');
      setLoading(false);
    }
  };

  if (!integration) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <IntegrationLogo integration={integration} size={64} />
            <View style={styles.warningBadge}>
              <Ionicons name="warning" size={24} color="#EF4444" />
            </View>
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Disconnect {integration.integration_name}?
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.colors.grey }]}>
            This will remove all access and stop syncing data. You can reconnect at any time.
          </Text>

          {/* Warning Box */}
          <View style={[styles.warningBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Ionicons name="information-circle" size={20} color="#EF4444" />
            <Text style={[styles.warningText, { color: '#EF4444' }]}>
              Any automation or agents using this integration may stop working.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: theme.colors.cardBackground }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.disconnectButton,
                { backgroundColor: '#EF4444', opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleDisconnect}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="close-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.disconnectButtonText}>Disconnect</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  warningBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 8,
  },
  actions: {
    flexDirection: 'row',
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
  disconnectButton: {
    marginLeft: 8,
    flexDirection: 'row',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default DisconnectConfirmModal;

