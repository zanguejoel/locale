/**
 * LocalModelTestToggle - Simple component to test ExecuTorch integration
 * 
 * Drop this into your chat screen to quickly test local AI functionality.
 * Once confirmed working, replace with the full ModelSelector component.
 */

import React from 'react';
import { View, Switch, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export interface LocalModelTestToggleProps {
  isLocal: boolean;
  setIsLocal: (value: boolean) => void;
  isLocalModelReady: boolean;
  isLocalModelGenerating: boolean;
  interruptLocalGeneration: () => void;
}

export function LocalModelTestToggle({
  isLocal,
  setIsLocal,
  isLocalModelReady,
  isLocalModelGenerating,
  interruptLocalGeneration,
}: LocalModelTestToggleProps) {

  return (
    <View style={styles.container}>
      {/* Toggle Switch */}
      <View style={styles.row}>
        <Text style={styles.label}>Local AI Mode:</Text>
        <Switch
          value={isLocal}
          onValueChange={setIsLocal}
          disabled={!isLocalModelReady}
          trackColor={{ false: '#767577', true: '#81b0ff' }}
          thumbColor={isLocal ? '#007AFF' : '#f4f3f4'}
        />
        
        {/* Status Text */}
        <Text style={[styles.status, isLocal && styles.statusActive]}>
          {isLocal ? 'ON' : 'OFF'}
        </Text>
        
        {/* Loading Indicator */}
        {!isLocalModelReady && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.loadingText}>Loading model...</Text>
          </View>
        )}
        
        {/* Ready Indicator */}
        {isLocalModelReady && !isLocal && (
          <Text style={styles.readyText}>✓ Ready</Text>
        )}
      </View>

      {/* Info Text */}
      {isLocal && (
        <Text style={styles.info}>
          🔒 Messages stay on your device • Works offline
        </Text>
      )}
      
      {/* Stop Button (when generating) */}
      {isLocal && isLocalModelGenerating && (
        <TouchableOpacity
          style={styles.stopButton}
          onPress={interruptLocalGeneration}
          activeOpacity={0.7}
        >
          <Text style={styles.stopButtonText}>⏹ Stop Generation</Text>
        </TouchableOpacity>
      )}
      
      {/* Debug Info (DEV only) */}
      {__DEV__ && (
        <View style={styles.debug}>
          <Text style={styles.debugText}>
            Ready: {isLocalModelReady ? '✓' : '✗'} | 
            Generating: {isLocalModelGenerating ? '✓' : '✗'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  statusActive: {
    color: '#007AFF',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
  },
  readyText: {
    fontSize: 12,
    color: '#34C759',
    marginLeft: 8,
  },
  info: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  stopButton: {
    marginTop: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  debug: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default LocalModelTestToggle;

