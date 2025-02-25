import React, { useEffect, useState } from "react";
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
import Colors from "@/constants/Colors";
import { router, useLocalSearchParams } from "expo-router";
import CustomInput from "@/components/CustomInput";


interface ErrorType {
    email?: string;
    code?: string
}
const TIMER_DURATION = 60;

const EmailVerification = () => {
    const { isLoading, confirmEmail } = useAuth();
    const { email } = useLocalSearchParams();

    const [code, setCode] = useState("");
    const [error, setError] = useState<ErrorType>({});
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleResetPassword = async () => {
        setIsSubmitted(true);
        try {
            await confirmEmail(email, code, router);
        } catch (err: any) {
            Alert.alert(
                "Error",
                err.message || "Failed to send reset instructions. Please try again."
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
                        <ActivityIndicator size="large" color={Colors.primary} />
                    </View>
                )}

                <View style={styles.headerContainer}>
                    <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
                    <Text style={styles.title}>Email verification</Text>
                    <Text style={styles.subtitle}>
                        A verification code has been sent to your inbox.
                    </Text>
                </View>

                <View style={styles.formContainer}>
                    <CustomInput
                        icon="mail-outline"
                        placeholder="Enter your code"
                        value={code}
                        onChangeText={(text) => {
                            setCode(text);
                        }}
                        error={!!error.code}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                    />
                    {error.code && <Text style={styles.errorText}>{error.code}</Text>}

                    <View style={styles.btnContainer}>
                        <TouchableOpacity
                            style={[defaultStyles.btn, styles.resetButton]}
                            onPress={handleResetPassword}
                        >
                            <Text style={styles.buttonText}>Submit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[defaultStyles.btnSecondary, styles.cancelButton]}
                            onPress={() => router.replace('/login')}
                        >
                            <Text style={[styles.buttonText, { color: Colors.primary }]}>
                                Back to Login
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 40,
        paddingHorizontal: 24,
    },
    resendContainerTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    timerText: {
        fontSize: 13,
        marginLeft: 4,
        color: Colors.primary,
        textAlign: 'center',
        lineHeight: 22,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.grey,
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    errorText: {
        color: Colors.red,
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
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    cancelButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.primary,
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
        color: Colors.grey,
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 16,
        color: Colors.grey,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    returnButton: {
        height: 50,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    resendButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
});

export default EmailVerification;