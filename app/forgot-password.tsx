import React, { useEffect, useState, useRef } from "react";
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
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import { useTheme } from '@/hooks/useTheme';
import { createSecureSession, clearSecureSession } from "@/utils/SecureSession";

interface ErrorType {
  email?: string;
  code?: string
}
const TIMER_DURATION = 60;

const ForgotPassword = () => {
  const { isLoading, forgotPassword, resetPassword } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<ErrorType>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [code, setCode] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Input refs for keyboard navigation
  const emailInputRef = useRef<TextInput>(null);
  const codeInputRef = useRef<TextInput>(null);


  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer(prev => (prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

  // Keyboard visibility listeners
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  const validateEmail = () => {
    if (!email) {
      setError({ email: "Email is required" });
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError({ email: "Email is invalid" });
      return false;
    }
    setError({});
    return true;
  };

  const handleResetPassword = async () => {
    // Dismiss keyboard
    Keyboard.dismiss();
    
    // e.preventDefault();
    setIsSubmitted(true);

    if (validateEmail()) {
      try {
        setResendTimer(TIMER_DURATION);

        const res = await forgotPassword(email);
        if (res?.ok) {
          setResetSent(true)
        } else {
          // Extract meaningful error message
          let errorMessage = "Failed to send reset code. Please try again.";
          
          if (res?.data?.detail) {
            errorMessage = res.data.detail;
          } else if (res?.data?.message) {
            errorMessage = res.data.message;
          } else if (res?.problem) {
            if (res.problem === 'NETWORK_ERROR') {
              errorMessage = 'Network error. Please check your internet connection.';
            } else if (res.problem === 'TIMEOUT_ERROR') {
              errorMessage = 'Request timed out. Please try again.';
            } else if (res.problem === 'CONNECTION_ERROR') {
              errorMessage = 'Unable to connect to server. Please try again.';
            } else {
              errorMessage = `Failed to send reset code: ${res.problem}`;
            }
          }
          
          // Check for specific errors
          if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('does not exist')) {
            Alert.alert(
              "Email Not Found",
              "This email is not registered. Please check your email or create a new account.",
              [
                { text: "Try Again", style: "default" },
                { text: "Sign Up", onPress: () => router.replace('/registration'), style: "cancel" }
              ]
            );
          } else {
            Alert.alert("Reset Code Failed", errorMessage);
          }
        }
      } catch (err: any) {
        // Extract meaningful error message
        let errorMessage = "Failed to send reset instructions. Please try again.";
        
        if (typeof err === 'string') {
          errorMessage = err;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        setError({ code: errorMessage });
        Alert.alert("Error", errorMessage);
      }
    }
  };

  const handleValidCode = async (e: any) => {
    // Dismiss keyboard
    Keyboard.dismiss();
    
    // e.preventDefault();
    if (!code) {
      setError({ code: "Code is required" });
      return;
    }

    try {
      const result = await resetPassword(email, code);
      
      if (result?.data) {
        // Code validated successfully, create secure session and navigate
        const sessionId = await createSecureSession({
          email,
          token: result?.data?.detail?.token,
          codeVerified: true
        });
        
        router.replace(`/forgot-password-change?session=${sessionId}`);
      } else {
        Alert.alert(
          "Verification Failed",
          "Unable to verify code. Please try again."
        );
      }
    } catch (err: any) {
      // Extract meaningful error message
      let errorMessage = "Invalid code. Please try again.";
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
        
        // Provide specific error messages
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('code')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        } else if (errorMessage.toLowerCase().includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        }
      }
      
      setError({ code: errorMessage });
      Alert.alert("Verification Failed", errorMessage);
    }
  }

  if (resetSent) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <ScrollView
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.successContainer, keyboardVisible && styles.successContainerCompact]}>
                <Image
                  source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
                  style={[styles.logo, keyboardVisible && styles.logoCompact]}
                />
                <Text style={[styles.title, { color: theme.colors.text }]}>Check Your Email</Text>
                <Text style={[styles.successMessage, { color: theme.colors.text }]}>
                  We've sent verification code to:
                </Text>
                <Text style={[styles.emailText, { color: theme.colors.primary }]}>{email}</Text>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Verification Code</Text>
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
                  containerStyle={{width: '100%'}}
                  onSubmitEditing={handleValidCode}
                  blurOnSubmit={true}
                  autoFocus={true}
                />
                </View>
                <View style={styles.btnContainer}>
                  <TouchableOpacity
                    style={[defaultStyles.btn, styles.returnButton, { backgroundColor: theme.colors.primary }]}
                    onPress={handleValidCode}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.buttonText}>Confirm</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={resendTimer > 0}
                    style={[
                      defaultStyles.btnSecondary,
                      styles.resendButton,
                      {
                        borderColor: resendTimer > 0 ? theme.colors.greyLight : theme.colors.primary
                      }
                    ]}
                    onPress={handleResetPassword}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.buttonText,
                      {
                        color: resendTimer > 0 ? theme.colors.greyLight : theme.colors.primary
                      }
                    ]}>
                      Resend code
                    </Text>
                  </TouchableOpacity>
                </View>
                {resendTimer > 0 && (
                  <View style={styles.resendContainerTimer}>
                    <Text style={{ color: resendTimer > 0 ? theme.colors.greyLight : theme.colors.primary }}>
                      Resend the code
                    </Text>
                    <Text style={[styles.timerText, { color: theme.colors.primary }]}>{resendTimer}s</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {isLoading && (
              <View style={[defaultStyles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Sending reset code...</Text>
              </View>
            )}

            <View style={[styles.headerContainer, keyboardVisible && styles.headerContainerCompact]}>
              <Image
                source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
                style={[styles.logo, keyboardVisible && styles.logoCompact]}
              />
              <Text style={[styles.title, { color: theme.colors.text }]}>Forgot Password?</Text>
              <Text style={[styles.subtitle, { color: theme.colors.text }]}>
                Enter your email address to receive verification code
              </Text>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Email Address</Text>
                <CustomInput
                  ref={emailInputRef}
                  icon="mail-outline"
                  placeholder="you@example.com"
                  value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (isSubmitted) validateEmail();
                }}
                error={!!error.email}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                returnKeyType="send"
                onSubmitEditing={handleResetPassword}
                blurOnSubmit={true}
                autoFocus={true}
              />
              {error.email && <Text style={[styles.errorText, { color: theme.colors.red }]}>{error.email}</Text>}
              </View>

              <View style={styles.btnContainer}>
                <TouchableOpacity
                  style={[defaultStyles.btn, styles.resetButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => handleResetPassword()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.buttonText}>Send Reset Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[defaultStyles.btnSecondary, styles.cancelButton, { borderColor: theme.colors.primary }]}
                  onPress={() => router.back()}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.buttonText, { color: theme.colors.primary }]}>
                    Back to Login
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
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
  headerContainerCompact: {
    marginTop: 40,
    marginBottom: 30,
    paddingVertical: 10,
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
  logoCompact: {
    width: 140,
    height: 80,
    marginBottom: 15,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 13,
    marginLeft: 4,
    textAlign: 'center',
    lineHeight: 22,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
    marginLeft: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  btnContainer: {
    gap: 16,
    width: '100%',
    marginTop: 24,
  },
  resetButton: {
    height: 50,
    borderRadius: 12,
  },
  cancelButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
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
    paddingTop: 80,
    paddingVertical: 20,
  },
  successContainerCompact: {
    paddingTop: 40,
    paddingVertical: 10,
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  returnButton: {
    height: 50,
    borderRadius: 12,
  },
  resendButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: Colors.common.grey,
  },
});

export default ForgotPassword;