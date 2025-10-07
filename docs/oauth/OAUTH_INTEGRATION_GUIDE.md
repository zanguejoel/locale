# Mobile OAuth Integration Guide
## Google & Microsoft Authentication for Odyssey Mobile App

**Version:** 1.0  
**Last Updated:** October 7, 2025  
**Status:** Implementation Required

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Current Status](#current-status)
3. [Architecture](#architecture)
4. [Prerequisites](#prerequisites)
5. [Installation](#installation)
6. [iOS Configuration](#ios-configuration)
7. [Android Configuration](#android-configuration)
8. [Implementation Guide](#implementation-guide)
9. [Backend Integration](#backend-integration)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Security Considerations](#security-considerations)

---

## 🎯 Overview

This guide provides step-by-step instructions for integrating Google and Microsoft OAuth authentication into the Odyssey mobile app. The implementation leverages existing backend OAuth infrastructure while providing native mobile OAuth experiences.

### Goals

- ✅ Enable users to sign in with Google
- ✅ Enable users to sign in with Microsoft
- ✅ Seamless integration with existing backend OAuth endpoints
- ✅ Native mobile OAuth experience (no WebView)
- ✅ Secure token storage using existing `SecureTokenManager`
- ✅ Support for both iOS and Android platforms

---

## 📊 Current Status

### Backend (✅ Complete)

**Endpoints Available:**
- `POST /auth/oauth/get-auth-url` - Get authorization URL
- `GET /auth/authorize-gmail/callback` - Google OAuth callback
- `GET /auth/authorize-microsoft/callback` - Microsoft OAuth callback
- `POST /auth/refresh-token` - Refresh expired tokens

**Backend URL:** `https://api-alpha.odysseytech.ai`

**OAuth Features:**
- ✅ Automatic user registration for new users
- ✅ Automatic login for existing users
- ✅ CSRF protection with state parameter
- ✅ Email verification (OAuth users are automatically verified)
- ✅ Team and personal account support

### Web Frontend (✅ Complete)

- ✅ OAuth UI buttons implemented
- ✅ OAuth flow with backend integration
- ✅ Callback page handling
- ✅ Token storage and management

### Mobile App (❌ Not Implemented)

- ❌ OAuth UI components
- ❌ OAuth flow implementation
- ❌ Deep linking configuration
- ❌ Platform-specific OAuth setup
- ❌ OAuth callback handling

---

## 🏗️ Architecture

### OAuth Flow Overview

```
┌─────────────┐
│ Mobile App  │
│   (User)    │
└──────┬──────┘
       │ 1. Tap "Sign in with Google/Microsoft"
       ↓
┌─────────────────────────────────────────────────────┐
│  Mobile App - OAuth Initiation                       │
│  • Generate state parameter                          │
│  • Store state in AsyncStorage                       │
│  • Open native OAuth browser                         │
└──────┬──────────────────────────────────────────────┘
       │ 2. Redirect to OAuth Provider
       ↓
┌─────────────────────────────────────────────────────┐
│  Google / Microsoft                                  │
│  • User authenticates                                │
│  • User grants permissions                           │
└──────┬──────────────────────────────────────────────┘
       │ 3. Redirect to backend callback
       ↓
┌─────────────────────────────────────────────────────┐
│  Backend: /auth/authorize-{provider}/callback        │
│  • Exchange code for tokens                          │
│  • Get user info from provider                       │
│  • Create or login user                              │
│  • Generate auth token                               │
│  • Redirect to mobile deep link                      │
└──────┬──────────────────────────────────────────────┘
       │ 4. Deep link: odyssey://auth/callback?token=...
       ↓
┌─────────────────────────────────────────────────────┐
│  Mobile App - Callback Handler                       │
│  • Validate state parameter                          │
│  • Extract token from URL                            │
│  • Store token securely (SecureTokenManager)         │
│  • Navigate to main app                              │
└─────────────────────────────────────────────────────┘
```

### Backend Integration Points

```typescript
// 1. Get OAuth Authorization URL (Optional - we can build it on mobile)
POST https://api-alpha.odysseytech.ai/auth/oauth/get-auth-url
Body: { "provider": "google" | "microsoft" }
Response: {
  "authorization_url": "https://accounts.google.com/...",
  "state": "uuid-string"
}

// 2. OAuth Callback (Backend handles automatically)
GET https://api-alpha.odysseytech.ai/auth/authorize-gmail/callback
Query: ?code=...&state=...

// 3. Backend redirects to mobile app
odyssey://auth/callback?status=success&token=xxx&user_id=yyy&account_type=zzz&type=Google

// 4. Token Refresh (when token expires)
POST https://api-alpha.odysseytech.ai/auth/refresh-token
Body: {
  "token": "current-token",
  "user_id": "user-id",
  "client": "APP"
}
```

---

## ✅ Prerequisites

### Required Credentials

#### 1. Google OAuth Credentials

**Where to get:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Create credentials for:
   - **iOS Application**
     - Bundle ID: `com.neptunetech.odyssey` (or your bundle ID)
   - **Android Application**
     - Package name: `com.neptunetech.odyssey`
     - SHA-1 certificate fingerprint

**Required values:**
```bash
GOOGLE_OAUTH_CLIENT_ID_IOS=<your-ios-client-id>
GOOGLE_OAUTH_CLIENT_ID_ANDROID=<your-android-client-id>
GOOGLE_OAUTH_CLIENT_ID_WEB=<your-web-client-id> # For token exchange
```

#### 2. Microsoft OAuth Credentials

**Where to get:**
1. Go to [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
2. Click "New registration"
3. Set name: "Odyssey Mobile"
4. Select "Accounts in any organizational directory and personal Microsoft accounts"
5. Add redirect URIs:
   - **iOS**: `msauth.com.neptunetech.odyssey://auth`
   - **Android**: `msauth://com.neptunetech.odyssey/signature-hash`

**Required values:**
```bash
MICROSOFT_OAUTH_CLIENT_ID=<your-microsoft-client-id>
MICROSOFT_OAUTH_TENANT_ID=common # or your tenant ID
```

#### 3. Backend Configuration

The backend is already configured with OAuth credentials. Verify these environment variables are set:

```bash
# Backend (already configured)
GOOGLE_OAUTH_CLIENT_ID=<backend-google-client-id>
GOOGLE_OAUTH_CLIENT_SECRET=<backend-google-client-secret>
MICROSOFT_OAUTH_CLIENT_ID=<backend-microsoft-client-id>
MICROSOFT_OAUTH_CLIENT_SECRET=<backend-microsoft-client-secret>
SERVER_URL=https://api-alpha.odysseytech.ai
FRONTEND_URL=https://odysseytech.ai
```

### Required Tools

- Node.js 18+
- React Native 0.76+
- Expo 52+
- Xcode 15+ (for iOS)
- Android Studio (for Android)
- CocoaPods (for iOS)

---

## 📦 Installation

### 1. Install Dependencies

```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app

# Install OAuth libraries
npx expo install expo-auth-session expo-crypto expo-web-browser

# Install Google Sign-In (native)
npx expo install @react-native-google-signin/google-signin

# Install Microsoft Authentication Library
npm install @azure/msal-react-native

# Install required peer dependencies
npm install react-native-get-random-values
```

### 2. Update app.json

Add deep linking configuration:

```json
{
  "expo": {
    "scheme": "odyssey",
    "ios": {
      "bundleIdentifier": "com.neptunetech.odyssey",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": ["odyssey", "com.neptunetech.odyssey"]
          }
        ],
        "LSApplicationQueriesSchemes": [
          "googlegmail",
          "comgooglegmail",
          "ms-outlook",
          "msauth"
        ]
      },
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.neptunetech.odyssey",
      "googleServicesFile": "./google-services.json",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "odyssey",
              "host": "auth"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      "@react-native-google-signin/google-signin",
      [
        "expo-build-properties",
        {
          "ios": {
            "useFrameworks": "static"
          }
        }
      ]
    ]
  }
}
```

---

## 🍎 iOS Configuration

### 1. Update Info.plist

The OAuth redirect URLs need to be configured. Edit `ios/Odyssey/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleTypeRole</key>
    <string>Editor</string>
    <key>CFBundleURLName</key>
    <string>com.neptunetech.odyssey</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>odyssey</string>
      <string>com.neptunetech.odyssey</string>
    </array>
  </dict>
</array>

<key>LSApplicationQueriesSchemes</key>
<array>
  <string>googlegmail</string>
  <string>comgooglegmail</string>
  <string>ms-outlook</string>
  <string>msauth</string>
</array>
```

### 2. Configure Google Sign-In (iOS)

Create `GoogleService-Info.plist` from Google Cloud Console and add to `ios/` directory.

Update `ios/Odyssey/AppDelegate.mm`:

```objc
#import <GoogleSignIn/GoogleSignIn.h>

// Add this method
- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [GIDSignIn.sharedInstance handleURL:url];
}
```

### 3. Install Pods

```bash
cd ios
pod install
cd ..
```

---

## 🤖 Android Configuration

### 1. Update AndroidManifest.xml

Edit `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest>
  <application>
    <!-- Deep Linking for OAuth -->
    <activity
      android:name=".MainActivity"
      android:launchMode="singleTask">
      
      <!-- OAuth Callback Intent Filter -->
      <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="odyssey" android:host="auth" />
      </intent-filter>
    </activity>
  </application>
</manifest>
```

### 2. Configure Google Sign-In (Android)

Download `google-services.json` from Google Cloud Console and add to `android/app/`.

Update `android/app/build.gradle`:

```gradle
apply plugin: 'com.android.application'
apply plugin: 'com.google.gms.google-services' // Add this

android {
  // ... existing config
  
  defaultConfig {
    // ... existing config
    
    // Add OAuth redirect scheme
    manifestPlaceholders = [
      appAuthRedirectScheme: 'com.neptunetech.odyssey'
    ]
  }
}

dependencies {
  // ... existing dependencies
  
  // Google Play Services (if not already added)
  implementation 'com.google.android.gms:play-services-auth:20.7.0'
}
```

Update `android/build.gradle`:

```gradle
buildscript {
  dependencies {
    // ... existing dependencies
    classpath 'com.google.gms:google-services:4.4.0'
  }
}
```

### 3. Get SHA-1 Certificate Fingerprint

```bash
# Debug certificate
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Production certificate (when you have one)
keytool -list -v -keystore /path/to/your/keystore.jks -alias your-alias
```

Add the SHA-1 fingerprint to Google Cloud Console OAuth credentials.

---

## 💻 Implementation Guide

### Step 1: Create OAuth Configuration

Create `constants/OAuthConfig.ts`:

```typescript
import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

export const API_BASE_URL = 'https://api-alpha.odysseytech.ai';

export const OAUTH_CONFIG = {
  google: {
    clientId: Platform.select({
      ios: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',
      android: 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com',
      default: 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com',
    }),
    scopes: ['openid', 'email', 'profile'],
    redirectUrl: `odyssey://auth/callback`,
  },
  microsoft: {
    clientId: 'YOUR_MICROSOFT_CLIENT_ID',
    tenantId: 'common',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUrl: Platform.select({
      ios: 'msauth.com.neptunetech.odyssey://auth',
      android: 'msauth://com.neptunetech.odyssey/YOUR_SIGNATURE_HASH',
      default: 'odyssey://auth/callback',
    }),
  },
};

// Generate secure state parameter
export const generateOAuthState = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return randomBytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
};
```

### Step 2: Create OAuth Service

Create `utils/OAuthService.ts`:

```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { PublicClientApplication } from '@azure/msal-react-native';
import { OAUTH_CONFIG, generateOAuthState, API_BASE_URL } from '@/constants/OAuthConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecureTokenManager } from './SecureTokenManager';
import { Platform } from 'react-native';

export type OAuthProvider = 'google' | 'microsoft';

export interface OAuthResult {
  success: boolean;
  token?: string;
  userId?: string;
  accountType?: string;
  error?: string;
}

class OAuthService {
  private msalClient: PublicClientApplication | null = null;

  constructor() {
    this.initializeGoogleSignIn();
    this.initializeMicrosoftAuth();
  }

  /**
   * Initialize Google Sign-In
   */
  private initializeGoogleSignIn() {
    GoogleSignin.configure({
      webClientId: OAUTH_CONFIG.google.clientId,
      offlineAccess: true,
      scopes: OAUTH_CONFIG.google.scopes,
    });
  }

  /**
   * Initialize Microsoft Authentication
   */
  private async initializeMicrosoftAuth() {
    try {
      this.msalClient = await PublicClientApplication.createPublicClientApplication({
        clientId: OAUTH_CONFIG.microsoft.clientId,
        authority: `https://login.microsoftonline.com/${OAUTH_CONFIG.microsoft.tenantId}`,
      });
    } catch (error) {
      console.error('Failed to initialize Microsoft auth:', error);
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle(): Promise<OAuthResult> {
    try {
      // Check if device supports Google Play Services (Android)
      await GoogleSignin.hasPlayServices();

      // Generate and store state for CSRF protection
      const state = await generateOAuthState();
      await AsyncStorage.setItem('oauth_state', state);
      await AsyncStorage.setItem('oauth_provider', 'google');

      // Sign in with Google
      const userInfo = await GoogleSignin.signIn();

      // Get authentication token
      const tokens = await GoogleSignin.getTokens();

      // Build authorization URL that points to backend
      const authUrl = this.buildBackendOAuthUrl('google', userInfo.serverAuthCode || '', state);

      // Send authorization code to backend
      return await this.handleBackendOAuthCallback(authUrl);

    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Google sign-in failed',
      };
    }
  }

  /**
   * Sign in with Microsoft
   */
  async signInWithMicrosoft(): Promise<OAuthResult> {
    try {
      if (!this.msalClient) {
        throw new Error('Microsoft auth not initialized');
      }

      // Generate and store state for CSRF protection
      const state = await generateOAuthState();
      await AsyncStorage.setItem('oauth_state', state);
      await AsyncStorage.setItem('oauth_provider', 'microsoft');

      // Acquire token interactively
      const result = await this.msalClient.acquireToken({
        scopes: OAUTH_CONFIG.microsoft.scopes,
      });

      if (!result) {
        throw new Error('Failed to acquire token');
      }

      // Build authorization URL that points to backend
      const authUrl = this.buildBackendOAuthUrl('microsoft', result.accessToken, state);

      // Send authorization code to backend
      return await this.handleBackendOAuthCallback(authUrl);

    } catch (error: any) {
      console.error('Microsoft Sign-In Error:', error);
      return {
        success: false,
        error: error.message || 'Microsoft sign-in failed',
      };
    }
  }

  /**
   * Build backend OAuth callback URL
   */
  private buildBackendOAuthUrl(provider: string, code: string, state: string): string {
    const callbackPath = provider === 'google' 
      ? '/auth/authorize-gmail/callback'
      : '/auth/authorize-microsoft/callback';
    
    return `${API_BASE_URL}${callbackPath}?code=${code}&state=${state}`;
  }

  /**
   * Handle backend OAuth callback by calling the URL
   * This simulates the OAuth redirect flow
   */
  private async handleBackendOAuthCallback(url: string): Promise<OAuthResult> {
    try {
      // Backend will process OAuth and return redirect URL with token
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual', // Don't follow redirects automatically
      });

      // Backend redirects to: odyssey://auth/callback?status=success&token=xxx&user_id=yyy
      const redirectUrl = response.headers.get('location');
      
      if (!redirectUrl) {
        throw new Error('No redirect URL from backend');
      }

      // Parse redirect URL
      const urlObj = new URL(redirectUrl);
      const status = urlObj.searchParams.get('status');
      const token = urlObj.searchParams.get('token');
      const userId = urlObj.searchParams.get('user_id');
      const accountType = urlObj.searchParams.get('account_type');
      const error = urlObj.searchParams.get('error');

      if (status === 'success' && token) {
        // Verify state parameter
        const storedState = await AsyncStorage.getItem('oauth_state');
        const returnedState = urlObj.searchParams.get('state');
        
        if (storedState && returnedState && storedState !== returnedState) {
          throw new Error('State mismatch - potential CSRF attack');
        }

        // Store token securely
        await SecureTokenManager.setToken('auth_token', token);
        if (userId) {
          await AsyncStorage.setItem('user_id', userId);
        }

        // Clean up
        await AsyncStorage.removeItem('oauth_state');
        await AsyncStorage.removeItem('oauth_provider');

        return {
          success: true,
          token,
          userId: userId || undefined,
          accountType: accountType || undefined,
        };
      } else {
        return {
          success: false,
          error: error || 'OAuth authentication failed',
        };
      }

    } catch (error: any) {
      console.error('Backend OAuth callback error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete OAuth flow',
      };
    }
  }

  /**
   * Sign out from OAuth providers
   */
  async signOut(provider?: OAuthProvider) {
    try {
      if (provider === 'google' || !provider) {
        const isSignedIn = await GoogleSignin.isSignedIn();
        if (isSignedIn) {
          await GoogleSignin.signOut();
        }
      }

      if (provider === 'microsoft' || !provider) {
        if (this.msalClient) {
          const accounts = await this.msalClient.getAccounts();
          for (const account of accounts) {
            await this.msalClient.removeAccount(account);
          }
        }
      }

      // Clean up stored data
      await SecureTokenManager.removeToken('auth_token');
      await AsyncStorage.removeItem('user_id');
      await AsyncStorage.removeItem('oauth_state');
      await AsyncStorage.removeItem('oauth_provider');

    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  /**
   * Get current signed-in provider
   */
  async getCurrentProvider(): Promise<OAuthProvider | null> {
    const isGoogleSignedIn = await GoogleSignin.isSignedIn();
    if (isGoogleSignedIn) return 'google';

    if (this.msalClient) {
      const accounts = await this.msalClient.getAccounts();
      if (accounts.length > 0) return 'microsoft';
    }

    return null;
  }
}

export default new OAuthService();
```

### Step 3: Create OAuth Buttons Component

Create `components/OAuthButtons.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OAuthService, { OAuthResult } from '@/utils/OAuthService';
import { router } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';

interface OAuthButtonsProps {
  onSuccess?: (result: OAuthResult) => void;
  onError?: (error: string) => void;
}

export default function OAuthButtons({ onSuccess, onError }: OAuthButtonsProps) {
  const theme = useTheme();
  const [loading, setLoading] = useState<'google' | 'microsoft' | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading('google');
    try {
      const result = await OAuthService.signInWithGoogle();
      
      if (result.success) {
        onSuccess?.(result);
        // Navigate to main app
        router.replace('/(chat)/new');
      } else {
        onError?.(result.error || 'Google sign-in failed');
      }
    } catch (error: any) {
      onError?.(error.message || 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  const handleMicrosoftSignIn = async () => {
    setLoading('microsoft');
    try {
      const result = await OAuthService.signInWithMicrosoft();
      
      if (result.success) {
        onSuccess?.(result);
        // Navigate to main app
        router.replace('/(chat)/new');
      } else {
        onError?.(result.error || 'Microsoft sign-in failed');
      }
    } catch (error: any) {
      onError?.(error.message || 'An error occurred');
    } finally {
      setLoading(null);
    }
  };

  return (
    <View style={styles.container}>
      {/* Divider */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Or continue with</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* OAuth Buttons */}
      <View style={styles.buttonsContainer}>
        {/* Google Sign-In Button */}
        <TouchableOpacity
          style={[styles.oauthButton, styles.googleButton]}
          onPress={handleGoogleSignIn}
          disabled={loading !== null}
        >
          {loading === 'google' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#fff" />
              <Text style={styles.googleButtonText}>Google</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Microsoft Sign-In Button */}
        <TouchableOpacity
          style={[styles.oauthButton, styles.microsoftButton]}
          onPress={handleMicrosoftSignIn}
          disabled={loading !== null}
        >
          {loading === 'microsoft' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="logo-microsoft" size={20} color="#fff" />
              <Text style={styles.microsoftButtonText}>Microsoft</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Privacy Notice */}
      <Text style={styles.privacyText}>
        By continuing, you agree to our Terms of Service and Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 20,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  oauthButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  googleButton: {
    backgroundColor: '#EA4335',
  },
  microsoftButton: {
    backgroundColor: '#00A4EF',
  },
  googleButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  microsoftButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  privacyText: {
    marginTop: 16,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 16,
  },
});
```

### Step 4: Update Login Screen

Update `app/login.tsx` to include OAuth buttons:

```typescript
// Add to imports
import OAuthButtons from '@/components/OAuthButtons';

// Add inside the ScrollView, after the login button
<OAuthButtons
  onSuccess={(result) => {
    console.log('OAuth success:', result);
    // Navigation is handled by OAuthButtons component
  }}
  onError={(error) => {
    Alert.alert('Authentication Error', error);
  }}
/>
```

### Step 5: Update Registration Screen

Update `app/registration.tsx` similarly:

```typescript
// Add to imports
import OAuthButtons from '@/components/OAuthButtons';

// Add inside the ScrollView, before the form
<OAuthButtons
  onSuccess={(result) => {
    console.log('OAuth success:', result);
    // Navigation is handled by OAuthButtons component
  }}
  onError={(error) => {
    Alert.alert('Authentication Error', error);
  }}
/>
```

### Step 6: Update Auth Hook

Update `hooks/useAuth.tsx` to support OAuth:

```typescript
// Add OAuth methods to useAuth hook
import OAuthService from '@/utils/OAuthService';

export const useAuth = () => {
  // ... existing code ...

  const signInWithOAuth = async (provider: 'google' | 'microsoft') => {
    try {
      const result = provider === 'google'
        ? await OAuthService.signInWithGoogle()
        : await OAuthService.signInWithMicrosoft();

      if (result.success && result.token) {
        // Token is already stored by OAuthService
        return result;
      } else {
        throw new Error(result.error || 'OAuth sign-in failed');
      }
    } catch (error) {
      console.error('OAuth error:', error);
      throw error;
    }
  };

  const signOutFromOAuth = async () => {
    await OAuthService.signOut();
  };

  return {
    // ... existing exports ...
    signInWithOAuth,
    signOutFromOAuth,
  };
};
```

---

## 🔗 Backend Integration

### Backend Endpoints

The backend is already configured and ready to use. Here's how the mobile app interacts with it:

#### 1. OAuth Authorization Flow

**Mobile App → OAuth Provider → Backend Callback → Mobile App**

```
1. Mobile app initiates OAuth with Google/Microsoft
2. User authenticates with provider
3. Provider redirects to backend callback with authorization code
4. Backend:
   - Exchanges code for tokens
   - Gets user info
   - Creates/logs in user
   - Generates auth token
   - Redirects to: odyssey://auth/callback?status=success&token=xxx
5. Mobile app receives deep link and extracts token
```

#### 2. Backend Callback URLs

**Important:** Configure these URLs in OAuth provider consoles:

```
Google Callback:
https://api-alpha.odysseytech.ai/auth/authorize-gmail/callback

Microsoft Callback:
https://api-alpha.odysseytech.ai/auth/authorize-microsoft/callback
```

#### 3. Mobile Deep Link

After successful authentication, backend redirects to:

```
odyssey://auth/callback?status=success&token=xxx&user_id=yyy&account_type=zzz&type=Google

Parameters:
- status: "success" or "error"
- token: Authentication token (if success)
- user_id: User ID (if success)
- account_type: "personal" or "team"
- type: "Google" or "Microsoft"
- error: Error message (if error)
- message: Error description (if error)
```

#### 4. Error Handling

Backend returns these error types:

```
odyssey://auth/callback?status=error&error=oauth_failed&message=...&type=Google
odyssey://auth/callback?status=error&error=missing_code&message=...&type=Google
odyssey://auth/callback?status=error&error=account_inactive&message=...&type=Google
odyssey://auth/callback?status=error&error=internal_error&message=...&type=Google
```

### Backend OAuth Flow Details

#### Google OAuth Flow

```python
# Backend: /auth/authorize-gmail/callback
@router.get("/authorize-gmail/callback")
async def authorize_gmail_callback(
    code: str,
    state: str,
    error: str = None
):
    # 1. Exchange code for tokens
    token_data = google_oauth.exchange_code_for_token(code)
    
    # 2. Get user info
    user_info = google_oauth.get_user_info(token_data["access_token"])
    
    # 3. Create or login user
    db_user = get_or_create_user(user_info["email"])
    
    # 4. Generate auth token
    auth_token = create_auth_token(db_user)
    
    # 5. Redirect to mobile app
    return RedirectResponse(
        f"odyssey://auth/callback?status=success&token={auth_token.token}&user_id={db_user.user_id}&account_type=personal&type=Google"
    )
```

#### Microsoft OAuth Flow

```python
# Backend: /auth/authorize-microsoft/callback
@router.get("/authorize-microsoft/callback")
async def authorize_microsoft_callback(
    code: str,
    state: str,
    error: str = None
):
    # Same flow as Google
    # 1. Exchange code for tokens
    # 2. Get user info from Microsoft Graph
    # 3. Create or login user
    # 4. Generate auth token
    # 5. Redirect to mobile app
```

---

## 🧪 Testing

### Development Testing

#### 1. Test Google OAuth (iOS Simulator)

```bash
# Run app in iOS simulator
pnpm ios

# Steps to test:
1. Launch app
2. Navigate to login screen
3. Tap "Sign in with Google"
4. Authenticate with test Google account
5. Verify redirect back to app
6. Verify token is stored
7. Verify navigation to main app
```

#### 2. Test Microsoft OAuth (iOS Simulator)

```bash
# Run app in iOS simulator
pnpm ios

# Steps to test:
1. Launch app
2. Navigate to login screen
3. Tap "Sign in with Microsoft"
4. Authenticate with test Microsoft account
5. Verify redirect back to app
6. Verify token is stored
7. Verify navigation to main app
```

#### 3. Test on Physical Device

**iOS Device:**
```bash
# Build development build
npx expo run:ios --device

# Test OAuth flow on physical device
# Note: OAuth may not work properly in simulator
```

**Android Device:**
```bash
# Build development build
npx expo run:android --device

# Test OAuth flow on physical device
```

### Test Cases

#### Test Case 1: New User Sign-Up via Google

```
1. User has never used the app before
2. Tap "Sign in with Google"
3. Authenticate with Google
4. Expected: New account created, user logged in, redirected to main app
5. Verify: User info populated from Google (name, email)
```

#### Test Case 2: Existing User Login via Google

```
1. User has existing account with email matching Google account
2. Tap "Sign in with Google"
3. Authenticate with Google
4. Expected: User logged in with existing account
5. Verify: User data preserved, not duplicated
```

#### Test Case 3: OAuth Error Handling

```
1. Initiate OAuth flow
2. Cancel authentication at OAuth provider
3. Expected: Return to login screen with error message
4. Verify: No token stored, user remains on login screen
```

#### Test Case 4: State Parameter Validation

```
1. Initiate OAuth flow
2. Intercept callback and modify state parameter
3. Expected: Authentication rejected with "State mismatch" error
4. Verify: CSRF protection working
```

#### Test Case 5: Token Refresh

```
1. Sign in with OAuth
2. Wait for token to expire (or manually expire in backend)
3. Make API call that requires authentication
4. Expected: Token automatically refreshed
5. Verify: Seamless user experience, no re-login required
```

### Testing Checklist

- [ ] Google OAuth works on iOS simulator
- [ ] Google OAuth works on iOS physical device
- [ ] Google OAuth works on Android emulator
- [ ] Google OAuth works on Android physical device
- [ ] Microsoft OAuth works on iOS simulator
- [ ] Microsoft OAuth works on iOS physical device
- [ ] Microsoft OAuth works on Android emulator
- [ ] Microsoft OAuth works on Android physical device
- [ ] New user registration works
- [ ] Existing user login works
- [ ] OAuth cancellation handled properly
- [ ] Network errors handled gracefully
- [ ] Token storage is secure
- [ ] Token refresh works
- [ ] Sign out clears OAuth session
- [ ] Deep linking works correctly
- [ ] State parameter validation works
- [ ] Backend callback works
- [ ] Error messages are user-friendly

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: "Google Sign-In Failed" on Android

**Cause:** SHA-1 fingerprint not configured or incorrect

**Solution:**
```bash
# Get SHA-1 fingerprint
cd android
./gradlew signingReport

# Add SHA-1 to Google Cloud Console OAuth credentials
# Make sure to use the correct keystore (debug vs release)
```

#### Issue 2: Microsoft Authentication Not Working

**Cause:** Redirect URI not configured correctly

**Solution:**
```
1. Go to Azure App Registrations
2. Verify redirect URIs match exactly:
   - iOS: msauth.com.neptunetech.odyssey://auth
   - Android: msauth://com.neptunetech.odyssey/YOUR_SIGNATURE_HASH
3. Ensure "Accounts in any organizational directory and personal Microsoft accounts" is selected
```

#### Issue 3: Deep Link Not Opening App

**Cause:** Deep linking not configured properly

**Solution iOS:**
```bash
# Verify Info.plist has correct URL schemes
# Rebuild app
npx expo run:ios
```

**Solution Android:**
```bash
# Verify AndroidManifest.xml has intent filters
# Test deep link manually:
adb shell am start -W -a android.intent.action.VIEW -d "odyssey://auth/callback?status=success&token=test"
```

#### Issue 4: "State Mismatch" Error

**Cause:** State parameter not matching between request and callback

**Solution:**
```typescript
// Ensure state is stored before OAuth redirect
await AsyncStorage.setItem('oauth_state', state);

// Verify state after callback
const storedState = await AsyncStorage.getItem('oauth_state');
if (storedState !== returnedState) {
  throw new Error('State mismatch');
}
```

#### Issue 5: Token Not Stored Securely

**Cause:** SecureTokenManager not working properly

**Solution:**
```typescript
// Verify SecureTokenManager is initialized
import { SecureTokenManager } from '@/utils/SecureTokenManager';

// Test storage
await SecureTokenManager.setToken('test_token', 'test_value');
const value = await SecureTokenManager.getToken('test_token');
console.log('Retrieved:', value); // Should print 'test_value'
```

#### Issue 6: Backend Callback Not Redirecting to App

**Cause:** Backend not configured with correct redirect URL

**Solution:**
```python
# Verify backend FRONTEND_URL is set correctly
# For mobile, backend should redirect to deep link:
return RedirectResponse(f"odyssey://auth/callback?status=success&token={token}")

# NOT to web URL like:
# return RedirectResponse(f"https://odysseytech.ai/auth/callback...")
```

#### Issue 7: OAuth Works on iOS but Not Android

**Cause:** Android-specific configuration missing

**Solution:**
```gradle
// Ensure google-services.json is in android/app/
// Verify build.gradle has google-services plugin
apply plugin: 'com.google.gms.google-services'

// Clean and rebuild
cd android
./gradlew clean
cd ..
npx expo run:android
```

### Debug Mode

Enable detailed OAuth logging:

```typescript
// In OAuthService.ts
const DEBUG_MODE = __DEV__;

if (DEBUG_MODE) {
  console.log('[OAuth] Provider:', provider);
  console.log('[OAuth] State:', state);
  console.log('[OAuth] Auth URL:', authUrl);
  console.log('[OAuth] Callback URL:', callbackUrl);
  console.log('[OAuth] Token:', token ? 'Present' : 'Missing');
}
```

### Testing Deep Links

**iOS:**
```bash
# Test deep link in simulator
xcrun simctl openurl booted "odyssey://auth/callback?status=success&token=test123"
```

**Android:**
```bash
# Test deep link on device/emulator
adb shell am start -W -a android.intent.action.VIEW -d "odyssey://auth/callback?status=success&token=test123" com.neptunetech.odyssey
```

---

## 🔒 Security Considerations

### 1. State Parameter (CSRF Protection)

- ✅ Generate cryptographically secure random state
- ✅ Store state before OAuth redirect
- ✅ Validate state matches after callback
- ✅ Remove state after validation

### 2. Token Storage

- ✅ Use `SecureTokenManager` for auth tokens
- ✅ Never store tokens in AsyncStorage (unencrypted)
- ✅ Use Expo SecureStore (iOS Keychain / Android Keystore)

### 3. Deep Link Security

- ✅ Validate all parameters from deep link
- ✅ Check status parameter before processing
- ✅ Verify token format before storage
- ✅ Handle malformed URLs gracefully

### 4. OAuth Provider Security

- ✅ Use latest SDK versions
- ✅ Implement proper error handling
- ✅ Don't log sensitive data (tokens, user info)
- ✅ Use HTTPS for all API calls

### 5. Backend Communication

- ✅ Always use HTTPS (api-alpha.odysseytech.ai)
- ✅ Verify SSL certificates
- ✅ Implement request timeouts
- ✅ Handle network errors gracefully

### 6. Token Refresh

- ✅ Implement automatic token refresh
- ✅ Handle expired tokens gracefully
- ✅ Don't expose refresh tokens to client
- ✅ Use short-lived access tokens

### 7. Session Management

- ✅ Implement proper sign-out
- ✅ Clear all OAuth sessions on sign-out
- ✅ Remove stored tokens on sign-out
- ✅ Revoke OAuth tokens if supported

### Security Checklist

- [ ] State parameter generated securely
- [ ] State parameter validated on callback
- [ ] Tokens stored in SecureStore (not AsyncStorage)
- [ ] Deep link parameters validated
- [ ] OAuth SDKs up to date
- [ ] HTTPS used for all API calls
- [ ] Sensitive data not logged
- [ ] Sign-out clears all sessions
- [ ] Error messages don't leak sensitive info
- [ ] Token refresh implemented
- [ ] Network timeouts configured
- [ ] SSL certificate validation enabled

---

## 📚 Additional Resources

### Documentation

- [Google OAuth 2.0 for Mobile Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
- [Microsoft Authentication Library (MSAL) for React Native](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react-native)
- [Expo Authentication](https://docs.expo.dev/guides/authentication/)
- [React Native Deep Linking](https://reactnative.dev/docs/linking)

### Backend Documentation

- Backend OAuth Implementation: `jaiime-backend-aws/dependencies/oauth.py`
- Backend Auth Router: `jaiime-backend-aws/routers/auth.py`
- Web Frontend OAuth: `jaiime-frontend/OAUTH_QUICK_START.md`

### Libraries Used

- [@react-native-google-signin/google-signin](https://github.com/react-native-google-signin/google-signin)
- [@azure/msal-react-native](https://github.com/AzureAD/microsoft-authentication-library-for-js/tree/dev/lib/msal-react-native)
- [expo-auth-session](https://docs.expo.dev/versions/latest/sdk/auth-session/)
- [expo-web-browser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)

### OAuth Provider Consoles

- [Google Cloud Console](https://console.cloud.google.com/)
- [Azure App Registrations](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)

---

## ✅ Implementation Checklist

Use this checklist to track your progress:

### Pre-Implementation

- [ ] Backend OAuth endpoints verified working
- [ ] Google OAuth credentials obtained (iOS, Android, Web)
- [ ] Microsoft OAuth credentials obtained
- [ ] OAuth provider consoles configured with redirect URLs

### Installation

- [ ] OAuth libraries installed
- [ ] app.json updated with deep linking configuration
- [ ] Google Services files added (iOS and Android)
- [ ] Pod dependencies installed (iOS)
- [ ] Gradle configuration updated (Android)

### iOS Configuration

- [ ] Info.plist updated with URL schemes
- [ ] GoogleService-Info.plist added
- [ ] AppDelegate.mm updated for Google Sign-In
- [ ] Pods installed

### Android Configuration

- [ ] AndroidManifest.xml updated with intent filters
- [ ] google-services.json added
- [ ] build.gradle updated with dependencies
- [ ] SHA-1 fingerprint added to Google Console

### Code Implementation

- [ ] OAuthConfig.ts created
- [ ] OAuthService.ts created
- [ ] OAuthButtons.tsx component created
- [ ] Login screen updated with OAuth buttons
- [ ] Registration screen updated with OAuth buttons
- [ ] useAuth hook updated with OAuth methods
- [ ] Deep link handler implemented

### Testing

- [ ] Google OAuth tested on iOS simulator
- [ ] Google OAuth tested on iOS device
- [ ] Google OAuth tested on Android emulator
- [ ] Google OAuth tested on Android device
- [ ] Microsoft OAuth tested on iOS simulator
- [ ] Microsoft OAuth tested on iOS device
- [ ] Microsoft OAuth tested on Android emulator
- [ ] Microsoft OAuth tested on Android device
- [ ] Deep linking tested
- [ ] Error handling tested
- [ ] Token storage verified secure
- [ ] Sign-out functionality tested

### Documentation

- [ ] Team trained on OAuth functionality
- [ ] User documentation updated
- [ ] Troubleshooting guide reviewed
- [ ] Security considerations documented

---

## 🎉 Next Steps

After completing the OAuth integration:

1. **Monitor Analytics**: Track OAuth sign-in success rates
2. **User Feedback**: Gather feedback on OAuth experience
3. **Performance**: Monitor OAuth flow performance
4. **Security Audit**: Regular security reviews
5. **Additional Providers**: Consider adding GitHub, LinkedIn, etc.

---

## 📞 Support

For questions or issues:

- **Backend Issues**: Check `jaiime-backend-aws/routers/auth.py`
- **Frontend Reference**: See `jaiime-frontend/OAUTH_QUICK_START.md`
- **Mobile Issues**: Review this guide's troubleshooting section
- **Security Concerns**: Contact Neptune Technologies security team

---

**Last Updated:** October 7, 2025  
**Version:** 1.0  
**Maintained By:** Neptune Technologies Inc.

**Status:** ✅ Backend Complete | ✅ Web Complete | 🚧 Mobile Implementation Pending

