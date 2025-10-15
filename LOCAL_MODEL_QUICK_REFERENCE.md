# Local Model Quick Reference

## Current Default Model

```typescript
DEFAULT_LOCAL_MODEL_ID = 'qwen2.5-0.5b'
```

**Qwen 2.5 0.5B** - Most stable and reliable model for all devices

## Available Models (Sorted by Stability)

### ✅ Recommended for Production

| Model | Size | Stability | Speed | Quality | Use Case |
|-------|------|-----------|-------|---------|----------|
| **Qwen 2.5 0.5B** | 500MB | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡ | ✨✨✨ | **Default - Best for all users** |
| Hammer2 0.5B | 500MB | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | ✨✨✨ | Alternative fast model |
| SmolLM2 360M | 360MB | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | ✨✨ | Lightweight option |
| SmolLM2 135M | 135MB | ⭐⭐⭐⭐⭐ | ⚡⚡⚡⚡⚡ | ✨ | Ultra-lightweight |

### ⚠️ Use with Caution

| Model | Size | Stability | Speed | Quality | Notes |
|-------|------|-----------|-------|---------|-------|
| Llama 3.2 1B | 1.2GB | ⭐⭐⭐ | ⚡⚡⚡ | ✨✨✨✨ | May have undefined result issues |
| Qwen 2.5 1.5B | 1.5GB | ⭐⭐⭐⭐ | ⚡⚡ | ✨✨✨✨ | Requires high-end devices |
| Llama 3.2 3B | 3GB | ⭐⭐ | ⚡ | ✨✨✨✨✨ | High memory requirements |

## Model Selection Guide

### Choose Qwen 2.5 0.5B if:
- ✅ You want the most stable experience
- ✅ Your app needs to work on all devices
- ✅ You prioritize reliability over maximum quality
- ✅ You want faster downloads (500MB)
- ✅ You're building for production

### Choose SmolLM2 models if:
- ✅ You need the smallest possible size
- ✅ You have limited storage/bandwidth
- ✅ Basic conversation quality is sufficient

### Choose Llama 3.2 1B if:
- ⚠️ You need better quality responses
- ⚠️ You can tolerate occasional stability issues
- ⚠️ You're testing/developing (not production)

### Choose larger models (1.5B+) if:
- ⚠️ You specifically need maximum quality
- ⚠️ You're targeting high-end devices only
- ⚠️ You have robust error handling

## Code Examples

### Get Default Model
```typescript
import { DEFAULT_LOCAL_MODEL_ID, getLocalModelById } from '@/constants/LocalModels';

const defaultModel = getLocalModelById(DEFAULT_LOCAL_MODEL_ID);
// Returns: Qwen 2.5 0.5B
```

### Get Recommended Model
```typescript
import { getRecommendedLocalModel } from '@/constants/LocalModels';

const recommendedModel = getRecommendedLocalModel();
// Returns: Qwen 2.5 0.5B (or best available for device)
```

### Check User's Selected Model
```typescript
import { storage } from '@/hooks/useMMKVStorage';

const userModelId = storage.getString('default_local_model_id');
// Returns: User's preference or falls back to DEFAULT_LOCAL_MODEL_ID
```

### Change Default Model (if needed)
```typescript
// In constants/LocalModels.ts
export const DEFAULT_LOCAL_MODEL_ID = 'qwen2.5-0.5b';

// Update recommended flag
{
  id: 'qwen2.5-0.5b',
  recommended: true  // ← Mark as recommended
}
```

## Troubleshooting

### Model Returns Undefined
1. Check if model is ready: `llm.isReady`
2. Verify model downloaded: `llm.downloadProgress === 1`
3. Consider switching to smaller model (Qwen 2.5 0.5B)
4. Check device memory availability

### Model Crashes on Generation
1. Use crash reporter: `CrashReporter.report(error, 'context')`
2. Check for repeated failures: `CrashReporter.hasRepeatedUndefinedResults(modelId)`
3. Suggest user switch to cloud or smaller model
4. Verify device meets minimum requirements

### Slow Download
1. Model size affects download time (500MB vs 3GB)
2. Use background download optimization
3. Show progress to user
4. Consider smaller model for faster onboarding

## Performance Metrics

### Expected Response Times (rough estimates)

| Model | First Token | Full Response (50 tokens) |
|-------|-------------|---------------------------|
| SmolLM2 135M | ~100ms | ~3s |
| SmolLM2 360M | ~150ms | ~4s |
| Qwen 2.5 0.5B | ~200ms | ~5s |
| Hammer2 0.5B | ~150ms | ~4s |
| Llama 3.2 1B | ~300ms | ~8s |
| Qwen 2.5 1.5B | ~500ms | ~12s |
| Llama 3.2 3B | ~800ms | ~20s |

*Note: Times vary by device*

### Memory Usage (approximate)

| Model | RAM Usage | Minimum Device RAM |
|-------|-----------|-------------------|
| SmolLM2 135M | ~200MB | 2GB |
| SmolLM2 360M | ~400MB | 2GB |
| Qwen 2.5 0.5B | ~600MB | 3GB |
| Hammer2 0.5B | ~600MB | 3GB |
| Llama 3.2 1B | ~1.5GB | 4GB |
| Qwen 2.5 1.5B | ~2GB | 6GB |
| Llama 3.2 3B | ~4GB | 8GB |

## Best Practices

### 1. Default to Stability
Always prefer stable models (Qwen 2.5 0.5B) for default settings. Let users opt-in to larger models.

### 2. Validate Responses
```typescript
if (!result || typeof result !== 'string') {
  throw new Error('Invalid result from LLM');
}
```

### 3. Handle Errors Gracefully
```typescript
try {
  const result = await llm.generate(messages);
} catch (error) {
  CrashReporter.report(error, 'generation');
  // Offer cloud fallback
}
```

### 4. Monitor Model Health
```typescript
if (!llm.isReady) {
  Alert.alert('Model not ready', 'Please wait...');
}
```

### 5. Track Usage
```typescript
DownloadedModelsTracker.updateLastUsed(modelId);
```

## Migration Guide

### From Llama 3.2 1B to Qwen 2.5 0.5B

**Why?**
- 58% smaller download
- More stable (no undefined results)
- Faster response times
- Works on all devices

**How?**
Users can switch in Settings > Local Models, or:
```typescript
storage.set('default_local_model_id', 'qwen2.5-0.5b');
```

**Trade-offs:**
- Slightly lower quality responses
- Still very good for most use cases
- Can always upgrade to larger model later

## Related Files

- `constants/LocalModels.ts` - Model definitions and defaults
- `hooks/useLocalModel.tsx` - Model management hook
- `utils/CrashReporter.ts` - Error handling
- `utils/DownloadedModelsTracker.ts` - Usage tracking

## Recent Changes

**October 15, 2025**: Changed default from Llama 3.2 1B to Qwen 2.5 0.5B for stability

See [DEFAULT_MODEL_CHANGE_SUMMARY.md](./DEFAULT_MODEL_CHANGE_SUMMARY.md) for details.

