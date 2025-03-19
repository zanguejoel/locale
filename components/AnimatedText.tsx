import React, { useEffect, useMemo } from 'react';
import { View, Animated, StyleSheet, Easing } from 'react-native';

interface IAnimatedText {
    text: string;
}

const AnimatedText = ({ text }: IAnimatedText) => {

    const animatedValues = useMemo(
        () => text.split('').map(() => new Animated.Value(0)),
        [text]
    );

    useEffect(() => {
        animatedValues.forEach((anim, index) => {
            const animate = () => {
                Animated.sequence([
                    Animated.timing(anim, {
                        toValue: 1,
                        duration: 900,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                    Animated.timing(anim, {
                        toValue: 0,
                        duration: 900,
                        easing: Easing.inOut(Easing.sin),
                        useNativeDriver: true,
                    }),
                ]).start(() => animate());
            };

            setTimeout(animate, index * 100);
        });
    }, [animatedValues]);

    return (
        <View style={styles.container}>
            {text.split('').map((letter, index) => {
                const translateY = animatedValues[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 1],
                });
                return (
                    <Animated.Text
                        key={index}
                        style={[styles.letter, { transform: [{ translateY }] }]}
                    >
                        {letter}
                    </Animated.Text>
                );
            })}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
    },
    letter: {
        fontSize: 12,
    },
});

export default AnimatedText;
