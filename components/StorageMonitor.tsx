/**
 * Storage Monitor Component
 * Displays storage usage with visual progress bar
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';
import { ModelFileManager } from '@/utils/ModelFileManager';

interface StorageInfo {
  totalSpace: number;
  freeSpace: number;
  usedSpace: number;
  modelSpace: number;
  cacheSpace: number;
  percentUsed: number;
}

export const StorageMonitor: React.FC = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setLoading(true);
      
      // Get device storage
      const deviceInfo = await ModelFileManager.getDeviceStorageInfo();
      
      // Get model and cache sizes
      const modelSpace = await ModelFileManager.getModelStorageSize();
      const cacheSpace = await ModelFileManager.getCacheSize();
      
      setStorageInfo({
        totalSpace: deviceInfo.totalSpace,
        freeSpace: deviceInfo.freeSpace,
        usedSpace: deviceInfo.usedSpace,
        modelSpace,
        cacheSpace,
        percentUsed: deviceInfo.percentUsed,
      });
    } catch (error) {
      console.error('[StorageMonitor] Error loading storage info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading storage info...</Text>
      </View>
    );
  }

  if (!storageInfo) {
    return null;
  }

  const percentModels = storageInfo.totalSpace > 0 
    ? (storageInfo.modelSpace / storageInfo.totalSpace) * 100 
    : 0;
  const percentCache = storageInfo.totalSpace > 0
    ? (storageInfo.cacheSpace / storageInfo.totalSpace) * 100
    : 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="pie-chart" size={20} color={theme.colors.primary} />
        <Text style={styles.title}>Storage Usage</Text>
      </View>

      {/* Main storage bar */}
      <View style={styles.storageBarContainer}>
        <View style={styles.storageBar}>
          <View 
            style={[
              styles.storageBarFill, 
              { 
                width: `${Math.min(storageInfo.percentUsed, 100)}%`,
                backgroundColor: storageInfo.percentUsed > 80 
                  ? theme.colors.destructive 
                  : storageInfo.percentUsed > 50
                  ? '#f59e0b'
                  : theme.colors.primary
              }
            ]} 
          />
        </View>
        <View style={styles.storageLabels}>
          <Text style={styles.storageText}>
            {ModelFileManager.formatFileSize(storageInfo.usedSpace)} used
          </Text>
          <Text style={styles.storageText}>
            {ModelFileManager.formatFileSize(storageInfo.totalSpace)} total
          </Text>
        </View>
        <Text style={styles.percentText}>
          {storageInfo.percentUsed.toFixed(1)}% of device
        </Text>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLabel}>
            <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
            <Text style={styles.breakdownText}>Models</Text>
          </View>
          <Text style={styles.breakdownValue}>
            {ModelFileManager.formatFileSize(storageInfo.modelSpace)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLabel}>
            <View style={[styles.dot, { backgroundColor: theme.colors.textSecondary }]} />
            <Text style={styles.breakdownText}>Cache</Text>
          </View>
          <Text style={styles.breakdownValue}>
            {ModelFileManager.formatFileSize(storageInfo.cacheSpace)}
          </Text>
        </View>

        <View style={styles.breakdownItem}>
          <View style={styles.breakdownLabel}>
            <View style={[styles.dot, { backgroundColor: theme.colors.accent }]} />
            <Text style={styles.breakdownText}>Free</Text>
          </View>
          <Text style={styles.breakdownValue}>
            {ModelFileManager.formatFileSize(storageInfo.freeSpace)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  storageBarContainer: {
    marginBottom: 16,
  },
  storageBar: {
    height: 8,
    backgroundColor: theme.colors.background200,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  storageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  storageLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storageText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  percentText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  breakdown: {
    gap: 10,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
  },
});

export default StorageMonitor;

