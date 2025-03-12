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
  ScrollView,
  SafeAreaView,
} from "react-native";
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import WebView from "react-native-webview";

interface ErrorType {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

const Registration = () => {
  const { signUp, isLoading } = useAuth();
  const [errors, setErrors] = useState<ErrorType>({});
  const [isValidForm, setIsFormValid] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });


  const validateForm = () => {
    let errors: ErrorType = {};
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    // Validate first name
    if (!formData.firstName.trim()) {
      errors.firstName = "First name is required";
    } else if (formData.firstName.length < 2) {
      errors.firstName = "First name must be at least 2 characters";
    }

    // Validate last name
    if (!formData.lastName.trim()) {
      errors.lastName = "Last name is required";
    } else if (formData.lastName.length < 2) {
      errors.lastName = "Last name must be at least 2 characters";
    }

    // Validate email
    if (!formData.email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Email is invalid";
    }

    // Validate phone
    if (!formData.phone) {
      errors.phone = "Phone number is required";
    } else if (!phoneRegex.test(formData.phone)) {
      errors.phone = "Please enter a valid phone number";
    }

    // Validate password
    if (!formData.password) {
      errors.password = "Password is required";
    } else if (!passwordRegex.test(formData.password)) {
      errors.password =
        "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character";
    }

    // Validate confirm password
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const onSignUpPress = async () => {

    setFormSubmitted(true);

    if (validateForm()) {
      try {
        await signUp(formData, router);
      } catch (err: any) {
        Alert.alert("Error", err.message || "Registration failed");
      }
    }
  };


  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {isLoading && (
        <View style={defaultStyles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
      <SafeAreaView>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.logo} />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started</Text>
          </View>

          <View style={styles.formContainer}>
            <CustomInput
              icon="person-outline"
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange("firstName", value)}
              error={!!errors.firstName}
              autoCapitalize="words"
            />
            {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}

            <CustomInput
              icon="person-outline"
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange("lastName", value)}
              error={!!errors.lastName}
              autoCapitalize="words"
            />
            {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}

            <CustomInput
              icon="mail-outline"
              placeholder="Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              error={!!errors.email}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <CustomInput
              icon="call-outline"
              placeholder="Phone Number"
              value={formData.phone}
              onChangeText={(value) => handleInputChange("phone", value)}
              error={!!errors.phone}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}

            <CustomInput
              icon="lock-closed-outline"
              placeholder="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange("password", value)}
              error={!!errors.password}
              isPassword
            />
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <CustomInput
              icon="lock-closed-outline"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange("confirmPassword", value)}
              error={!!errors.confirmPassword}
              isPassword
            />
            {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

            <View style={styles.btnContainer}>
              <TouchableOpacity
                style={[defaultStyles.btn, styles.signUpButton]}
                onPress={onSignUpPress}
              >
                <Text style={styles.btnPrimaryText}>Create Account</Text>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={styles.loginText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                  <Text style={styles.loginLink}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 30,
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.grey,
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
    marginTop: 24,
  },
  signUpButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    color: Colors.grey,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default Registration;