import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useDefaultLocalModel } from '@/hooks/useDefaultLocalModel';
import LocalModelErrorBoundary from './LocalModelErrorBoundary';

interface LocalModelDownloadProgressProps {
  progress: number; // 0 to 1
  isReady: boolean;
  onFallbackToCloud?: () => void;
}

const LocalModelDownloadProgressInner: React.FC<LocalModelDownloadProgressProps> = React.memo(({ 
  progress, 
  isReady 
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const selectedLocalModel = useDefaultLocalModel();
  
  // Get model info
  const modelName = selectedLocalModel?.displayName || 'Llama 3.2 1B';
  const modelSize = selectedLocalModel?.size || '~1.2GB';

  // Don't show if model is ready
  if (isReady) {
    // console.log('[LocalModelProgress] Hidden - model is ready');
    return null;
  }

  // If progress is 100% but not ready yet, show "Finalizing" instead of "Preparing"
  if (progress >= 1) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Finalizing {modelName}</Text>
            <Text style={styles.subtitle}>
              Almost ready • {modelSize}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // Show if downloading (progress > 0 and < 100%)
  if (progress > 0) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Downloading {modelName}</Text>
            <Text style={styles.subtitle}>
              {Math.round(progress * 100)}% complete • {modelSize}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarContainer}>
          <View 
            style={[
              styles.progressBar, 
              { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }
            ]} 
          />
        </View>
      </View>
    );
  }

  // Show preparing message if progress is 0
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Preparing {modelName}</Text>
          <Text style={styles.subtitle}>
            Starting download • {modelSize}
          </Text>
        </View>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if progress changed by more than 5% or isReady changed
  const progressDiff = Math.abs(prevProps.progress - nextProps.progress);
  return progressDiff < 0.05 && prevProps.isReady === nextProps.isReady;
});

// Wrapper component with error boundary
export const LocalModelDownloadProgress: React.FC<LocalModelDownloadProgressProps> = (props) => {
  return (
    <LocalModelErrorBoundary fallbackToCloud={props.onFallbackToCloud}>
      <LocalModelDownloadProgressInner {...props} />
    </LocalModelErrorBoundary>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: theme.colors.greyLight,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.grey,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: theme.colors.greyLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

