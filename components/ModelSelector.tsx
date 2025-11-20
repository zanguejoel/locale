/**
 * ModelSelector Component
 * 
 * Allows users to toggle between cloud and local AI models.
 * Shows model status, capabilities, and provides visual feedback.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

// ============================================================
// Types
// ============================================================

export interface ModelSelectorProps {
  /** Whether local mode is currently active */
  isLocal: boolean;
  
  /** Callback when user toggles mode */
  onToggle: (isLocal: boolean) => void;
  
  /** Whether local model is ready for use */
  isLocalModelReady: boolean;
  
  /** Whether local model is currently generating */
  isLocalModelGenerating?: boolean;
  
  /** Optional: Custom styling */
  containerStyle?: any;
  
  /** Optional: Show detailed info */
  showDetails?: boolean;
}

// ============================================================
// Component
// ============================================================

export function ModelSelector({
  isLocal,
  onToggle,
  isLocalModelReady,
  isLocalModelGenerating = false,
  containerStyle,
  showDetails = true,
}: ModelSelectorProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      {/* Header */}
      {showDetails && (
        <Text style={styles.header}>AI Model</Text>
      )}
      
      {/* Options */}
      <View style={styles.optionsContainer}>
        {/* Cloud Option */}
        <TouchableOpacity
          style={[
            styles.option,
            !isLocal && styles.selectedOption,
          ]}
          onPress={() => onToggle(false)}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={[
              styles.optionTitle,
              !isLocal && styles.selectedText,
            ]}>
              ☁️ Cloud Models
            </Text>
            {!isLocal && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          
          {showDetails && (
            <Text style={styles.optionSubtitle}>
              GPT-4, Claude, Gemini
            </Text>
          )}
          
          {showDetails && !isLocal && (
            <View style={styles.features}>
              <Text style={styles.feature}>• Web search</Text>
              <Text style={styles.feature}>• Image generation</Text>
              <Text style={styles.feature}>• Latest models</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Local Option */}
        <TouchableOpacity
          style={[
            styles.option,
            isLocal && styles.selectedOption,
            !isLocalModelReady && styles.disabledOption,
          ]}
          onPress={() => onToggle(true)}
          disabled={!isLocalModelReady}
          activeOpacity={0.7}
        >
          <View style={styles.optionHeader}>
            <Text style={[
              styles.optionTitle,
              isLocal && styles.selectedText,
              !isLocalModelReady && styles.disabledText,
            ]}>
              📱 Local AI
            </Text>
            
            {isLocal && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
            
            {!isLocalModelReady && (
              <ActivityIndicator size="small" color="#666" />
            )}
          </View>
          
          {showDetails && (
            <Text style={[
              styles.optionSubtitle,
              !isLocalModelReady && styles.disabledText,
            ]}>
              {isLocalModelReady 
                ? 'Llama 3.2 1B • Ready'
                : 'Loading model...'
              }
            </Text>
          )}
          
          {showDetails && isLocal && (
            <View style={styles.features}>
              <Text style={styles.feature}>• 100% Private</Text>
              <Text style={styles.feature}>• Works offline</Text>
              <Text style={styles.feature}>• No data sent</Text>
            </View>
          )}
          
          {isLocalModelGenerating && (
            <View style={styles.generatingBadge}>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.generatingText}>Generating...</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Info Footer */}
      {showDetails && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {isLocal 
              ? '🔒 Your conversations never leave this device'
              : '☁️ Connected to cloud AI services'
            }
          </Text>
        </View>
      )}
    </View>
  );
}

// ============================================================
// Compact Version (for header/toolbar)
// ============================================================

export function CompactModelSelector({
  isLocal,
  onToggle,
  isLocalModelReady,
}: Pick<ModelSelectorProps, 'isLocal' | 'onToggle' | 'isLocalModelReady'>) {
  return (
    <TouchableOpacity
      style={styles.compactContainer}
      onPress={() => onToggle(!isLocal)}
      disabled={!isLocalModelReady && !isLocal}
    >
      <Text style={styles.compactLabel}>
        {isLocal ? '📱 Local' : '☁️ Cloud'}
      </Text>
      
      {!isLocalModelReady && !isLocal && (
        <ActivityIndicator size="small" color="#666" />
      )}
    </TouchableOpacity>
  );
}

// ============================================================
// Styles
// ============================================================

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
  },
  
  header: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#000',
  },
  
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  
  option: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#f8f8f8',
    minHeight: 120,
  },
  
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  
  disabledOption: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  
  selectedText: {
    color: '#007AFF',
  },
  
  disabledText: {
    color: '#999',
  },
  
  optionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
  },
  
  features: {
    marginTop: 8,
    gap: 4,
  },
  
  feature: {
    fontSize: 11,
    color: '#888',
  },
  
  activeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
  
  generatingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  
  generatingText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  
  footer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  
  footerText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  
  // Compact version
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  
  compactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
});

export default ModelSelector;

