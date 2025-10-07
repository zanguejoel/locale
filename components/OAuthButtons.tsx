import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OAuthService, { OAuthResult } from '@/utils/OAuthService';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface OAuthButtonsProps {
  onSuccess?: (result: OAuthResult) => void;
  onError?: (error: string) => void;
}

export default function OAuthButtons({ onSuccess, onError }: OAuthButtonsProps) {
  const { colors } = useTheme();
  const [loading, setLoading] = useState<'google' | 'microsoft' | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading('google');
    try {
      const result = await OAuthService.signInWithGoogle();
      
      if (result.success) {
        onSuccess?.(result);
        // Navigate to main app
        router.replace('/(chat)/new');
      } else {
        const errorMessage = result.error || 'Google sign-in failed';
        onError?.(errorMessage);
        Alert.alert('Authentication Error', errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(null);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setLoading('microsoft');
    try {
      const result = await OAuthService.signInWithMicrosoft();
      
      if (result.success) {
        onSuccess?.(result);
        // Navigate to main app
        router.replace('/(chat)/new');
      } else {
        const errorMessage = result.error || 'Microsoft sign-in failed';
        onError?.(errorMessage);
        Alert.alert('Authentication Error', errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred';
      onError?.(errorMessage);
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        <Text style={[styles.dividerText, { color: colors.text }]}>Or continue with</Text>
        <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
      </View>

      {/* OAuth Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.oauthButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === 'google' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleButtonText}>Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Microsoft Sign-In Button */}
        <TouchableOpacity
          style={[styles.oauthButton, styles.microsoftButton]}
          onPress={handleMicrosoftSignIn}
          disabled={loading !== null}
          activeOpacity={0.8}
        >
          {loading === 'microsoft' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-microsoft" size={20} color="#fff" />
              <Text style={styles.microsoftButtonText}>Microsoft</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Privacy Notice */}
      <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  oauthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  googleButton: {
    backgroundColor: '#EA4335',
  },
  microsoftButton: {
    backgroundColor: '#00A4EF',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  microsoftButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  privacyText: {
    marginTop: 16,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
});

