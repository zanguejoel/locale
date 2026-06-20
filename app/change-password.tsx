import { useAuth } from "@/hooks/useAuth";
import React, { useState, useRef } from "react";
import type { TextInput } from 'react-native';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";

import { getErrorMessage, VALIDATION_PATTERNS, VALIDATION_MESSAGES } from "@/utils/ErrorValidation";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/constants/Types";
import { GradientBackground } from "@/components/GradientBackground";
import { GlassCard } from "@/components/GlassSurface";

const ChangePassword = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [showPassword, setShowPassword] = useState({
    currentPassword: false,
    newPassword: false,
    confirmNewPassword: false,
  });
  
  // Input refs for keyboard navigation
  const currentPasswordRef = useRef<TextInput>(null);
  const newPasswordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);


  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const passwordFields = [
    { label: "Current Password", key: "currentPassword", placeholder: "Enter current password" },
    { label: "New Password", key: "newPassword", placeholder: "Enter new password" },
    { label: "Confirm New Password", key: "confirmNewPassword", placeholder: "Confirm new password" },
  ];

  const handleSavePassword = async () => {
    // Validate password format
    if (!VALIDATION_PATTERNS.PASSWORD.test(formData.newPassword)) {
      Alert.alert("Invalid Password", VALIDATION_MESSAGES.PASSWORD);
      return;
    }

    // Check if new password is same as old password
    if (formData.newPassword === formData.currentPassword) {
      Alert.alert("Error", VALIDATION_MESSAGES.PASSWORD_SAME_AS_OLD);
      return;
    }

    // Validate confirm password
    if (formData.newPassword !== formData.confirmNewPassword) {
      Alert.alert("Error", VALIDATION_MESSAGES.PASSWORDS_MATCH);
      return;
    }

    try {
      setLoading(true);
      await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmNewPassword,
      );
      Alert.alert("Success", "Password updated successfully");
      router.back()
    } catch (err: any) {
      Alert.alert("Error", getErrorMessage(err));

    } finally {
      setLoading(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.gradientWrapper}>
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.modalContainer}>
          <GlassCard style={styles.modalContent} borderRadius={20}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Current Password</Text>
              <CustomInput
                ref={currentPasswordRef}
                icon="lock-closed-outline"
                style={styles.input}
                value={formData.currentPassword}
                onChangeText={(value) => handleInputChange("currentPassword", value)}
                placeholder="Enter current password"
                isPassword
                returnKeyType="next"
                onSubmitEditing={() => newPasswordRef.current?.focus()}
                blurOnSubmit={false}
                autoFocus={true}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>New Password</Text>
              <CustomInput
                ref={newPasswordRef}
                icon="lock-closed-outline"
                style={styles.input}
                value={formData.newPassword}
                onChangeText={(value) => handleInputChange("newPassword", value)}
                placeholder="Enter new password"
                isPassword
                returnKeyType="next"
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                blurOnSubmit={false}
              />
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>Confirm New Password</Text>
              <CustomInput
                ref={confirmPasswordRef}
                icon="lock-closed-outline"
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
          </GlassCard>
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={handleSavePassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
    </GradientBackground>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    marginBottom: 80,
    backgroundColor: theme.colors.background,
  },
  logo: {
    width: 180,
    height: 100,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  headerContainer: {
    alignItems: 'center'
  },
  gradientWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {},
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
  },
  editButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    marginTop: 24,
    justifyContent: 'center',
  },
  modalContent: {
    flex: 1,
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
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
});

export default ChangePassword;
