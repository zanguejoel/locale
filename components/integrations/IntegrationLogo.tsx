/**
 * Integration Logo Component
 * 
 * Displays integration logo with light/dark mode support
 * Handles both image URLs and icon fallbacks
 */

import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration } from '@/types/integrations';

interface IntegrationLogoProps {
  integration: Integration;
  size?: number;
}

export function IntegrationLogo({ integration, size = 48 }: IntegrationLogoProps) {
  const theme = useTheme();
  
  // Determine logo URL based on theme
  const logoUrl = theme.isDark ? integration.logo?.dark : integration.logo?.light;
  
  // If no logo, show default icon
  if (!logoUrl || logoUrl === '') {
    return (
      <View style={[styles.iconContainer, { width: size, height: size, backgroundColor: theme.colors.cardBackground }]}>
        <Ionicons 
          name="link-outline" 
          size={size * 0.5} 
          color={theme.colors.grey} 
        />
      </View>
    );
  }

  // Show integration logo
  return (
    <View style={[styles.logoContainer, { width: size, height: size }]}>
      <Image
        source={{ uri: logoUrl }}
        style={[styles.logo, { width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  logo: {
    borderRadius: 12,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
});

export default IntegrationLogo;

