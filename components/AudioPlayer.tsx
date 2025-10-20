import React, { useEffect, useRef } from 'react';
import { View, Pressable, StyleSheet, Platform, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Waveform from './ui/Waveform/Waveform';
import { Role } from '@/utils/Interfaces';
import Colors from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { LinearGradient } from 'expo-linear-gradient';

interface AudioPlayerProps {
    handleSeek: (progress: number) => void;
    duration: number;
    position: number;
    handlePress: () => void;
    onLongPress?: () => void;
    role: Role;
    playAudio: () => void;
    isPlaying: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    handleSeek,
    duration,
    position,
    handlePress,
    onLongPress,
    role,
    playAudio,
    isPlaying,
}) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const progress = duration > 0 ? position / duration : 0;

    // Format time as MM:SS
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Pulse animation for playing state
    useEffect(() => {
        if (isPlaying) {
            const animation = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            );
            animation.start();
            return () => animation.stop();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isPlaying, pulseAnim]);

    return (
        <Pressable
            onLongPress={onLongPress}
            onPress={handlePress}
            style={[
                styles.contentContainer,
                role === Role.Bot ? styles.botContent : styles.userContent,
            ]}
            accessible
            accessibilityLabel={`${role === Role.Bot ? 'Assistant' : 'Your'} audio message`}
            accessibilityRole="button"
            testID="audio-player-container"
        >
            {/* Play/Pause Button with modern circular design */}
            <Pressable 
                style={styles.playButtonContainer} 
                onPress={playAudio} 
                testID="audio-play-button"
            >
                <Animated.View style={[
                    styles.playButton,
                    role === Role.User && styles.playButtonUser,
                    { transform: [{ scale: pulseAnim }] }
                ]}>
                    {!isPlaying ? (
                        <Ionicons 
                            name="play" 
                            size={20} 
                            color={role === Role.User ? '#FFFFFF' : theme.colors.primary} 
                            style={styles.playIcon}
                        />
                    ) : (
                        <Ionicons 
                            name="pause" 
                            size={20} 
                            color={role === Role.User ? '#FFFFFF' : theme.colors.primary} 
                        />
                    )}
                </Animated.View>
            </Pressable>

            {/* Waveform and duration container */}
            <View style={styles.waveformContainer}>
                <Waveform 
                    onSeek={handleSeek} 
                    progress={progress} 
                    isPlaying={isPlaying}
                    role={role}
                />
                <View style={styles.durationContainer}>
                    <Text style={[
                        styles.durationText,
                        role === Role.User && styles.durationTextUser
                    ]}>
                        {formatTime(position)} / {formatTime(duration)}
                    </Text>
                </View>
            </View>
        </Pressable>
    );
};

export default AudioPlayer;

const getStyles = (theme: Theme) => StyleSheet.create({
    contentContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 14,
        minWidth: 260,
        maxWidth: 320,
        gap: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    botContent: {
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    },
    userContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
    },
    playButtonContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
    },
    playButtonUser: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    playIcon: {
        marginLeft: 2, // Optical alignment for play icon
    },
    waveformContainer: {
        flex: 1,
        gap: 8,
    },
    durationContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    durationText: {
        fontSize: 11,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        opacity: 0.8,
        fontVariant: ['tabular-nums'],
        letterSpacing: 0.3,
    },
    durationTextUser: {
        color: 'rgba(255, 255, 255, 0.9)',
    },
});
