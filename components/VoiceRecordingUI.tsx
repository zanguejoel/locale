/**
 * Voice Recording UI Component
 * Enhanced recording interface with waveform, timer, and slide-to-cancel
 */

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { Ionicons } from '@expo/vector-icons';

interface VoiceRecordingUIProps {
  isRecording: boolean;
  onCancel: () => void;
}

export const VoiceRecordingUI: React.FC<VoiceRecordingUIProps> = ({
  isRecording,
  onCancel,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [seconds, setSeconds] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Timer
  useEffect(() => {
    if (!isRecording) {
      setSeconds(0);
      setWaveformData([]);
      return;
    }

    const interval = setInterval(() => {
      setSeconds(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Animate in/out
  useEffect(() => {
    if (isRecording) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 10,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isRecording, slideAnim, fadeAnim]);

  // Simulated waveform (in real app, get from audio recorder)
  useEffect(() => {
    if (!isRecording) return;

    const interval = setInterval(() => {
      setWaveformData(prev => {
        const newData = [...prev, Math.random() * 40 + 10];
        // Keep last 30 bars
        return newData.slice(-30);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  // Format time as MM:SS
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Pan responder for slide to cancel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Slid left more than 50px - cancel
          onCancel();
        }
      },
    })
  ).current;

  if (!isRecording) return null;

  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [100, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents={isRecording ? 'auto' : 'none'}
      {...panResponder.panHandlers}
    >
      {/* Recording indicator */}
      <View style={styles.header}>
        <View style={styles.recordingIndicator}>
          <Ionicons name="mic" size={20} color="#fff" />
          <Text style={styles.recordingText}>Recording...</Text>
        </View>
        <Text style={styles.timer}>{formatTime(seconds)}</Text>
      </View>

      {/* Waveform visualization */}
      <View style={styles.waveformContainer}>
        {waveformData.map((height, index) => (
          <Animated.View
            key={index}
            style={[
              styles.waveformBar,
              {
                height,
                opacity: 0.3 + (index / waveformData.length) * 0.7,
              },
            ]}
          />
        ))}
      </View>

      {/* Slide to cancel hint */}
      <View style={styles.footer}>
        <Ionicons name="chevron-back" size={16} color={theme.colors.textSecondary} />
        <Text style={styles.cancelHint}>Slide to cancel</Text>
      </View>
    </Animated.View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 10,
    left: 16,
    right: 16,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  recordingText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timer: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    fontVariant: ['tabular-nums'],
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 60,
    gap: 3,
    marginBottom: 12,
  },
  waveformBar: {
    width: 3,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cancelHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
});

export default VoiceRecordingUI;

