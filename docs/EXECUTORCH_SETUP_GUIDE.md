# React Native ExecuTorch Setup Guide

**Date**: October 3, 2025  
**Status**: ✅ Configuration Updated - Ready for Rebuild

## 🎯 What Changed

Your app has been updated to support local model downloads via `react-native-executorch`. The following critical changes were made:

### 1. ✅ New Architecture Enabled

**Changed:**
- `app.config.js`: `newArchEnabled: false` → `newArchEnabled: true`
- Added New Architecture flags for both iOS and Android in `expo-build-properties`

**Why:** react-native-executorch **ONLY** works with the New React Native Architecture.

### 2. ✅ iOS Deployment Target Updated

**Changed:**
- `ios/Podfile`: `platform :ios, '15.1'` → `platform :ios, '17.0'`
- `app.config.js`: Added `deploymentTarget: '17.0'` in iOS build properties

**Why:** react-native-executorch requires iOS 17.0+ minimum.

### 3. ✅ Android MinSdk Updated

**Changed:**
- `app.config.js`: `minSdkVersion: 24` → `minSdkVersion: 33`

**Why:** react-native-executorch requires Android 13+ (API level 33).

### 4. ✅ Device Capability Checks Fixed

**Changed:**
- `utils/DeviceCapabilities.ts`: Updated version checks from iOS 14+/Android 10+ to iOS 17+/Android 13+

**Why:** Prevents the app from attempting to use executorch on unsupported devices.

### 5. ✅ Library Updated

**Changed:**
- `package.json`: `react-native-executorch` from `0.3.1` → `0.5.8` (latest)

**Why:** Latest version with bug fixes and improved model download handling.

---

## 🚀 Next Steps: Rebuild Your App

### Step 1: Clean Everything

```bash
# Navigate to your project
cd /Users/zanguejoel/Documents/work/jaime-mobile-app

# Remove node_modules and reinstall
rm -rf node_modules
pnpm install

# Clean iOS build artifacts
cd ios
rm -rf Pods Podfile.lock build
cd ..

# Clean Android build artifacts
cd android
./gradlew clean
cd ..
```

### Step 2: Reinstall iOS Pods

```bash
cd ios
pod install --repo-update
cd ..
```

**Expected output:**
- You should see `react-native-executorch` being installed
- ExecuTorch frameworks should be linked
- No errors about missing dependencies

### Step 3: Rebuild iOS

```bash
# Option A: Using Expo
pnpm expo run:ios

# Option B: Clean build (if issues persist)
cd ios
xcodebuild clean -workspace Odyssey.xcworkspace -scheme Odyssey
cd ..
pnpm expo run:ios
```

### Step 4: Rebuild Android

```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
pnpm expo run:android
```

---

## 🧪 Testing Model Downloads

Once your app is rebuilt:

### 1. Check Device Compatibility

Open your app and check if the local model toggle appears:
- **If visible**: Your device meets requirements (iOS 17+ or Android 13+)
- **If hidden**: Device doesn't meet minimum requirements

### 2. Enable Local Mode

1. Open the drawer/sidebar
2. Toggle to "Local" mode
3. You should see a message about the model downloading

### 3. Monitor Download Progress

The app will automatically download the selected local model (~80MB for Tiny Mamba):
- Progress bar should appear
- Shows percentage complete
- May take 1-5 minutes depending on connection

### 4. Test Generation

Once the model is downloaded (progress reaches 100%):
1. Type a message
2. Send it
3. The local model should generate a response

**Expected Logs:**
```
LOG  [Local] Initializing LLM for first time...
LOG  [Local] Model downloading: 45% complete
LOG  [Local] Model ready!
LOG  [Local] Generating response...
```

---

## 🔧 Troubleshooting

### Issue: "Package doesn't seem to be linked"

**Solution:**
```bash
# Complete clean and rebuild
rm -rf node_modules ios/Pods ios/Podfile.lock ios/build
pnpm install
cd ios && pod install && cd ..
pnpm expo run:ios
```

### Issue: Build fails on iOS

**Check:**
1. Xcode version: Requires Xcode 15+ for iOS 17 support
2. Open `ios/Odyssey.xcworkspace` in Xcode
3. Check "Build Settings" → "iOS Deployment Target" should be 17.0
4. Clean Build Folder (Cmd+Shift+K) and rebuild

### Issue: Build fails on Android

**Check:**
1. Android Studio: Update to latest version
2. SDK Platform 33 (Android 13) must be installed
3. Check `android/build.gradle` for correct SDK versions
4. Run `./gradlew clean` before rebuilding

### Issue: Model download stuck at 0%

**Possible causes:**
1. **Network issue**: Check internet connection
2. **Permissions**: Ensure app has storage permissions
3. **Library not linked**: Verify the package installed correctly

**Solution:**
```bash
# Check if library is properly installed
pnpm list react-native-executorch

# Should show: react-native-executorch@0.5.8
```

### Issue: App crashes when using local mode

**Check logs for:**
- Memory issues: LLMs require significant RAM (2GB+ free)
- Model corruption: Try clearing model data and re-downloading
- Incompatible device: Verify iOS 17+/Android 13+

---

## 📱 Device Requirements

### Minimum Requirements

**iOS:**
- iOS 17.0 or newer
- iPhone XS/XR or newer (with iOS 17 update)
- 3GB+ free storage for models
- 2GB+ available RAM

**Android:**
- Android 13 (API level 33) or newer
- Devices released 2021+ (most will support Android 13)
- 3GB+ free storage for models
- 4GB+ available RAM

### Which Devices Are Affected?

**Devices that will LOSE local model support:**
- iPhones running iOS 16 or older
- Android devices on Android 12 or older
- These devices will still work perfectly with cloud models

**Recommended:**
- Inform users to update their OS to iOS 17/Android 13 for local AI features

---

## 📊 What to Expect

### After Successful Rebuild:

✅ **Local models will work** on supported devices (iOS 17+/Android 13+)  
✅ **Model downloads** will complete successfully  
✅ **Offline AI** will be functional  
✅ **Cloud models** continue to work on all devices  
✅ **App stability** maintained across all configurations

### Build Time:
- **First build**: 10-20 minutes (compiling native code)
- **Subsequent builds**: 2-5 minutes (incremental)

### App Size Impact:
- Binary size increase: ~15-20MB (executorch libraries)
- Model storage: 80MB - 1.2GB per model (downloaded on demand)

---

## 🎯 Success Criteria

You'll know the setup is successful when:

1. ✅ App builds without errors on iOS and Android
2. ✅ Local model toggle is visible on compatible devices
3. ✅ Model download progress is shown when switching to local mode
4. ✅ Model download completes and reaches 100%
5. ✅ Local model generates responses to messages
6. ✅ No crashes or "not linked" errors

---

## 📞 Need Help?

If you encounter issues:

1. **Check the logs** - Most issues will show specific error messages
2. **Verify versions** - Ensure all requirements are met
3. **Clean builds** - Many issues are resolved by cleaning and rebuilding
4. **Device compatibility** - Confirm device meets iOS 17+/Android 13+ requirements

### Common Error Messages and Fixes

| Error | Fix |
|-------|-----|
| "Package doesn't seem to be linked" | Clean install: `rm -rf node_modules && pnpm install && cd ios && pod install` |
| "Model is still loading" | Wait for download to complete (check progress bar) |
| "Unsupported device" | Device needs iOS 17+ or Android 13+ |
| Build fails with "No such module" | Run `cd ios && pod install --repo-update` |
| Gradle build fails | Update Android Studio and install API 33 SDK |

---

## 🎉 What's Next?

Once your rebuild is successful:

1. **Test thoroughly** on both iOS and Android
2. **Try different models** in the local model selector
3. **Monitor performance** and user feedback
4. **Update your app store listing** to mention iOS 17/Android 13 requirement for local AI

---

## 📝 Technical Details

### New Architecture Changes

The New Architecture (also called Fabric) changes how React Native handles:
- **Rendering**: Better performance with Fabric renderer
- **Native modules**: Improved TurboModules
- **Threading**: Better concurrency and responsiveness

### ExecuTorch Integration

`react-native-executorch` provides:
- **On-device inference**: Run AI models locally
- **Model downloading**: Automatic model fetch from HuggingFace
- **Progress tracking**: Real-time download progress
- **Model caching**: Downloaded models are stored locally

---

## 🔗 References

- [react-native-executorch GitHub](https://github.com/software-mansion/react-native-executorch)
- [Official Documentation](https://docs.swmansion.com/react-native-executorch/docs)
- [React Native New Architecture](https://reactnative.dev/docs/new-architecture-intro)
- [ExecuTorch (Meta)](https://pytorch.org/executorch/)

---

**Last Updated**: October 3, 2025  
**Configuration Version**: 1.0  
**Status**: ✅ Ready for rebuild


