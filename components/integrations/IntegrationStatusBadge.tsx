/**
 * Integration Status Badge Component
 * 
 * Shows connection status (Connected, Disconnected, Premium, etc.)
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface IntegrationStatusBadgeProps {
  status: 'connected' | 'disconnected' | 'premium' | 'error';
  small?: boolean;
}

export function IntegrationStatusBadge({ status, small = false }: IntegrationStatusBadgeProps) {
  const theme = useTheme();
  
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          text: 'Connected',
          icon: 'checkmark-circle' as const,
          color: '#10B981',
          bgColor: 'rgba(16, 185, 129, 0.1)',
        };
      case 'disconnected':
        return {
          text: 'Not Connected',
          icon: 'ellipse-outline' as const,
          color: theme.colors.grey,
          bgColor: theme.colors.cardBackground,
        };
      case 'premium':
        return {
          text: 'Premium',
          icon: 'star' as const,
          color: '#8B5CF6',
          bgColor: 'rgba(139, 92, 246, 0.1)',
        };
      case 'error':
        return {
          text: 'Error',
          icon: 'warning' as const,
          color: '#EF4444',
          bgColor: 'rgba(239, 68, 68, 0.1)',
        };
    }
  };
  
  const config = getStatusConfig();
  const fontSize = small ? 11 : 13;
  const iconSize = small ? 14 : 16;
  const paddingVertical = small ? 3 : 5;
  const paddingHorizontal = small ? 8 : 10;
  
  return (
    <View style={[
      styles.badge, 
      { 
        backgroundColor: config.bgColor,
        paddingVertical,
        paddingHorizontal,
      }
    ]}>
      <Ionicons name={config.icon} size={iconSize} color={config.color} />
      <Text style={[styles.text, { color: config.color, fontSize, marginLeft: small ? 3 : 4 }]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});

export default IntegrationStatusBadge;

