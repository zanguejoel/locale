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
  password?: string;
}

const Login = () => {
  const { signIn, isLoading } = useAuth();
  const [errors, setErrors] = useState<ErrorType>({});
  const [isValidForm, setIsFormValid] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);


  const validateForm = () => {
    let errors: ErrorType = {};

    if (!emailAddress) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      errors.email = "Email is invalid";
    }

    if (!password) {
      errors.password = "Password is required";
    }

    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const onSignInPress = async () => {
    setFormSubmitted(true);
    
    if (validateForm()) {
      try {
        await signIn(emailAddress, password);
      } catch (err: any) {
        Alert.alert("Error", err?.detail|| "Login failed");
      }
    }
  };

  const handleForgotPassword = () => {
    router.push('/forgot-password');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={70}
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
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </View>

      <View style={styles.formContainer}>
        <CustomInput
          icon="mail-outline"
          placeholder="Email"
          value={emailAddress}
          onChangeText={(value) => {
            setEmailAddress(value)
            validateForm()
          }}
          error={!!errors.email}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <CustomInput
          icon="lock-closed-outline"
          placeholder="Password"
          value={password}
          onChangeText={(value) => {
            setPassword(value)
            validateForm()
          }}
          error={!!errors.password}
          isPassword
        />
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        <View style={styles.optionsContainer}>
          <TouchableOpacity 
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.btnContainer}>
          <TouchableOpacity 
            style={[defaultStyles.btn, styles.signInButton]} 
            onPress={onSignInPress}
          >
            <Text style={styles.btnPrimaryText}>Sign In</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

          <TouchableOpacity 
            onPress={() => router.replace('/registration')}
            style={[defaultStyles.btnSecondary, styles.signUpButton]}
          >
            <Text style={[styles.btnPrimaryText, {color: Colors.primary}]}>
              Create an Account
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
  },
  logo: {
    width: 150,
    height: 100,
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
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.grey,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
  },
  rememberMeText: {
    color: Colors.grey,
    fontSize: 14,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  btnContainer: {
    gap: 16,
  },
  signInButton: {
    height: 50,
    backgroundColor: Colors.primary,
    borderRadius: 12,
  },
  signUpButton: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.light.background,
  },
  dividerText: {
    color: Colors.grey,
    paddingHorizontal: 16,
    fontSize: 14,
  },
});

export default Login;