/**
 * Connected Integrations List Component
 * 
 * Displays only connected integrations in a compact format
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration } from '@/types/integrations';
import { useIntegrations } from '@/contexts/IntegrationsContext';
import IntegrationLogo from './IntegrationLogo';

interface ConnectedIntegrationsListProps {
  onIntegrationPress?: (integration: Integration) => void;
  horizontal?: boolean;
  maxItems?: number;
}

export function ConnectedIntegrationsList({
  onIntegrationPress,
  horizontal = false,
  maxItems,
}: ConnectedIntegrationsListProps) {
  const theme = useTheme();
  const { getConnectedIntegrations, loading } = useIntegrations();

  const connectedIntegrations = getConnectedIntegrations();
  const displayedIntegrations = maxItems
    ? connectedIntegrations.slice(0, maxItems)
    : connectedIntegrations;
  const hasMore = maxItems && connectedIntegrations.length > maxItems;

  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.grey }]}>
          Loading...
        </Text>
      </View>
    );
  }

  if (connectedIntegrations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="link-outline" size={48} color={theme.colors.grey} />
        <Text style={[styles.emptyText, { color: theme.colors.grey }]}>
          No connected integrations
        </Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.grey }]}>
          Connect your first integration to get started
        </Text>
      </View>
    );
  }

  const renderItem = (integration: Integration) => (
    <TouchableOpacity
      key={integration.id}
      style={[
        styles.item,
        {
          backgroundColor: theme.colors.cardBackground,
          marginRight: horizontal ? 12 : 0,
          marginBottom: horizontal ? 0 : 12,
        },
      ]}
      onPress={() => onIntegrationPress?.(integration)}
      activeOpacity={0.7}
    >
      <IntegrationLogo integration={integration} size={40} />
      <View style={styles.itemInfo}>
        <Text
          style={[styles.itemName, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {integration.integration_name}
        </Text>
        <View style={styles.statusRow}>
          <View style={styles.statusDot} />
          <Text style={[styles.statusText, { color: theme.colors.grey }]}>
            Connected
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.grey} />
    </TouchableOpacity>
  );

  if (horizontal) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalContainer}
      >
        {displayedIntegrations.map(renderItem)}
        {hasMore && (
          <View style={[styles.moreItem, { backgroundColor: theme.colors.cardBackground }]}>
            <Text style={[styles.moreText, { color: theme.colors.grey }]}>
              +{connectedIntegrations.length - maxItems!} more
            </Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <View style={styles.verticalContainer}>
      {displayedIntegrations.map(renderItem)}
      {hasMore && (
        <Text style={[styles.moreText, { color: theme.colors.grey, marginTop: 8 }]}>
          +{connectedIntegrations.length - maxItems!} more integrations
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  verticalContainer: {
    paddingHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 200,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
  },
  moreItem: {
    minWidth: 120,
    height: 64,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
    borderStyle: 'dashed',
  },
  moreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13,
    marginTop: 6,
    textAlign: 'center',
  },
});

export default ConnectedIntegrationsList;

