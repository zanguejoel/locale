# Mobile OAuth Integration - Quick Start Checklist

⏱️ **Estimated Time:** 3-5 days  
📱 **Platforms:** iOS & Android  
🎯 **Goal:** Integrate Google & Microsoft OAuth into mobile app

---

## 📋 Pre-Implementation (1 hour)

### Verify Backend Status
- [ ] Backend OAuth endpoints are working (`/auth/authorize-gmail/callback`, `/auth/authorize-microsoft/callback`)
- [ ] Backend is accessible: `https://api-alpha.odysseytech.ai`
- [ ] Backend environment variables are configured

### Create OAuth Credentials

#### Google OAuth
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Create OAuth credentials for **iOS Application**
  - Bundle ID: `com.neptunetech.odyssey`
  - Save iOS Client ID
- [ ] Create OAuth credentials for **Android Application**
  - Package: `com.neptunetech.odyssey`
  - Get SHA-1 fingerprint: `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey`
  - Save Android Client ID
- [ ] Download `GoogleService-Info.plist` (iOS)
- [ ] Download `google-services.json` (Android)

#### Microsoft OAuth
- [ ] Go to [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)
- [ ] Add mobile redirect URIs to existing app registration:
  - iOS: `msauth.com.neptunetech.odyssey://auth`
  - Android: `msauth://com.neptunetech.odyssey/{signature-hash}`
- [ ] Note Client ID (can reuse backend client ID)

---

## 📦 Installation (30 minutes)

### 1. Install Dependencies

```bash
cd jaime-mobile-app

# OAuth libraries
npx expo install expo-auth-session expo-crypto expo-web-browser
npx expo install @react-native-google-signin/google-signin
npm install @azure/msal-react-native
npm install react-native-get-random-values
```

### 2. Add Google Services Files
- [ ] Copy `GoogleService-Info.plist` to `ios/`
- [ ] Copy `google-services.json` to `android/app/`

### 3. Update app.json

```json
{
  "expo": {
    "scheme": "odyssey",
    "plugins": [
      "@react-native-google-signin/google-signin",
      ["expo-build-properties", {
        "ios": { "useFrameworks": "static" }
      }]
    ]
  }
}
```

---

## 🍎 iOS Configuration (2 hours)

### 1. Update Info.plist

Add to `ios/Odyssey/Info.plist`:

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>odyssey</string>
      <string>com.neptunetech.odyssey</string>
    </array>
  </dict>
</array>
```

### 2. Update AppDelegate.mm

Add to `ios/Odyssey/AppDelegate.mm`:

```objc
#import <GoogleSignIn/GoogleSignIn.h>

- (BOOL)application:(UIApplication *)app
            openURL:(NSURL *)url
            options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options {
  return [GIDSignIn.sharedInstance handleURL:url];
}
```

### 3. Install Pods

```bash
cd ios && pod install && cd ..
```

### 4. Test iOS Build

```bash
npx expo run:ios
```

---

## 🤖 Android Configuration (2 hours)

### 1. Update AndroidManifest.xml

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="odyssey" android:host="auth" />
</intent-filter>
```

### 2. Update build.gradle

Add to `android/app/build.gradle`:

```gradle
apply plugin: 'com.google.gms.google-services'

android {
  defaultConfig {
    manifestPlaceholders = [
      appAuthRedirectScheme: 'com.neptunetech.odyssey'
    ]
  }
}
```

Add to `android/build.gradle`:

```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.4.0'
  }
}
```

### 3. Test Android Build

```bash
npx expo run:android
```

---

## 💻 Code Implementation (4-6 hours)

### 1. Create OAuthConfig.ts

- [ ] Create `constants/OAuthConfig.ts`
- [ ] Add Google client IDs (iOS, Android, Web)
- [ ] Add Microsoft client ID
- [ ] Add redirect URLs
- [ ] Add scopes

**Reference:** See full code in `OAUTH_INTEGRATION_GUIDE.md` section "Step 1: Create OAuth Configuration"

### 2. Create OAuthService.ts

- [ ] Create `utils/OAuthService.ts`
- [ ] Implement `signInWithGoogle()`
- [ ] Implement `signInWithMicrosoft()`
- [ ] Implement backend callback handling
- [ ] Implement state validation
- [ ] Implement token storage
- [ ] Implement `signOut()`

**Reference:** See full code in `OAUTH_INTEGRATION_GUIDE.md` section "Step 2: Create OAuth Service"

### 3. Create OAuthButtons.tsx

- [ ] Create `components/OAuthButtons.tsx`
- [ ] Add Google button with icon
- [ ] Add Microsoft button with icon
- [ ] Add loading states
- [ ] Add error handling
- [ ] Style buttons

**Reference:** See full code in `OAUTH_INTEGRATION_GUIDE.md` section "Step 3: Create OAuth Buttons Component"

### 4. Update Login Screen

- [ ] Open `app/login.tsx`
- [ ] Import `OAuthButtons`
- [ ] Add `<OAuthButtons />` component below login form
- [ ] Add success/error handlers

```typescript
<OAuthButtons
  onSuccess={(result) => console.log('OAuth success:', result)}
  onError={(error) => Alert.alert('Error', error)}
/>
```

### 5. Update Registration Screen

- [ ] Open `app/registration.tsx`
- [ ] Import `OAuthButtons`
- [ ] Add `<OAuthButtons />` component
- [ ] Add success/error handlers

### 6. Update Auth Hook

- [ ] Open `hooks/useAuth.tsx`
- [ ] Add `signInWithOAuth()` method
- [ ] Add `signOutFromOAuth()` method
- [ ] Export new methods

---

## 🧪 Testing (2-3 hours)

### iOS Testing

- [ ] **Test on Simulator**
  ```bash
  npx expo run:ios
  ```
  - [ ] Google OAuth button appears
  - [ ] Microsoft OAuth button appears
  - [ ] Tap Google button - authentication flow works
  - [ ] Tap Microsoft button - authentication flow works

- [ ] **Test on Physical Device**
  ```bash
  npx expo run:ios --device
  ```
  - [ ] Google OAuth works
  - [ ] Microsoft OAuth works
  - [ ] Deep linking works

### Android Testing

- [ ] **Test on Emulator**
  ```bash
  npx expo run:android
  ```
  - [ ] Google OAuth button appears
  - [ ] Microsoft OAuth button appears
  - [ ] Tap Google button - authentication flow works
  - [ ] Tap Microsoft button - authentication flow works

- [ ] **Test on Physical Device**
  ```bash
  npx expo run:android --device
  ```
  - [ ] Google OAuth works
  - [ ] Microsoft OAuth works
  - [ ] Deep linking works

### Test Scenarios

- [ ] **New User Registration**
  - Sign in with Google (never used before)
  - Verify account created
  - Verify redirect to main app

- [ ] **Existing User Login**
  - Sign in with Google (account exists)
  - Verify logged in with existing account
  - Verify user data preserved

- [ ] **OAuth Cancellation**
  - Start OAuth flow
  - Cancel at provider
  - Verify returned to login screen
  - Verify error message shown

- [ ] **Error Handling**
  - Network error during OAuth
  - Verify error message shown
  - Verify no crash

- [ ] **Token Storage**
  - Sign in with OAuth
  - Close app
  - Reopen app
  - Verify still logged in

- [ ] **Sign Out**
  - Sign out from app
  - Verify OAuth session cleared
  - Verify token removed

### Deep Link Testing

- [ ] **Test Deep Link (iOS)**
  ```bash
  xcrun simctl openurl booted "odyssey://auth/callback?status=success&token=test123"
  ```
  - App opens to correct screen

- [ ] **Test Deep Link (Android)**
  ```bash
  adb shell am start -W -a android.intent.action.VIEW -d "odyssey://auth/callback?status=success&token=test123"
  ```
  - App opens to correct screen

---

## 🔒 Security Verification (1 hour)

- [ ] State parameter is generated securely
- [ ] State parameter is validated on callback
- [ ] Tokens stored in SecureStore (not AsyncStorage)
- [ ] Deep link parameters validated before use
- [ ] OAuth SDKs are latest versions
- [ ] HTTPS used for all API calls
- [ ] No sensitive data logged to console
- [ ] Sign-out clears all OAuth sessions
- [ ] Error messages don't leak sensitive info

---

## 📱 Platform-Specific Verification

### iOS Checklist
- [ ] `GoogleService-Info.plist` in `ios/` directory
- [ ] URL schemes in `Info.plist`
- [ ] `AppDelegate.mm` updated for Google Sign-In
- [ ] Pods installed successfully
- [ ] App builds without errors
- [ ] OAuth works on simulator
- [ ] OAuth works on device
- [ ] Deep linking works

### Android Checklist
- [ ] `google-services.json` in `android/app/`
- [ ] Intent filters in `AndroidManifest.xml`
- [ ] `build.gradle` updated with OAuth dependencies
- [ ] SHA-1 fingerprint added to Google Console
- [ ] App builds without errors
- [ ] OAuth works on emulator
- [ ] OAuth works on device
- [ ] Deep linking works

---

## 🐛 Common Issues & Quick Fixes

### Google Sign-In Failed (Android)
**Fix:** Get SHA-1 fingerprint and add to Google Console
```bash
cd android
./gradlew signingReport
```

### Deep Link Not Working
**Fix iOS:** Verify URL schemes in `Info.plist`
**Fix Android:** Verify intent filters in `AndroidManifest.xml`

### Module Not Found Error
**Fix:** Clear cache and reinstall
```bash
rm -rf node_modules
npm install
cd ios && pod install && cd ..
```

### Build Errors (iOS)
**Fix:** Clean and rebuild
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### Build Errors (Android)
**Fix:** Clean Gradle cache
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

---

## ✅ Final Verification

Before considering implementation complete:

- [ ] All test scenarios pass
- [ ] Both platforms work (iOS & Android)
- [ ] Both providers work (Google & Microsoft)
- [ ] Deep linking works correctly
- [ ] Tokens stored securely
- [ ] Error handling is robust
- [ ] UI is polished and user-friendly
- [ ] No console errors or warnings
- [ ] App passes security review checklist
- [ ] Documentation updated

---

## 🎉 Success Criteria

✅ **Implementation is COMPLETE when:**

1. ✅ Users can sign in with Google on iOS
2. ✅ Users can sign in with Google on Android
3. ✅ Users can sign in with Microsoft on iOS
4. ✅ Users can sign in with Microsoft on Android
5. ✅ New users are registered automatically
6. ✅ Existing users log in successfully
7. ✅ Deep linking works correctly
8. ✅ All test scenarios pass
9. ✅ Security checklist complete
10. ✅ Both platforms tested on physical devices

---

## 📚 Additional Resources

- **Full Implementation Guide:** `OAUTH_INTEGRATION_GUIDE.md` (same directory)
- **Status Summary:** `../OAUTH_STATUS_SUMMARY.md` (root directory)
- **Backend OAuth Code:** `../jaiime-backend-aws/dependencies/oauth.py`
- **Web OAuth Reference:** `../jaiime-frontend/OAUTH_QUICK_START.md`

---

## 🚀 Quick Start Command

```bash
# Start here!
cd jaime-mobile-app
cat OAUTH_INTEGRATION_GUIDE.md  # Read full guide
cat OAUTH_QUICK_CHECKLIST.md    # Use this checklist
```

---

**Time Estimate by Phase:**

- ⏱️ Pre-Implementation: 1 hour
- ⏱️ Installation: 30 minutes
- ⏱️ iOS Configuration: 2 hours
- ⏱️ Android Configuration: 2 hours
- ⏱️ Code Implementation: 4-6 hours
- ⏱️ Testing: 2-3 hours
- ⏱️ Security Verification: 1 hour

**Total: 12-15 hours (2-3 days)**

---

**Last Updated:** October 7, 2025  
**Version:** 1.0  
**Status:** Ready to implement ✅

**Start Implementation:** Follow this checklist and refer to `OAUTH_INTEGRATION_GUIDE.md` for detailed code examples.

