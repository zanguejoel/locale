/**
 * ModelDownloadScreen - Beautiful one-time download experience
 * 
 * Shows when user first enables local AI mode and model isn't downloaded yet.
 * Provides progress tracking and engaging messaging about privacy benefits.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

export interface ModelDownloadScreenProps {
  /** Download progress (0 to 1) */
  progress: number;
  
  /** Whether currently downloading */
  isDownloading: boolean;
  
  /** Estimated time remaining in seconds */
  estimatedTimeRemaining: number | null;
  
  /** Download size in MB */
  downloadSizeMB: number;
  
  /** Callback to start download */
  onStartDownload: () => void;
  
  /** Callback to cancel download */
  onCancelDownload: () => void;
  
  /** Model name */
  modelName?: string;
}

export function ModelDownloadScreen({
  progress,
  isDownloading,
  estimatedTimeRemaining,
  downloadSizeMB,
  onStartDownload,
  onCancelDownload,
  modelName = 'Llama 3.2 1B',
}: ModelDownloadScreenProps) {
  const theme = useTheme();
  const styles = getStyles(theme);
  
  // Animated progress value
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  
  React.useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress]);
  
  // Calculate downloaded MB
  const downloadedMB = Math.round(downloadSizeMB * progress);
  const progressPercent = Math.round(progress * 100);
  
  // Format time remaining
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };
  
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={theme.isDark 
          ? ['#1e3a8a', '#1e40af', '#2563eb']
          : ['#dbeafe', '#bfdbfe', '#93c5fd']
        }
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={['#3b82f6', '#2563eb', '#1d4ed8']}
              style={styles.iconGradient}
            >
              {isDownloading ? (
                <ActivityIndicator size="large" color="#fff" />
              ) : (
                <Ionicons name="download" size={48} color="#fff" />
              )}
            </LinearGradient>
          </View>
          
          {/* Title */}
          <Text style={styles.title}>
            {isDownloading ? 'Downloading Local AI' : 'Enable Private AI'}
          </Text>
          
          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {isDownloading 
              ? 'One-time download in progress...'
              : `${modelName} • ${downloadSizeMB / 1000} GB`
            }
          </Text>
          
          {/* Progress Bar (when downloading) */}
          {isDownloading && (
            <View style={styles.progressSection}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              
              <View style={styles.progressInfo}>
                <Text style={styles.progressText}>
                  {downloadedMB} MB / {downloadSizeMB} MB
                </Text>
                <Text style={styles.progressPercent}>
                  {progressPercent}%
                </Text>
              </View>
              
              {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
                <Text style={styles.timeRemaining}>
                  ~{formatTime(estimatedTimeRemaining)} remaining
                </Text>
              )}
            </View>
          )}
          
          {/* Benefits (when not downloading) */}
          {!isDownloading && (
            <View style={styles.benefits}>
              <View style={styles.benefit}>
                <Ionicons name="lock-closed" size={20} color="#3b82f6" />
                <Text style={styles.benefitText}>
                  100% Private - Your data never leaves your device
                </Text>
              </View>
              
              <View style={styles.benefit}>
                <Ionicons name="cloud-offline" size={20} color="#3b82f6" />
                <Text style={styles.benefitText}>
                  Works Offline - No internet required after download
                </Text>
              </View>
              
              <View style={styles.benefit}>
                <Ionicons name="flash" size={20} color="#3b82f6" />
                <Text style={styles.benefitText}>
                  Fast Responses - 30+ tokens per second
                </Text>
              </View>
              
              <View style={styles.benefit}>
                <Ionicons name="infinite" size={20} color="#3b82f6" />
                <Text style={styles.benefitText}>
                  Unlimited Usage - No API costs
                </Text>
              </View>
            </View>
          )}
          
          {/* Action Buttons */}
          <View style={styles.actions}>
            {!isDownloading ? (
              <>
                <TouchableOpacity
                  style={styles.downloadButton}
                  onPress={onStartDownload}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.buttonGradient}
                  >
                    <Ionicons name="download" size={20} color="#fff" />
                    <Text style={styles.downloadButtonText}>
                      Download Model ({downloadSizeMB / 1000} GB)
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
                
                <Text style={styles.note}>
                  One-time download • WiFi recommended
                </Text>
              </>
            ) : (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onCancelDownload}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {/* Footer info */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              💡 Requires iPhone 12 or newer with iOS 17+
            </Text>
            <Text style={styles.footerText}>
              ⚡️ Best performance on iPhone 13 Pro or newer
            </Text>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconGradient: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.mutedForeground,
    marginBottom: 32,
    textAlign: 'center',
  },
  progressSection: {
    width: '100%',
    marginBottom: 32,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: theme.isDark ? '#374151' : '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: 4,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '700',
  },
  timeRemaining: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  benefits: {
    width: '100%',
    marginBottom: 32,
    gap: 16,
  },
  benefit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    color: theme.colors.text,
    flex: 1,
  },
  actions: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
  },
  downloadButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  downloadButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.mutedForeground,
    fontWeight: '500',
  },
  note: {
    fontSize: 13,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
  footer: {
    marginTop: 32,
    gap: 4,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.mutedForeground,
    textAlign: 'center',
  },
});

export default ModelDownloadScreen;

