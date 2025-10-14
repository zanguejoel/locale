# Quick Test Guide - Local Models

## 🚀 Quick Start (Choose One)

### Option 1: Use Test Script (Easiest)
```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app

# For iOS
./test-local-models.sh ios

# For Android  
./test-local-models.sh android
```

### Option 2: Manual Commands

**iOS:**
```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app
pnpm install
cd ios && pod install && cd ..
npx expo start --clear

# In another terminal:
npx expo run:ios
```

**Android:**
```bash
cd /Users/zanguejoel/Desktop/Neptune/odyssey/jaime-mobile-app
pnpm install
npx expo start --clear

# In another terminal:
npx expo run:android
```

## ✅ Testing Checklist

1. [ ] App launches successfully
2. [ ] Log in to your account
3. [ ] Go to **Profile** tab
4. [ ] Toggle to **Local** mode
5. [ ] Observe download progress bar
6. [ ] **Look for the warning** in terminal logs (this is expected!)
7. [ ] Wait for "Model is ready" status
8. [ ] Send a test message: "Hello!"
9. [ ] Verify response is generated locally

## 📊 Expected Logs

```
✅ [Local] User switched to local mode - initializing ExecuTorch...
⚠️  WARN [React Native ExecuTorch] No content-length header for ...tokenizer_config.json
✅ [Local] Progress changed: 0.25
✅ [Local] Progress changed: 0.50
✅ [Local] Progress changed: 0.75
✅ [Local] Download complete, stopping progress polling
✅ [Local] Model is ready, stopping ready state polling
```

## 🔍 What the Warning Means

```
WARN [React Native ExecuTorch] No content-length header for ...tokenizer_config.json
```

**Status:** ✅ **HARMLESS** - Not an error!

- **Cause:** HuggingFace server doesn't send file size header for small config files
- **Impact:** Progress bar may briefly show 0% for that one file
- **Result:** Download completes successfully anyway
- **Action:** No action needed - this is normal

## 🎯 Testing Scenarios

### Scenario 1: First Time Download
1. Fresh app install
2. Toggle to Local mode
3. Watch full download (~1.2GB)
4. Should take 2-10 minutes depending on internet speed

### Scenario 2: Model Already Downloaded
1. Toggle to Local mode
2. Should immediately show "Model is ready"
3. No download progress bar
4. Ready to use instantly

### Scenario 3: Switch Between Models
1. Go to Profile → Settings
2. Change local model (e.g., from Llama 3.2 1B to SmolLM2 360M)
3. Toggle to Local mode
4. Watch new model download

### Scenario 4: Switch Cloud ↔ Local
1. Send message in Cloud mode → Uses API
2. Toggle to Local mode → Uses on-device model
3. Toggle back to Cloud → Uses API again
4. No crashes, smooth transitions

## 🐛 Quick Debugging

### Check Device Compatibility
```javascript
// Add to app temporarily
import { isLocalLLMSupported, getLocalLLMUnsupportedMessage } from '@/utils/DeviceCapabilities';
console.log('Local LLM supported?', isLocalLLMSupported());
```

### Monitor Download Progress
```javascript
// Already in useChat.tsx - check logs
const progress = (llm as any).downloadProgress || 0;
console.log('[Local] Current progress:', progress);
```

### Clear Cache & Restart
```bash
# iOS Simulator
xcrun simctl erase all
npx expo run:ios

# Android Emulator  
adb shell pm clear com.neptunetech.odyssey
npx expo run:android
```

## 📱 Device Requirements

| Platform | Minimum Version | Recommended |
|----------|----------------|-------------|
| iOS | 17.0+ | 17.0+ |
| Android | 13+ (API 33) | 13+ |
| Storage | 2GB free | 5GB+ free |
| RAM | 4GB | 6GB+ |

## 🔧 Common Commands

```bash
# View iOS logs
npx expo run:ios | grep -i "executorch\|Local"

# View Android logs  
adb logcat | grep -i "executorch\|Local"

# Clear Metro cache
npx expo start --clear

# Rebuild iOS
cd ios && rm -rf build/ Pods/ && pod install && cd ..

# Rebuild Android
cd android && ./gradlew clean && cd ..

# Check storage
du -sh ios/build android/app/build node_modules
```

## 🎬 Expected Flow

```
User opens app
    ↓
User logs in
    ↓
User goes to Profile
    ↓
User toggles to "Local" mode
    ↓
App: "Initializing ExecuTorch..."
    ↓
Console: Warning about content-length ⚠️ (HARMLESS)
    ↓
UI: Shows download progress bar
    ↓
Progress: 0% → 25% → 50% → 75% → 100%
    ↓
App: "Finalizing Llama 3.2 1B"
    ↓
App: "Model is ready" ✅
    ↓
User sends message
    ↓
Response generated locally 🎉
```

## 📚 More Details

For comprehensive testing instructions, see:
- **[TESTING_LOCAL_MODELS.md](./TESTING_LOCAL_MODELS.md)** - Full testing guide
- **[docs/EXECUTORCH_SETUP_GUIDE.md](./docs/EXECUTORCH_SETUP_GUIDE.md)** - Setup guide
- **[docs/LOCAL_MODEL_MANAGEMENT_PLAN.md](./docs/LOCAL_MODEL_MANAGEMENT_PLAN.md)** - Architecture

## 💡 Pro Tips

1. **Use iOS Simulator first** - Easier to debug, faster iterations
2. **Keep terminal logs visible** - Watch for the "harmless" warning
3. **Test on slow network** - Verifies download resumption works
4. **Try different models** - Each has different sizes/performance
5. **Monitor memory** - Check device doesn't run out of RAM

## ❓ Questions?

If you see the warning → ✅ **Working as expected!**
If download fails → Check internet, storage, device compatibility
If app crashes → Check logs, report to team

---

**Remember:** The `content-length` warning is **not an error**. It's just informational logging from the library. The download will complete successfully! 🎉

