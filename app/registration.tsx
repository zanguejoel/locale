import React, { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { defaultStyles } from "@/constants/Styles";
import {
  View,
  StyleSheet,
  TextInput,
  Text,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  KeyboardAvoidingView,
  Image,
  Platform,
} from "react-native";
import Colors from "@/constants/Colors";
import { Link, router } from "expo-router";

interface ErrorType {
  email?: string;
  password?: string;
}

const Registration = () => {
  const { user, signIn, isLoading } = useAuth();
  const [errors, setErrors] = useState<ErrorType>();
  const [isValidForm, setIsFormValid] = useState(false);
  const [password, setPassword] = useState("");
  const [emailAdress, setEmailAddress] = useState("");

  useEffect(() => {
    validateForm();
}, [emailAdress, password]);

  const validateForm = () => {
    let errors: ErrorType = {};

    // Validate email field
    if (!emailAdress) {
      errors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(emailAdress)) {
      errors.email = "Email is invalid.";
    }

    // Validate password field
    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters.";
    }

    // Set the errors and update form validity
    setErrors(errors);
    setIsFormValid(Object.keys(errors).length === 0);
  };

  const onSignInPress = async () => {
    try {
      await signIn(emailAdress, password);
    } catch (err: any) {
      Alert.alert(err.errors[0].message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={70}
      style={styles.container}
    >
      {isLoading && (
        <View style={defaultStyles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
      <Image source={require('@/assets/images/icon.png')} style={styles.logo} />

      <Text style={styles.title}>{"Welcome to Jaiime"}</Text>
      <View style={{ marginBottom: 30 }}>
        <TextInput
          autoCapitalize="none"
          placeholder="john@neptuneech.com"
          value={emailAdress}
          onChangeText={setEmailAddress}
          style={[styles.inputField, errors?.email && {borderColor: Colors.red, borderWidth: 0.5}]}
        />
        <TextInput
          placeholder="password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={[styles.inputField, errors?.password && {borderColor: Colors.red, borderWidth: 0.5}]}
        />
      </View>

      

      <View style={styles.btnContainer}>
        <TouchableOpacity style={[defaultStyles.btn]} onPress={onSignInPress}>
          <Text style={styles.btnPrimaryText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
        onPress={() => router.replace('/registration')}
        style={[defaultStyles.btnSecondary]}
        >
          <Text style={[styles.btnPrimaryText, {color: Colors.primary}]}>Sign In</Text>
        </TouchableOpacity>
      </View>

      {/* Display error messages */}
      <View style={styles.errorsContainer}>
      {(errors?.email || errors?.password ) && Object.values(errors).map((error, index) => (
                <Text key={index} style={styles.error}>
                    {error}
                </Text>
      ))}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  logo: {
    width: 60,
    height: 60,
    alignSelf: "center",
    marginVertical: 80,
  },
  title: {
    fontSize: 30,
    marginBottom: 20,
    fontWeight: "bold",
    alignSelf: "center",
  },
  inputField: {
    marginVertical: 4,
    height: 50,
    borderWidth: 1,
    borderColor: Colors.light.background,
    borderRadius: 15,
    padding: 10,
    backgroundColor: "#fff",
  },
  btnPrimary: {
    backgroundColor: Colors.light.background,
    marginVertical: 4,
  },
  btnPrimaryText: {
    color: "#fff",
    fontSize: 16,
  },
  btnContainer: {
    gap: 20,
  },
  errorsContainer: {
    marginTop: 30
  },
  error: {
    color: Colors.red,
    fontSize: 18,
    marginBottom: 12,
    textAlign: 'center'
},
});

export default Registration;
