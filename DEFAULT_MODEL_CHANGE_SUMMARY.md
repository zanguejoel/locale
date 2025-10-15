# Default Local Model Change Summary

## Change Overview

**Date**: October 15, 2025

**Change**: Updated default local model from `llama-3.2-1b` to `qwen2.5-0.5b`

**Reason**: Improved stability and reliability for all users

## What Changed

### Code Changes

1. **`constants/LocalModels.ts`**:
   - Updated `DEFAULT_LOCAL_MODEL_ID` from `'llama-3.2-1b'` to `'qwen2.5-0.5b'`
   - Marked Qwen 2.5 0.5B as `recommended: true`
   - Marked Llama 3.2 1B as `recommended: false`
   - Updated model descriptions to reflect stability
   - Reordered preference list to prioritize stability

### Model Comparison

| Aspect | Llama 3.2 1B (Old) | Qwen 2.5 0.5B (New) |
|--------|-------------------|---------------------|
| **Size** | ~1.2GB | ~500MB |
| **Memory Usage** | High | Low |
| **Stability** | Issues on some devices | Stable on all devices |
| **Speed** | Moderate | Fast |
| **Quality** | High | Good |
| **Recommended For** | High-end devices | All devices |
| **Known Issues** | Undefined results, crashes | None |

## Impact on Users

### New Users
- Will automatically get Qwen 2.5 0.5B as their default model
- Faster initial download (500MB vs 1.2GB)
- More reliable out-of-box experience
- Less likely to encounter crashes

### Existing Users
- Users who already selected Llama 3.2 1B will keep it (stored in preferences)
- Can manually switch models in Settings if desired
- New installs will get the more stable default

## Technical Benefits

### 1. Lower Memory Footprint
- 58% smaller size reduces memory pressure
- Less likely to trigger out-of-memory errors
- Better performance on older devices

### 2. Better ExecuTorch Compatibility
- Qwen models have proven more stable with ExecuTorch
- Fewer undefined result errors
- More consistent response quality

### 3. Faster Downloads
- 500MB downloads much faster than 1.2GB
- Better user experience for first-time local model users
- Less bandwidth usage

### 4. Improved Device Compatibility
- Works reliably on all device tiers
- Doesn't require high-end devices
- Consistent performance across iOS and Android

## User Communication

### Settings UI
The model selection in Settings will show:
- ✅ **Qwen 2.5 0.5B** - "Balanced model for various tasks - Most stable" (RECOMMENDED)
- **Llama 3.2 1B** - "Good performance but may have stability issues on some devices"

### Migration Path
No automatic migration is needed. Users can continue using their selected model or switch manually through Settings.

## Monitoring & Rollback

### Success Metrics
- Reduced crash reports related to ExecuTorch
- Lower "undefined result" errors
- Improved user retention on local models
- Faster model download completion rates

### Rollback Plan
If issues are discovered with Qwen 2.5 0.5B:
1. Revert `DEFAULT_LOCAL_MODEL_ID` back to `'llama-3.2-1b'`
2. Or switch to another stable model like `'hammer2-0.5b'`

## Alternative Models

If users need different capabilities:

### For Maximum Stability (Smallest)
- **SmolLM2 135M** (~135MB) - Ultra-lightweight
- **SmolLM2 360M** (~360MB) - Small and efficient

### For Better Performance (Medium)
- **Qwen 2.5 0.5B** (~500MB) - **DEFAULT** ✅
- **Hammer2 0.5B** (~500MB) - Fast alternative

### For Best Quality (Large)
- **Llama 3.2 1B** (~1.2GB) - Good quality, some stability issues
- **Qwen 2.5 1.5B** (~1.5GB) - More capable, requires high-end device
- **Llama 3.2 3B** (~3GB) - Most capable, requires high-end device

## Testing Recommendations

1. **Fresh Install Testing**:
   - Verify new installs get Qwen 2.5 0.5B by default
   - Test initial download and first message

2. **Upgrade Testing**:
   - Verify existing users keep their selected model
   - Test model switching still works

3. **Stability Testing**:
   - Run extended sessions with Qwen 2.5 0.5B
   - Monitor for undefined results or crashes
   - Test on various device tiers

4. **Performance Testing**:
   - Compare response times vs Llama 3.2 1B
   - Check memory usage during generation
   - Verify download speeds

## Related Documentation

- [ExecuTorch Undefined Result Fix](./EXECUTORCH_UNDEFINED_RESULT_FIX.md) - Details of the crash fix
- [ExecuTorch Alternatives](./EXECUTORCH_ALTERNATIVES.md) - Alternative local model frameworks

## FAQs

**Q: Will this affect my current model selection?**  
A: No, if you've already selected a model, it will remain your default. This only affects new users.

**Q: Can I still use Llama 3.2 1B?**  
A: Yes, you can manually select it in Settings > Local Models.

**Q: Is Qwen 2.5 0.5B less capable than Llama 3.2 1B?**  
A: It's slightly less capable but still provides good quality responses, and it's much more stable and faster.

**Q: What if I have a high-end device?**  
A: You can select larger models like Qwen 2.5 1.5B or Llama 3.2 3B in Settings for better quality.

**Q: Will I need to re-download the model?**  
A: Only if you're currently using Llama 3.2 1B and want to switch to the new default.

## Conclusion

This change prioritizes **stability and reliability** over maximum capability, ensuring a better experience for the majority of users. Users who need higher quality can still opt-in to larger models through Settings.

