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
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";

interface ErrorType {
  email?: string;
}
const TIMER_DURATION = 60;

const ForgotPassword = () => {
  const { isLoading, forgotPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<ErrorType>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const [resendTimer, setResendTimer] = useState(0);

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
    setIsSubmitted(true);

    if (validateEmail()) {
      try {
        setResendTimer(TIMER_DURATION);

        await forgotPassword(email);
        setResetSent(true);
      } catch (err: any) {
        Alert.alert(
          "Error",
          err.message || "Failed to send reset instructions. Please try again."
        );
      }
    }
  };

  if (resetSent) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.logo} />
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.successMessage}>
            We've sent password reset instructions to:
          </Text>
          <Text style={styles.emailText}>{email}</Text>
          <Text style={styles.instructionText}>
            Please check your email and follow the instructions to reset your password.
          </Text>

          <View style={styles.btnContainer}>
            <TouchableOpacity
              style={[defaultStyles.btn, styles.returnButton]}
              onPress={() => router.replace('/login')}
            >
              <Text style={styles.buttonText}>Return to Login</Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={resendTimer > 0}
              style={[defaultStyles.btnSecondary, styles.resendButton, { borderColor: resendTimer > 0 ? 'gray' : Colors.primary }]}
              onPress={handleResetPassword}
            >
              <Text style={[styles.buttonText, { color: resendTimer > 0 ? 'gray' : Colors.primary }]}>
                Resend Email
              </Text>
            </TouchableOpacity>
          </View>
          {resendTimer > 0 && (
            <View style={styles.resendContainerTimer}>
              <Text style={{ color: resendTimer > 0 ? 'gray' : Colors.primary }}>
                Resend the code
              </Text>
              <Text style={styles.timerText}>{resendTimer}s</Text>
            </View>

          )}
        </View>
      </View>
    );
  }

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
          <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.logo} />
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your email address to receive password reset instructions
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
          {error.email && <Text style={styles.errorText}>{error.email}</Text>}

          <View style={styles.btnContainer}>
            <TouchableOpacity
              style={[defaultStyles.btn, styles.resetButton]}
              onPress={handleResetPassword}
            >
              <Text style={styles.buttonText}>Send Reset Instructions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[defaultStyles.btnSecondary, styles.cancelButton]}
              onPress={() => router.back()}
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
    width: 150,
    height: 75,
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

export default ForgotPassword;