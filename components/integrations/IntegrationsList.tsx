/**
 * Integrations List Component
 * 
 * Scrollable list of integrations with search and filtering
 */

import React, { useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration, IntegrationCategory } from '@/types/integrations';
import { useIntegrations } from '@/contexts/IntegrationsContext';
import IntegrationCard from './IntegrationCard';

interface IntegrationsListProps {
  integrations?: Integration[];
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  category?: IntegrationCategory;
  onIntegrationPress?: (integration: Integration) => void;
  onConnect?: (integration: Integration) => void;
  onDisconnect?: (integration: Integration) => void;
  onSettings?: (integration: Integration) => void;
  showSearch?: boolean;
  emptyMessage?: string;
}

export function IntegrationsList({
  integrations: propIntegrations,
  searchQuery = '',
  onSearchChange,
  category = 'all',
  onIntegrationPress,
  onConnect,
  onDisconnect,
  onSettings,
  showSearch = true,
  emptyMessage = 'No integrations found',
}: IntegrationsListProps) {
  const theme = useTheme();
  const { 
    integrations: contextIntegrations, 
    isIntegrationConnected, 
    loading 
  } = useIntegrations();

  // Use prop integrations or context integrations
  const integrations = propIntegrations || contextIntegrations;

  // Filter integrations based on search and category
  const filteredIntegrations = useMemo(() => {
    let filtered = integrations;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (int) =>
          int.integration_name.toLowerCase().includes(query) ||
          int.str_id.toLowerCase().includes(query) ||
          (int.description && int.description.toLowerCase().includes(query))
      );
    }

    // Filter by category
    if (category === 'connected') {
      filtered = filtered.filter((int) => isIntegrationConnected(int.str_id));
    } else if (category !== 'all') {
      // TODO: Implement category filtering based on integration type
      // For now, show all
    }

    return filtered;
  }, [integrations, searchQuery, category, isIntegrationConnected]);

  const renderItem = ({ item }: { item: Integration }) => {
    const connected = isIntegrationConnected(item.str_id);
    
    return (
      <IntegrationCard
        integration={item}
        isConnected={connected}
        onPress={() => onIntegrationPress?.(item)}
        onConnect={() => onConnect?.(item)}
        onDisconnect={() => onDisconnect?.(item)}
        onSettings={() => onSettings?.(item)}
      />
    );
  };

  const renderEmpty = () => {
    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.tint} />
          <Text style={[styles.emptyText, { color: theme.colors.grey }]}>
            Loading integrations...
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="link-outline" size={64} color={theme.colors.grey} />
        <Text style={[styles.emptyText, { color: theme.colors.grey }]}>
          {emptyMessage}
        </Text>
        {searchQuery && (
          <Text style={[styles.emptySubtext, { color: theme.colors.grey }]}>
            Try adjusting your search
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search bar */}
      {showSearch && onSearchChange && (
        <View style={[styles.searchContainer, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="search" size={20} color={theme.colors.grey} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search integrations..."
            placeholderTextColor={theme.colors.grey}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <Ionicons 
              name="close-circle" 
              size={20} 
              color={theme.colors.grey}
              onPress={() => onSearchChange('')}
            />
          )}
        </View>
      )}

      {/* Integrations list */}
      <FlatList
        data={filteredIntegrations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          filteredIntegrations.length === 0 && styles.listContentEmpty,
        ]}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.2)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 16,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default IntegrationsList;

