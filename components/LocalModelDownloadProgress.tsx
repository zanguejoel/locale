import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useDefaultLocalModel } from '@/hooks/useDefaultLocalModel';

interface LocalModelDownloadProgressProps {
  progress: number; // 0 to 1
  isReady: boolean;
}

export const LocalModelDownloadProgress: React.FC<LocalModelDownloadProgressProps> = ({ 
  progress, 
  isReady 
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const selectedLocalModel = useDefaultLocalModel();
  
  // Get model size from selected model
  const modelSize = selectedLocalModel?.size || '~80MB';
  
  // Debug logging
  console.log('[LocalModelProgress] Render:', { progress, isReady, modelSize });

  // Don't show if model is ready
  if (isReady) {
    console.log('[LocalModelProgress] Hidden - model is ready');
    return null;
  }

  // Show if downloading (progress > 0)
  if (progress > 0 && progress < 1) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Downloading {selectedLocalModel?.displayName || 'Local Model'}</Text>
            <Text style={styles.subtitle}>
              {Math.round(progress * 100)}% complete ({modelSize})
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
          <Text style={styles.title}>Preparing {selectedLocalModel?.displayName || 'Local Model'}</Text>
          <Text style={styles.subtitle}>
            This may take a few moments ({modelSize} download)
          </Text>
        </View>
      </View>
    </View>
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

