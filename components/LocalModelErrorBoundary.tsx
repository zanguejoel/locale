import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocalModelErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
}

interface LocalModelErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
  fallbackToCloud?: () => void;
}

/**
 * Error Boundary specifically for local model loading and execution
 * Provides graceful fallback to cloud models when local models fail
 */
class LocalModelErrorBoundary extends Component<
  LocalModelErrorBoundaryProps,
  LocalModelErrorBoundaryState
> {
  constructor(props: LocalModelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LocalModelErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log error details for debugging
    console.error('[LocalModelErrorBoundary] Caught local model error:', error);
    console.error('[LocalModelErrorBoundary] Error info:', errorInfo);
    
    // Categorize the error
    const errorMessage = error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {
      console.error('[LocalModelErrorBoundary] Memory error detected');
    } else if (errorMessage.includes('download') || errorMessage.includes('network')) {
      console.error('[LocalModelErrorBoundary] Download/Network error detected');
    } else if (errorMessage.includes('model') && errorMessage.includes('not loaded')) {
      console.error('[LocalModelErrorBoundary] Model loading error detected');
    } else if (errorMessage.includes('unsupported') || errorMessage.includes('not supported')) {
      console.error('[LocalModelErrorBoundary] Device compatibility error detected');
    }
    
    // Here you could send to crash reporting service
    // Sentry.captureException(error, { 
    //   tags: { component: 'LocalModel' },
    //   extra: errorInfo 
    // });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Call custom reset handler if provided
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleFallbackToCloud = () => {
    // Reset error state
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Switch to cloud models
    if (this.props.fallbackToCloud) {
      this.props.fallbackToCloud();
    } else {
      // Default: show alert if no fallback provided
      Alert.alert(
        'Switched to Cloud Models',
        'Local models encountered an error. You can try again from the model selector.',
        [{ text: 'OK' }]
      );
    }
  };

  getErrorCategory = () => {
    const errorMessage = this.state.error?.message?.toLowerCase() || '';
    
    if (errorMessage.includes('memory') || errorMessage.includes('out of memory')) {
      return {
        title: 'Memory Error',
        message: 'Your device does not have enough memory to run this local model.',
        suggestion: 'Try a smaller model or use cloud models instead.',
        icon: 'hardware-chip-outline' as const,
      };
    }
    
    if (errorMessage.includes('download') || errorMessage.includes('network')) {
      return {
        title: 'Download Failed',
        message: 'Failed to download the local model.',
        suggestion: 'Check your internet connection and try again.',
        icon: 'cloud-download-outline' as const,
      };
    }
    
    if (errorMessage.includes('model') && errorMessage.includes('not loaded')) {
      return {
        title: 'Model Loading Failed',
        message: 'The local model failed to initialize properly.',
        suggestion: 'Try restarting the app or switching to cloud models.',
        icon: 'cube-outline' as const,
      };
    }
    
    if (errorMessage.includes('unsupported') || errorMessage.includes('not supported')) {
      return {
        title: 'Device Not Supported',
        message: 'Your device does not support running local AI models.',
        suggestion: 'Please use cloud models instead.',
        icon: 'phone-portrait-outline' as const,
      };
    }
    
    // Default error
    return {
      title: 'Local Model Error',
      message: this.state.error?.message || 'An error occurred with the local model.',
      suggestion: 'Switch to cloud models to continue using the app.',
      icon: 'warning-outline' as const,
    };
  };

  render() {
    if (this.state.hasError) {
      const errorInfo = this.getErrorCategory();
      
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.iconContainer}>
              <Ionicons name={errorInfo.icon} size={48} color="#FF6B6B" />
            </View>
            
            <Text style={styles.title}>{errorInfo.title}</Text>
            
            <Text style={styles.message}>{errorInfo.message}</Text>
            
            <Text style={styles.suggestion}>{errorInfo.suggestion}</Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText} numberOfLines={4}>
                  {this.state.error.stack}
                </Text>
              </View>
            )}
            
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.buttonPrimary]} 
                onPress={this.handleFallbackToCloud}
                activeOpacity={0.7}
              >
                <Ionicons name="cloud" size={18} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Use Cloud Models</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, styles.buttonSecondary]} 
                onPress={this.handleReset}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh" size={18} color="#007AFF" style={styles.buttonIcon} />
                <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Try Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 20,
  },
  suggestion: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  debugContainer: {
    width: '100%',
    backgroundColor: '#2D2D2D',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    maxHeight: 100,
  },
  debugTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6B6B',
    marginBottom: 6,
  },
  debugText: {
    fontSize: 10,
    color: '#FFF',
    fontFamily: 'monospace',
  },
  buttonContainer: {
    width: '100%',
    gap: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonSecondary: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  buttonIcon: {
    marginRight: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#007AFF',
  },
});

export default LocalModelErrorBoundary;

