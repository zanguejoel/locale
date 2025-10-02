import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { User } from '@/constants/Types';
import { saveToken, getToken, deleteToken } from '@/utils/SecureTokenManager';
import { createSecureSession, getSecureSession } from '@/utils/SecureSession';
import { formatAuthHeader } from '@/utils/AuthHelpers';

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
  handleForgotPasswordChange: (email: string, token: string, newPassword: string, router: any) => Promise<void>
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
      const response = await api.post<{ token: string } | any>('/auth/login', {
        email,
        password
      });
      if (!response.ok) {
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Login failed';
        throw errorMessage;
      }
      if (!response.data?.token) {
        throw { detail: "Error, Try again later." }
      }
      
      // Store token securely in SecureStore
      await saveToken(response.data.token);
      api.setAuthToken(response.data.token);
      
      const userResponse = await api.get<User | any>('/auth/me');
      if (!(userResponse.ok && userResponse.data)) {
        throw { detail: "Error, Try again later." }
      }

      // Store user data WITHOUT token
      const newUser = { ...userResponse.data };

      if (isMountedRef.current) {
        setUser(newUser);
      }
    } catch (error) {
      console.error('Sign in error:', JSON.stringify(error));
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
      console.error('Email verification error:', JSON.stringify(error))
      throw error
    }
  }


  const forgotPassword = async (email: string) => {
    // setIsLoading(true);
    try {
      const response = await api.post<{ token: string } | any>(`/auth/reset-password-request?email=${encodeURIComponent(email)}`);
      
     //  alert(JSON.stringify(response.ok ? 'true' : 'false'));
      return response;


    } catch (error) {
      console.error('Forgot password error:', JSON.stringify(error))
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
      console.error('Forgot password error:', JSON.stringify(error))
    } finally {
      setIsLoading(false);
    }
  }

  const signUp = async (formData: FormData, router: any) => {
    try {
      setIsLoading(true);

      const response = await api.post<{ token: string } | any>("/auth/signup", {
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
      });
      
      if (response.ok) {
        // Create secure session instead of passing password in URL
        const sessionId = await createSecureSession({
          email: formData.email,
          password: formData.password,
          requiresVerification: true
        });
        router.push(`/email-verification?session=${sessionId}`)
      } else {
        // Handle error properly when response.data is null or doesn't have detail
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Registration failed';
        throw errorMessage;
      }
    } catch (error) {
      console.error("Sign up error: ", error);
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
      console.error('updateUser error:', error);
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
        return response.data;
      } else {
        const errorMessage = response.data?.detail || response.data?.message || response.problem || 'Password change failed';
        throw errorMessage;
      }

    } catch (error) {
      console.error('changePassword error:', error);
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
      console.error('Reset password error:', error);
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
      console.error('handleForgotPasswordChange error:', error);
      throw error;
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const signOut = async () => {
    // Delete token from secure storage
    await deleteToken();
    setUser(null);
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isLoading, isInitialLoading, isSignedIn, resetPassword, forgotPassword, confirmEmail, updateUser, changePassword, confirmCode, handleForgotPasswordChange }}>
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