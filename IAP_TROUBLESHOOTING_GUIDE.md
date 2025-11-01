# IAP Disconnected on Real Device - Troubleshooting Guide

## Problem
IAP Debug Status shows "🔴 Disconnected" on a physical iOS device.

---

## Common Causes & Solutions

### 1. ✅ **Missing StoreKit Configuration File**

**Problem:** StoreKit needs a configuration file for testing on device.

**Solution:**
1. Open Xcode project: `ios/Odyssey.xcworkspace`
2. Go to: **Editor** → **Add Configuration File** → **In-App Purchase**
3. Add your product IDs:
   - `credits_500`
   - `credits_1500`
   - `credits_2500`
   - `credits_5000`
   - `credits_10000`
   - `credits_15000`
   - `basic_monthly`
   - `basic_yearly`
   - `professional_monthly`
   - `professional_yearly`

**File:** `ios/Odyssey.storekit`

---

### 2. ✅ **Missing Entitlements in Xcode**

**Problem:** Xcode project doesn't have IAP entitlements.

**Solution:**
1. Open `ios/Odyssey.xcworkspace` in Xcode
2. Select **Odyssey** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **In-App Purchase**
6. Verify entitlements file is created

---

### 3. ✅ **App Store Connect Configuration**

**Problem:** Products not created in App Store Connect.

**Status Check:**
- [ ] Created app in App Store Connect
- [ ] Added In-App Purchase products
- [ ] Products status = "Ready to Submit"
- [ ] Created Sandbox Tester account

**Solution:**
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Navigate to: **Your App** → **Features** → **In-App Purchases**
3. Create products matching your product IDs
4. Set prices and descriptions
5. Submit for review (products must be "Ready to Submit")

**Important:** Products won't load until they're created in App Store Connect, even for testing!

---

### 4. ✅ **Sandbox Tester Account**

**Problem:** Not signed in with Sandbox Tester on device.

**Solution:**
1. On your iPhone: **Settings** → **App Store**
2. Scroll down to **Sandbox Account**
3. Sign in with Sandbox Tester (create one in App Store Connect if needed)
4. Sign OUT of regular App Store account

**Important:** Do NOT sign in to App Store with your Sandbox account - only use it for IAP testing!

---

### 5. ✅ **Bundle Identifier Mismatch**

**Problem:** Bundle ID doesn't match App Store Connect.

**Check:**
```javascript
// app.config.js
ios: {
  bundleIdentifier: 'com.neptunetech.odyssey', // Must match App Store Connect
}
```

**Verify in Xcode:**
1. Open `ios/Odyssey.xcworkspace`
2. Select **Odyssey** target
3. **General** tab → **Bundle Identifier**
4. Must match: `com.neptunetech.odyssey`

---

### 6. ✅ **Provisioning Profile**

**Problem:** Development provisioning profile doesn't include IAP capability.

**Solution:**
1. Go to [Apple Developer Portal](https://developer.apple.com)
2. **Certificates, Identifiers & Profiles**
3. Find your **App ID** (`com.neptunetech.odyssey`)
4. Edit → Enable **In-App Purchase**
5. Regenerate provisioning profiles
6. Download and install in Xcode

---

### 7. ✅ **expo-iap Package Issues**

**Problem:** Package not properly installed or incompatible version.

**Solution:**
```bash
cd jaime-mobile-app

# Reinstall expo-iap
pnpm remove expo-iap
pnpm install expo-iap@latest

# Reinstall pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..

# Rebuild
pnpm run ios -- --device
```

---

### 8. ✅ **Code Signing**

**Problem:** App not properly signed for device.

**Solution:**
1. Open `ios/Odyssey.xcworkspace` in Xcode
2. Select **Odyssey** target
3. **Signing & Capabilities** tab
4. **Automatically manage signing** = ✅ Checked
5. Select your **Team**
6. Verify provisioning profile is valid

---

## 🔍 Debugging Steps

### Step 1: Check Console Logs

When app starts, look for:
```
[IAPService] expo-iap module loaded successfully
[IAPService] Initializing...
[IAPService] Environment: ios - Physical Device (isDevice: true, ...)
```

If you see errors, note the exact message.

### Step 2: Check Error in Settings

1. Open app on device
2. Go to **Settings**
3. Scroll to **IAP Debug Status** card
4. Read the error message

Common errors:
- ❌ `"User not allowed to make purchases"` → Check parental controls
- ❌ `"Invalid product ID"` → Products not in App Store Connect
- ❌ `"Cannot connect to iTunes Store"` → Network issue
- ❌ `"Purchase not available"` → Sandbox account issue

### Step 3: Verify Device Setup

**Check:**
```bash
# Device must be running iOS 15.0+
# Device must have internet connection
# Device must NOT be jailbroken
```

**On Device:**
- Settings → Screen Time → Content & Privacy → ensure purchases allowed
- Settings → [Your Name] → Media & Purchases → verify logged in
- Settings → App Store → Sandbox Account → verify signed in

---

## 🎯 Quick Diagnostic Checklist

Run through this checklist:

### In App Store Connect:
- [ ] App created
- [ ] In-App Purchase products created
- [ ] Products have status "Ready to Submit" or "Approved"
- [ ] Sandbox Tester account created
- [ ] Bundle ID matches app

### In Apple Developer Portal:
- [ ] App ID has "In-App Purchase" capability enabled
- [ ] Provisioning profile includes IAP
- [ ] Certificate is valid

### In Xcode Project:
- [ ] `ios/Odyssey.xcworkspace` opens without errors
- [ ] Signing & Capabilities includes "In-App Purchase"
- [ ] Bundle Identifier matches
- [ ] Team is selected
- [ ] Build succeeds

### On Device:
- [ ] iOS 15.0 or higher
- [ ] Signed OUT of regular App Store account
- [ ] Signed IN to Sandbox Account (in Settings → App Store → Sandbox)
- [ ] Internet connection working
- [ ] App installed from Xcode (not TestFlight for now)

### In Code:
- [ ] expo-iap package installed
- [ ] Pods installed (`cd ios && pod install`)
- [ ] No console errors about expo-iap
- [ ] Product IDs match exactly

---

## 📱 Testing Workflow

### Correct Testing Flow:

1. **Create Products in App Store Connect**
   - Add all product IDs
   - Set prices
   - Submit for review

2. **Set Up Sandbox Tester**
   - Create in App Store Connect
   - Sign in on device (Settings → App Store → Sandbox)

3. **Build and Install**
   ```bash
   pnpm run ios -- --device
   ```

4. **Test Purchase**
   - Open app
   - Go to Settings → check debug status
   - Should show: 🟢 Connected
   - Go to Plans & Pricing
   - Try purchasing (won't charge real money)

---

## 🚨 Most Common Issue

**90% of IAP connection issues are because:**

Products haven't been created in App Store Connect yet!

**Solution:**
1. Go to App Store Connect
2. Create your app if you haven't
3. Add In-App Purchase products
4. Wait 15-30 minutes for Apple's servers to sync
5. Rebuild and test again

---

## 💡 Testing Without App Store Connect

If you don't have products in App Store Connect yet:

**Option 1: Use Mock Service (Recommended for Development)**
```typescript
// In IAPProvider.tsx - temporarily force mock
const useMock = true; // Force mock mode
const service = useMock ? iapServiceMock : iapService;
```

**Option 2: Wait for App Store Connect Setup**
Real IAP won't work until products are configured in App Store Connect.

---

## 🔍 Error Code Reference

| Error | Meaning | Solution |
|-------|---------|----------|
| `E_USER_CANCELLED` | User cancelled purchase | Normal behavior |
| `E_USER_ERROR` | User not allowed to purchase | Check parental controls |
| `E_ITEM_UNAVAILABLE` | Product not found | Create in App Store Connect |
| `E_NETWORK_ERROR` | Can't connect to iTunes | Check internet |
| `E_UNKNOWN` | General error | Check all above |

---

## 📞 Next Steps

1. **Check App Store Connect first** - This is usually the issue
2. **Review Xcode capabilities** - Ensure IAP is enabled
3. **Verify Sandbox account** - Must be signed in on device
4. **Check debug status** - Look at error message in Settings
5. **Review console logs** - Check exact error from expo-iap

---

## 🆘 Still Not Working?

**Collect Debug Info:**
1. Error message from Settings debug card
2. Console logs when app starts
3. Device iOS version
4. Whether app is built for device or simulator
5. Screenshots of:
   - Settings debug status
   - Xcode Signing & Capabilities
   - App Store Connect products page

**Common Last Resort:**
```bash
# Nuclear option - full clean
cd jaime-mobile-app
rm -rf node_modules ios/Pods ios/Podfile.lock
pnpm install
cd ios && pod install && cd ..
pnpm run ios -- --device --clean
```

---

**Remember:** IAP on real devices requires:
1. ✅ Products in App Store Connect
2. ✅ Sandbox Tester signed in
3. ✅ Proper entitlements
4. ✅ Valid provisioning profile

**Test Flow:** App Store Connect Setup → Sandbox Tester → Build → Test

Good luck! 🍀

