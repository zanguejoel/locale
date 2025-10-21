import * as SecureStore from 'expo-secure-store';

/**
 * Secure token management for authentication
 * Tokens are stored in the device's secure enclave (iOS) or KeyStore (Android)
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

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
 * Check if user has a valid token stored
 * @returns true if token exists
 */
export const hasStoredToken = async (): Promise<boolean> => {
  const token = await getToken();
  return token !== null && token.length > 0;
};

/**
 * Save authentication token with expiry date
 * @param token Auth token
 * @param expiresAt ISO date string for when token expires
 */
export const saveTokenWithExpiry = async (token: string, expiresAt: string): Promise<void> => {
  try {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, token),
      SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, expiresAt)
    ]);
  } catch (error) {
    // console.error('Failed to save token with expiry:', error);
    throw new Error('Failed to save authentication token with expiry');
  }
};

/**
 * Get token expiry date from secure storage
 * @returns ISO date string or null if not found
 */
export const getTokenExpiry = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY);
  } catch (error) {
    // console.error('Failed to retrieve token expiry:', error);
    return null;
  }
};

/**
 * Delete token expiry from secure storage
 */
export const deleteTokenExpiry = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY);
  } catch (error) {
    // console.error('Failed to delete token expiry:', error);
  }
};

/**
 * Check if token is expired
 * @returns true if token is expired or expiry not found
 */
export const isTokenExpired = async (): Promise<boolean> => {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) return true;
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    
    // Token is expired if current time is past expiry
    return now >= expiryDate;
  } catch (error) {
    // console.error('Failed to check token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Check if token is near expiry (within 24 hours)
 * @returns true if token expires within 24 hours or expiry not found
 */
export const isTokenNearExpiry = async (): Promise<boolean> => {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) return true;
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    const hoursDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Refresh if expires within 24 hours
    return hoursDiff < 24;
  } catch (error) {
    // console.error('Failed to check token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Get hours until token expiry
 * @returns Number of hours until token expires, or null if no expiry found
 */
export const getHoursUntilExpiry = async (): Promise<number | null> => {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) return null;
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    const hoursDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff;
  } catch (error) {
    // console.error('Failed to get hours until expiry:', error);
    return null;
  }
};

/**
 * Check if token is near expiry with a custom threshold
 * @param hoursThreshold Number of hours before expiry to consider "near expiry"
 * @returns true if token expires within the specified hours or expiry not found
 */
export const isTokenNearExpiryWithThreshold = async (hoursThreshold: number): Promise<boolean> => {
  try {
    const expiry = await getTokenExpiry();
    if (!expiry) return true;
    
    const expiryDate = new Date(expiry);
    const now = new Date();
    const hoursDiff = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Token is near expiry if it expires within the threshold AND hasn't expired yet
    return hoursDiff > 0 && hoursDiff <= hoursThreshold;
  } catch (error) {
    // console.error('Failed to check token expiry:', error);
    return true; // Assume expired on error
  }
};

/**
 * Clear all authentication data including expiry
 * Enhanced version that also clears token expiry
 */
export const clearAllTokens = async (): Promise<void> => {
  await Promise.all([
    deleteToken(),
    deleteRefreshToken(),
    deleteTokenExpiry(),
  ]);
};

