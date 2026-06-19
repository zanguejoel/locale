import React, { useState, forwardRef } from 'react';
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
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { LocaleGlass } from '@/constants/LocaleColors';

interface CustomInputProps extends TextInputProps {
  icon: string;
  error?: boolean;
  isPassword?: boolean;
  containerStyle?: ViewStyle;
}

const CustomInput = forwardRef<TextInput, CustomInputProps>(({
  icon,
  error,
  isPassword,
  containerStyle,
  onFocus,
  onBlur,
  ...props
}, ref) => {
  const theme = useTheme();
  const styles = getStyles(theme);
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
        color={isFocused ? theme.colors.primary : theme.colors.greyLight}
        style={styles.inputIcon}
      />

      <TextInput
        ref={ref}
        {...props}
        style={styles.inputField}
        secureTextEntry={isPassword && !showPassword}
        placeholderTextColor={theme.colors.greyLight}
        onFocus={(e) => {
          setIsFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
      />

      {isPassword && (
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeIcon}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel={showPassword ? "Hide password" : "Show password"}
          accessibilityRole="button"
        >
          <Ionicons
            name={showPassword ? "eye-outline" : "eye-off-outline"}
            size={20}
            color={isFocused ? theme.colors.primary : (theme.isDark ? theme.colors.greyLight : theme.colors.grey)}
          />
        </TouchableOpacity>
      )}
    </View>
  );
});

CustomInput.displayName = 'CustomInput';

const getStyles = (theme: Theme) => StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: (theme.isDark ? LocaleGlass.dark : LocaleGlass.light).border,
    borderRadius: 12,
    backgroundColor: (theme.isDark ? LocaleGlass.dark : LocaleGlass.light).surfaceFillStrong,
  },
  inputFocused: {
    borderColor: (theme.isDark ? LocaleGlass.dark : LocaleGlass.light).highlightBorder,
    borderWidth: 1.5,
  },
  inputIcon: {
    paddingLeft: 12,
  },
  inputField: {
    flex: 1,
    height: 50,
    padding: 12,
    fontSize: 16,
    color: theme.colors.text,
    borderColor: theme.colors.greyLight
  },
  inputError: {
    borderColor: theme.colors.red,
    borderWidth: 1.5,
  },
  eyeIcon: {
    padding: 12,
  },
});

export default CustomInput;