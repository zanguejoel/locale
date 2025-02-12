import React, { createContext, useContext, useState, useEffect } from 'react';
import useMMKVStorage, { storage } from './useMMKVStorage';
import api from '@/utils/ApiClient';
import { User } from '@/constants/Types';



interface AuthContextType {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  isLoading: boolean;
  isSignedIn: boolean;
}



const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useMMKVStorage<User | null>('user', null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    // Initial loading state is handled by useMMKVStorage
    setIsLoading(false);
    if(!user?.user_id) {
      setIsSignedIn(false);
    } else {
      setIsSignedIn(true);
    }

  }, [user]);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await api.post<{token: string} | any>('/auth/login', {
          email,
          password
      });
      if(!response.ok) {
        throw response.data;
      }
      if(!response.data?.token) {
        throw {detail: "Error, Try again later."}
      }
      await api.setAuthToken(response.data?.token);
      const userResponse = await  api.get<User | any>('/auth/me');
      if(!(userResponse.ok && userResponse.data)) {
        throw {detail: "Error, Try again later."}
      }
      console.log(console.log(JSON.stringify(userResponse.data)));
      const newUser = {...userResponse.data, token: response.data?.token };
      
      setUser(newUser);
    } catch (error) {
      console.error('Sign in error:', JSON.stringify(error));
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      const newUser = { email };
      setIsSignedIn(true);
      setUser(newUser as User);
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
    <AuthContext.Provider value={{ user, signIn, signUp, signOut, isLoading, isSignedIn }}>
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