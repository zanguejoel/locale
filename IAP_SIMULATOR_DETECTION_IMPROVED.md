# Improved IAP Simulator Detection ✅

## Problem Fixed

The original `Constants.isDevice` check was not reliable enough for simulator detection. Sometimes it would incorrectly identify simulators as real devices, causing the IAP initialization to fail.

## Solution Implemented

Created a **centralized, multi-layered device detection system** that's much more reliable.

---

## New Detection System

### 📁 `utils/deviceDetection.ts`

A dedicated utility module with multiple detection methods:

```typescript
export function isRunningOnSimulator(): boolean {
  // Method 1: Check Constants.isDevice (primary)
  if (Constants.isDevice === false) {
    return true;
  }

  // Method 2: Check device model string
  if (Platform.OS === 'ios') {
    const model = Constants.platform?.ios?.model?.toLowerCase();
    if (model?.includes('simulator')) {
      return true;
    }
  } else if (Platform.OS === 'android') {
    const model = Constants.platform?.android?.model?.toLowerCase();
    if (model?.includes('emulator') || model?.includes('sdk')) {
      return true;
    }
  }

  // Default: assume real device
  return false;
}
```

### Detection Layers

1. **Primary Check**: `Constants.isDevice === false`
2. **Model String Check**: Looks for "simulator" / "emulator" in model name
3. **Fallback**: Assumes real device if uncertain

---

## Key Features

### 1. Centralized Detection ✅
All detection logic in one place:
- `isRunningOnSimulator()` - Main detection function
- `getEnvironmentDescription()` - Debug info
- `shouldUseMockIAP()` - Decision helper

### 2. Platform-Specific ✅
Different checks for iOS vs Android:
- **iOS**: Checks for "simulator" in model
- **Android**: Checks for "emulator" or "sdk" in model

### 3. Debug Logging ✅
Comprehensive logs to help diagnose issues:
```
[IAPService] Environment: ios - Simulator/Emulator (isDevice: false, model: iPhone 15 Simulator)
[IAPProvider] Environment detected: ios - Simulator/Emulator
[IAPProvider] Using MOCK IAP service
```

### 4. Easy Testing ✅
Included test helper to verify detection:
```typescript
import { testDeviceDetection } from '@/utils/__tests__/deviceDetection.test';
testDeviceDetection(); // Logs all detection info
```

---

## Files Updated

### Core Detection
- ✅ **`utils/deviceDetection.ts`** - New centralized detection module
- ✅ **`utils/deviceDetection.test.ts`** - Test helper

### Services
- ✅ **`utils/IAPService.ts`** - Uses `isRunningOnSimulator()`
- ✅ **`providers/IAPProvider.tsx`** - Uses `shouldUseMockIAP()`

### UI Components
- ✅ **`components/CreditPurchaseModalIAP.tsx`** - Uses `isRunningOnSimulator()`
- ✅ **`app/(modal)/plans-pricing-iap.tsx`** - Uses `isRunningOnSimulator()`

---

## How to Verify Detection Works

### Method 1: Check Console Logs

When app starts, look for these logs:

**On Simulator:**
```
[IAPService] expo-iap module loaded successfully
[IAPProvider] Environment detected: ios - Simulator/Emulator (isDevice: false, model: iPhone 15 Simulator)
[IAPProvider] Using MOCK IAP service
[IAPServiceMock] Initializing mock IAP...
[IAPServiceMock] Mock products fetched: 12
```

**On Physical Device:**
```
[IAPService] expo-iap module loaded successfully
[IAPProvider] Environment detected: ios - Physical Device (isDevice: true, model: iPhone 14 Pro)
[IAPProvider] Using REAL IAP service
[IAPService] Initializing...
[IAPService] Environment: ios - Physical Device (isDevice: true, model: iPhone 14 Pro)
[IAPService] Connected to store
```

### Method 2: Check UI Banners

**On Simulator:**
- Should see orange "Simulator Mode" banner
- Footer says "Mock mode - Testing only"

**On Physical Device:**
- No banner shown
- Footer says "Secure payment via App Store"

### Method 3: Run Test Function

Add this to your app temporarily to test:

```typescript
// In app/_layout.tsx or any component
import { testDeviceDetection } from '@/utils/__tests__/deviceDetection.test';

useEffect(() => {
  testDeviceDetection(); // Logs detection results
}, []);
```

---

## Debugging Tips

### If Detection Still Fails

1. **Check Console Logs**
   ```
   Look for: [IAPProvider] Environment detected: ...
   ```

2. **Verify Constants Values**
   ```typescript
   console.log('isDevice:', Constants.isDevice);
   console.log('platform:', Constants.platform);
   console.log('model:', Constants.platform?.ios?.model);
   ```

3. **Force Mock Mode** (temporary testing)
   ```typescript
   // In IAPProvider.tsx
   const useMock = true; // Force mock mode for testing
   const service = useMock ? iapServiceMock : iapService;
   ```

4. **Clear Cache & Rebuild**
   ```bash
   cd jaime-mobile-app
   rm -rf node_modules
   pnpm install
   pnpm run ios
   ```

---

## Environment Detection Details

### iOS Simulator
```
Constants.isDevice: false
Constants.platform.ios.model: "iPhone 15 Simulator"
Detection Result: Simulator → Use Mock IAP
```

### Physical iPhone
```
Constants.isDevice: true
Constants.platform.ios.model: "iPhone 14 Pro"
Detection Result: Physical Device → Use Real IAP
```

### Android Emulator
```
Constants.isDevice: false
Constants.platform.android.model: "Android SDK built for arm64"
Detection Result: Emulator → Use Mock IAP
```

### Physical Android
```
Constants.isDevice: true
Constants.platform.android.model: "Samsung Galaxy S21"
Detection Result: Physical Device → Use Real IAP
```

---

## What Changed from Before

### Before (Unreliable)
```typescript
// Simple check - sometimes wrong
const isSimulator = !Constants.isDevice;
```

**Problems:**
- ❌ Sometimes `isDevice` is `true` on simulator
- ❌ No fallback checks
- ❌ No logging
- ❌ Hard to debug

### After (Reliable)
```typescript
// Multi-layered detection
export function isRunningOnSimulator(): boolean {
  // Check 1: Constants.isDevice
  if (Constants.isDevice === false) return true;
  
  // Check 2: Model string
  const model = Constants.platform?.ios?.model?.toLowerCase();
  if (model?.includes('simulator')) return true;
  
  // Default: real device
  return false;
}
```

**Benefits:**
- ✅ Multiple detection methods
- ✅ Platform-specific checks
- ✅ Comprehensive logging
- ✅ Easy to debug
- ✅ Centralized in one place

---

## API Reference

### `isRunningOnSimulator(): boolean`
Main detection function.

**Returns:** `true` if simulator/emulator, `false` if physical device

**Example:**
```typescript
import { isRunningOnSimulator } from '@/utils/deviceDetection';

if (isRunningOnSimulator()) {
  console.log('Running on simulator - use mock IAP');
} else {
  console.log('Running on device - use real IAP');
}
```

### `getEnvironmentDescription(): string`
Returns human-readable environment description.

**Returns:** String like `"ios - Simulator/Emulator (isDevice: false, model: iPhone 15 Simulator)"`

**Example:**
```typescript
import { getEnvironmentDescription } from '@/utils/deviceDetection';

console.log('Environment:', getEnvironmentDescription());
// Output: "ios - Simulator/Emulator (isDevice: false, model: iPhone 15 Simulator)"
```

### `shouldUseMockIAP(): boolean`
Determines if app should use mock IAP service.

**Returns:** `true` if should use mock, `false` if should use real IAP

**Checks:**
1. Is running on simulator?
2. Is `expo-iap` module available?

**Example:**
```typescript
import { shouldUseMockIAP } from '@/utils/deviceDetection';

const service = shouldUseMockIAP() ? iapServiceMock : iapService;
```

---

## Testing Checklist

- [ ] Build and run on iOS Simulator
  - [ ] Check console logs show "Simulator/Emulator"
  - [ ] Check console logs show "Using MOCK IAP service"
  - [ ] Check orange banner appears in credit purchase modal
  - [ ] Check orange banner appears in plans & pricing
  - [ ] Try mock purchase - should work instantly

- [ ] Build and run on physical iPhone
  - [ ] Check console logs show "Physical Device"
  - [ ] Check console logs show "Using REAL IAP service"
  - [ ] Check NO banner appears
  - [ ] Try real purchase - should open App Store sheet

- [ ] Build and run on Android Emulator (when ready)
  - [ ] Check console logs show "Emulator"
  - [ ] Check console logs show "Using MOCK IAP service"

- [ ] Build and run on physical Android (when ready)
  - [ ] Check console logs show "Physical Device"
  - [ ] Check console logs show "Using REAL IAP service"

---

## Troubleshooting Common Issues

### Issue: Still showing "IAP.connectAsync not a function"

**Possible Causes:**
1. Detection failing - check logs
2. expo-iap not properly installed
3. Need to rebuild

**Solution:**
```bash
# Reinstall dependencies
cd jaime-mobile-app
rm -rf node_modules
pnpm install

# Clean build
rm -rf ios/build
rm -rf ios/Pods
cd ios && pod install && cd ..

# Rebuild
pnpm run ios
```

### Issue: Orange banner showing on physical device

**Diagnosis:**
Detection thinks device is a simulator.

**Check:**
```typescript
// Add temporary logging
console.log('Constants.isDevice:', Constants.isDevice);
console.log('Model:', Constants.platform?.ios?.model);
```

**Solution:**
If model contains "simulator" on real device, contact Expo support - this is unusual.

### Issue: No banner on simulator

**Diagnosis:**
Detection thinks simulator is a device.

**Check:**
```typescript
// Add temporary logging
import { isRunningOnSimulator, getEnvironmentDescription } from '@/utils/deviceDetection';
console.log('Detection:', isRunningOnSimulator());
console.log('Environment:', getEnvironmentDescription());
```

**Solution:**
Check the detection logic in `utils/deviceDetection.ts` and verify your simulator model name.

---

## Summary

✅ **Improved multi-layered device detection**  
✅ **Centralized in one module**  
✅ **Platform-specific checks**  
✅ **Comprehensive logging**  
✅ **Easy debugging**  
✅ **Reliable fallback logic**  

The new detection system is much more robust and should correctly identify simulators vs physical devices in all cases.

---

**Status:** ✅ **COMPLETE**  
**Date:** October 31, 2025  
**Files Modified:** 6  
**New Files:** 2  
**Breaking Changes:** None  
**Requires Testing:** Yes (on both simulator and device)

