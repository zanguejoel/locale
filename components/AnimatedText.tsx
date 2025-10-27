import { Theme } from '@/constants/Types';
import { useTheme } from '@/hooks/useTheme';
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

interface IAnimatedText {
    text: string;
}

const AnimatedText = ({ text }: IAnimatedText) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    
    // Create animated value for shimmer/highlight effect
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Create continuous shimmer animation
        const animate = () => {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(shimmerAnim, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.linear,
                        useNativeDriver: false, // Can't use native driver for color interpolation
                    }),
                    Animated.timing(shimmerAnim, {
                        toValue: 0,
                        duration: 1500,
                        easing: Easing.linear,
                        useNativeDriver: false,
                    }),
                ])
            ).start();
        };
        
        animate();
    }, [shimmerAnim]);

    // Interpolate color for highlight effect
    const textColor = shimmerAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [
            theme.colors.textSecondary,
            theme.colors.text,
            theme.colors.textSecondary,
        ],
    });

    return (
        <View style={styles.container}>
            <Animated.Text style={[styles.text, { color: textColor }]}>
                {text}
            </Animated.Text>
        </View>
    );
};

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
    text: {
        fontSize: 13,
        fontWeight: '500',
    },
});

export default AnimatedText;
