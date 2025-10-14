# Local Model Download Crash Troubleshooting

**Date**: October 13, 2025  
**Issue**: App crashes when starting to download local models  
**Status**: ✅ Multiple fixes applied

---

## 🐛 Common Crash Causes & Solutions

### 1. Content-Length Header Error ✅ FIXED

**Symptom:**
```
[React Native ExecuTorch] No content-length header for ...tokenizer.json
APP CRASHES
```

**Cause:** HuggingFace doesn't always include `Content-Length` headers, causing the library to throw an error.

**Solution:** ✅ Already fixed in `LocalModelErrorBoundary.tsx` - error is now caught and ignored.

**Verification:**
- Check console for: `[LocalModelErrorBoundary] Content-Length header warning - ignoring`
- Download should continue normally

---

### 2. Invalid Model Source

**Symptom:**
```
[Local] Invalid model source: { modelId: 'xxx', modelSource: undefined }
APP CRASHES when switching to local mode
```

**Cause:** Selected model doesn't have a valid `modelSource` constant from `react-native-executorch`.

**Solution:** ✅ Now checks for valid model source before initializing

**Code Protection:**
```typescript
// hooks/useChat.tsx
const hasValidModelSource = Boolean(selectedLocalModel?.modelSource);
const safeModelSource = hasValidModelSource ? selectedLocalModel.modelSource : null;

const llm = useLLM({
  model: safeModelSource,
  preventLoad: !deviceSupportsLocalLLM || !shouldInitializeLLM || !hasValidModelSource
});
```

**User Action Needed:** If this persists, go to Settings → Model Manager → select a different local model

---

### 3. Insufficient Storage

**Symptom:**
```
Download starts → Progress bar appears → APP CRASHES
```

**Cause:** Device runs out of storage during download.

**Solution:** ✅ Now checks storage before download starts

**What Happens:**
- System checks available space
- Requires 20% buffer (e.g., 1.2GB model needs 1.44GB free)
- Shows alert if insufficient
- Blocks download until space is freed

**User Action:** Delete unused models or other files to free up space

---

### 4. Memory Errors

**Symptom:**
```
Out of memory
Memory allocation failed
SIGHUP or SIGTERM
```

**Cause:** Device doesn't have enough RAM for the selected model.

**Solutions:**
- Try a smaller model (SmolLM2 135M instead of Llama 3.2 3B)
- Close other apps
- Restart device
- Use cloud models instead

**Model Size Recommendations:**
| Device RAM | Recommended Model | Size |
|------------|-------------------|------|
| < 4GB | SmolLM2 135M/360M | ~135-360MB |
| 4-6GB | Llama 3.2 1B | ~1.2GB |
| 6-8GB | Qwen 2.5 1.5B | ~1.5GB |
| 8GB+ | Llama 3.2 3B | ~3GB |

---

### 5. Network Interruptions

**Symptom:**
```
Download progress freezes
Network error
Connection timeout
APP MAY CRASH or hang
```

**Cause:** Unstable network connection during download.

**Solutions:**
- Use stable Wi-Fi (not mobile data)
- Don't switch networks mid-download
- Ensure good signal strength
- Try download again if interrupted

---

### 6. ExecuTorch Library Errors

**Symptom:**
```
react-native-executorch error
Module initialization failed
Native module not found
```

**Cause:** ExecuTorch native module issues.

**Solutions:**

**iOS:**
```bash
cd ios
pod install
cd ..
npx expo run:ios --device
```

**Android:**
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

**Nuclear Option:**
```bash
# Delete and rebuild
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..
```

---

## 🔧 Fixes Applied

### In `LocalModelErrorBoundary.tsx`:
✅ Content-length errors are caught and ignored  
✅ Download continues normally  
✅ Other errors show proper UI  

### In `useChat.tsx`:
✅ Added validation for model source  
✅ Added safe model source handling  
✅ Added error monitoring in LLM state  
✅ Added try-catch around stream updates  
✅ Shows alert for LLM errors (except content-length)  

### In `_layout.tsx`:
✅ Wrapped `ChatProvider` with `LocalModelErrorBoundary`  
✅ Global error catching for model initialization  

### In `model-manager.tsx` & `ChatCustomDrawerContent.tsx`:
✅ Storage check before download  
✅ Prevents download if insufficient space  

---

## 📊 Diagnostic Logs

### Expected Console Output (Successful):

```
[Local] Initializing useLLM with: {
  modelSource: 'valid',
  preventLoad: false,
  deviceSupported: true,
  shouldInit: true,
  hasValidSource: true
}

[Local] User switched to local mode - initializing ExecuTorch...
[Local] Model info: {
  id: 'llama-3.2-1b',
  name: 'Llama 3.2 1B',
  hasModelSource: true
}

[LocalModelErrorBoundary] Content-Length header warning - ignoring
[LocalModelErrorBoundary] Model download will continue normally

[Local] Progress changed: 0.15
[Local] Progress changed: 0.35
[Local] Progress changed: 0.55
[Local] Progress changed: 0.75
[Local] Progress changed: 0.95
[Local] Model marked as downloaded: llama-3.2-1b
```

### Error Logs (If Crash Occurs):

```
[Local] Invalid model source: { modelId: 'xxx', modelSource: undefined }
❌ This means the selected model is not properly configured

[Local] LLM has error: [error message]
❌ This means ExecuTorch encountered an error

[LocalModelErrorBoundary] Caught local model error: [error]
❌ This means an uncaught error was thrown

[ModelManager] Error checking storage: [error]
⚠️  Storage check failed, but download may proceed
```

---

## 🧪 Testing Checklist

To verify the fixes work:

### Test 1: Normal Download
- [ ] Switch to local mode
- [ ] Select Llama 3.2 1B
- [ ] Wait for download to complete
- [ ] ✅ Should NOT crash
- [ ] ✅ Should see progress bar
- [ ] ✅ Should complete successfully

### Test 2: Insufficient Storage
- [ ] Fill device storage (leave < 500MB free)
- [ ] Try downloading 1.2GB model
- [ ] ✅ Should show "Insufficient Storage" alert
- [ ] ✅ Should NOT start download
- [ ] ✅ Should NOT crash

### Test 3: Content-Length Warning
- [ ] Watch console during download
- [ ] ✅ Should see content-length warning
- [ ] ✅ Should continue downloading
- [ ] ✅ Should NOT crash

### Test 4: Network Interruption
- [ ] Start download
- [ ] Turn off Wi-Fi mid-download
- [ ] ✅ Should show error (not crash)
- [ ] ✅ Should allow retry

### Test 5: Invalid Model
- [ ] Manually corrupt model ID in storage
- [ ] Switch to local mode
- [ ] ✅ Should show error alert
- [ ] ✅ Should offer to use cloud
- [ ] ✅ Should NOT crash

---

## 🔍 How to Debug Crashes

### Step 1: Enable Detailed Logging

Uncomment debug logs in `useChat.tsx`:

```typescript
// Line 332-337
console.log('[Local] LLM state update:', {
  isReady: (llm as any).isReady,
  downloadProgress: (llm as any).downloadProgress,
  isGenerating: (llm as any).isGenerating,
  error: (llm as any).error,
  allProps: Object.keys(llm)
});
```

### Step 2: Check Native Logs

**iOS:**
```bash
# View Xcode console
# Or use:
npx react-native log-ios
```

**Android:**
```bash
adb logcat | grep -i "executorch\|crash\|fatal"
```

### Step 3: Monitor Memory

**iOS:**
- Open Xcode → Debug Navigator → Memory
- Watch for spikes during download

**Android:**
```bash
adb shell dumpsys meminfo [your.package.name]
```

### Step 4: Check Storage

**Get current storage:**
```typescript
import { ModelFileManager } from '@/utils/ModelFileManager';

const storage = await ModelFileManager.getDeviceStorageInfo();
console.log('Free space:', storage.freeSpace / (1024 * 1024 * 1024), 'GB');
```

---

## 🚨 If Still Crashing

### Last Resort Steps:

**1. Clear App Data:**
```bash
# iOS - Delete app and reinstall
# Android
adb shell pm clear [your.package.name]
```

**2. Check Device Compatibility:**
- iOS 17.0+ required
- Android API 33+ required
- Minimum 4GB RAM recommended

**3. Try Smallest Model First:**
- Download SmolLM2 135M (~135MB)
- If this works, device supports local models
- If this crashes, device may not be compatible

**4. Use Cloud Models:**
- Switch to cloud mode
- File bug report with:
  - Device model
  - OS version
  - Console logs
  - Crash logs (if available)

---

## 📝 Files Modified for Crash Prevention

1. `components/LocalModelErrorBoundary.tsx` - Content-length error handling
2. `hooks/useChat.tsx` - Model source validation, error monitoring
3. `app/_layout.tsx` - Global error boundary
4. `app/model-manager.tsx` - Storage checking
5. `components/ChatCustomDrawerContent.tsx` - Storage checking

---

## ✨ Summary

The app now has multiple layers of protection:

1. **Error Boundary** - Catches React errors including from useLLM hook
2. **Content-Length Handling** - Ignores harmless tokenizer warnings
3. **Model Source Validation** - Ensures valid model before initialization
4. **Storage Checking** - Prevents downloads with insufficient space
5. **LLM Error Monitoring** - Detects and reports ExecuTorch errors
6. **Safe Fallbacks** - Always offers to switch to cloud models
7. **Detailed Logging** - Helps identify issues quickly

**Most crashes should now be prevented.** If you still experience crashes, follow the debugging steps above and report the issue with console logs.

