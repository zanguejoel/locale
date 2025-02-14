import React, { useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface CustomInputProps extends TextInputProps {
  icon: string;
  error?: boolean;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

const CustomInput = ({
  icon,
  error,
  isPassword,
  containerStyle,
  ...props
}: CustomInputProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [err] = useState(error);

  return (
    <View style={[
      styles.inputContainer, 
      isFocused && styles.inputFocused,
      error && styles.inputError, 
      containerStyle
    ]}>
      <Ionicons 
        name={icon as any} 
        size={20} 
        color={isFocused ? Colors.primary : Colors.grey} 
        style={styles.inputIcon} 
      />
      
      <TextInput
        {...props}
        style={styles.inputField}
        secureTextEntry={isPassword && !showPassword}
        placeholderTextColor={Colors.grey}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />

      {isPassword && (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
        >
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={isFocused ? Colors.primary : Colors.grey}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: '#E1E1E1',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputFocused: {
    borderColor: Colors.primary,
    borderWidth: 1.5,
    shadowOpacity: 0.1,
    shadowRadius: 4.84,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  inputField: {
    flex: 1,
    height: 50,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  inputError: {
    borderColor: Colors.red,
    borderWidth: 1.5,
  },
  eyeIcon: {
    padding: 12,
  },
});

export default CustomInput;