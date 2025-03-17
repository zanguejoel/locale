import Colors from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";

import { getErrorMessage } from "@/utils/ErrorValidation";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";

const ChangePassword = () => {
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
    if (formData.newPassword !== formData.confirmNewPassword) {
      Alert.alert("Error", "New passwords do not match");
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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
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
            </View>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginBottom: 80,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
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
    color: Colors.greyLight,
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
    backgroundColor: Colors.primary,
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
});

export default ChangePassword;
