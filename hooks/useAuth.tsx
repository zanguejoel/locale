import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { User } from '@/constants/Types';
import { saveToken, getToken, deleteToken } from '@/utils/SecureTokenManager';
import { createSecureSession, getSecureSession } from '@/utils/SecureSession';
import { formatAuthHeader } from '@/utils/AuthHelpers';
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';
import { AuthEvent } from '@/types/mixpanel';
import OAuthService, { OAuthResult } from '@/utils/OAuthService';

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
  resetPassword: (email: string, code: string, recaptchaToken: string) => Promise<any>;
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
        if (token) {
          api.setAuthToken(token);
          setIsSignedIn(true);
        } else {
          setIsSignedIn(false);
        }
      }
    };
    initAuth();
  }, [user]);

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
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Login failed';
        
        // Track login failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
          method: 'email',
          error_message: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        }).catch(() => {});
        
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Login failed');
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
        await saveToken(response.data.token);
        api.setAuthToken(response.data.token);
      } catch (storageError) {
        console.error('[Auth] Token storage failed:', storageError);
        throw new Error('Failed to securely store credentials');
      }
      
      // Fetch user data with timeout
      const userResponse = await Promise.race([
        api.get<User | any>('/auth/me'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('User data fetch timeout')), 30000)
        )
      ]);

      if (!(userResponse.ok && userResponse.data)) {
        // Track login failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.LOGIN_FAILED, {
          method: 'email',
          error_message: 'Failed to fetch user data',
        }).catch(() => {});
        
        throw new Error('Failed to fetch user data');
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
      
      throw error;
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
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Email verification failed';
        throw errorMessage;
      }

    } catch (error) {
      // console.error('Email verification error:', JSON.stringify(error))
      throw error
    }
  }


  const forgotPassword = async (email: string) => {
    // setIsLoading(true);
    try {
      // Track password reset requested
      await mixpanelService.trackAuth(AuthEvent.PASSWORD_RESET_REQUESTED, {
        method: 'email',
      });

      const response = await api.post<{ token: string } | any>(`/auth/reset-password-request?email=${encodeURIComponent(email)}`);
      
     //  alert(JSON.stringify(response.ok ? 'true' : 'false'));
      return response;


    } catch (error) {
      // console.error('Forgot password error:', JSON.stringify(error))
    } finally {
      // setIsLoading(false);
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
          setTimeout(() => reject(new Error('Sign up timeout')), 30000)
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
          throw new Error('Failed to create secure session');
        }
      } else {
        // Handle error properly when response.data is null or doesn't have detail
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Registration failed';
        
        // Track sign up failed (non-blocking)
        mixpanelService.trackAuth(AuthEvent.SIGN_UP_FAILED, {
          method: 'email',
          error_message: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        }).catch(() => {});
        
        throw new Error(typeof errorMessage === 'string' ? errorMessage : 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Registration failed';
      console.error('[Auth] Sign up error:', errorMessage);
      
      // Track sign up failed (non-blocking)
      mixpanelService.trackAuth(AuthEvent.SIGN_UP_FAILED, {
        method: 'email',
        error_message: errorMessage,
      }).catch(() => {});
      
      throw error;
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

  const resetPassword = async (email: string, code: string, recaptchaToken: string) => {
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
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Password reset failed';
        throw errorMessage;
      }
      
      return { data: response.data, status: response.status };
    } catch (error) {
      // console.error('Reset password error:', error);
      throw error;
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
      
      // Track password reset completed on success
      if (response.ok) {
        await mixpanelService.trackAuth(AuthEvent.PASSWORD_RESET_COMPLETED);
      }
      if (response.ok) {
        // Create secure session instead of passing password in URL
        const sessionId = await createSecureSession({
          email,
          password: newPassword,
          passwordReset: true
        });
        router.replace(`/success-page?session=${sessionId}`)
      }

    } catch (error) {
      // console.error('handleForgotPasswordChange error:', error);
      throw error;
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
    
    // Delete token from secure storage
    await deleteToken();
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
                oauth_provider: provider,
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