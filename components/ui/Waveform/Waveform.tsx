import Colors from '@/constants/Colors';
import React, { useMemo, useState, useRef } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    UIManager,
    findNodeHandle,
    LayoutChangeEvent,
    GestureResponderEvent,
} from 'react-native';

interface WaveformProps {
    progress?: number;
    onSeek?: (newProgress: number) => void;
}

const Waveform: React.FC<WaveformProps> = ({ progress = 0, onSeek }) => {
    const waveData = useMemo<number[]>(() => {
        const barsCount = 30;
        const minHeight = 10;
        const maxHeight = 60;
        return Array.from({ length: barsCount }, () =>
            Math.floor(Math.random() * (maxHeight - minHeight) + minHeight)
        );
    }, []);

    const playedBarsCount = Math.round(waveData.length * progress);
    const [containerWidth, setContainerWidth] = useState<number>(0);
    const [containerLeft, setContainerLeft] = useState<number>(0);
    const containerRef = useRef<typeof Pressable>(null);

    const handleLayout = (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
        if (containerRef.current) {
            UIManager.measure(
                findNodeHandle(containerRef.current),
                (x, y, width, height, pageX) => {
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

    return (
        <Pressable onPress={handlePress} onLayout={handleLayout} ref={containerRef}>
            <View style={styles.waveContainer}>
                {waveData.map((height, index) => {
                    const barColor = index < playedBarsCount ? Colors.common.primary : Colors.common.greyLight;
                    return (
                        <View
                            key={index}
                            style={[styles.waveBar, { height, backgroundColor: barColor }]}
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
    },
    waveBar: {
        width: 3,
        marginHorizontal: 1,
        borderRadius: 2,
    },
});

export default Waveform;
