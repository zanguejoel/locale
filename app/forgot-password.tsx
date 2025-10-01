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
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import { useTheme } from '@/hooks/useTheme';

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


  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setInterval(() => {
        setResendTimer(prev => (prev > 1 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendTimer]);

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
    // e.preventDefault();
    setIsSubmitted(true);

    if (validateEmail()) {
      try {
        setResendTimer(TIMER_DURATION);

        const res = await forgotPassword(email);
        if (res?.ok) {
          setResetSent(true)
        } else {
          Alert.alert(
            "Error",
            res?.data?.detail || "Failed to send . Please try again."
          );
        }
      } catch (err: any) {
        setError({ code: err })
        Alert.alert(
          "Error",
          err || "Failed to send reset instructions. Please try again."
        );
      }
    }
  };

  const handleValidCode = async (e: any) => {
    // e.preventDefault();
    if (!code) {
      setError({ code: "Code is required" });
      return;
    }

    try {
      const recaptchaToken = "It2wh;Wcj&pkgdD4X2'~6@6FmpqLr1";
      const result = await resetPassword(email, code, recaptchaToken);
        // alert(JSON.stringify(result?.data));
      if (result?.data) {
      
        // Code validated successfully, navigate to password change page
        router.replace(`/forgot-password-change?email=${encodeURIComponent(email)}&token=${encodeURIComponent(result?.data?.detail?.token)}`);
      }
    } catch (err: any) {
      setError({ code: err });
      Alert.alert(
        "Error",
        err?.message || err || "Invalid code. Please try again."
      );
    }
  }

  if (resetSent) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.successContainer}>
          <Image
            source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>Check Your Email</Text>
          <Text style={[styles.successMessage, { color: theme.colors.text }]}>
            We've sent verification code to:
          </Text>
          <Text style={[styles.emailText, { color: theme.colors.primary }]}>{email}</Text>
          <CustomInput
            icon="code-outline"
            placeholder="Enter your code"
            value={code}
            onChangeText={(text) => {
              setCode(text);
            }}
            error={!!error.code}
            autoCapitalize="none"
            keyboardType="numeric"
          />
          <View style={styles.btnContainer}>
            <TouchableOpacity
              style={[defaultStyles.btn, styles.returnButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleValidCode}
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
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView>
        {isLoading && (
          <View style={[defaultStyles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}

        <View style={styles.headerContainer}>
          <Image
            source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Enter your email address to receive verification code
          </Text>
        </View>

        <View style={styles.formContainer}>
          <CustomInput
            icon="mail-outline"
            placeholder="Enter your email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (isSubmitted) validateEmail();
            }}
            error={!!error.email}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          {error.email && <Text style={[styles.errorText, { color: theme.colors.red }]}>{error.email}</Text>}

          <View style={styles.btnContainer}>
            <TouchableOpacity
              style={[defaultStyles.btn, styles.resetButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => handleResetPassword()}
            >
              <Text style={styles.buttonText}>Send Reset Code</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[defaultStyles.btnSecondary, styles.cancelButton, { borderColor: theme.colors.primary }]}
              onPress={() => router.back()}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
});

export default ForgotPassword;