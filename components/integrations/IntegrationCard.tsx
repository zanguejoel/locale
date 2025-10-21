/**
 * Integration Card Component
 * 
 * Displays an integration with logo, name, description, and status
 * Shows connect/disconnect button and settings access
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration } from '@/types/integrations';
import IntegrationLogo from './IntegrationLogo';
import IntegrationStatusBadge from './IntegrationStatusBadge';

interface IntegrationCardProps {
  integration: Integration;
  isConnected: boolean;
  onPress?: () => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSettings?: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function IntegrationCard({
  integration,
  isConnected,
  onPress,
  onConnect,
  onDisconnect,
  onSettings,
  loading = false,
  disabled = false,
}: IntegrationCardProps) {
  const theme = useTheme();

  const handleCardPress = () => {
    if (!disabled && onPress) {
      onPress();
    }
  };

  const handleActionPress = (e: any) => {
    e.stopPropagation();
    if (disabled || loading) return;
    
    if (isConnected && onDisconnect) {
      onDisconnect();
    } else if (!isConnected && onConnect) {
      onConnect();
    }
  };

  const handleSettingsPress = (e: any) => {
    e.stopPropagation();
    if (onSettings && !disabled) {
      onSettings();
    }
  };

  const isPremium = integration.price && parseFloat(integration.price) > 0;
  const needsSubscription = isPremium && !integration.is_subscribed;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.cardBackground,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
      onPress={handleCardPress}
      disabled={disabled || !onPress}
      activeOpacity={0.7}
    >
      {/* Logo and Info */}
      <View style={styles.header}>
        <IntegrationLogo integration={integration} size={56} />
        
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.name, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {integration.integration_name}
            </Text>
            {isPremium && (
              <View style={styles.premiumBadge}>
                <Ionicons name="star" size={12} color="#8B5CF6" />
              </View>
            )}
          </View>
          
          <Text
            style={[styles.description, { color: theme.colors.grey }]}
            numberOfLines={2}
          >
            {integration.description || 'No description available'}
          </Text>
        </View>
      </View>

      {/* Status and Actions */}
      <View style={styles.footer}>
        <IntegrationStatusBadge
          status={isConnected ? 'connected' : 'disconnected'}
          small
        />
        
        <View style={styles.actions}>
          {/* Settings button (only if connected) */}
          {isConnected && onSettings && (
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: theme.colors.background },
              ]}
              onPress={handleSettingsPress}
              disabled={disabled}
            >
              <Ionicons name="settings-outline" size={18} color={theme.colors.text} />
            </TouchableOpacity>
          )}
          
          {/* Connect/Disconnect button */}
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isConnected
                  ? theme.colors.background
                  : theme.colors.tint,
                opacity: loading ? 0.7 : 1,
              },
            ]}
            onPress={handleActionPress}
            disabled={disabled || loading || needsSubscription}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.text} />
            ) : needsSubscription ? (
              <>
                <Ionicons
                  name="lock-closed"
                  size={16}
                  color={theme.colors.text}
                />
                <Text style={[styles.buttonText, { color: theme.colors.text }]}>
                  Subscribe
                </Text>
              </>
            ) : (
              <>
                <Ionicons
                  name={isConnected ? 'close-circle-outline' : 'add-circle-outline'}
                  size={16}
                  color={isConnected ? theme.colors.text : '#FFFFFF'}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: isConnected ? theme.colors.text : '#FFFFFF' },
                  ]}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  info: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  premiumBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 100,
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default IntegrationCard;

