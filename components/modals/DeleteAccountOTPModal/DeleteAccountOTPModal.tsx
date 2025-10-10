import Colors from "@/constants/Colors";
import { Theme } from "@/constants/Types";
import { useTheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useEffect } from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View, ScrollView } from "react-native";

interface IDeleteAccountOTPModalProps {
    isModalVisible: boolean;
    setIsModalVisible: (visible: boolean) => void;
    onConfirm: () => void;
    otpCode: string[];
    setOtpCode: (code: string[]) => void;
    isDeleting: boolean;
    userEmail: string;
    onResendCode: () => void;
    resendCooldown: number;
}

const DeleteAccountOTPModal = ({ 
    isModalVisible, 
    setIsModalVisible, 
    onConfirm,
    otpCode,
    setOtpCode,
    isDeleting,
    userEmail,
    onResendCode,
    resendCooldown
}: IDeleteAccountOTPModalProps) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const inputRefs = useRef<(TextInput | null)[]>([]);

    // Auto-focus first input when modal opens
    useEffect(() => {
        if (isModalVisible) {
            setTimeout(() => inputRefs.current[0]?.focus(), 300);
        }
    }, [isModalVisible]);

    const handleOtpChange = (index: number, value: string) => {
        // Only allow single digit
        if (value.length > 1) {
            value = value.slice(-1);
        }
        
        // Only allow numbers
        if (!/^\d*$/.test(value)) {
            return;
        }

        const newOtp = [...otpCode];
        newOtp[index] = value;
        setOtpCode(newOtp);

        // Auto-focus to next input if value is entered
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyPress = (index: number, key: string) => {
        if (key === 'Backspace' && !otpCode[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleClose = () => {
        if (!isDeleting) {
            setIsModalVisible(false);
            setOtpCode(['', '', '', '', '', '']);
        }
    };

    const isOtpComplete = otpCode.every(digit => digit !== '');

    return (
        <Modal
            visible={isModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={handleClose}
        >
            <View style={styles.modalBackground}>
                <View style={styles.modalContent}>
                    {/* Header with Lock Icon */}
                    <View style={styles.modalHeader}>
                        <View style={styles.lockIconContainer}>
                            <Text style={styles.lockEmoji}>🔐</Text>
                        </View>
                        <Text style={styles.modalTitle}>Verify Account Deletion</Text>
                        <TouchableOpacity
                            onPress={handleClose}
                            style={styles.closeButton}
                            disabled={isDeleting}
                        >
                            <Ionicons name="close" size={24} color={theme.colors.greyLight} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {/* Description */}
                        <Text style={styles.descriptionText}>
                            We've sent a 6-digit verification code to your email address:
                        </Text>

                        {/* Email */}
                        <Text style={styles.emailText}>{userEmail}</Text>

                        <Text style={styles.instructionText}>
                            Please enter the code below to confirm and permanently delete your account.
                        </Text>

                        {/* OTP Input */}
                        <View style={styles.otpContainer}>
                            {otpCode.map((digit, index) => (
                                <TextInput
                                    key={index}
                                    ref={(ref) => { inputRefs.current[index] = ref; }}
                                    style={[
                                        styles.otpInput,
                                        digit && styles.otpInputFilled
                                    ]}
                                    value={digit}
                                    onChangeText={(value) => handleOtpChange(index, value)}
                                    onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                                    keyboardType="number-pad"
                                    maxLength={1}
                                    selectTextOnFocus
                                    editable={!isDeleting}
                                />
                            ))}
                        </View>

                        {/* Resend Code */}
                        <View style={styles.resendContainer}>
                            {resendCooldown > 0 ? (
                                <Text style={styles.cooldownText}>
                                    Resend code in {resendCooldown}s
                                </Text>
                            ) : (
                                <TouchableOpacity 
                                    onPress={onResendCode}
                                    disabled={isDeleting}
                                >
                                    <Text style={styles.resendText}>Resend verification code</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={handleClose}
                            disabled={isDeleting}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.button, 
                                styles.deleteButton,
                                (!isOtpComplete || isDeleting) && styles.deleteButtonDisabled
                            ]}
                            onPress={onConfirm}
                            disabled={!isOtpComplete || isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="trash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.deleteButtonText}>Delete My Account</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default React.memo(DeleteAccountOTPModal);

const getStyles = (theme: Theme) => StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 20,
    },
    lockIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    lockEmoji: {
        fontSize: 48,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: Colors.common.error,
    },
    closeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 4,
    },
    scrollView: {
        marginBottom: 16,
    },
    descriptionText: {
        fontSize: 14,
        color: theme.colors.greyLight,
        marginBottom: 8,
        lineHeight: 20,
    },
    emailText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
    },
    instructionText: {
        fontSize: 13,
        color: theme.colors.greyLight,
        marginBottom: 24,
        lineHeight: 18,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 8,
    },
    otpInput: {
        flex: 1,
        aspectRatio: 1,
        maxWidth: 50,
        borderWidth: 2,
        borderColor: theme.colors.greyLight,
        borderRadius: 12,
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        color: theme.colors.text,
        backgroundColor: theme.colors.background,
    },
    otpInputFilled: {
        borderColor: Colors.common.primary,
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    cooldownText: {
        fontSize: 13,
        color: theme.colors.greyLight,
    },
    resendText: {
        fontSize: 14,
        color: Colors.common.primary,
        fontWeight: '600',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    cancelButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.greyLight,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: Colors.common.error,
    },
    deleteButtonDisabled: {
        opacity: 0.5,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

