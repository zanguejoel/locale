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
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import CustomInput from "@/components/CustomInput";
import { useTheme } from '@/hooks/useTheme';
import { getErrorMessage } from "@/utils/ErrorValidation";
import { Theme } from "@/constants/Types";
import { getSecureSession, clearSecureSession } from "@/utils/SecureSession";

interface ErrorType {
  email?: string;
  token?: string
}

const ForgotPasswordChange = () => {
  const { isLoading, handleForgotPasswordChange } = useAuth();
  const theme = useTheme();
  const styles = getStyles(theme);

  const [error, setError] = useState<ErrorType>({});
  const [loading, setLoading] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [sessionError, setSessionError] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmNewPassword: false,
  });

  const { session } = useLocalSearchParams();
  
  // Input refs for keyboard navigation
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Load session data on mount
  useEffect(() => {
    const loadSession = async () => {
      if (session) {
        const data = await getSecureSession(session as string);
        if (data) {
          setSessionData(data);
        } else {
          setSessionError(true);
          Alert.alert(
            "Session Expired",
            "Your reset session has expired. Please request a new password reset code.",
            [{ text: "OK", onPress: () => router.replace('/forgot-password') }]
          );
        }
      } else {
        setSessionError(true);
        Alert.alert(
          "Invalid Session",
          "No session found. Please request a password reset code.",
          [{ text: "OK", onPress: () => router.replace('/forgot-password') }]
        );
      }
    };
    loadSession();
  }, [session]);


  const passwordFields = [
    { label: "New Password", key: "newPassword", placeholder: "Enter new password" },
    { label: "Confirm New Password", key: "confirmNewPassword", placeholder: "Confirm new password" },
  ];

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSavePassword = async () => {
    // Validate passwords match
    if (formData.newPassword !== formData.confirmNewPassword) {
      Alert.alert("Passwords Don't Match", "New passwords do not match. Please try again.");
      return;
    }
    
    // Validate password strength
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(formData.newPassword)) {
      Alert.alert(
        "Weak Password",
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character."
      );
      return;
    }
    
    // Check session data
    if (!sessionData?.email || !sessionData?.token) {
      Alert.alert(
        "Session Error",
        "Session data not available. Please request a new password reset.",
        [{ text: "OK", onPress: () => router.replace('/forgot-password') }]
      );
      return;
    }
    
    try {
      setLoading(true);
      await handleForgotPasswordChange(
        sessionData.email,
        sessionData.token,
        formData.newPassword,
        router 
      );
      
      // Clear the session after successful password change
      if (session) {
        await clearSecureSession(session as string);
      }
    } catch (err: any) {
      // Extract meaningful error message
      let errorMessage = "Failed to reset password. Please try again.";
      
      if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      } else {
        errorMessage = getErrorMessage(err);
      }
      
      // Provide specific error messages
      if (errorMessage.toLowerCase().includes('token') && errorMessage.toLowerCase().includes('expired')) {
        Alert.alert(
          "Reset Link Expired",
          "Your password reset link has expired. Please request a new one.",
          [{ text: "Request New Reset", onPress: () => router.replace('/forgot-password') }]
        );
      } else if (errorMessage.toLowerCase().includes('network')) {
        Alert.alert("Network Error", "Please check your internet connection and try again.");
      } else {
        Alert.alert("Password Reset Failed", errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };


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
          <Text style={[styles.title, { color: theme.colors.text }]}>Reset Password</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Enter your new password below
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>New Password</Text>
            <CustomInput
              ref={newPasswordRef}
              icon="lock-closed-outline"
              autoComplete="off"
              style={styles.input}
              value={formData.newPassword}
              onChangeText={(value) => handleInputChange("newPassword", value)}
              placeholder="Enter new password"
              isPassword
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              blurOnSubmit={false}
              autoFocus={true}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Confirm New Password</Text>
            <CustomInput
              ref={confirmPasswordRef}
              icon="lock-closed-outline"
              autoComplete="off"
              style={styles.input}
              value={formData.confirmNewPassword}
              onChangeText={(value) => handleInputChange("confirmNewPassword", value)}
              placeholder="Confirm new password"
              isPassword
              returnKeyType="done"
              onSubmitEditing={handleSavePassword}
              blurOnSubmit={true}
            />
          </View>
          {error.email && <Text style={[styles.errorText, { color: theme.colors.red }]}>{error.email}</Text>}

          <View style={styles.btnContainer}>
            <TouchableOpacity
              style={[defaultStyles.btn, styles.resetButton, { backgroundColor: theme.colors.primary }]}
              onPress={handleSavePassword}
            >
              <Text style={styles.buttonText}>Confirm</Text>
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

const getStyles = (theme: Theme) => StyleSheet.create({
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
  logo: {
    width: 180,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: 'center',
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
  safeArea: {
    flex: 1,
    marginBottom: 80,
    backgroundColor: theme.colors.background,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
});

export default ForgotPasswordChange;