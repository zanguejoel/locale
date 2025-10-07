import * as SecureStore from 'expo-secure-store';
import { v4 as uuidv4 } from 'uuid';

/**
 * Secure session management for temporary sensitive data
 * Sessions auto-expire after 10 minutes
 */

interface SessionData {
  [key: string]: any;
  timestamp: number;
}

const SESSION_PREFIX = 'session_';
const SESSION_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Create a secure session to store temporary sensitive data
 * Use this instead of passing sensitive data in URL parameters
 */
export const createSecureSession = async (data: any): Promise<string> => {
  const sessionId = uuidv4();
  const sessionData: SessionData = {
    ...data,
    timestamp: Date.now(),
  };
  
  try {
    await SecureStore.setItemAsync(
      `${SESSION_PREFIX}${sessionId}`,
      JSON.stringify(sessionData)
    );
    
    // Schedule cleanup after expiry (best effort - not guaranteed in background)
    setTimeout(() => {
      clearSecureSession(sessionId).catch(() => {/* console.error */});
    }, SESSION_EXPIRY_MS);
    
    return sessionId;
  } catch (error) {
    // console.error('Failed to create secure session:', error);
    throw new Error('Failed to create secure session');
  }
};

/**
 * Retrieve data from a secure session
 * Returns null if session doesn't exist or has expired
 */
export const getSecureSession = async (sessionId: string): Promise<any> => {
  try {
    const data = await SecureStore.getItemAsync(`${SESSION_PREFIX}${sessionId}`);
    
    if (!data) {
      return null;
    }
    
    const sessionData: SessionData = JSON.parse(data);
    
    // Check if session has expired
    if (Date.now() - sessionData.timestamp > SESSION_EXPIRY_MS) {
      await clearSecureSession(sessionId);
      return null;
    }
    
    // Remove timestamp before returning
    const { timestamp, ...userData } = sessionData;
    return userData;
  } catch (error) {
    // console.error('Failed to retrieve secure session:', error);
    return null;
  }
};

/**
 * Clear a secure session after use
 * Always call this after successfully using the session data
 */
export const clearSecureSession = async (sessionId: string): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(`${SESSION_PREFIX}${sessionId}`);
  } catch (error) {
    // console.error('Failed to clear secure session:', error);
    // Don't throw - cleanup is best effort
  }
};

/**
 * Clear all expired sessions
 * Call this periodically or on app startup
 */
export const clearExpiredSessions = async (): Promise<void> => {
  // Note: SecureStore doesn't provide a way to list all keys
  // Individual sessions will be cleared when accessed
  // console.log('Session cleanup runs per-access basis');
};

