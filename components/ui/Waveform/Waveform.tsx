import Colors from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { Role } from '@/utils/Interfaces';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    UIManager,
    findNodeHandle,
    LayoutChangeEvent,
    GestureResponderEvent,
    Animated,
} from 'react-native';

interface WaveformProps {
    progress?: number;
    onSeek?: (newProgress: number) => void;
    isPlaying?: boolean;
    role?: Role;
}

const Waveform: React.FC<WaveformProps> = ({ 
    progress = 0, 
    onSeek, 
    isPlaying = false,
    role = Role.Bot 
}) => {
    const theme = useTheme();
    
    const waveData = useMemo<number[]>(() => {
        const barsCount = 35;
        const minHeight = 8;
        const maxHeight = 36;
        return Array.from({ length: barsCount }, () =>
            Math.floor(Math.random() * (maxHeight - minHeight) + minHeight)
        );
    }, []);

    const playedBarsCount = Math.round(waveData.length * progress);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [containerLeft, setContainerLeft] = useState<number>(0);
    const containerRef = useRef<View>(null);
    
    // Animated values for each bar
    const barAnimations = useRef(
        waveData.map(() => new Animated.Value(1))
    ).current;

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
        if (containerRef.current) {
            UIManager.measure(
                findNodeHandle(containerRef.current) as any,
                (x: any, y: any, width: any, height: any, pageX: any) => {
                    setContainerLeft(pageX);
                }
            );
        }
    };

    const handlePress = (event: GestureResponderEvent) => {
        if (containerWidth > 0 && onSeek) {
            const { pageX } = event.nativeEvent;
            const relativeX = pageX - containerLeft;
            const newProgress = Math.min(1, Math.max(0, relativeX / containerWidth));
            onSeek(newProgress);
        }
    };

    // Animate bars when playing
    useEffect(() => {
        if (isPlaying) {
            const animations = barAnimations.map((anim, index) => {
                return Animated.loop(
                    Animated.sequence([
                        Animated.timing(anim, {
                            toValue: 1.2 + Math.random() * 0.3,
                            duration: 400 + Math.random() * 200,
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 400 + Math.random() * 200,
                            useNativeDriver: true,
                        }),
                    ])
                );
            });

            animations.forEach((anim, index) => {
                // Stagger the start times for a wave effect
                setTimeout(() => anim.start(), index * 20);
            });

            return () => {
                animations.forEach(anim => anim.stop());
            };
        } else {
            barAnimations.forEach(anim => anim.setValue(1));
        }
    }, [isPlaying, barAnimations]);

    return (
        <Pressable onPress={handlePress} onLayout={handleLayout} ref={containerRef}>
            <View style={styles.waveContainer}>
                {waveData.map((height, index) => {
                    const isPlayed = index < playedBarsCount;
                    const barColor = isPlayed 
                        ? (role === Role.User ? 'rgba(255, 255, 255, 0.9)' : theme.colors.primary)
                        : (role === Role.User ? 'rgba(255, 255, 255, 0.3)' : theme.colors.mutedForeground);
                    
                    // Create gradient effect - bars near playback position are brighter
                    const distanceFromPlayback = Math.abs(index - playedBarsCount);
                    const proximityOpacity = Math.max(0.3, 1 - (distanceFromPlayback / 8));
                    const opacity = isPlayed ? 1 : proximityOpacity * 0.4;
                    
                    return (
                        <Animated.View
                            key={index}
                            style={[
                                styles.waveBar, 
                                { 
                                    height,
                                    backgroundColor: barColor,
                                    opacity,
                                    transform: [{ scaleY: barAnimations[index] }]
                                }
                            ]}
                        />
                    );
                })}
            </View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    waveContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
        gap: 2,
    },
    waveBar: {
        width: 3,
        borderRadius: 3,
        minHeight: 4,
    },
});

export default Waveform;
