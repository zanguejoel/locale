import React, { useEffect, useState, useRef } from "react";
import type { TextInput as TextInputType } from 'react-native';
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
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import Colors from "@/constants/Colors";
import { router } from "expo-router";
import CustomInput from "@/components/CustomInput";
import WebView from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import contries from '@/data/countries.json'
import { useTheme } from '@/hooks/useTheme';

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

interface CountryCode {
  name: string;
  code: string;
  dial_code: string;
  flag: string;
}

// Sample country codes (you can expand this list)
const countryCodes: CountryCode[] = contries;

const Registration = () => {
  const { signUp, isLoading } = useAuth();
  const theme = useTheme();
  const [errors, setErrors] = useState<ErrorType>({});
  const [isValidForm, setIsFormValid] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>(countryCodes[0]);

  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  
  // Input refs for keyboard navigation
  const firstNameRef = useRef<TextInputType>(null);
  const lastNameRef = useRef<TextInputType>(null);
  const emailRef = useRef<TextInputType>(null);
  const phoneRef = useRef<TextInputType>(null);
  const passwordRef = useRef<TextInputType>(null);
  const confirmPasswordRef = useRef<TextInputType>(null);

  // Validate a specific field
  const validateField = (field: keyof FormData, value: string, allFormData: FormData): string | undefined => {
    const phoneRegex = /^\d{4,15}$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    switch (field) {
      case 'firstName':
        if (!value.trim()) {
          return "First name is required";
        } else if (value.length < 2) {
          return "First name must be at least 2 characters";
        }
        break;

      case 'lastName':
        if (!value.trim()) {
          return "Last name is required";
        } else if (value.length < 2) {
          return "Last name must be at least 2 characters";
        }
        break;

      case 'email':
        if (!value) {
          return "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(value)) {
          return "Email is invalid";
        }
        break;

      case 'phone':
        const phoneWithoutCode = value.replace(/\D/g, '');
        if (phoneWithoutCode && !phoneRegex.test(phoneWithoutCode)) {
          return "Please enter a valid phone number";
        }
        break;

      case 'password':
        if (!value) {
          return "Password is required";
        } else if (!passwordRegex.test(value)) {
          return "Password must contain at least 8 characters, one uppercase letter, one lowercase letter, one number and one special character";
        }
        break;

      case 'confirmPassword':
        if (!value) {
          return "Please confirm your password";
        } else if (allFormData.password !== value) {
          return "Passwords do not match";
        }
        break;
    }

    return undefined;
  };

  const validateForm = () => {
    let errors: ErrorType = {};
    
    // Validate all fields
    errors.firstName = validateField('firstName', formData.firstName, formData);
    errors.lastName = validateField('lastName', formData.lastName, formData);
    errors.email = validateField('email', formData.email, formData);
    errors.phone = validateField('phone', formData.phone, formData);
    errors.password = validateField('password', formData.password, formData);
    errors.confirmPassword = validateField('confirmPassword', formData.confirmPassword, formData);

    // Remove undefined errors
    Object.keys(errors).forEach(key => {
      if (errors[key as keyof ErrorType] === undefined) {
        delete errors[key as keyof ErrorType];
      }
    });

    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === "phone") {
      // Format the phone number with spaces or dashes
      value = formatPhoneNumber(value);
    }

    const updatedFormData = {
      ...formData,
      [field]: value
    };

    setFormData(updatedFormData);

    // Revalidate the field if it currently has an error or if form has been submitted
    if (errors[field] || formSubmitted) {
      const fieldError = validateField(field, value, updatedFormData);
      
      setErrors(prev => {
        const newErrors = { ...prev };
        if (fieldError) {
          newErrors[field] = fieldError;
        } else {
          delete newErrors[field];
        }
        
        // Special case: if password changes, revalidate confirmPassword too
        if (field === 'password' && (prev.confirmPassword || formSubmitted)) {
          const confirmPasswordError = validateField('confirmPassword', updatedFormData.confirmPassword, updatedFormData);
          if (confirmPasswordError) {
            newErrors.confirmPassword = confirmPasswordError;
          } else {
            delete newErrors.confirmPassword;
          }
        }
        
        return newErrors;
      });
    }
  };

  // Format phone number as user types
  const formatPhoneNumber = (input: string) => {
    // Remove all non-digits
    const phoneDigits = input.replace(/\D/g, '');

    // Format based on length patterns (customize this based on your needs)
    if (phoneDigits.length <= 3) {
      return phoneDigits;
    } else if (phoneDigits.length <= 6) {
      return `${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3)}`;
    } else {
      return `${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 6)} ${phoneDigits.slice(6, 10)}`;
    }
  };

  const selectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    setShowCountryModal(false);
  };

  const filteredCountries = searchQuery
    ? countryCodes.filter(country =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dial_code.includes(searchQuery)
    )
    : countryCodes;

  const onSignUpPress = async (e: any) => {
    e.preventDefault();
    setFormSubmitted(true);

    if (validateForm()) {
      try {
        // Only add phone number if provided
        const phoneWithoutCode = formData.phone.replace(/\D/g, '');
        const updatedFormData = {
          ...formData,
          phone: phoneWithoutCode ? `${selectedCountry.dial_code}${phoneWithoutCode}` : ''
        };

        await signUp(updatedFormData, router);
      } catch (err: any) {
        Alert.alert("Error", err || "Registration failed");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {isLoading && (
        <View style={[defaultStyles.loadingOverlay, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.7)' }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      )}
      <SafeAreaView>
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerContainer}>
            <Image
              source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')}
              style={styles.logo}
            />
            <Text style={[styles.subtitle, { color: theme.colors.text }]}>Sign up to get started</Text>
          </View>

          <View style={styles.formContainer}>
            <CustomInput
              ref={firstNameRef}
              icon="person-outline"
              placeholder="First Name"
              value={formData.firstName}
              onChangeText={(value) => handleInputChange("firstName", value)}
              error={!!errors.firstName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => lastNameRef.current?.focus()}
              blurOnSubmit={false}
              autoFocus={true}
            />
            {errors.firstName && <Text style={[styles.errorText, { color: theme.colors.red }]}>{errors.firstName}</Text>}

            <CustomInput
              ref={lastNameRef}
              icon="person-outline"
              placeholder="Last Name"
              value={formData.lastName}
              onChangeText={(value) => handleInputChange("lastName", value)}
              error={!!errors.lastName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => emailRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.lastName && <Text style={[styles.errorText, { color: theme.colors.red }]}>{errors.lastName}</Text>}

            <CustomInput
              ref={emailRef}
              icon="mail-outline"
              placeholder="Email"
              value={formData.email}
              onChangeText={(value) => handleInputChange("email", value)}
              error={!!errors.email}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={() => phoneRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.email && <Text style={[styles.errorText, { color: theme.colors.red }]}>{errors.email}</Text>}

            {/* Custom Phone Input with Country Code Selector */}
            <View style={styles.phoneContainer}>
              <TouchableOpacity
                style={[styles.countrySelector, { borderColor: theme.colors.greyLight }]}
                onPress={() => setShowCountryModal(true)}
              >
                <Text style={styles.countryFlag}>{selectedCountry.flag}</Text>
                <Text style={[styles.countryCode, { color: theme.colors.text }]}>{selectedCountry.dial_code}</Text>
                <Ionicons name="chevron-down" size={16} color={theme.colors.text} />
              </TouchableOpacity>

              <View style={[styles.phoneInputContainer, !!errors.phone && styles.inputError, { borderColor: theme.colors.greyLight }]}>
                <Ionicons name="call-outline" size={20} color={theme.colors.text} style={styles.phoneIcon} />
                <TextInput
                  ref={phoneRef}
                  style={[styles.phoneInput, { color: theme.colors.text }]}
                  placeholder="Phone Number (Optional)"
                  placeholderTextColor={theme.colors.greyLight}
                  value={formData.phone}
                  onChangeText={(value) => handleInputChange("phone", value)}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  blurOnSubmit={false}
                />
              </View>
            </View>
            {errors.phone && <Text style={[styles.errorText, { color: theme.colors.red }]}>{errors.phone}</Text>}

            <CustomInput
              ref={passwordRef}
              icon="lock-closed-outline"
              placeholder="Password"
              value={formData.password}
              onChangeText={(value) => handleInputChange("password", value)}
              error={!!errors.password}
              isPassword
              returnKeyType="next"
              onSubmitEditing={() => confirmPasswordRef.current?.focus()}
              blurOnSubmit={false}
            />
            {errors.password && <Text style={[styles.errorText, { color: theme.colors.red }]}>{errors.password}</Text>}

            <CustomInput
              ref={confirmPasswordRef}
              icon="lock-closed-outline"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChangeText={(value) => handleInputChange("confirmPassword", value)}
              error={!!errors.confirmPassword}
              isPassword
              returnKeyType="done"
              onSubmitEditing={onSignUpPress}
              blurOnSubmit={true}
            />
            {errors.confirmPassword && <Text style={[styles.errorText, { color: theme.colors.red }]}>{errors.confirmPassword}</Text>}

            <View style={styles.btnContainer}>
              <TouchableOpacity
                style={[defaultStyles.btn, styles.signUpButton, { backgroundColor: theme.colors.primary }]}
                onPress={onSignUpPress}
              >
                <Text style={styles.btnPrimaryText}>Create Account</Text>
              </TouchableOpacity>

              <View style={styles.loginContainer}>
                <Text style={[styles.loginText, { color: theme.colors.text }]}>Already have an account?</Text>
                <TouchableOpacity onPress={() => router.replace('/login')}>
                  <Text style={[styles.loginLink, { color: theme.colors.primary }]}>Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Country Code Modal */}
      <Modal
        visible={showCountryModal}
        animationType="slide"
        transparent={true}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.3)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Select Country Code</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchContainer, { borderColor: theme.colors.greyLight }]}>
              <Ionicons name="search" size={20} color={theme.colors.text} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.text }]}
                placeholder="Search country or code"
                placeholderTextColor={theme.colors.greyLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.countryItem}
                  onPress={() => selectCountry(item)}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, { color: theme.colors.text }]}>{item.name}</Text>
                  <Text style={[styles.countryDialCode, { color: theme.colors.text }]}>{item.dial_code}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: theme.colors.greyLight }]} />}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  headerContainer: {
    alignItems: 'center',
    // marginTop: 30,
    marginBottom: 30,
    paddingVertical: 20,
  },
  logo: {
    resizeMode: 'contain',
    width: 180,
    height: 100,
  },
  appTitle: {
    fontSize: 42,
    fontWeight: "bold",
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: Colors.common.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.common.grey,
    opacity: 0.8,
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  phoneContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginRight: 8,
  },
  countryFlag: {
    fontSize: 18,
    marginRight: 4,
  },
  countryCode: {
    marginRight: 4,
    fontSize: 14,
  },
  phoneInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 12,
    paddingHorizontal: 10,
  },
  phoneIcon: {
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    height: 45,
    fontSize: 14,
  },
  inputError: {
    borderColor: Colors.common.red,
  },
  errorText: {
    color: Colors.common.red,
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  btnContainer: {
    marginTop: 24,
  },
  signUpButton: {
    height: 50,
    backgroundColor: Colors.common.primary,
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
    color: Colors.common.grey,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.common.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    height: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.common.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.common.grey,
    borderRadius: 12,
    paddingHorizontal: 10,
    marginBottom: 16,
    height: 45,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  countryName: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
  },
  countryDialCode: {
    fontSize: 16,
    color: Colors.common.grey,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
});

export default Registration;