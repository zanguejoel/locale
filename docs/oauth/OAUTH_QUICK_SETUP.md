# OAuth Quick Setup Guide

**Status:** ✅ Code Complete | ⚠️ Credentials Required

---

## What Just Happened? ✅

The error you saw is **EXPECTED** and has been **FIXED**. The app now gracefully handles missing OAuth credentials with helpful warnings instead of crashes.

### Changes Made:
- ✅ Added credential validation checks
- ✅ Graceful fallback for missing credentials
- ✅ Helpful console warnings
- ✅ OAuth buttons will show but display friendly error messages when tapped

---

## Current Behavior 📱

**When you tap OAuth buttons WITHOUT credentials:**
- Google button → "Google OAuth not configured. Please add your credentials..."
- Microsoft button → "Microsoft OAuth not configured. Please add your credentials..."

**Console warnings (safe to ignore for now):**
```
[OAuth] Google Sign-In not configured. Please add your OAuth credentials to constants/OAuthConfig.ts
[OAuth] Microsoft Sign-In not configured. Please add your OAuth credentials to constants/OAuthConfig.ts
```

---

## How to Make OAuth Work 🚀

### Step 1: Get Google OAuth Credentials (15 min)

1. **Go to** [Google Cloud Console](https://console.cloud.google.com/)

2. **Create/Select Project** → "Odyssey Mobile"

3. **Enable APIs** → Enable "Google+ API"

4. **Create Credentials** → "OAuth client ID"

5. **Configure for iOS:**
   - Type: **iOS Application**
   - Bundle ID: `com.neptunetech.odyssey`
   - Save the **iOS Client ID**

6. **Configure for Android:**
   - Type: **Android Application**
   - Package: `com.neptunetech.odyssey`
   - Get SHA-1 fingerprint:
     ```bash
     keytool -list -v -keystore ~/.android/debug.keystore \
       -alias androiddebugkey -storepass android -keypass android
     ```
   - Save the **Android Client ID**

7. **Download Files:**
   - `GoogleService-Info.plist` (iOS)
   - `google-services.json` (Android)

### Step 2: Get Microsoft OAuth Credentials (10 min)

1. **Go to** [Azure Portal](https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps/ApplicationsListBlade)

2. **New Registration** → "Odyssey Mobile"

3. **Account Type:** "Accounts in any organizational directory and personal Microsoft accounts"

4. **Add Redirect URIs:**
   - iOS: `msauth.com.neptunetech.odyssey://auth`
   - Android: `msauth://com.neptunetech.odyssey/{your-signature-hash}`

5. **Save Client ID**

### Step 3: Update Configuration Files

#### A. Update `constants/OAuthConfig.ts`

Replace the placeholder values:

```typescript
export const OAUTH_CONFIG = {
  google: {
    clientId: Platform.select({
      ios: '123456789-xxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com',     // ← Your iOS Client ID
      android: '123456789-xxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // ← Your Android Client ID
      default: '123456789-xxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com', // ← Your Web Client ID
    }),
    scopes: ['openid', 'email', 'profile'],
    redirectUrl: `odyssey://auth/callback`,
  },
  microsoft: {
    clientId: 'YOUR_ACTUAL_MICROSOFT_CLIENT_ID',  // ← Your Microsoft Client ID
    tenantId: 'common',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    redirectUrl: Platform.select({
      ios: 'msauth.com.neptunetech.odyssey://auth',
      android: 'msauth://com.neptunetech.odyssey/YOUR_SIGNATURE_HASH',
      default: 'odyssey://auth/callback',
    }),
  },
};
```

#### B. Add Google Service Files

```bash
# Copy Google service files
cp path/to/GoogleService-Info.plist \
  /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app/ios/

cp path/to/google-services.json \
  /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app/android/app/
```

#### C. Reinstall iOS Pods (if you added GoogleService-Info.plist)

```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app/ios
pod install
cd ..
```

### Step 4: Test OAuth

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

**Test Flow:**
1. Tap "Sign in with Google"
2. Complete Google authentication
3. App should redirect back and log you in
4. Check console for success logs

---

## Backend Configuration ⚙️

**Important:** Make sure your backend is configured to redirect to mobile deep links:

```python
# Backend should redirect to mobile app after OAuth
MOBILE_REDIRECT_URL = "odyssey://auth/callback"

# In OAuth callback handlers:
return RedirectResponse(
    f"odyssey://auth/callback?status=success&token={token}&user_id={user_id}"
)
```

**Backend OAuth endpoints:**
- Google: `https://api-alpha.odysseytech.ai/auth/authorize-gmail/callback`
- Microsoft: `https://api-alpha.odysseytech.ai/auth/authorize-microsoft/callback`

---

## Troubleshooting 🔧

### "Client ID not configured" warning
✅ **EXPECTED** - Add your OAuth credentials to `OAuthConfig.ts`

### Google Sign-In fails on Android
- Verify SHA-1 fingerprint is added to Google Console
- Check `google-services.json` is in `android/app/`

### Deep link doesn't open app
- iOS: Verify `Info.plist` has URL schemes
- Android: Verify `AndroidManifest.xml` has intent filters
- Test manually:
  ```bash
  # iOS
  xcrun simctl openurl booted "odyssey://auth/callback?status=success&token=test"
  
  # Android
  adb shell am start -W -a android.intent.action.VIEW \
    -d "odyssey://auth/callback?status=success&token=test" \
    com.neptunetech.odyssey
  ```

### OAuth works in dev but not production
- Use **production** OAuth credentials for release builds
- Update redirect URIs in Google/Microsoft consoles

---

## Status Checklist ✅

- [x] OAuth code implementation complete
- [x] Deep linking configured
- [x] iOS build configuration complete
- [x] Android build configuration complete
- [x] Error handling implemented
- [x] Security features (CSRF, secure storage) implemented
- [ ] **Google OAuth credentials added**
- [ ] **Microsoft OAuth credentials added**
- [ ] **Google service files added**
- [ ] **Backend mobile redirect URLs configured**
- [ ] **Tested on iOS device**
- [ ] **Tested on Android device**

---

## Next Steps 🎯

1. **For Development:**
   - Get OAuth credentials (Steps 1-2 above)
   - Update `OAuthConfig.ts` (Step 3A)
   - Add service files (Step 3B)
   - Test OAuth flow

2. **For Production:**
   - Create production OAuth credentials
   - Update backend redirect URLs
   - Test end-to-end flow
   - Security audit

---

## Documentation 📚

- **Full Guide:** `OAUTH_INTEGRATION_GUIDE.md` (1,575 lines)
- **Implementation Summary:** `OAUTH_IMPLEMENTATION_COMPLETE.md`
- **Quick Checklist:** `OAUTH_QUICK_CHECKLIST.md`

---

**Questions?** 
- Check the full documentation in `OAUTH_INTEGRATION_GUIDE.md`
- Review backend OAuth code: `../jaiime-backend-aws/dependencies/oauth.py`
- Compare with web implementation: `../jaiime-frontend/OAUTH_QUICK_START.md`

---

**Last Updated:** October 7, 2025  
**Status:** ✅ Ready for Credentials

