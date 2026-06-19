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
  ScrollView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import * as Haptics from 'expo-haptics';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from "@/constants/Types";

interface ErrorType {
  email?: string;
  password?: string;
}

const Login = () => {
  const { signIn, isLoading, signInWithApple } = useAuth();

  const onApplePress = async () => {
    const result = await signInWithApple();
    if (!result.success && result.error && result.error !== 'Sign-in was cancelled.') {
      Alert.alert('Apple Sign-In', result.error);
    }
    // On success, the auth state listener redirects via the root index.
  };
  const theme = useTheme();
  const styles = getStyles(theme);

  const [errors, setErrors] = useState<ErrorType>({});
  const [isValidForm, setIsFormValid] = useState(false);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [touchedFields, setTouchedFields] = useState<{email?: boolean; password?: boolean}>({});

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
        // console.error("Error loading saved email", error);
      }
    };

    loadStoredEmail();
  }, []);

  const validateEmail = () => {
    let emailError = undefined;
    if (!emailAddress) {
      emailError = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(emailAddress)) {
      emailError = "Email is invalid";
    }
    setErrors(prev => ({ ...prev, email: emailError }));
    return !emailError;
  };

  const validatePassword = () => {
    let passwordError = undefined;
    if (!password) {
      passwordError = "Password is required";
    }
    setErrors(prev => ({ ...prev, password: passwordError }));
    return !passwordError;
  };

  const validateForm = () => {
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    const isValid = emailValid && passwordValid;
    setIsFormValid(isValid);
    return isValid;
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
        Alert.alert("Sign In Error", err || "Login failed");
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
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        style={styles.keyboardView}
      >
        {isLoading && (
          <View style={[defaultStyles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Signing in...</Text>
          </View>
        )}
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
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
                source={theme.isDark ? require('@/assets/images/Localelogodark.png') : require('@/assets/images/Localelogowhite.png')}
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
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <CustomInput
                ref={emailInputRef}
                icon="mail-outline"
                placeholder="you@example.com"
                nativeID="email-input"
                value={emailAddress}
                onChangeText={(value) => {
                  setEmailAddress(value);
                  if (rememberMe) {
                    AsyncStorage.setItem("savedEmail", value);
                  }
                  // Clear error on change if field was touched
                  if (touchedFields.email) {
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }
                }}
                onBlur={() => {
                  setTouchedFields(prev => ({ ...prev, email: true }));
                  validateEmail();
                }}
                error={!!errors.email}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                blurOnSubmit={false}
                autoFocus={true}
                textContentType="username"
                autoComplete="email"
              />
            {errors.email && <Text style={[styles.errorText]}>{errors.email}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Password</Text>
              <CustomInput
                ref={passwordInputRef}
                icon="lock-closed-outline"
                placeholder="Enter your password"
                nativeID="password-input"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  // Clear error on change if field was touched
                  if (touchedFields.password) {
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }
                }}
                onBlur={() => {
                  setTouchedFields(prev => ({ ...prev, password: true }));
                  validatePassword();
                }}
                error={!!errors.password}
                isPassword
                returnKeyType="go"
                onSubmitEditing={onSignInPress}
                blurOnSubmit={true}
                textContentType="password"
                autoComplete="password"
              />
            {errors.password && <Text style={[styles.errorText]}>{errors.password}</Text>}
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity 
                style={styles.rememberMeContainer} 
                onPress={toggleRememberMe}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel={rememberMe ? "Remember me enabled" : "Remember me disabled"}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: rememberMe }}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.rememberMeText]}>Remember me</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={handleForgotPassword}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Forgot password"
                accessibilityRole="button"
                accessibilityHint="Opens password reset flow"
              >
                <Text style={[styles.forgotPasswordText]}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.btnContainer}>
              <TouchableOpacity
                style={[defaultStyles.btn, styles.signInButton]}
                onPress={onSignInPress}
              >
                <Text style={styles.buttonText}>Sign In</Text>
                <Ionicons name="arrow-forward-outline" size={18} color={theme.colors.white} />
              </TouchableOpacity>

              {Platform.OS === 'ios' && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={
                    theme.isDark
                      ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                      : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                  }
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={onApplePress}
                />
              )}

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
                <Text style={styles.secondaryButtonText}>
                  Create an Account
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          </ScrollView>
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
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginTop: 60,
    marginBottom: 40,
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
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.textSecondary,
    marginBottom: 2,
    marginLeft: 4,
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
    width: 24,
    height: 24,
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
  appleButton: {
    height: 50,
    width: '100%',
    marginTop: 16,
  },
  dividerContainer: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  divider: {
    width: '40%',
    height: 1,
    backgroundColor: theme.colors.greyLight
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    color: theme.colors.text
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
  },
});

export default Login;