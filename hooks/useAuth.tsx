import React, { createContext, useContext, useState, useEffect } from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { User } from '@/constants/Types';

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (formatData: FormData, router: any) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
  isSignedIn: boolean;
  forgotPassword: (e: string) => {}
  confirmEmail: (e: string, s: string, r: any, p: string) => {}
  updateUser: (formatData: FormData,) => Promise<void>;
}




const AuthContext = createContext<AuthContextType | undefined>(undefined);
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useMMKVStorage<User | null>('user', null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Initial loading state is handled by useMMKVStorage
    setIsLoading(false);
    if (!user?.user_id) {
      setIsSignedIn(false);
    } else {
      api.setAuthToken(user?.token);
      setIsSignedIn(true);
    }

  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post<{ token: string } | any>('/auth/login', {
        email,
        password
      });
      if (!response.ok) {
        throw response.data;
      }
      if (!response.data?.token) {
        throw { detail: "Error, Try again later." }
      }
      await api.setAuthToken(response.data?.token);
      const userResponse = await api.get<User | any>('/auth/me');
      if (!(userResponse.ok && userResponse.data)) {
        throw { detail: "Error, Try again later." }
      }

      const newUser = { ...userResponse.data, token: response.data?.token };

      setUser(newUser);
    } catch (error) {
      console.error('Sign in error:', JSON.stringify(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmEmail = async (email: string, code: string, router: any, password: string) => {
    try {
      const response = await api.post<{ token: string } | any>(`/auth/verify-email`, {
        email: email,
        code: code
      });

      if (response.ok) {
        router.push(`/success-page?email=${email}&password=${password}`)
      }

    } catch (error) {
      console.error('Forgot password error:', JSON.stringify(error))
    }
  }


  const forgotPassword = async (email: string) => {
    try {
      const response = await api.post<{ token: string } | any>(`/auth/reset-password-request?email=${email}`);

      if (!response.ok) {
        throw response.data;
      }
      if (!response.data?.token) {
        throw { detail: "Error, Try again later." }
      }

    } catch (error) {
      console.error('Forgot password error:', JSON.stringify(error))
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
        phone: formData.phone,
        password: formData.password,
      }, {
        headers: {
          "X-Mobile-Recaptcha-Token": "It2wh;Wcj&pkgdD4X2'~6@6FmpqLr1",
          "Content-Type": "application/json",
        }
      });
      if (response.ok) {
        router.push(`/email-verification?email=${formData?.email}&password=${formData.password}`)
      }
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  const updateUser = async (formData: FormData, captchaToken: string, router: any) => {
    try {
      const response = await api.patch<{ token: string } | any>(`/auth/update-user`, {
        first_name: formData.firstName,
        last_name: formData.lastName,
      });
      if (response.ok) {
        const newUser = { ...response.data, token: user?.token };
        setUser(newUser);
        return response.data;
      }

    } catch (error) {
      console.error('updateUser error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };


  const resetPassword = async (email: string) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    setUser(null);
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isLoading, isSignedIn, resetPassword, forgotPassword, confirmEmail, updateUser }}>
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