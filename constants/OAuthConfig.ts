import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export const API_BASE_URL = 'https://api-alpha.odysseytech.ai';

/**
 * OAuth configuration for mobile app
 * Note: Client IDs are fetched from backend via /auth/oauth/get-auth-url
 * This is just for reference and deep linking configuration
 */
export const OAUTH_CONFIG = {
  google: {
    scopes: ['openid', 'email', 'profile'],
    redirectUrl: `odyssey://auth/callback`,
  },
  microsoft: {
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUrl: `odyssey://auth/callback`,
  },
};

// Generate secure state parameter for CSRF protection
export const generateOAuthState = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return randomBytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
};


