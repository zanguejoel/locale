import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Pressable,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface GlobalDownloadManagerProps {
  progress: number; // 0 to 1
  isDownloading: boolean;
  isReady: boolean;
  onCancel?: () => void;
  onViewDetails?: () => void;
}

/**
 * Global floating download manager that persists across navigation
 * Shows as a minimized bar at the bottom or can be expanded for details
 */
export const GlobalDownloadManager: React.FC<GlobalDownloadManagerProps> = ({
  progress,
  isDownloading,
  isReady,
  onCancel,
  onViewDetails,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  const slideAnim = useRef(new Animated.Value(100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Show/hide based on download state
  useEffect(() => {
    if (isDownloading && !isReady) {
      setIsVisible(true);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
      }).start();
    } else if (isReady) {
      // Hide after completion with delay
      setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setIsVisible(false));
      }, 2000);
    }
  }, [isDownloading, isReady, slideAnim]);

  // Animate progress bar
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim]);

  if (!isVisible) {
    return null;
  }

  const safeProgress = Math.max(0, Math.min(1, progress || 0));
  const percentComplete = Math.round(safeProgress * 100);
  const modelName = 'Model';
  const modelSize = '';

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <>
      {/* Minimized floating bar */}
      <Animated.View
        style={[
          styles.floatingBar,
          {
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Pressable
          onPress={() => setIsExpanded(true)}
          style={styles.floatingContent}
        >
          <View style={styles.floatingLeft}>
            <View style={styles.iconContainer}>
              <Ionicons 
                name="cloud-download" 
                size={20} 
                color={theme.colors.primary} 
              />
            </View>
            <View style={styles.floatingTextContainer}>
              <Text style={styles.floatingTitle} numberOfLines={1}>
                {isReady ? 'Download Complete' : `Downloading ${modelName}`}
              </Text>
              <Text style={styles.floatingSubtitle}>
                {isReady ? 'Ready to use' : `${percentComplete}% • ${modelSize}`}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              setIsExpanded(true);
            }}
            style={styles.expandButton}
          >
            <Ionicons 
              name="chevron-up" 
              size={20} 
              color={theme.colors.textSecondary} 
            />
          </TouchableOpacity>
        </Pressable>

        {/* Progress bar on bottom */}
        <View style={styles.floatingProgressContainer}>
          <Animated.View
            style={[
              styles.floatingProgressBar,
              {
                width: progressWidth,
                backgroundColor: isReady 
                  ? theme.colors.success || '#4CAF50'
                  : theme.colors.primary,
              },
            ]}
          />
        </View>
      </Animated.View>

      {/* Expanded modal */}
      <Modal
        visible={isExpanded}
        transparent
        animationType="slide"
        onRequestClose={() => setIsExpanded(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIsExpanded(false)}
        >
          <Pressable 
            style={styles.modalContent}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <View style={styles.handleBar} />

            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Progress</Text>
              <TouchableOpacity
                onPress={() => setIsExpanded(false)}
                style={styles.closeButton}
              >
                <Ionicons 
                  name="close" 
                  size={24} 
                  color={theme.colors.text} 
                />
              </TouchableOpacity>
            </View>

            {/* Model info */}
            <View style={styles.modelInfo}>
              <View style={styles.modelIconLarge}>
                <Ionicons
                  name={isReady ? 'checkmark-circle' : 'cloud-download'}
                  size={48}
                  color={isReady ? theme.colors.success || '#4CAF50' : theme.colors.primary}
                />
              </View>

              <Text style={styles.modelName}>{modelName}</Text>
              <Text style={styles.modelSize}>{modelSize}</Text>

              {/* Progress circle or checkmark */}
              {isReady ? (
                <Text style={styles.statusText}>✓ Download Complete</Text>
              ) : (
                <>
                  <Text style={styles.percentageText}>{percentComplete}%</Text>
                  <Text style={styles.statusText}>Downloading...</Text>
                </>
              )}
            </View>

            {/* Large progress bar */}
            <View style={styles.largeProgressContainer}>
              <Animated.View
                style={[
                  styles.largeProgressBar,
                  {
                    width: progressWidth,
                    backgroundColor: isReady
                      ? theme.colors.success || '#4CAF50'
                      : theme.colors.primary,
                  },
                ]}
              />
            </View>

            {/* Info text */}
            {!isReady && (
              <Text style={styles.infoText}>
                Model is being downloaded in the background. You can continue using the app.
              </Text>
            )}

            {/* Action buttons */}
            <View style={styles.actions}>
              {onViewDetails && (
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={() => {
                    setIsExpanded(false);
                    onViewDetails();
                  }}
                >
                  <Text style={styles.secondaryButtonText}>View Details</Text>
                </TouchableOpacity>
              )}

              {!isReady && onCancel && (
                <TouchableOpacity
                  style={[styles.button, styles.dangerButton]}
                  onPress={() => {
                    setIsExpanded(false);
                    onCancel();
                  }}
                >
                  <Text style={styles.dangerButtonText}>Cancel Download</Text>
                </TouchableOpacity>
              )}

              {isReady && (
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={() => setIsExpanded(false)}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  // Floating bar styles
  floatingBar: {
    position: 'absolute',
    bottom: 80, // Above tab bar
    left: 16,
    right: 16,
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  floatingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  floatingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.isDark ? 'rgba(0, 122, 255, 0.2)' : 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  floatingTextContainer: {
    flex: 1,
  },
  floatingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  floatingSubtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  expandButton: {
    padding: 8,
  },
  floatingProgressContainer: {
    height: 3,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
  },
  floatingProgressBar: {
    height: '100%',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modelInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modelIconLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modelName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  modelSize: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 16,
  },
  percentageText: {
    fontSize: 32,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  largeProgressContainer: {
    height: 8,
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  largeProgressBar: {
    height: '100%',
    borderRadius: 4,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.error || '#FF3B30',
  },
  dangerButtonText: {
    color: theme.colors.error || '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
});

