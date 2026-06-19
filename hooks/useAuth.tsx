import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import useMMKVStorage, { storage } from './useMMKVStorage';
import { User } from '@/constants/Types';
import { supabase, registerSupabaseAutoRefresh } from '@/lib/supabase/client';
import { getProfile, updateProfile } from '@/lib/supabase/profiles';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AuthEvent } from '@/types/mixpanel';

export interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  address?: string;
  city?: string;
  postalCode?: string;
  state?: string;
}

export interface OAuthResult {
  success: boolean;
  error?: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (formatData: FormData, router: any) => Promise<void>;
  resetPassword: (email: string, code: string) => Promise<any>;
  signOut: () => void;
  isLoading: boolean;
  isInitialLoading: boolean;
  isSignedIn: boolean;
  forgotPassword: (e: string) => Promise<any>;
  confirmEmail: (e: string, s: string, r: any, p: string) => Promise<void>;
  updateUser: (formatData: FormData, captchaToken: string, router: any) => Promise<void>;
  changePassword: (oldPassword: string, newP: string, confirm: string) => void;
  confirmCode: (code: string) => void;
  handleForgotPasswordChange: (email: string, token: string, newPassword: string, router: any) => Promise<void>;
  signInWithApple: () => Promise<OAuthResult>;
  signOutFromOAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useMMKVStorage<User | null>('user', null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const isMountedRef = useRef(true);

  // Load the profile for the current session and push it into app state +
  // Mixpanel. Tolerates the brief window where the profiles trigger hasn't run.
  const hydrateUserFromSession = async (track: 'login' | null, method?: string) => {
    const profile = await getProfile();
    if (!profile) return;
    if (isMountedRef.current) setUser(profile);

    mixpanelService.identify(profile.user_id).catch(() => {});
    mixpanelService
      .setUserProfile({
        $email: profile.email,
        $name: `${profile.first_name} ${profile.last_name}`.trim(),
        user_id: profile.user_id,
        membership_tier: 'free',
        last_login_date: new Date().toISOString(),
      })
      .catch(() => {});
    if (track === 'login') {
      mixpanelService.incrementUserProperty('login_count', 1).catch(() => {});
      mixpanelService
        .trackAuth(AuthEvent.LOGIN_COMPLETED, { method: method ?? 'email', user_id: profile.user_id })
        .catch(() => {});
    }
  };

  // Bootstrap: read any persisted session, then subscribe to auth changes.
  useEffect(() => {
    isMountedRef.current = true;
    registerSupabaseAutoRefresh();

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setIsSignedIn(true);
          await hydrateUserFromSession(null);
        } else {
          setIsSignedIn(false);
        }
      } finally {
        if (isMountedRef.current) setIsInitialLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[Auth] auth state:', event);
      if (event === 'SIGNED_OUT') {
        if (isMountedRef.current) {
          setUser(null);
          setIsSignedIn(false);
        }
        return;
      }
      if (session) {
        if (isMountedRef.current) setIsSignedIn(true);
        // Only do the full login tracking on an actual sign-in event.
        await hydrateUserFromSession(event === 'SIGNED_IN' ? 'login' : null);
      }
    });

    return () => {
      isMountedRef.current = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      mixpanelService.trackAuth(AuthEvent.LOGIN_STARTED, { method: 'email' }).catch(() => {});

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        mixpanelService
          .trackAuth(AuthEvent.LOGIN_FAILED, { method: 'email', error_message: error.message })
          .catch(() => {});
        throw new Error(error.message || 'Login failed');
      }
      // onAuthStateChange (SIGNED_IN) hydrates the user + tracks completion.
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const signUp = async (formData: FormData, router: any) => {
    try {
      setIsLoading(true);
      mixpanelService.trackAuth(AuthEvent.SIGN_UP_STARTED, { method: 'email' }).catch(() => {});

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            username: `${formData.firstName}${formData.lastName}`,
            phone: formData.phone?.length > 5 ? formData.phone : undefined,
          },
        },
      });

      if (error) {
        mixpanelService
          .trackAuth(AuthEvent.SIGN_UP_FAILED, { method: 'email', error_message: error.message })
          .catch(() => {});
        throw new Error(error.message || 'Registration failed');
      }

      mixpanelService.trackAuth(AuthEvent.SIGN_UP_COMPLETED, { method: 'email' }).catch(() => {});
      // Email confirmation is required (mailer_autoconfirm=false). Send the user
      // to the verification screen to enter the OTP code from their email.
      router.push(`/email-verification?email=${encodeURIComponent(formData.email)}`);
    } catch (error: any) {
      throw new Error(error?.message || 'Registration failed. Please try again.');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const confirmEmail = async (email: string, code: string, router: any, _password: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) {
        const msg = error.message?.toLowerCase().includes('expired')
          ? 'Verification code has expired. Please request a new one.'
          : 'Invalid verification code. Please check and try again.';
        throw new Error(msg);
      }
      // verifyOtp establishes a session → onAuthStateChange signs the user in.
      mixpanelService.trackAuth(AuthEvent.EMAIL_VERIFIED, { method: 'email' }).catch(() => {});
      router.replace(`/success-page?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      throw new Error(error?.message || 'Email verification failed');
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      mixpanelService.trackAuth(AuthEvent.PASSWORD_RESET_REQUESTED, { method: 'email' }).catch(() => {});
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        return { ok: false, problem: 'ERROR', data: { detail: error.message } };
      }
      return { ok: true, data: {} };
    } catch (error: any) {
      return { ok: false, problem: 'UNKNOWN_ERROR', data: { detail: error?.message || 'Failed to request password reset' } };
    }
  };

  // Resend the signup confirmation code.
  const confirmCode = async (email: string) => {
    setIsLoading(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
    } finally {
      setIsLoading(false);
    }
  };

  // Verify the recovery OTP from a "forgot password" email. Establishes a
  // temporary session so the password can then be changed.
  const resetPassword = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.verifyOtp({ email, token: code, type: 'recovery' });
      if (error) {
        const msg = error.message?.toLowerCase().includes('expired')
          ? 'Verification code has expired. Please request a new one.'
          : 'Invalid verification code. Please check and try again.';
        throw new Error(msg);
      }
      return { data, status: 200 };
    } catch (error: any) {
      throw new Error(error?.message || 'Code verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordChange = async (
    email: string,
    _token: string,
    newPassword: string,
    router: any
  ) => {
    setIsLoading(true);
    try {
      // resetPassword() above already established the recovery session.
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message || 'Failed to reset password');

      mixpanelService.trackAuth(AuthEvent.PASSWORD_RESET_COMPLETED).catch(() => {});
      router.replace(`/success-page?email=${encodeURIComponent(email)}`);
    } catch (error: any) {
      throw new Error(error?.message || 'Failed to reset password');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string, _confirmPassword: string) => {
    setIsLoading(true);
    try {
      const email = user?.email;
      if (!email) throw new Error('Not signed in');

      // Verify the old password by re-authenticating before changing it.
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });
      if (reauthError) throw new Error('Current password is incorrect');

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message || 'Password change failed');

      mixpanelService.trackAuth(AuthEvent.PASSWORD_CHANGED).catch(() => {});
    } catch (error) {
      throw error;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const updateUser = async (formData: FormData, _captchaToken: string, _router: any) => {
    setIsLoading(true);
    try {
      const updated = await updateProfile({
        first_name: formData.firstName,
        last_name: formData.lastName,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        state: formData.state,
      });
      if (isMountedRef.current) setUser(updated);
      return updated as any;
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const signInWithApple = async (): Promise<OAuthResult> => {
    try {
      setIsLoading(true);
      mixpanelService.trackAuth(AuthEvent.LOGIN_STARTED, { method: 'apple' }).catch(() => {});

      if (Platform.OS !== 'ios') {
        return { success: false, error: 'Apple Sign-In is only available on iOS.' };
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { success: false, error: 'No identity token returned from Apple.' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });
      if (error) {
        mixpanelService
          .trackAuth(AuthEvent.LOGIN_FAILED, { method: 'apple', error_message: error.message })
          .catch(() => {});
        return { success: false, error: error.message };
      }
      // onAuthStateChange handles user hydration + completion tracking.
      return { success: true };
    } catch (e: any) {
      if (e?.code === 'ERR_REQUEST_CANCELED') {
        return { success: false, error: 'Sign-in was cancelled.' };
      }
      return { success: false, error: e?.message || 'Apple Sign-In failed.' };
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  };

  const signOut = async () => {
    mixpanelService.trackAuth(AuthEvent.LOGOUT).catch(() => {});
    mixpanelService.reset().catch(() => {});
    await supabase.auth.signOut();
    setUser(null);
    setIsSignedIn(false);
  };

  const signOutFromOAuth = async () => {
    await signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signUp,
        signOut,
        isLoading,
        isInitialLoading,
        isSignedIn,
        resetPassword,
        forgotPassword,
        confirmEmail,
        updateUser,
        changePassword,
        confirmCode,
        handleForgotPasswordChange,
        signInWithApple,
        signOutFromOAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to clear all auth-related storage
export const clearAuthStorage = () => {
  storage.delete('user');
};
