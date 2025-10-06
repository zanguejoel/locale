import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { defaultStyles } from "@/constants/Styles";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  Animated,
  TextInput,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from "@/constants/Types";

interface ErrorType {
  email?: string;
  password?: string;
}

const Login = () => {
  const { signIn, isLoading } = useAuth();
  const theme = useTheme();
  const styles = getStyles(theme);

  const [errors, setErrors] = useState<ErrorType>({});
  const [isValidForm, setIsFormValid] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  
  // Input refs for keyboard navigation
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // Setup animations
  useEffect(() => {
    // Initial fade and slide in animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();

    const loadStoredEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem("savedEmail");
        if (storedEmail) {
          setEmailAddress(storedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.error("Error loading saved email", error);
      }
    };

    loadStoredEmail();
  }, []);

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFormSubmitted(true);

    if (validateForm()) {
      try {
        await signIn(emailAddress, password);

        if (rememberMe) {
          await AsyncStorage.setItem("savedEmail", emailAddress);
        } else {
          await AsyncStorage.removeItem("savedEmail");
        }
      } catch (err: any) {
        Alert.alert("Error", err || "Login failed");
      }
    }
  };

  const toggleRememberMe = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRememberMe(!rememberMe);
    if (!rememberMe) {
      await AsyncStorage.setItem("savedEmail", emailAddress);
    } else {
      await AsyncStorage.removeItem("savedEmail");
    }
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/forgot-password");
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={70}
        style={styles.keyboardView}
      >
        {isLoading && (
          <View style={[defaultStyles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        )}
        <SafeAreaView>
          <Animated.View
            style={[
              styles.headerContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <Image
              source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
              style={styles.logo}
            /> 
            
            <Text style={[styles.welcomeText]}>Welcome Back</Text>
            <Text style={[styles.subtitle]}>Sign in to continue</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formContainer,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            <CustomInput
              ref={emailInputRef}
              icon="mail-outline"
              placeholder="Email"
              value={emailAddress}
              onChangeText={(value) => {
                setEmailAddress(value);
                if (rememberMe) {
                  AsyncStorage.setItem("savedEmail", value);
                }
              }}
              error={!!errors.email}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
              blurOnSubmit={false}
              autoFocus={true}
            />
            {errors.email && <Text style={[styles.errorText]}>{errors.email}</Text>}

            <CustomInput
              ref={passwordInputRef}
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
              }}
              error={!!errors.password}
              isPassword
              returnKeyType="go"
              onSubmitEditing={onSignInPress}
              blurOnSubmit={true}
            />
            {errors.password && <Text style={[styles.errorText]}>{errors.password}</Text>}

            <View style={styles.optionsContainer}>
              <TouchableOpacity style={styles.rememberMeContainer} onPress={toggleRememberMe}>
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.rememberMeText]}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <Text style={[styles.forgotPasswordText]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.btnContainer}>
              <TouchableOpacity
                style={[defaultStyles.btn, styles.signInButton]}
                onPress={onSignInPress}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Sign In</Text>
                <Ionicons name="arrow-forward-outline" size={18} color="#fff" />
              </TouchableOpacity>

              <View style={styles.dividerContainer}>
                <View style={[styles.divider]} />
                <Text style={[styles.dividerText]}>OR</Text>
                <View style={[styles.divider]} />
              </View>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.replace("/registration");
                }}
                style={[defaultStyles.btnSecondary, styles.createAccountButton]}
              >
                <Text style={[{ color: theme.colors.primary }]}>
                  Create an Account
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 80,
    marginBottom: 50,
    position: "relative",
    paddingVertical: 20,
  },
  logo: {
    width: 180,
    height: 100,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: 8,
    color: theme.colors.primary,
    letterSpacing: 1,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "600",
    marginBottom: 8,
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.text,
    opacity: 0.8,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
    color: theme.colors.red
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: theme.isDark ? theme.colors.greyLight : theme.colors.grey,
    borderRadius: 4,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  checkmark: {
    color: "#fff",
    fontSize: 14,
  },
  rememberMeText: {
    fontSize: 14,
    color: theme.colors.text
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  btnContainer: {
    gap: 16,
  },
  signInButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.colors.primary
  },
  createAccountButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderColor: theme.colors.primary
  },
  dividerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  divider: {
    width: 140,
    height: 1,
    backgroundColor: theme.colors.greyLight
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: theme.colors.text
  },
});

export default Login;