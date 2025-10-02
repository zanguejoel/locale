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
  Easing,
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
  const colorAnim = useRef(new Animated.Value(0)).current;
  const dotOpacity1 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity2 = useRef(new Animated.Value(0.3)).current;
  const dotOpacity3 = useRef(new Animated.Value(0.3)).current;
  const bubbleScale1 = useRef(new Animated.Value(0)).current;
  const bubbleScale2 = useRef(new Animated.Value(0)).current;
  const bubbleScale3 = useRef(new Animated.Value(0)).current;
  const bubbleScale4 = useRef(new Animated.Value(0)).current;
  const bubbleScale5 = useRef(new Animated.Value(0)).current;
  const bubbleScale6 = useRef(new Animated.Value(0)).current;
  // Removed rotation animation

  // Interpolate background color
  const backgroundColorInterpolation = colorAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [
      theme.colors.background,
      theme.isDark ? 'rgba(30, 30, 30, 1)' : 'rgba(250, 250, 255, 1)',
      theme.colors.background
    ],
  });

  // No rotation animation needed anymore

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

    // Background color animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(colorAnim, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 2,
          duration: 4000,
          useNativeDriver: false,
        }),
        Animated.timing(colorAnim, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Chat ellipsis animation
    const animateDots = () => {
      Animated.loop(
        Animated.sequence([
          // First dot
          Animated.sequence([
            Animated.timing(dotOpacity1, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity1, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          // Second dot
          Animated.sequence([
            Animated.timing(dotOpacity2, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity2, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          // Third dot
          Animated.sequence([
            Animated.timing(dotOpacity3, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(dotOpacity3, {
              toValue: 0.3,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    };

    // No rotation animation needed anymore

    // Bubble animations
    const animateBubbles = () => {
      // First bubble
      Animated.sequence([
        Animated.timing(bubbleScale1, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.delay(1000),
        Animated.timing(bubbleScale1, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(2000),
      ]).start(() => {
        bubbleScale1.setValue(0);
        setTimeout(animateBubble1, 1000);
      });
    };

    const animateBubble1 = () => {
      Animated.sequence([
        Animated.timing(bubbleScale1, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5)),
        }),
        Animated.delay(1000),
        Animated.timing(bubbleScale1, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        bubbleScale1.setValue(0);
        setTimeout(animateBubble1, 3000);
      });
    };

    const animateBubble2 = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(bubbleScale2, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.delay(1000),
          Animated.timing(bubbleScale2, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bubbleScale2.setValue(0);
          setTimeout(animateBubble2, 4000);
        });
      }, 1500);
    };

    const animateBubble3 = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(bubbleScale3, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.delay(1000),
          Animated.timing(bubbleScale3, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bubbleScale3.setValue(0);
          setTimeout(animateBubble3, 5000);
        });
      }, 3000);
    };

    // Additional bubbles
    const animateBubble4 = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(bubbleScale4, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.delay(800),
          Animated.timing(bubbleScale4, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bubbleScale4.setValue(0);
          setTimeout(animateBubble4, 3500);
        });
      }, 800);
    };

    const animateBubble5 = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(bubbleScale5, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.delay(1200),
          Animated.timing(bubbleScale5, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bubbleScale5.setValue(0);
          setTimeout(animateBubble5, 4200);
        });
      }, 2000);
    };

    const animateBubble6 = () => {
      setTimeout(() => {
        Animated.sequence([
          Animated.timing(bubbleScale6, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.5)),
          }),
          Animated.delay(1500),
          Animated.timing(bubbleScale6, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          bubbleScale6.setValue(0);
          setTimeout(animateBubble6, 4800);
        });
      }, 3800);
    };

    animateDots();
    animateBubbles();
    animateBubble2();
    animateBubble3();
    animateBubble4();
    animateBubble5();
    animateBubble6();

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
    <Animated.View style={[styles.container, { backgroundColor: backgroundColorInterpolation }]}>
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
            {/* Logo commented out */}
            <Image
              source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
              style={styles.logo}
            /> 

            {/* Chat bubbles animation */}
            <View style={styles.bubbleContainer}>
              <Animated.View style={[styles.bubble, { transform: [{ scale: bubbleScale1 }], backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <Ionicons name="browsers-outline" size={24} color={theme.colors.primary} />
              </Animated.View>
              <Animated.View style={[styles.bubble, styles.bubble2, { transform: [{ scale: bubbleScale2 }], backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <Ionicons name="server-outline" size={22} color="#6C63FF" />
              </Animated.View>
              <Animated.View style={[styles.bubble, styles.bubble3, { transform: [{ scale: bubbleScale3 }], backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <Ionicons name="flash-outline" size={20} color="#4CD964" />
              </Animated.View>
              <Animated.View style={[styles.bubble, styles.bubble4, { transform: [{ scale: bubbleScale4 }], backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <Ionicons name="bulb-outline" size={18} color="#FF9500" />
              </Animated.View>
              <Animated.View style={[styles.bubble, styles.bubble5, { transform: [{ scale: bubbleScale5 }], backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <Ionicons name="analytics-outline" size={18} color="#FF2D55" />
              </Animated.View>
              <Animated.View style={[styles.bubble, styles.bubble6, { transform: [{ scale: bubbleScale6 }], backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.8)' }]}>
                <Ionicons name="planet-outline" size={16} color="#5AC8FA" />
              </Animated.View>
            </View>

          
            <Text style={[styles.welcomeText]}>Welcome Back</Text>

            <View style={styles.typingContainer}>
              <Text style={[styles.subtitle]}>Sign in to continue</Text>
             
            </View>
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
            />
            {errors.email && <Text style={[styles.errorText]}>{errors.email}</Text>}

            <CustomInput
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={(value) => {
                setPassword(value);
              }}
              error={!!errors.password}
              isPassword
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
    </Animated.View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
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
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginRight: 8,
    color: theme.colors.text,
    opacity: 0.8,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    marginHorizontal: 2,
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
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: -1,
  },
  bubble: {
    position: 'absolute',
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    right: -15,
    top: -10,
  },
  bubble2: {
    width: 40,
    height: 40,
    borderRadius: 20,
    left: -10,
    top: 20,
  },
  bubble3: {
    width: 36,
    height: 36,
    borderRadius: 18,
    left: 30,
    top: 70,
  },
  bubble4: {
    width: 34,
    height: 34,
    borderRadius: 17,
    right: 20,
    top: 60,
  },
  bubble5: {
    width: 32,
    height: 32,
    borderRadius: 16,
    right: 60,
    top: 5,
  },
  bubble6: {
    width: 30,
    height: 30,
    borderRadius: 15,
    left: 60,
    top: 15,
  },
  // Removed orbit-related styles
});

export default Login;