# ExecuTorch Undefined Result Fix

## Issue Summary

**Problem**: The ExecuTorch local model (llama-3.2-1b) was returning `undefined` instead of a valid string response, causing crashes with the error: "Invalid result from LLM: undefined"

**Date Fixed**: October 15, 2025

**Resolution**: Changed default local model from `llama-3.2-1b` to `qwen2.5-0.5b` for improved stability

## Root Cause

The ExecuTorch library's `generate()` method was failing silently and returning `undefined` instead of:
1. A valid string response
2. Throwing an error

This could be caused by:
- Model not fully initialized despite `isReady` flag being true
- Internal ExecuTorch library errors
- Memory constraints on the device
- Corrupted model download
- Device compatibility issues

## Changes Made

### 0. Created ExecuTorch Wrapper (`utils/ExecuTorchWrapper.ts`) ⭐

**NEW: Centralized wrapper to handle all ExecuTorch interactions**

Created a comprehensive wrapper that encapsulates all ExecuTorch quirks:

- `safeExecuTorchGenerate()` - Safe generation with streaming support
- `getExecuTorchState()` - Type-safe state access
- `isExecuTorchReady()` - Readiness validation
- `getExecuTorchResponse()` - Response extraction
- `isRecoverableError()` - Error classification
- `isFatalError()` - Fatal error detection
- `formatExecuTorchState()` - Diagnostic logging

**Benefits:**
- ✅ Centralized handling of streaming responses
- ✅ No more false "undefined" errors
- ✅ Consistent error classification
- ✅ Better diagnostics and logging
- ✅ Type-safe API (despite ExecuTorch not having types)

### 1. Enhanced Pre-flight Checks (`useLocalModel.tsx`)

Added validation before calling `generate()`:
- Check if model is ready (`llm.isReady`)
- Log model state before generation for debugging
- Added diagnostic logging for model state

### 2. Improved Generation Logic

Replaced direct ExecuTorch calls with wrapper:
```typescript
// Old way (problematic):
const result = await llm.generate(messages);
if (!result) throw new Error('No result');

// New way (using wrapper):
const generationResult = await safeExecuTorchGenerate(llm, contextMessages);
if (!generationResult.success) {
  throw new Error(generationResult.error);
}

// Handle streaming properly
if (generationResult.isStreaming) {
  result = getExecuTorchResponse(llm) || '';
} else {
  result = generationResult.response;
}
```

**Benefits:**
- Automatically handles streaming vs non-streaming
- Validates both return value and `llm.response` property
- Provides clear success/error distinction
- No false positives for streaming models

### 3. Better Error Detection and Recovery

Added detection for undefined result errors:
- Distinguishes between undefined results and other errors
- Provides specific guidance to users (reinitialize model)
- Tracks repeated failures to suggest switching to cloud

### 4. Enhanced Crash Reporter (`CrashReporter.ts`)

Added new diagnostic methods:
- `hasRepeatedUndefinedResults(modelId)`: Detects if a specific model is consistently failing
- `getDiagnosticInfo()`: Returns detailed crash history for debugging
- Enhanced crash metadata to include model state

### 5. User Guidance Improvements

**First Undefined Error**:
Shows alert suggesting:
- Switch to cloud mode and back to reinitialize
- Or try again

**Repeated Undefined Errors** (2+ times):
Shows more detailed alert explaining:
- Possible causes (memory, corruption, compatibility)
- Strong recommendation to use cloud models
- Option to clear crash history when switching to cloud

## Testing Recommendations

### Test Case 1: First Undefined Result
1. Use local model until undefined error occurs
2. Verify alert appears with reinitialization guidance
3. Switch to cloud and back to local
4. Verify model reinitializes properly

### Test Case 2: Repeated Undefined Results
1. Trigger undefined error 2+ times with same model
2. Verify enhanced alert appears with detailed causes
3. Verify "Switch to Cloud" clears crash history
4. Confirm model switching works properly

### Test Case 3: Diagnostic Logging
1. Check console logs for model state before generation:
   - `isReady` status
   - `downloadProgress` value
   - `hasError` status
2. Verify result type is logged after generation
3. Check crash reports include model state metadata

## Monitoring

To check crash history in development:
```typescript
import { CrashReporter } from '@/utils/CrashReporter';

// Get diagnostic info
console.log(CrashReporter.getDiagnosticInfo());

// Check if model is failing repeatedly
const hasIssues = CrashReporter.hasRepeatedUndefinedResults('llama-3.2-1b');

// Clear crash history
CrashReporter.clearCrashHistory();
```

## Prevention Strategies

1. **Always validate ExecuTorch responses**: Never assume `generate()` will return a valid string
2. **Check model state before generation**: Verify `isReady` and other state flags
3. **Log model state**: Include diagnostic information in error reports
4. **Implement graceful degradation**: Offer cloud models as fallback
5. **Track repeated failures**: Detect patterns and guide users appropriately

## Future Improvements

Consider implementing:
1. **Retry Logic**: Automatically retry failed generations (with exponential backoff)
2. **Model Health Checks**: Ping model before user attempts to send message
3. **Memory Monitoring**: Check available memory before generation
4. **Model Validation**: Verify model file integrity after download
5. **Telemetry**: Send anonymized crash data to identify patterns across devices

## Default Model Change

### Old Default: Llama 3.2 1B (~1.2GB)
- Higher quality responses
- More resource intensive
- Prone to undefined results on some devices
- Memory pressure can cause crashes

### New Default: Qwen 2.5 0.5B (~500MB)
- More stable and reliable
- Lower memory footprint (58% smaller)
- Works on all device tiers
- Better ExecuTorch compatibility
- Still provides good quality responses

### Why Qwen 2.5 0.5B?

1. **Stability**: Smaller models are less prone to memory-related crashes
2. **Compatibility**: Works reliably across all supported devices
3. **Performance**: Fast response times with lower resource usage
4. **Reliability**: Proven track record with ExecuTorch
5. **User Experience**: Fewer errors = happier users

Users can still manually select Llama 3.2 1B or other models from settings if desired, but Qwen 2.5 0.5B provides the best out-of-box experience.

## Related Files

- `jaime-mobile-app/utils/ExecuTorchWrapper.ts` - **NEW: Centralized ExecuTorch wrapper**
- `jaime-mobile-app/hooks/useLocalModel.tsx` - Main local model hook (updated to use wrapper)
- `jaime-mobile-app/utils/CrashReporter.ts` - Crash reporting and recovery
- `jaime-mobile-app/constants/LocalModels.ts` - Model configuration and defaults (changed default to Qwen 2.5 0.5B)
- `jaime-mobile-app/constants/LocalModelsConfig.ts` - Model download configuration

## Documentation

- [ExecuTorch Wrapper Documentation](./EXECUTORCH_WRAPPER_DOCUMENTATION.md) - Complete API reference for the wrapper
- [Default Model Change Summary](./DEFAULT_MODEL_CHANGE_SUMMARY.md) - Details on changing default model
- [Local Model Quick Reference](./LOCAL_MODEL_QUICK_REFERENCE.md) - Developer quick reference

## Additional Notes

- The crash protection system will disable local models after 3 crashes in 5 minutes
- Users can manually re-enable local models through the alert dialog
- Crash history is persisted in MMKV storage (last 10 crashes)
- Switching to cloud mode can clear crash history to reset protection

## Known Limitations

1. Cannot prevent ExecuTorch from returning undefined (library issue)
2. Cannot detect memory issues before they cause undefined results
3. Model reinitialization requires toggling local/cloud mode
4. No automatic model corruption detection

## Support

If users continue experiencing undefined results after these fixes:
1. Check device memory availability
2. Try clearing app data to re-download model
3. Test on different device if available
4. Use cloud models as stable alternative
5. Report issue with console logs and crash diagnostics

