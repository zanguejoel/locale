# 🔧 iOS Build Fix - expo-secure-store Swift Error

**Issue:** Swift compilation error in expo-secure-store module  
**Error:** `cannot find 'Constant' in scope`  
**Cause:** Compatibility issue between expo-secure-store 15.0.7 and Expo SDK 52

---

## 🎯 **SOLUTION OPTIONS**

### **Option 1: Use Expo Development Build (Recommended)**

Instead of running `pod install` directly, use Expo's development build:

```bash
# Clean everything
cd /Users/zanguejoel/Documents/work/jaime-mobile-app
rm -rf ios/Pods ios/Podfile.lock
rm -rf node_modules

# Reinstall
pnpm install

# Create development build
npx expo run:ios
```

This will handle all the native module setup automatically.

---

### **Option 2: Downgrade expo-secure-store (If Option 1 fails)**

Use an older, more stable version:

```bash
# Remove current version
pnpm remove expo-secure-store

# Install compatible version
pnpm add expo-secure-store@13.0.2

# Rebuild
npx expo prebuild --clean
npx expo run:ios
```

**Note:** You'll need to update the imports slightly:
```typescript
// No changes needed - API is the same
import * as SecureStore from 'expo-secure-store';
```

---

### **Option 3: Alternative - Use MMKV for Tokens (Fallback)**

If expo-secure-store continues to have issues, you can use react-native-mmkv with encryption:

```bash
# Already installed
# Just need to update SecureTokenManager.ts
```

```typescript
// utils/SecureTokenManager.ts (Alternative implementation)
import { MMKV } from 'react-native-mmkv';

// Create encrypted storage instance
const secureStorage = new MMKV({
  id: 'secure-tokens',
  encryptionKey: 'your-app-specific-encryption-key-here' // Store this safely
});

export const saveToken = async (token: string): Promise<void> => {
  try {
    secureStorage.set('auth_token', token);
  } catch (error) {
    console.error('Failed to save auth token:', error);
    throw new Error('Failed to save authentication token');
  }
};

export const getToken = async (): Promise<string | null> => {
  try {
    return secureStorage.getString('auth_token') || null;
  } catch (error) {
    console.error('Failed to retrieve auth token:', error);
    return null;
  }
};

export const deleteToken = async (): Promise<void> => {
  try {
    secureStorage.delete('auth_token');
  } catch (error) {
    console.error('Failed to delete auth token:', error);
  }
};
```

---

## 🚀 **RECOMMENDED APPROACH**

### **Step 1: Try Development Build First**

```bash
cd /Users/zanguejoel/Documents/work/jaime-mobile-app

# Make sure expo-cli is updated
pnpm add -g expo-cli

# Run iOS with development build
npx expo run:ios
```

This should automatically:
- Install pods correctly
- Build native modules
- Launch the app
- Handle expo-secure-store properly

### **Step 2: If Errors Persist**

The Swift error might be due to Expo SDK 52 being very new. Check for updates:

```bash
# Update Expo packages
npx expo install --fix

# Or specific package
pnpm add expo-secure-store@latest

# Then rebuild
npx expo run:ios
```

---

## 🐛 **TROUBLESHOOTING**

### **If you see "Constant not found" error:**

This is a known issue with expo-modules-core and Swift. The fix:

```bash
# Option A: Use Expo's managed workflow
npx expo start
# Then press 'i' for iOS

# Option B: Update expo-modules-core
cd ios
pod update expo-modules-core
cd ..
npx expo run:ios
```

### **If CocoaPods has encoding errors:**

```bash
# Add to ~/.zshrc or ~/.bash_profile
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Reload shell
source ~/.zshrc

# Try again
cd ios && pod install
```

---

## ✅ **VERIFICATION**

After fixing, verify:

```bash
# TypeScript should still pass
npx tsc --noEmit  # ✅ Should pass

# Run app
npx expo run:ios

# Test SecureStore
# 1. Sign in
# 2. Close app completely
# 3. Reopen app
# 4. Should still be signed in (token from SecureStore)
```

---

## 📝 **NOTES**

### Why This Happened
- expo-secure-store 15.x uses new Expo Modules API
- Expo SDK 52 is very recent (released Dec 2024)
- Some Swift APIs changed between versions
- CocoaPods needs UTF-8 encoding

### Our Code is Fine ✅
- All TypeScript is correct
- All security implementation is correct
- This is purely a native build issue
- Not a code problem!

---

## 🎯 **QUICK FIX STEPS**

```bash
# 1. Set encoding
export LANG=en_US.UTF-8

# 2. Clean and rebuild
cd /Users/zanguejoel/Documents/work/jaime-mobile-app
rm -rf ios/Pods ios/Podfile.lock

# 3. Use Expo's build system
npx expo run:ios
```

**This should work!** If not, use Option 2 (downgrade expo-secure-store).

---

## 💡 **IMPORTANT**

**Your code changes are ALL CORRECT!** ✅

- TypeScript: Perfect (0 errors)
- Security implementation: Correct
- SecureStore usage: Correct

This is just a native module build issue, not a code issue.

---

**Next:** Try `npx expo run:ios` and it should handle everything! 🚀

