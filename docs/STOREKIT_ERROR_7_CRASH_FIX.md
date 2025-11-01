# Fixing StoreKit Error 7 Crash (non-std C++ exception)

## Error
```
[acee2cda] Request failed with error Error Domain=StoreKit_Shared.StoreKitInternalError Code=7 "(null)"
non-std C++ exception
RCTFatal
```

## Root Cause

This is a **CRITICAL CRASH** caused by StoreKit Error 7, which means:
- **StoreKit cannot connect to the App Store**
- The error throws a C++ exception that crashes the app
- This happens BEFORE our JavaScript error handling can catch it

## Common Causes

### 1. Running on iOS Simulator ⚠️ MOST COMMON
**IAP does not work on simulator!** Even though our code checks for this, the crash can happen during module initialization.

**Solution**: Use a physical iOS device

### 2. Not Signed In with Apple ID
StoreKit requires an Apple ID to be signed in on the device.

**Solution**: 
- Go to iOS Settings → Sign in with your Apple ID
- Or set up a Sandbox Tester account (for testing)

### 3. Missing StoreKit Configuration File (iOS 17+)
iOS 17+ requires a StoreKit Configuration file for local testing.

**Solution**: Create `.storekit` configuration file in Xcode (see below)

### 4. Network Issues
StoreKit needs to reach Apple's servers.

**Solution**: Check internet connection, try different WiFi/cellular

---

## IMMEDIATE FIX: Disable IAP on Simulator

Add this check at the app level to prevent initialization on simulator:

### In your app entry point (e.g., `App.tsx` or `_layout.tsx`):

```typescript
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { iapService } from '@/utils/IAPService';

// Only initialize IAP on physical device
const initializeIAP = async () => {
  // Check if running on simulator
  if (Constants.isDevice === false) {
    console.log('[App] Running on simulator - skipping IAP initialization');
    return;
  }
  
  if (Platform.OS === 'ios') {
    try {
      await iapService.initialize();
    } catch (error) {
      console.error('[App] IAP initialization failed:', error);
      // App continues to function without IAP
    }
  }
};

// Call during app startup
useEffect(() => {
  initializeIAP();
}, []);
```

---

## Solution 1: Test on Physical Device

### Prerequisites:
1. **Physical iPhone/iPad** (iOS 17.0+)
2. **Apple Developer Account** (for device provisioning)
3. **Sandbox Tester Account** (for testing purchases)

### Steps:

```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app

# Build and install on device
npx expo run:ios --device
```

### Configure Sandbox Tester:
1. **Create Sandbox Tester**:
   - Go to [App Store Connect](https://appstoreconnect.apple.com/)
   - Users and Access → Sandbox → Testers
   - Click "+" to add a tester
   - Use a unique email (can be fake like `test@example.com`)
   - Set password and region

2. **Sign in on Device**:
   - iOS Settings → App Store
   - Scroll down to "Sandbox Account"
   - Sign in with your sandbox tester credentials

---

## Solution 2: Create StoreKit Configuration File

For testing on device WITHOUT needing actual App Store Connect products:

### In Xcode:

1. Open your project: `open ios/Odyssey.xcworkspace`

2. **Create StoreKit Configuration**:
   - File → New → File
   - Scroll to "Resource" section
   - Select "StoreKit Configuration File"
   - Name it: `Products.storekit`
   - Save in the `ios/` folder

3. **Add Your Products**:
   - Click "+" in the editor
   - Add "Auto-Renewable Subscription" or "Consumable"
   - Set Product ID to match your constants (e.g., `basic_monthly`, `credits_500`)
   - Set prices and details

4. **Configure Scheme**:
   - Product → Scheme → Edit Scheme
   - Run → Options
   - StoreKit Configuration → Select `Products.storekit`

5. **Build and Run**:
   - Select your physical device
   - Product → Run (Cmd + R)

Now StoreKit will use local configuration instead of reaching App Store.

---

## Solution 3: Update IAPProvider to Handle Errors Gracefully

The IAPProvider should not crash the app if IAP fails:

### In `providers/IAPProvider.tsx`:

```typescript
useEffect(() => {
  // Only initialize on iOS physical devices
  if (Platform.OS !== 'ios') {
    console.log('[IAPProvider] IAP currently supports iOS only');
    setError('In-App Purchases are currently only available on iOS');
    setIsInitialized(false);
    setIsLoading(false);
    return;
  }

  // Check if simulator
  if (Constants.isDevice === false) {
    console.log('[IAPProvider] Running on simulator - skipping IAP');
    setError('IAP requires physical device');
    setIsInitialized(false);
    setIsLoading(false);
    return;
  }

  initializeIAP();
  
  return () => {
    iapService.disconnect();
  };
}, []);
```

---

## Solution 4: Downgrade to v12 (If v13 continues to crash)

If the crash persists with v13, you can downgrade to the more stable v12:

```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app

# Update package.json
# Change: "react-native-iap": "^13.0.4"
# To: "react-native-iap": "^12.16.4"

pnpm install
cd ios && pod install && cd ..

# Clean and rebuild
rm -rf ios/build ios/DerivedData
npx expo run:ios --device
```

v12 is more stable but lacks some newer StoreKit 2 features.

---

## Verification Steps

After implementing fixes:

1. **Check Logs**:
```
[IAPService] Environment: ios - Physical Device (isDevice: true, model: iPhone15,2)
[IAPService] ✓ Running on physical device
[IAPService] ✓ Connected to App Store
```

2. **No Crash**: App should start without crashing

3. **IAP Works**: Can fetch products and make purchases

---

## Debug Checklist

- [ ] Are you on a **physical device** (not simulator)?
- [ ] Is device **signed in with Apple ID**?
- [ ] Do you have **internet connection**?
- [ ] Is Xcode **up to date** (15.0+)?
- [ ] Did you **clean build** (`Cmd + Shift + K` in Xcode)?
- [ ] Are **product IDs** configured in App Store Connect?
- [ ] Is bundle ID correct (`com.neptunetech.odyssey`)?
- [ ] Did you create a **StoreKit Configuration file**?

---

## Current Configuration

✅ **react-native-iap**: v13.0.4  
✅ **React Native**: 0.79.5  
✅ **iOS Deployment Target**: 17.0  
✅ **Bundle ID**: com.neptunetech.odyssey  

❌ **Issue**: StoreKit Error 7 crash on initialization  
✅ **Solution**: Test on physical device with proper setup

---

## Quick Command Summary

```bash
# Clean and rebuild for device
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app
rm -rf ios/build ios/DerivedData
cd ios && pod install && cd ..
npx expo run:ios --device

# If error persists, downgrade to v12
# Edit package.json: "react-native-iap": "^12.16.4"
pnpm install
cd ios && pod install && cd ..
npx expo run:ios --device
```

---

## Need Help?

1. Check the full crash log in Xcode Console
2. Verify you're not on simulator: `console.log(Constants.isDevice)`
3. Test with StoreKit Configuration file first
4. Consider downgrading to v12 if issues persist

The crash should be resolved by testing on a physical device with proper Apple ID sign-in!

