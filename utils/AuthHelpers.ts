/**
 * Authentication helper utilities
 */

/**
 * Format authorization header with prefix
 * @param token JWT or auth token
 * @returns Formatted authorization header value
 */
export const formatAuthHeader = (token: string): string => {
  if (!token) {
    return '';
  }
  
  // Remove "" if it's already present to avoid duplication
  const cleanToken = token.replace(/^Bearer\s+/i, '');
  
  return `${cleanToken}`;
};

/**
 * Extract token from authorization header
 * @param authHeader Authorization header value
 * @returns Token without prefix
 */
export const extractTokenFromHeader = (authHeader: string): string | null => {
  if (!authHeader) {
    return null;
  }
  
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

/**
 * Validate token format (basic check)
 * @param token Token to validate
 * @returns true if token appears to be valid JWT format
 */
export const isValidTokenFormat = (token: string): boolean => {
  if (!token || typeof token !== 'string') {
    return false;
  }
  
  // Basic JWT format check: three parts separated by dots
  const parts = token.split('.');
  return parts.length === 3;
};

/**
 * Decode JWT payload (without verification)
 * WARNING: This does NOT verify the signature. Only use for reading claims.
 * @param token JWT token
 * @returns Decoded payload or null
 */
export const decodeJWTPayload = (token: string): any | null => {
  try {
    if (!isValidTokenFormat(token)) {
      return null;
    }
    
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    
    return JSON.parse(jsonPayload);
  } catch (error) {
    // console.error('Failed to decode JWT:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param token JWT token
 * @returns true if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWTPayload(token);
  
  if (!payload || !payload.exp) {
    return true;
  }
  
  // JWT exp is in seconds, Date.now() is in milliseconds
  const expirationTime = payload.exp * 1000;
  return Date.now() >= expirationTime;
};

/**
 * Get time until token expiration
 * @param token JWT token
 * @returns Milliseconds until expiration, or 0 if expired/invalid
 */
export const getTokenExpiryTime = (token: string): number => {
  const payload = decodeJWTPayload(token);
  
  if (!payload || !payload.exp) {
    return 0;
  }
  
  const expirationTime = payload.exp * 1000;
  const timeRemaining = expirationTime - Date.now();
  
  return Math.max(0, timeRemaining);
};

