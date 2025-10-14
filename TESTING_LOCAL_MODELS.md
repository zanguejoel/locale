# Testing Local Models Locally

This guide will help you test the local model download functionality and understand the `content-length` warning.

## Prerequisites

### iOS Requirements
- macOS with Xcode installed
- iOS device or simulator running iOS 17.0+
- CocoaPods installed (`sudo gem install cocoapods`)

### Android Requirements
- Android Studio installed
- Android device or emulator running Android 13+ (API level 33+)

## Setup

1. **Install Dependencies**
   ```bash
   cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app
   pnpm install
   ```

2. **iOS Setup**
   ```bash
   cd ios
   pod install
   cd ..
   ```

## Running the App

### Option 1: iOS (Recommended for Testing)

```bash
# Start Metro bundler in one terminal
npx expo start --clear

# In another terminal, run on iOS
npx expo run:ios

# Or specify a simulator
npx expo run:ios --simulator="iPhone 15 Pro"
```

### Option 2: Android

```bash
# Start Metro bundler in one terminal
npx expo start --clear

# In another terminal, run on Android
npx expo run:android
```

### Option 3: Development Client (Faster Iterations)

```bash
# Just start Expo
npx expo start

# Then:
# - Press 'i' for iOS
# - Press 'a' for Android
```

## Testing Local Model Download

### Step 1: Enable Local Models

1. Launch the app
2. Log in to your account
3. Navigate to **Profile** (bottom tab)
4. Look for the **Model Toggle** or **Local/Cloud** switch
5. Toggle to **Local** mode

**Expected behavior:**
- You should see a console log: `[Local] User switched to local mode - initializing ExecuTorch...`
- The app should start initializing the local model

### Step 2: Observe the Download

Open your terminal where Metro is running to see logs:

**Expected logs:**
```
[Local] User switched to local mode - initializing ExecuTorch...
WARN [React Native ExecuTorch] No content-length header for https://huggingface.co/software-mansion/react-native-executorch-llama-3.2/resolve/v0.5.0/tokenizer_config.json
[Local] Progress changed: 0.15
[Local] Progress changed: 0.35
[Local] Progress changed: 0.67
[Local] Progress changed: 0.95
[Local] Download complete, stopping progress polling
[Local] Model is ready, stopping ready state polling
```

**UI indicators:**
- A download progress bar should appear in the chat interface
- Shows "Downloading Llama 3.2 1B"
- Progress percentage updates (e.g., "45% complete • ~1.2GB")
- When complete: "Finalizing Llama 3.2 1B"

### Step 3: Test the Model

1. Once the download is complete (progress shows 100% and "Model is ready")
2. Type a message in the chat: "Hello, how are you?"
3. Send the message

**Expected behavior:**
- Message should be processed locally (on-device)
- Response appears with streaming text
- No network call to cloud API
- Faster responses after initial load

### Step 4: Monitor the Warning

The warning `No content-length header for...tokenizer_config.json` is **normal and harmless**.

**What you'll observe:**
- ✅ Warning appears in logs during download
- ✅ Download continues successfully
- ✅ Progress bar may show 0% briefly for that specific file
- ✅ Model works perfectly after download
- ✅ No impact on functionality

## Debugging Tips

### View All Logs

**React Native Debugger:**
```bash
# In your browser, open:
http://localhost:8081/debugger-ui

# Or use React Native Debugger app
brew install --cask react-native-debugger
```

**iOS Logs:**
```bash
# Terminal logs from iOS device
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Odyssey"' --level=debug

# Or use Console.app (macOS application)
```

**Android Logs:**
```bash
# View Android logs
adb logcat | grep -i "executorch\|odyssey"
```

### Common Issues

#### Issue 1: "Device does not support local LLM"
**Solution:** Ensure your device/simulator meets requirements:
- iOS 17.0+ or Android 13+ (API 33+)
- Check `DeviceCapabilities.ts` for details

#### Issue 2: Download seems stuck
**Solution:**
- Check internet connection
- Clear app cache: Settings → Clear Cache
- Restart the app
- Check available storage space (models are large!)

#### Issue 3: Model doesn't initialize
**Solution:**
```bash
# Clear cache and reinstall (iOS)
cd ios
rm -rf build/
pod deintegrate
pod install
cd ..
npx expo run:ios --device

# Clear cache and reinstall (Android)
cd android
./gradlew clean
cd ..
npx expo run:android
```

## Testing Different Models

To test different local models:

1. Go to **Profile** → **Settings** → **Local Model Settings**
2. Select a different model (e.g., SmolLM2 360M, Qwen 2.5 0.5B)
3. Switch to Local mode
4. Observe the new model downloading

**Available models:**
- SmolLM2 135M (~135MB) - Smallest, fastest
- SmolLM2 360M (~360MB) - Small, efficient
- Hammer2 0.5B (~500MB) - Balanced
- Qwen 2.5 0.5B (~500MB) - Balanced
- **Llama 3.2 1B (~1.2GB)** - Recommended (default)
- Qwen 2.5 1.5B (~1.5GB) - Advanced
- Llama 3.2 3B (~3GB) - Most capable

## Performance Testing

### Test Response Times

```javascript
// Add this to ChatPage.tsx temporarily for testing
const testStartTime = Date.now();

// After response received:
const responseTime = Date.now() - testStartTime;
console.log(`[Performance] Local response time: ${responseTime}ms`);
```

**Expected response times:**
- First message after download: 2-5 seconds (model loading)
- Subsequent messages: 0.5-2 seconds per token
- Varies by device performance and model size

### Test Storage Usage

```javascript
// Check model storage (add to ChatPage.tsx for testing)
import { ModelFileManager } from '@/utils/ModelFileManager';

const checkStorage = async () => {
  const size = await ModelFileManager.getTotalModelSize();
  console.log(`[Storage] Total model size: ${(size / 1024 / 1024).toFixed(2)} MB`);
};
```

## Verifying the Fix

To verify that the `content-length` warning is harmless:

1. ✅ **Check**: Warning appears in logs → Normal
2. ✅ **Check**: Download completes successfully → Working
3. ✅ **Check**: Model generates responses → Working
4. ✅ **Check**: Progress bar shows updates → Working
5. ✅ **Check**: No crashes or errors → Stable

## Automated Tests

Run the existing test suite:

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test -- ChatPage.test.tsx

# Run with coverage
pnpm test -- --coverage
```

## Clean Up After Testing

```bash
# Remove downloaded models to free space
# Via app: Profile → Model Manager → Clear All Models

# Or manually:
rm -rf ~/Library/Developer/CoreSimulator/Devices/*/data/Containers/Data/Application/*/Library/Caches/executorch

# Reset app state
npx expo start --clear
```

## What to Look For

### ✅ Success Indicators
- Warning appears but doesn't cause failures
- Download completes to 100%
- Model marked as "ready"
- Chat responses work locally
- No network calls during local chat
- Progress bar updates (even if briefly at 0%)

### ❌ Failure Indicators (Not Expected)
- Download fails completely
- App crashes during download
- Model never reaches "ready" state
- Cannot send messages after download
- Error alerts appear

## Next Steps

If everything works (which it should):
- The warning is cosmetic and can be ignored
- Consider updating `react-native-executorch` to latest version
- Monitor for updates from the library maintainers
- Continue with normal development

## Additional Resources

- [ExecuTorch Setup Guide](./docs/EXECUTORCH_SETUP_GUIDE.md)
- [Local Model Management Plan](./docs/LOCAL_MODEL_MANAGEMENT_PLAN.md)
- [Migration Summary](./docs/MIGRATION_SUMMARY.md)
- [react-native-executorch Docs](https://docs.swmansion.com/react-native-executorch/docs)

## Reporting Issues

If you find actual issues (not the warning):

1. Capture full logs
2. Note device/simulator specs
3. Document exact steps to reproduce
4. Check [react-native-executorch GitHub Issues](https://github.com/software-mansion/react-native-executorch/issues)

