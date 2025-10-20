import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { User } from '@/constants/Types';
import { saveToken, getToken, deleteToken, saveTokenWithExpiry, clearAllTokens, isTokenExpired } from '@/utils/SecureTokenManager';
import { createSecureSession, getSecureSession } from '@/utils/SecureSession';
import { formatAuthHeader } from '@/utils/AuthHelpers';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AuthEvent } from '@/types/mixpanel';
import OAuthService, { OAuthResult } from '@/utils/OAuthService';
import { Alert } from 'react-native';

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
  state?: string
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
  confirmEmail: (e: string, s: string, r: any, p: string) => {}
  updateUser: (formatData: FormData, captchaToken: string, router: any) => Promise<void>;
  changePassword: (oldPassword: string, newP: string, confirm: string) => void;
  confirmCode: (code: string) => void;
  handleForgotPasswordChange: (email: string, token: string, newPassword: string, router: any) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'microsoft') => Promise<OAuthResult>;
  signOutFromOAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useMMKVStorage<User | null>('user', null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const isMountedRef = useRef(true);
  const isHandlingSessionExpiration = useRef(false);

  // Set initial loading state only once on mount
  useEffect(() => {
    setIsInitialLoading(false);
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Handle user authentication state changes
  useEffect(() => {
    const initAuth = async () => {
      if (!user?.user_id) {
        setIsSignedIn(false);
      } else {
        // Retrieve token from secure storage
        const token = await getToken();
        if (!token) {
          console.log('[Auth] No token found, signing out');
          setIsSignedIn(false);
          return;
        }

        // Check if token is already expired
        const expired = await isTokenExpired();
        if (expired) {
          console.log('[Auth] Token already expired, signing out user');
          /* Alert.alert(
            'Session Expired',
            'Your session has expired. Please sign in again.',
            [
              {
                text: 'OK',
                onPress: async () => {
                  await clearAllTokens();
                  setUser(null);
                  setIsSignedIn(false);
                }
              }
            ]
          ); */
          return;
        }

        // Token is valid
        api.setAuthToken(token);
        setIsSignedIn(true);
      }
    };
    initAuth();
  }, [user]);

  // Handle API session expiration errors
  useEffect(() => {
    console.log('[Auth] Setting up session expiration listener');
    
    // Subscribe to session expiration events from ApiClient
    const unsubscribe = api.onSessionExpired(async () => {
      // Prevent multiple simultaneous session expiration handlers
      if (isHandlingSessionExpiration.current) {
        console.log('[Auth] Already handling session expiration, skipping');
        return;
      }
      
      isHandlingSessionExpiration.current = true;
      console.log('[Auth] Session expired event received from ApiClient');
      
      // Track session expiration (non-blocking)
      mixpanelService.trackAuth(AuthEvent.LOGOUT, {
        reason: 'session_expired',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));
      
      // Reset Mixpanel user (non-blocking)
      mixpanelService.reset().catch(err => console.warn('[Mixpanel] Reset failed:', err));
      
      // Clear auth state immediately
      await clearAllTokens();
      
      if (isMountedRef.current) {
        setUser(null);
        setIsSignedIn(false);
      }
      
      // Show alert to user (after state is cleared)
      /* Alert.alert(
        'Session Expired',
        'Your session has expired. Please sign in again.',
        [
          {
            text: 'OK',
            onPress: () => {
              isHandlingSessionExpiration.current = false;
            }
          }
        ],
        { 
          cancelable: false,
          onDismiss: () => {
            isHandlingSessionExpiration.current = false;
          }
        }
      ); */
    });

    return () => {
      console.log('[Auth] Cleaning up session expiration listener');
      unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Track login started (non-blocking)
      mixpanelService.trackAuth(AuthEvent.LOGIN_STARTED, {
        method: 'email',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));

      // Add timeout to network request
      const response = await Promise.race([
        api.post<{ token: string } | any>('/auth/login', { email, password }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Login timeout')), 30000)
        )
      ]);

      if (!response.ok) {
        // Handle error properly when response.data is null or doesn't have detail
        let errorMessage = 'Login failed';
        
        // Try to extract meaningful error from response
        // Handle Pydantic validation errors (array format)
        if (Array.isArray(response.data?.detail)) {
          errorMessage = response.data.detail
            .map((err: any) => err.msg || err.message || String(err))
            .join('. ');
        }
        // Handle nested error structures (like email verification error)
        else if (response.data?.detail?.msg) {
          errorMessage = response.data.detail.msg;
        }
        // Handle string detail or message
        else if (response.data?.detail) {
          errorMessage = response.data.detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.problem) {
          // Handle network problems
          if (response.problem === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (response.problem === 'TIMEOUT_ERROR') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (response.problem === 'CONNECTION_ERROR') {
            errorMessage = 'Unable to connect to server. Please try again.';
          } else if (response.problem === 'SERVER_ERROR') {
            errorMessage = 'Server error. Please try again later.';
          } else if (response.problem === 'CLIENT_ERROR') {
            errorMessage = 'Invalid request. Please check your email and password.';
          } else {
            errorMessage = `Login failed: ${response.problem}`;
          }
        }
        
        // Track login failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
          method: 'email',
          error_message: errorMessage,
          status_code: response.status,
        }).catch(() => {});
        
        throw new Error(errorMessage);
      }

      if (!response.data?.token) {
        // Track login failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
          method: 'email',
          error_message: 'No token received',
        }).catch(() => {});
        
        throw new Error('No token received');
      }
      
      // Store token securely with error handling
      try {
        // Backend tokens expire in 30 days by default
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await saveTokenWithExpiry(response.data.token, expiresAt);
        api.setAuthToken(response.data.token);
        console.log('[Auth] Token saved with expiry:', expiresAt);
      } catch (storageError) {
        console.error('[Auth] Token storage failed:', storageError);
        throw new Error('Failed to securely store credentials');
      }
      
      // Fetch user data with timeout
      const userResponse = await Promise.race([
        api.get<User | any>('/auth/me', 
          { headers: { 'authorization': `${response.data.token}` } 
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('User data fetch timeout')), 10000)
        )
      ]);

      if (!(userResponse.ok && userResponse.data)) {
        // Handle error properly with detailed message extraction
        let errorMessage = 'Failed to fetch user data';
        
        // Extract meaningful error from response
        if (Array.isArray(userResponse.data?.detail)) {
          errorMessage = userResponse.data.detail
            .map((err: any) => err.msg || err.message || String(err))
            .join('. ');
        } else if (userResponse.data?.detail?.msg) {
          errorMessage = userResponse.data.detail.msg;
        } else if (userResponse.data?.detail) {
          errorMessage = userResponse.data.detail;
        } else if (userResponse.data?.message) {
          errorMessage = userResponse.data.message;
        } else if (userResponse.problem) {
          // Handle network problems
          if (userResponse.problem === 'NETWORK_ERROR') {
            errorMessage = 'Network error while fetching user data. Please check your connection.';
          } else if (userResponse.problem === 'TIMEOUT_ERROR') {
            errorMessage = 'Request timed out while fetching user data. Please try again.';
          } else if (userResponse.problem === 'CONNECTION_ERROR') {
            errorMessage = 'Unable to connect to server. Please check your connection.';
          } else if (userResponse.problem === 'SERVER_ERROR') {
            errorMessage = 'Server error while fetching user data. Please try again later.';
          } else if (userResponse.problem === 'CLIENT_ERROR') {
            errorMessage = 'Authentication error. Please try logging in again.';
          } else {
            errorMessage = `Failed to fetch user data: ${userResponse.problem}`;
          }
        }
        
        // Track login failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
          method: 'email',
          error_message: errorMessage,
          status_code: userResponse.status,
          failure_point: 'fetch_user_data',
        }).catch(() => {});
        
        throw new Error(errorMessage);
      }

      // Store user data WITHOUT token
      const newUser = { ...userResponse.data };

      if (isMountedRef.current) {
        setUser(newUser);
        
        // All Mixpanel operations are non-blocking
        Promise.all([
          mixpanelService.identify(newUser.user_id.toString()),
          mixpanelService.setUserProfile({
            $email: newUser.email,
            $name: `${newUser.first_name} ${newUser.last_name}`,
            $created: newUser.created_at,
            user_id: newUser.user_id.toString(),
            account_created_date: newUser.created_at,
            membership_tier: 'free',
            last_login_date: new Date().toISOString(),
          }),
          mixpanelService.incrementUserProperty('login_count', 1),
          mixpanelService.trackAuth(AuthEvent.LOGIN_COMPLETED, {
            method: 'email',
            user_id: newUser.user_id.toString(),
          })
        ]).catch(err => console.warn('[Mixpanel] Post-login tracking failed:', err));
      }
    } catch (error: any) {
      // Unified error handling
      const errorMessage = error?.message || 'Login failed';
      console.error('[Auth] Sign in error:', errorMessage);
      
      // Track failure (non-blocking)
      mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
        method: 'email',
        error_message: errorMessage,
      }).catch(() => {});
      
      throw errorMessage;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const confirmEmail = async (email: string, code: string, router: any, password: string) => {
    try {
      const response = await api.post<{ token: string } | any>(`/auth/verify-email`, {
        email: email,
        code: code
      });

      if (response.ok) {
        // Track email verified
        await mixpanelService.trackAuth(AuthEvent.EMAIL_VERIFIED, {
          method: 'email',
        });

        // Create secure session instead of passing password in URL
        const sessionId = await createSecureSession({
          email,
          password,
          verified: true
        });
        router.replace(`/success-page?session=${sessionId}`)
      } else {
        // Handle error properly when response.data is null or doesn't have detail
        let errorMessage = 'Email verification failed';
        
        if (response.data?.detail) {
          errorMessage = response.data.detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.problem) {
          // Handle network problems
          if (response.problem === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (response.problem === 'TIMEOUT_ERROR') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (response.problem === 'CONNECTION_ERROR') {
            errorMessage = 'Unable to connect to server. Please try again.';
          } else {
            errorMessage = `Verification failed: ${response.problem}`;
          }
        }
        
        // Provide specific error messages for common verification issues
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('code')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        }
        
        throw new Error(errorMessage);
      }

    } catch (error: any) {
      console.error('[Auth] Email verification error:', error);
      // Throw error with proper message
      const errorMessage = error?.message || error?.toString() || 'Email verification failed';
      throw new Error(errorMessage);
    }
  }


  const forgotPassword = async (email: string) => {
    try {
      // Track password reset requested (non-blocking)
      mixpanelService.trackAuth(AuthEvent.PASSWORD_RESET_REQUESTED, {
        method: 'email',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));

      const response = await api.post<{ token: string } | any>(`/auth/reset-password-request?email=${encodeURIComponent(email)}`);
      
      // Return response for caller to handle
      return response;
    } catch (error: any) {
      console.error('[Auth] Forgot password error:', error);
      // Return error response for consistent handling
      return {
        ok: false,
        problem: 'UNKNOWN_ERROR',
        data: { detail: error?.message || 'Failed to request password reset' }
      };
    }
  }

  const confirmCode = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await api.post<{ token: string } | any>(`/auth/reset-password-request?email=${encodeURIComponent(email)}`);

      if (!response.ok) {
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Reset password request failed';
        throw errorMessage;
      }
      if (!response.data?.token) {
        throw { detail: "Error, Try again later." }
      }

    } catch (error) {
      // console.error('Forgot password error:', JSON.stringify(error))
    } finally {
      setIsLoading(false);
    }
  }

  const signUp = async (formData: FormData, router: any) => {
    try {
      setIsLoading(true);

      // Track sign up started (non-blocking)
      mixpanelService.trackAuth(AuthEvent.SIGN_UP_STARTED, {
        method: 'email',
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));

      // Add timeout to network request
      const response = await Promise.race([
        api.post<{ token: string } | any>("/auth/signup", {
          first_name: formData.firstName,
          last_name: formData.lastName,
          username: `${formData.firstName}${formData.lastName}`,
          email: formData.email,
          phone: formData.phone?.length > 5 ? formData.phone : undefined,
          password: formData.password,
          confirmPassword: formData.confirmPassword
        }, {
          headers: {
            "Content-Type": "application/json",
          }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Sign up request timed out. Please check your connection and try again.')), 30000)
        )
      ]);
      
      if (response.ok) {
        // Track sign up completed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.SIGN_UP_COMPLETED, {
          method: 'email',
        }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));

        // Create secure session with error handling
        try {
          const sessionId = await createSecureSession({
            email: formData.email,
            password: formData.password,
            requiresVerification: true
          });
          router.push(`/email-verification?session=${sessionId}`)
        } catch (sessionError) {
          console.error('[Auth] Session creation failed:', sessionError);
          throw new Error('Failed to create secure session. Please try again.');
        }
      } else {
        // Handle error properly when response.data is null or doesn't have detail
        let errorMessage = 'Registration failed';
        
        // Try to extract meaningful error from response
        if (response.data?.detail) {
          errorMessage = response.data.detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.problem) {
          // Handle network problems
          if (response.problem === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (response.problem === 'TIMEOUT_ERROR') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (response.problem === 'CONNECTION_ERROR') {
            errorMessage = 'Unable to connect to server. Please try again.';
          } else if (response.problem === 'SERVER_ERROR') {
            errorMessage = 'Server error. Please try again later.';
          } else if (response.problem === 'CLIENT_ERROR') {
            errorMessage = 'Invalid request. Please check your information and try again.';
          } else {
            errorMessage = `Registration failed: ${response.problem}`;
          }
        }
        
        // Track sign up failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.SIGN_UP_FAILED, {
          method: 'email',
          error_message: errorMessage,
          status_code: response.status,
        }).catch(() => {});
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      // Don't wrap error if it already has a message
      const errorMessage = error?.message || 'Registration failed. Please try again.';
      console.error('[Auth] Sign up error:', errorMessage);
      
      // Track sign up failed (non-blocking) - only if not already tracked
      if (!error?.tracked) {
        mixpanelService.trackAuth(AuthEvent.SIGN_UP_FAILED, {
          method: 'email',
          error_message: errorMessage,
        }).catch(() => {});
      }
      
      // Throw error with message property
      throw new Error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };


  const updateUser = async (formData: FormData, captchaToken: string, router: any) => {
    setIsLoading(true);
    try {
      const response = await api.patch<{ token: string } | any>(`/auth/update-user`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
        address: formData.address,
        city: formData.city,
        postal_code: formData.postalCode,
        state: formData.state
      });
      if (response.ok) {
        // Store user data WITHOUT token (token is in SecureStore)
        const newUser = { ...response.data };
        if (isMountedRef.current) {
          setUser(newUser);
        }
        return response.data;
      }

    } catch (error) {
      // console.error('updateUser error:', error);
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };


  const changePassword = async (oldPassword: string, newPassword: string, confirmPassword: string) => {
    setIsLoading(true);
    try {
      // TODO: Implement proper reCAPTCHA token generation
      // For now, this will need to be updated when expo-recaptcha is properly configured
      const response = await api.patch<{ token: string } | any>(`/auth/change-password`, {
        old_password: oldPassword,
        new_password: newPassword,
      }, {
        headers: {
          "Content-Type": "application/json",
          // Note: reCAPTCHA token should be generated dynamically
          // This is a temporary placeholder - backend should handle mobile requests differently
        }
      });

      if (response.ok) {
        // Track password changed
        await mixpanelService.trackAuth(AuthEvent.PASSWORD_CHANGED);
        return response.data;
      } else {
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Password change failed';
        throw errorMessage;
      }

    } catch (error) {
      // console.error('changePassword error:', error);
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const resetPassword = async (email: string, code: string) => {
    try {
      setIsLoading(true);
      const response = await api.patch<any>(
        `/auth/forgot-password/redeem`,
        {
          email,
          code
        }
      );
      
      if (!response.ok) {
        // Extract meaningful error message
        let errorMessage = 'Code verification failed';
        
        if (response.data?.detail) {
          errorMessage = response.data.detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.problem) {
          // Handle network problems
          if (response.problem === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (response.problem === 'TIMEOUT_ERROR') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (response.problem === 'CONNECTION_ERROR') {
            errorMessage = 'Unable to connect to server. Please try again.';
          } else {
            errorMessage = `Verification failed: ${response.problem}`;
          }
        }
        
        // Provide specific error messages for common issues
        if (errorMessage.toLowerCase().includes('invalid') || errorMessage.toLowerCase().includes('code')) {
          errorMessage = 'Invalid verification code. Please check and try again.';
        } else if (errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Verification code has expired. Please request a new one.';
        }
        
        throw new Error(errorMessage);
      }
      
      return { data: response.data, status: response.status };
    } catch (error: any) {
      console.error('[Auth] Reset password error:', error);
      // Throw error with proper message
      const errorMessage = error?.message || error?.toString() || 'Code verification failed';
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  const handleForgotPasswordChange = async (email: string, token: string, newPassword: string, router: any) => {
    setIsLoading(true);
    try {
      const response = await api.patch<{ token: string } | any>(`/auth/forgot-password/change`, {
        new_password: newPassword,
      }, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": formatAuthHeader(token)
        }
      });
      
      if (response.ok) {
        // Track password reset completed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.PASSWORD_RESET_COMPLETED).catch(err => 
          console.warn('[Mixpanel] Tracking failed:', err)
        );
        
        // Create secure session instead of passing password in URL
        const sessionId = await createSecureSession({
          email,
          password: newPassword,
          passwordReset: true
        });
        router.replace(`/success-page?session=${sessionId}`)
      } else {
        // Extract meaningful error message
        let errorMessage = 'Failed to reset password';
        
        if (response.data?.detail) {
          errorMessage = response.data.detail;
        } else if (response.data?.message) {
          errorMessage = response.data.message;
        } else if (response.problem) {
          // Handle network problems
          if (response.problem === 'NETWORK_ERROR') {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (response.problem === 'TIMEOUT_ERROR') {
            errorMessage = 'Request timed out. Please try again.';
          } else if (response.problem === 'CONNECTION_ERROR') {
            errorMessage = 'Unable to connect to server. Please try again.';
          } else if (response.problem === 'SERVER_ERROR') {
            errorMessage = 'Server error. Please try again later.';
          } else {
            errorMessage = `Password reset failed: ${response.problem}`;
          }
        }
        
        // Provide specific error messages for common issues
        if (errorMessage.toLowerCase().includes('token') && errorMessage.toLowerCase().includes('expired')) {
          errorMessage = 'Reset token has expired. Please request a new password reset.';
        } else if (errorMessage.toLowerCase().includes('token') && errorMessage.toLowerCase().includes('invalid')) {
          errorMessage = 'Invalid reset token. Please request a new password reset.';
        } else if (errorMessage.toLowerCase().includes('password') && errorMessage.toLowerCase().includes('weak')) {
          errorMessage = 'Password is too weak. Please use a stronger password.';
        }
        
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('[Auth] Password change error:', error);
      // Throw error with proper message
      const errorMessage = error?.message || error?.toString() || 'Failed to reset password';
      throw new Error(errorMessage);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const signOut = async () => {
    // Track logout
    await mixpanelService.trackAuth(AuthEvent.LOGOUT);
    
    // Reset Mixpanel user
    await mixpanelService.reset();
    
    // Clear all tokens including expiry
    await clearAllTokens();
    setUser(null);
    setIsSignedIn(false);
  };

  /**
   * Sign in with OAuth provider (Google or Microsoft)
   */
  const signInWithOAuth = async (provider: 'google' | 'microsoft'): Promise<OAuthResult> => {
    try {
      setIsLoading(true);
      
      // Track OAuth login started (non-blocking)
      mixpanelService.trackAuth(AuthEvent.LOGIN_STARTED, {
        method: provider,
      }).catch(err => console.warn('[Mixpanel] Tracking failed:', err));

      const result = provider === 'google'
        ? await OAuthService.signInWithGoogle()
        : await OAuthService.signInWithMicrosoft();

      if (result.success && result.token) {
        // Token is already stored by OAuthService in SecureStore
        api.setAuthToken(result.token);
        
        // Fetch user data with timeout
        const userResponse = await Promise.race([
          api.get<User | any>('/auth/me'),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('User data fetch timeout')), 30000)
          )
        ]);

        if (!userResponse.ok || !userResponse.data) {
          // Handle error properly with detailed message extraction
          let errorMessage = 'Failed to fetch user data';
          
          // Extract meaningful error from response
          if (Array.isArray(userResponse.data?.detail)) {
            errorMessage = userResponse.data.detail
              .map((err: any) => err.msg || err.message || String(err))
              .join('. ');
          } else if (userResponse.data?.detail?.msg) {
            errorMessage = userResponse.data.detail.msg;
          } else if (userResponse.data?.detail) {
            errorMessage = userResponse.data.detail;
          } else if (userResponse.data?.message) {
            errorMessage = userResponse.data.message;
          } else if (userResponse.problem) {
            // Handle network problems
            if (userResponse.problem === 'NETWORK_ERROR') {
              errorMessage = 'Network error while fetching user data. Please check your connection.';
            } else if (userResponse.problem === 'TIMEOUT_ERROR') {
              errorMessage = 'Request timed out while fetching user data. Please try again.';
            } else if (userResponse.problem === 'CONNECTION_ERROR') {
              errorMessage = 'Unable to connect to server. Please check your connection.';
            } else if (userResponse.problem === 'SERVER_ERROR') {
              errorMessage = 'Server error while fetching user data. Please try again later.';
            } else if (userResponse.problem === 'CLIENT_ERROR') {
              errorMessage = 'Authentication error after OAuth. Please try again.';
            } else {
              errorMessage = `Failed to fetch user data: ${userResponse.problem}`;
            }
          }
          
          // Track OAuth login failed (non-blocking)
          mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
            method: provider,
            error_message: errorMessage,
            status_code: userResponse.status,
            failure_point: 'fetch_user_data',
          }).catch(() => {});
          
          return {
            success: false,
            error: errorMessage,
          };
        }

        if (userResponse.ok && userResponse.data) {
          const newUser = { ...userResponse.data };
          
          if (isMountedRef.current) {
            setUser(newUser);
            
            // All Mixpanel operations are non-blocking
            Promise.all([
              mixpanelService.identify(newUser.user_id.toString()),
              mixpanelService.setUserProfile({
                $email: newUser.email,
                $name: `${newUser.first_name} ${newUser.last_name}`,
                $created: newUser.created_at,
                user_id: newUser.user_id.toString(),
                account_created_date: newUser.created_at,
                membership_tier: 'free',
                last_login_date: new Date().toISOString(),
              }),
              mixpanelService.incrementUserProperty('login_count', 1),
              mixpanelService.trackAuth(AuthEvent.LOGIN_COMPLETED, {
                method: provider,
                user_id: newUser.user_id.toString(),
              })
            ]).catch(err => console.warn('[Mixpanel] Post-OAuth tracking failed:', err));
          }
        }
        
        return result;
      } else {
        // Track OAuth login failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
          method: provider,
          error_message: result.error || 'OAuth sign-in failed',
        }).catch(() => {});
        
        throw new Error(result.error || 'OAuth sign-in failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'OAuth sign-in failed';
      console.error('[Auth] OAuth error:', errorMessage);
      
      // Track OAuth login failed (non-blocking)
      mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
        method: provider,
        error_message: errorMessage,
      }).catch(() => {});
      
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  /**
   * Sign out from OAuth providers
   */
  const signOutFromOAuth = async () => {
    await OAuthService.signOut();
    await signOut();
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isLoading, isInitialLoading, isSignedIn, resetPassword, forgotPassword, confirmEmail, updateUser, changePassword, confirmCode, handleForgotPasswordChange, signInWithOAuth, signOutFromOAuth }}>
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