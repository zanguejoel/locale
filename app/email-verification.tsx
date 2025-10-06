import React, { useState, useRef } from "react";
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
} from "react-native";

import { router, useLocalSearchParams } from "expo-router";
import CustomInput from "@/components/CustomInput";
import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/constants/Types";

interface ErrorType {
    email?: string;
    code?: string
}
const TIMER_DURATION = 60;

const EmailVerification = () => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const { isLoading, confirmEmail } = useAuth();
    const { email, password } = useLocalSearchParams();

    const [code, setCode] = useState("");
    const [error, setError] = useState<ErrorType>({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    // Input ref for keyboard navigation
    const codeInputRef = useRef<TextInput>(null);

    const handleConfirm = async () => {
        setIsSubmitted(true);

        try {
            await confirmEmail(decodeURIComponent(`${email}`), code, router, decodeURIComponent(`${password}`));
        } catch (err: any) {
            Alert.alert(
                "Error",
                err || "Failed to send reset instructions. Please try again."
            );
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <SafeAreaView>
                {isLoading && (
                    <View style={defaultStyles.loadingOverlay}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                    </View>
                )}

                <View style={styles.headerContainer}>
                    <Image source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')} style={styles.logo} />
                    <Text style={styles.title}>Email Verification</Text>
                    <Text style={styles.subtitle}>
                        A verification code has been sent to {email}.
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <CustomInput
                        ref={codeInputRef}
                        icon="code-outline"
                        placeholder="Enter your code"
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

                    <View style={styles.btnContainer}>
                        <TouchableOpacity
                            style={[defaultStyles.btn, styles.resetButton]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.buttonText}>Submit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[defaultStyles.btnSecondary, styles.cancelButton]}
                            onPress={() => router.replace('/login')}
                        >
                            <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                                Back to Login
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
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
        resizeMode: 'contain',
        height: 75,
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
});

export default EmailVerification;