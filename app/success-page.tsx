import React, { useState, useEffect, useRef } from "react";
import { defaultStyles } from "@/constants/Styles";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Image,
    SafeAreaView,
    Animated,
    Easing,
    Alert,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/constants/Types";


interface ErrorType {
    email?: string;
    code?: string
}

const SuccessPage = () => {
    const theme = useTheme();
    const styles = getStyles(theme);

    const [isLoading, setLoading] = useState(false);

    // Animation values
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    // Animations on mount. The user already has an active session here (email
    // OTP verification / password reset established it), so nothing to sign in.
    useEffect(() => {
        // Icon scale animation with bounce
        Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
        }).start();

        // Content fade and slide up
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                delay: 200,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                delay: 200,
                useNativeDriver: true,
                easing: Easing.out(Easing.ease),
            }),
        ]).start();
    }, []);

    const handleHome = async () => {
        setLoading(true);
        router.replace('/(chat)/new');
    }

    return (
        <View style={styles.container} >
            <SafeAreaView style={styles.content}>
                <View style={styles.headerContainer}>
                    <Image 
                      source={theme.isDark ? require('@/assets/images/Localelogodark.png') : require('@/assets/images/Localelogowhite.png')} 
                      style={styles.logo} 
                    />
                    
                    <Animated.View style={[
                        styles.successIconContainer,
                        { transform: [{ scale: scaleAnim }] }
                    ]}>
                      <View style={styles.successIconCircle}>
                        <Ionicons name="checkmark-circle" size={80} color={theme.colors.success} />
                      </View>
                    </Animated.View>
                    
                    <Animated.View style={[
                        styles.titleContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}>
                        <Text style={styles.title}>Success!</Text>
                        <Text style={styles.subtitle}>
                            Congratulations, your account has been successfully created.
                        </Text>
                    </Animated.View>

                </View>
                <Animated.View style={[
                    styles.formContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }
                ]}>
                    <View style={styles.btnContainer}>
                        <TouchableOpacity
                            style={[defaultStyles.btn, styles.continueButton]}
                            onPress={handleHome}
                            disabled={isLoading}
                        >
                            <Text style={styles.buttonText}>Continue to Locale</Text>
                            <Ionicons name="arrow-forward-outline" size={18} color={theme.colors.white} />
                        </TouchableOpacity>
                        <Text style={styles.autoLoginText}>You'll be signed in automatically</Text>
                    </View>
                </Animated.View>
            </SafeAreaView>
        </View>
    );
};

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        justifyContent: 'space-between',
        flex: 1,
    },
    headerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    successIconContainer: {
        marginVertical: 32,
    },
    successIconCircle: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    resendContainerTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    titleContainer: {
    },
    logo: {
        width: 180,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: "700",
        color: theme.colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    timerText: {
        fontSize: 13,
        marginLeft: 4,
        color: theme.colors.primary,
        textAlign: 'center',
        lineHeight: 22,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 16,
    },
    formContainer: {

        paddingHorizontal: 24,
    },
    errorText: {
        color: theme.colors.red,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 12,
    },
    btnContainer: {
        gap: 16,
        marginTop: 24,
    },
    continueButton: {
        height: 50,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
        flexDirection: 'row',
        gap: 8,
    },
    autoLoginText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: 8,
    },
    cancelButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Success screen styles
    successContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    successMessage: {
        fontSize: 16,
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.primary,
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 16,
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    returnButton: {
        height: 50,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
    },
    resendButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
});

export default SuccessPage;