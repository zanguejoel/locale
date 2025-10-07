import * as SecureStore from 'expo-secure-store';

/**
 * Secure token management for authentication
 * Tokens are stored in the device's secure enclave (iOS) or KeyStore (Android)
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

/**
 * Save authentication token to secure storage
 * @param token JWT or auth token
 */
export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch (error) {
    // console.error('Failed to save auth token:', error);
    throw new Error('Failed to save authentication token');
  }
};

/**
 * Retrieve authentication token from secure storage
 * @returns Token string or null if not found
 */
export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    // console.error('Failed to retrieve auth token:', error);
    return null;
  }
};

/**
 * Delete authentication token from secure storage
 * Call this on logout
 */
export const deleteToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch (error) {
    // console.error('Failed to delete auth token:', error);
    // Don't throw - cleanup is best effort
  }
};

/**
 * Save refresh token to secure storage
 * @param refreshToken Refresh token
 */
export const saveRefreshToken = async (refreshToken: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  } catch (error) {
    // console.error('Failed to save refresh token:', error);
    throw new Error('Failed to save refresh token');
  }
};

/**
 * Retrieve refresh token from secure storage
 * @returns Refresh token string or null if not found
 */
export const getRefreshToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    // console.error('Failed to retrieve refresh token:', error);
    return null;
  }
};

/**
 * Delete refresh token from secure storage
 */
export const deleteRefreshToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    // console.error('Failed to delete refresh token:', error);
  }
};

/**
 * Clear all authentication data
 * Call this on logout or when switching accounts
 */
export const clearAllTokens = async (): Promise<void> => {
  await Promise.all([
    deleteToken(),
    deleteRefreshToken(),
  ]);
};

/**
 * Check if user has a valid token stored
 * @returns true if token exists
 */
export const hasStoredToken = async (): Promise<boolean> => {
  const token = await getToken();
  return token !== null && token.length > 0;
};

