# Streaming Issues Investigation & Fixes

**Date**: October 2, 2025  
**Issue**: Neither cloud model nor local model streaming working

## Problems Identified

### 1. Cloud Model Streaming - 401 Unauthorized

**Symptom:**
```
LOG  [Cloud] Fetch response status: 401 ok: false
ERROR [Cloud] Error response: {"detail":"Unauthorized token."}
```

**Root Cause:**
- Authentication token is expired or invalid
- The stored token in expo-secure-store is no longer valid with the backend API

**Solution Applied:**
- Added comprehensive token debugging (preview, length)
- Added specific 401 error handling with user-friendly message
- Prompts user to sign in again when token is expired
- Returns early to prevent further processing

**Next Steps:**
- User needs to **sign in again** to get a fresh token
- Consider implementing automatic token refresh using refresh tokens
- Add token expiration checking before making requests

---

### 2. Local Model Streaming - Model Not Loaded

**Symptom:**
```
LOG  [Local] LLM state: {"isGenerating": false, "isModelLoading": undefined, "response": ""}
ERROR [Local] LLM generation error: [Error: Model is still loading]
```

**Root Cause:**
- `LLAMA3_2_1B` constant points to a **1.2GB model file** hosted on HuggingFace:
  ```
  https://huggingface.co/software-mansion/react-native-executorch-llama-3.2/resolve/v0.1.0/llama-3.2-1B/original/llama3_2_bf16.pte
  ```
- The `useLLM` hook automatically downloads the model when initialized
- **The model is still downloading** in the background (1.2GB takes time)
- Users are trying to use it before download completes
- `isModelLoading` property is `undefined` (possible API mismatch in react-native-executorch)

**Solution Applied:**
- Added detection of all possible loading property names (`isModelLoading`, `loading`, `isLoading`)
- Added comprehensive error handling for "Model is still loading" errors
- User-friendly alert explaining the model is downloading (1.2GB) and to wait
- Logs all LLM object properties to debug the actual API surface
- Better error messages distinguishing between download/loading errors and generation errors

**Next Steps for Local Model:**
1. **Wait for model download** - The first time local mode is used, the 1.2GB model must download completely
2. **Add download progress indicator** - Show users the download progress so they know it's working
3. **Consider smaller models** - Use lighter models like Llama-160M (~640MB) or Minueza-32M (~128MB) for faster initial load
4. **Pre-bundle models** - For production, consider bundling smaller models with the app

---

## Code Changes Made

### `hooks/useChat.tsx`

**Cloud Streaming:**
- Added token debugging (preview, length, existence)
- Added specific handling for 401 errors
- Better error messages for users
- Proper cleanup on authentication errors

**Local Streaming:**
- Added logging of all LLM object properties
- Check multiple property names for loading state
- Specific handling for "still loading" errors
- Inform users about 1.2GB download requirement

### `utils/ChatStream.ts`

- Added detailed chunk-by-chunk logging
- Log when reader is obtained
- Count and log number of chunks received
- Log first 100 chars of each chunk
- Log number of parsed results from each chunk

---

## Testing Recommendations

### Cloud Model Testing:
1. User should sign in again to get a fresh token
2. Try sending a message - should see detailed fetch logs
3. Verify streaming chunks are received and processed
4. Check that messages appear in real-time

### Local Model Testing:
1. **First time**: Model needs to download (1.2GB) - this takes several minutes
2. Check logs for `[Local] LLM object properties:` to see actual API
3. Wait for download to complete (no visual indicator yet)
4. Try again after waiting 5-10 minutes (depending on connection)
5. Model should work after first successful download (cached for future use)

---

## Improvements Implemented

1. ✅ **Download progress UI** - Created `LocalModelDownloadProgress` component
   - Shows real-time download progress (0-100%)
   - Displays size information (~1.2GB)
   - Auto-hides when model is ready
   - Shown in ChatPage when local mode is active

2. ✅ **Model management** - Added "Clear Downloaded Models" option in Settings
   - Shows current download status
   - Displays model size when downloaded
   - Shows download percentage when in progress
   - Option to clear model and free up space

3. ✅ **Better error handling** - Fixed property names
   - Use `isModelReady` instead of `isModelLoading`
   - Check `downloadProgress` for status
   - User-friendly error messages with download percentage

4. ✅ **Comprehensive logging** - Debug both cloud and local streaming
   - Chunk-by-chunk logging for cloud streams
   - Token validation and preview logging
   - LLM state logging with all properties

## Future Improvements

1. **Implement token refresh** mechanism for cloud models
2. **Pre-download models** on app installation or first launch  
3. **Smaller default model** - Consider using a lighter model by default
4. **Add pause/resume download** functionality
5. **Background download** with notifications

---

## Summary

✅ **Both issues diagnosed and improved error handling added**  
⚠️ **Cloud**: User needs to re-authenticate  
⚠️ **Local**: Model is downloading (1.2GB) - need to wait for completion

The streaming code itself is working correctly - the issues are:
- **Authentication** (cloud)
- **Model availability** (local)

