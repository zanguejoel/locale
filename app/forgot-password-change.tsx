import React, { useState } from "react";
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

interface ErrorType {
  email?: string;
  code?: string
}

const ForgotPasswordChange = () => {
  const { isLoading, handleForgotPasswordChange } = useAuth();
  const theme = useTheme();
  const styles = getStyles(theme);

  const [error, setError] = useState<ErrorType>({});
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmNewPassword: false,
  });

  const { email } = useLocalSearchParams();


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
    if (formData.newPassword !== formData.confirmNewPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    try {
      setLoading(true);
      await handleForgotPasswordChange(
        email,
        formData.newPassword,
        router
      );
    } catch (err: any) {
      Alert.alert("Error", getErrorMessage(err));

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
            source={theme.isDark ? require('@/assets/images/Jaiimelogodark.png') : require('@/assets/images/Jaiimelogowhite.png')}
            style={styles.logo}
          />
          <Text style={[styles.title, { color: theme.colors.text }]}>Forgot Password?</Text>
          <Text style={[styles.subtitle, { color: theme.colors.text }]}>
            Enter your email address to receive password reset instructions
          </Text>
        </View>

        <View style={styles.formContainer}>
          {passwordFields.map((field, index) => (
            <View key={index} style={styles.inputContainer}>
              <Text style={styles.inputLabel}>{field.label}</Text>
              <CustomInput
                icon="lock-closed-outline"
                style={styles.input}
                value={formData[field.key as keyof typeof formData]}
                onChangeText={(value) =>
                  handleInputChange(field.key as keyof typeof formData, value)
                }
                placeholder={field.placeholder}
                secureTextEntry={!showPassword[field.key as keyof typeof showPassword]}
                isPassword
              />
            </View>
          ))}
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
    marginTop: 60,
    marginBottom: 40,
    paddingHorizontal: 24,
  },
  logo: {
    width: 150,
    height: 75,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
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
    color: theme.colors.greyLight,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
});

export default ForgotPasswordChange;