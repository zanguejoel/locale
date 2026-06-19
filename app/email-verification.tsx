import React, { useState, useRef, useEffect } from "react";
import type { TextInput } from 'react-native';
import { useAuth } from "../hooks/useAuth";
import { defaultStyles } from "@/constants/Styles";
import {
    View,
    StyleSheet,
    Text,
    Alert,
    ActivityIndicator,
    TouchableOpacity,
    KeyboardAvoidingView,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    TouchableWithoutFeedback,
    Keyboard,
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import CustomInput from "@/components/CustomInput";
import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/constants/Types";
import { GradientBackground } from "@/components/GradientBackground";
import { GlassCard } from "@/components/GlassSurface";

interface ErrorType {
    email?: string;
    code?: string
}
const TIMER_DURATION = 60;

const EmailVerification = () => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { isLoading, confirmEmail } = useAuth();
    const params = useLocalSearchParams();
    const email = (params.email as string) || '';

    const [code, setCode] = useState("");
    const [error, setError] = useState<ErrorType>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Input ref for keyboard navigation
    const codeInputRef = useRef<TextInput>(null);

    // Guard: no email param means we got here without a valid signup flow.
    useEffect(() => {
        if (!email) {
            Alert.alert(
                "Invalid Session",
                "No email found. Please register again.",
                [{ text: "OK", onPress: () => router.replace('/registration') }]
            );
        }
    }, [email]);

    const handleConfirm = async () => {
        setIsSubmitted(true);

        if (!email) {
            Alert.alert("Error", "Email not available. Please try again.");
            return;
        }

        try {
            await confirmEmail(email, code, router, '');
        } catch (err: any) {
            // Extract meaningful error message
            let errorMessage = "Failed to verify email. Please try again.";
            
            if (typeof err === 'string') {
                errorMessage = err;
            } else if (err?.message) {
                errorMessage = err.message;
            } else if (err?.detail) {
                errorMessage = err.detail;
            }
            
            Alert.alert("Verification Failed", errorMessage);
        }
    };

    return (
        <GradientBackground variant="background" style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.keyboardView}
                keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
            >
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <ScrollView
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {isLoading && (
                            <View style={[defaultStyles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
                                <ActivityIndicator size="large" color={theme.colors.primary} />
                                <Text style={styles.loadingText}>Verifying...</Text>
                            </View>
                        )}

                        <View style={styles.headerContainer}>
                            <Image source={theme.isDark ? require('@/assets/images/Localelogodark.png') : require('@/assets/images/Localelogowhite.png')} style={styles.logo} />
                            <Text style={styles.title}>Email Verification</Text>
                            <Text style={styles.subtitle}>
                                {email
                                    ? `A verification code has been sent to ${email}.`
                                    : "Loading..."}
                            </Text>
                        </View>

                        <View style={styles.formContainer}>
                        <GlassCard style={styles.formCard}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Verification Code</Text>
                                <CustomInput
                                    ref={codeInputRef}
                                    icon="code-outline"
                                    placeholder="Enter 6-digit code"
                                    value={code}
                                    onChangeText={(text) => {
                                        setCode(text);
                                    }}
                                    error={!!error.code}
                                    autoCapitalize="none"
                                    keyboardType="numeric"
                                    returnKeyType="go"
                                    onSubmitEditing={handleConfirm}
                                    blurOnSubmit={true}
                                    autoFocus={true}
                                />
                                {error.code && <Text style={styles.errorText}>{error.code}</Text>}
                            </View>

                            <View style={styles.btnContainer}>
                                <TouchableOpacity
                                    style={[defaultStyles.btn, styles.resetButton]}
                                    onPress={handleConfirm}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.buttonText}>Submit</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[defaultStyles.btnSecondary, styles.cancelButton]}
                                    onPress={() => {
                                        Keyboard.dismiss();
                                        router.replace('/login');
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                                        Back to Login
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </GlassCard>
                        </View>
                    </ScrollView>
                </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
        </SafeAreaView>
        </GradientBackground>
    );
};

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
    },
    headerContainer: {
        alignItems: 'center',
        marginTop: 80,
        marginBottom: 50,
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    resendContainerTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    logo: {
        width: 180,
        height: 100,
        resizeMode: 'contain',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: "600",
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
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 24,
        opacity: 0.8,
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    formCard: {
        borderRadius: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginBottom: 2,
        marginLeft: 4,
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
    resetButton: {
        height: 50,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
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
        color: theme.colors.light,
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
    loadingText: {
        marginTop: 12,
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
    },
});

export default EmailVerification;