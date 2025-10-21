/**
 * Integration Category Section Component
 * 
 * Groups integrations by category with collapsible sections
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration, IntegrationCategory, INTEGRATION_CATEGORIES } from '@/types/integrations';
import IntegrationCard from './IntegrationCard';

interface IntegrationCategorySectionProps {
  category: IntegrationCategory;
  integrations: Integration[];
  connectedStrIds: string[];
  onIntegrationPress?: (integration: Integration) => void;
  onConnect?: (integration: Integration) => void;
  onDisconnect?: (integration: Integration) => void;
  onSettings?: (integration: Integration) => void;
  defaultExpanded?: boolean;
}

export function IntegrationCategorySection({
  category,
  integrations,
  connectedStrIds,
  onIntegrationPress,
  onConnect,
  onDisconnect,
  onSettings,
  defaultExpanded = true,
}: IntegrationCategorySectionProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (integrations.length === 0) {
    return null;
  }

  const categoryName = INTEGRATION_CATEGORIES[category] || category;
  const connectedCount = integrations.filter((int) =>
    connectedStrIds.includes(int.str_id)
  ).length;

  return (
    <View style={styles.container}>
      {/* Category Header */}
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            {categoryName}
          </Text>
          <Text style={[styles.count, { color: theme.colors.grey }]}>
            {integrations.length} {integrations.length === 1 ? 'integration' : 'integrations'}
            {connectedCount > 0 && ` · ${connectedCount} connected`}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={theme.colors.grey}
        />
      </TouchableOpacity>

      {/* Integrations List */}
      {expanded && (
        <View style={styles.content}>
          {integrations.map((integration) => {
            const isConnected = connectedStrIds.includes(integration.str_id);
            return (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                isConnected={isConnected}
                onPress={() => onIntegrationPress?.(integration)}
                onConnect={() => onConnect?.(integration)}
                onDisconnect={() => onDisconnect?.(integration)}
                onSettings={() => onSettings?.(integration)}
              />
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  count: {
    fontSize: 13,
  },
  content: {
    marginTop: 8,
  },
});

export default IntegrationCategorySection;

