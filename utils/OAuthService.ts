import * as WebBrowser from 'expo-web-browser';
import { OAUTH_CONFIG, generateOAuthState, API_BASE_URL } from '@/constants/OAuthConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveToken, deleteToken, getToken, saveTokenWithExpiry, clearAllTokens } from './SecureTokenManager';
import { Platform } from 'react-native';

export type OAuthProvider = 'google' | 'microsoft';

export interface OAuthResult {
  success: boolean;
  token?: string;
  userId?: string;
  accountType?: string;
  error?: string;
}

interface OAuthAuthUrlResponse {
  authorization_url: string;
  state: string;
}

class OAuthService {
  /**
   * Get OAuth authorization URL from backend
   * Backend has the OAuth credentials and builds the URL
   */
  private async getAuthUrlFromBackend(provider: OAuthProvider): Promise<OAuthAuthUrlResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/oauth/get-auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ provider }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || 'Failed to get OAuth URL');
      }

      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error('[OAuth] Failed to get auth URL from backend:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   * Uses backend OAuth flow - backend has all the credentials
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      // Get OAuth authorization URL from backend
      const { authorization_url, state } = await this.getAuthUrlFromBackend('google');
      
      // Store state for validation later
      await AsyncStorage.setItem('oauth_state', state);
      await AsyncStorage.setItem('oauth_provider', 'google');

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        authorization_url,
        OAUTH_CONFIG.google.redirectUrl
      );

      if (result.type === 'cancel') {
        return {
          success: false,
          error: 'Sign in was cancelled',
        };
      }

      if (result.type === 'success' && result.url) {
        // Parse the callback URL
        return await this.handleOAuthCallback(result.url);
      }

      return {
        success: false,
        error: 'OAuth flow did not complete successfully',
      };

    } catch (error: any) {
      console.error('[OAuth] Google Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Google sign-in failed',
      };
    }
  }

  /**
   * Sign in with Microsoft
   * Uses backend OAuth flow - backend has all the credentials
   */
  async signInWithMicrosoft(): Promise<OAuthResult> {
    try {
      // Get OAuth authorization URL from backend
      const { authorization_url, state } = await this.getAuthUrlFromBackend('microsoft');
      
      // Store state for validation later
      await AsyncStorage.setItem('oauth_state', state);
      await AsyncStorage.setItem('oauth_provider', 'microsoft');

      // Open OAuth URL in browser
      const result = await WebBrowser.openAuthSessionAsync(
        authorization_url,
        OAUTH_CONFIG.microsoft.redirectUrl
      );

      if (result.type === 'cancel') {
        return {
          success: false,
          error: 'Sign in was cancelled',
        };
      }

      if (result.type === 'success' && result.url) {
        // Parse the callback URL
        return await this.handleOAuthCallback(result.url);
      }

      return {
        success: false,
        error: 'OAuth flow did not complete successfully',
      };

    } catch (error: any) {
      console.error('[OAuth] Microsoft Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Microsoft sign-in failed',
      };
    }
  }

  /**
   * Handle OAuth callback from deep link
   * Backend redirects to: odyssey://auth/callback?status=success&token=xxx&user_id=yyy
   */
  private async handleOAuthCallback(callbackUrl: string): Promise<OAuthResult> {
    try {
      // Parse callback URL
      const urlObj = new URL(callbackUrl);
      const status = urlObj.searchParams.get('status');
      const token = urlObj.searchParams.get('token');
      const userId = urlObj.searchParams.get('user_id');
      const accountType = urlObj.searchParams.get('account_type');
      const error = urlObj.searchParams.get('error');
      const message = urlObj.searchParams.get('message');

      if (status === 'success' && token) {
        // Store token securely with 30-day expiry (backend default)
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await saveTokenWithExpiry(token, expiresAt);
        console.log('[OAuth] Token saved with expiry:', expiresAt);
        
        if (userId) {
          await AsyncStorage.setItem('user_id', userId);
        }

        // Clean up
        await AsyncStorage.removeItem('oauth_state');
        await AsyncStorage.removeItem('oauth_provider');

        console.log('[OAuth] Authentication successful');

        return {
          success: true,
          token,
          userId: userId || undefined,
          accountType: accountType || undefined,
        };
      } else {
        console.error('[OAuth] Authentication failed:', error, message);
        return {
          success: false,
          error: message || error || 'OAuth authentication failed',
        };
      }

    } catch (error: any) {
      console.error('[OAuth] Callback parsing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to parse OAuth response',
      };
    }
  }

  /**
   * Sign out and clear OAuth session data
   */
  async signOut(provider?: OAuthProvider) {
    try {
      // Clean up stored data including token expiry
      await clearAllTokens();
      await AsyncStorage.removeItem('user_id');
      await AsyncStorage.removeItem('oauth_state');
      await AsyncStorage.removeItem('oauth_provider');

      console.log('[OAuth] Sign out complete');
    } catch (error) {
      console.error('[OAuth] Sign out error:', error);
    }
  }

  /**
   * Get current signed-in provider
   */
  async getCurrentProvider(): Promise<OAuthProvider | null> {
    // Check if we have a stored provider from the last OAuth login
    const storedProvider = await AsyncStorage.getItem('oauth_provider');
    if (storedProvider) {
      return storedProvider as OAuthProvider;
    }

    // Check if we have any auth token
    const token = await getToken();
    return token ? null : null;
  }
}

export default new OAuthService();

