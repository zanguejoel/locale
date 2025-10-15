# ExecuTorch Wrapper Documentation

## Overview

The ExecuTorch Wrapper (`utils/ExecuTorchWrapper.ts`) provides a safe, centralized way to interact with the `react-native-executorch` library, handling its quirks and providing consistent error handling.

## Problem Statement

The `react-native-executorch` library has several non-standard behaviors:

1. **Streaming Response**: `generate()` may return `undefined` even on success
2. **Dual Response Paths**: Response can come from return value OR `llm.response` property
3. **Inconsistent Errors**: Some errors are recoverable, others are fatal
4. **Type Safety**: No TypeScript definitions, requires `any` casting

## Solution

The wrapper provides:
- ✅ Unified interface for generation
- ✅ Proper streaming detection
- ✅ Consistent error classification
- ✅ Type-safe state access
- ✅ Diagnostic utilities

## API Reference

### Core Functions

#### `safeExecuTorchGenerate(llm, messages, options?)`

Safely generates a response from ExecuTorch model.

```typescript
const result = await safeExecuTorchGenerate(llm, contextMessages, {
  timeout: 120000,      // Optional: generation timeout (default: 120s)
  checkInterval: 100    // Optional: state check interval (default: 100ms)
});

if (result.success) {
  console.log('Response:', result.response);
  console.log('Is streaming:', result.isStreaming);
} else {
  console.error('Error:', result.error);
}
```

**Returns:** `GenerationResult`
```typescript
interface GenerationResult {
  success: boolean;        // Whether generation succeeded
  response?: string;       // The generated text (may be empty for streaming)
  error?: string;          // Error message if failed
  isStreaming: boolean;    // Whether response is being streamed
}
```

**Behavior:**
- Checks if model is ready before generation
- Handles both direct return and streamed responses
- Returns immediately for streaming (response updates via `llm.response`)
- Validates model state and provides detailed errors

---

#### `getExecuTorchResponse(llm)`

Gets the current streamed response from the model.

```typescript
const response = getExecuTorchResponse(llm);
console.log('Current response:', response);
```

**Returns:** `string | undefined`

**Use Case:** Poll this during streaming to get the latest response

---

#### `isExecuTorchReady(llm)`

Checks if the model is ready for generation.

```typescript
if (isExecuTorchReady(llm)) {
  // Safe to call generate()
} else {
  console.log('Model not ready yet');
}
```

**Returns:** `boolean`

**Checks:**
- `llm.isReady === true`
- `llm.downloadProgress >= 1`
- `llm.error` is not present

---

#### `getExecuTorchState(llm)`

Gets comprehensive model state for diagnostics.

```typescript
const state = getExecuTorchState(llm);
console.log('Model state:', state);
```

**Returns:**
```typescript
{
  isReady: boolean;
  downloadProgress: number;      // 0-1
  hasError: boolean;
  errorMessage?: string;
  hasResponse: boolean;
  responseLength: number;
}
```

---

#### `formatExecuTorchState(llm)`

Formats model state as a readable string for logging.

```typescript
console.log(formatExecuTorchState(llm));
// Output:
// ExecuTorch State:
//   - Ready: true
//   - Download: 100%
//   - Error: None
//   - Response: 42 chars
```

**Returns:** `string`

---

### Error Classification Functions

#### `isRecoverableError(error)`

Checks if an error is recoverable (non-critical).

```typescript
try {
  await generate();
} catch (error) {
  if (isRecoverableError(error)) {
    // Can ignore or retry
    console.warn('Recoverable error:', error);
  } else {
    // Needs user attention
    Alert.alert('Error', error.message);
  }
}
```

**Recoverable Errors:**
- `unload` - Cleanup errors
- `still loading` / `not loaded` - Temporary state
- `content-length` - Download issues

---

#### `isFatalError(error)`

Checks if an error is fatal and requires switching to cloud mode.

```typescript
try {
  await generate();
} catch (error) {
  if (isFatalError(error)) {
    // Switch to cloud mode
    setIsLocal(false);
    Alert.alert('Fatal Error', 'Switching to cloud mode');
  }
}
```

**Fatal Errors:**
- `crash` - Application crash
- `fatal` - Fatal system error
- `abort` - Aborted operation
- `segmentation` - Segmentation fault
- `out of memory` / `oom` - Memory exhausted

---

### Utility Functions

#### `validateExecuTorchResponse(response)`

Validates if a response is valid.

```typescript
const validation = validateExecuTorchResponse(response);

if (validation.valid) {
  console.log('Valid response');
} else {
  console.error('Invalid:', validation.error);
}
```

**Returns:**
```typescript
{
  valid: boolean;
  error?: string;
}
```

---

#### `safeUnloadExecuTorch(llm)`

Safely unloads a model, ignoring recoverable errors.

```typescript
await safeUnloadExecuTorch(llm);
console.log('Model unloaded');
```

**Returns:** `Promise<void>`

---

## Usage Examples

### Basic Generation

```typescript
import { safeExecuTorchGenerate, formatExecuTorchState } from '@/utils/ExecuTorchWrapper';

async function generateResponse(llm, messages) {
  console.log(formatExecuTorchState(llm));
  
  const result = await safeExecuTorchGenerate(llm, messages);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  if (result.isStreaming) {
    // Response will update via llm.response
    return result.response || '';
  } else {
    // Got full response immediately
    return result.response;
  }
}
```

### With Error Handling

```typescript
import {
  safeExecuTorchGenerate,
  isRecoverableError,
  isFatalError,
  getExecuTorchState
} from '@/utils/ExecuTorchWrapper';

async function generateWithErrorHandling(llm, messages) {
  try {
    const result = await safeExecuTorchGenerate(llm, messages);
    
    if (!result.success) {
      const error = new Error(result.error);
      
      if (isRecoverableError(error)) {
        console.warn('Recoverable error, retrying...');
        // Retry logic here
        return;
      }
      
      if (isFatalError(error)) {
        console.error('Fatal error, switching to cloud');
        switchToCloudMode();
        return;
      }
      
      throw error;
    }
    
    return result.response;
    
  } catch (error) {
    const state = getExecuTorchState(llm);
    console.error('Generation failed:', {
      error,
      state
    });
    
    throw error;
  }
}
```

### Streaming Response Monitoring

```typescript
import { getExecuTorchResponse, safeExecuTorchGenerate } from '@/utils/ExecuTorchWrapper';

async function generateWithStreaming(llm, messages, onUpdate) {
  const result = await safeExecuTorchGenerate(llm, messages);
  
  if (!result.success) {
    throw new Error(result.error);
  }
  
  if (result.isStreaming) {
    // Poll for updates (or use the existing llm.response observer)
    const interval = setInterval(() => {
      const currentResponse = getExecuTorchResponse(llm);
      if (currentResponse) {
        onUpdate(currentResponse);
      }
    }, 100);
    
    // Clean up when done
    setTimeout(() => clearInterval(interval), 60000);
  } else {
    // Non-streaming, return immediately
    onUpdate(result.response);
  }
}
```

### Pre-flight Validation

```typescript
import { isExecuTorchReady, getExecuTorchState } from '@/utils/ExecuTorchWrapper';

function checkModelBeforeSend(llm) {
  if (!isExecuTorchReady(llm)) {
    const state = getExecuTorchState(llm);
    
    if (state.downloadProgress < 1) {
      Alert.alert(
        'Model Downloading',
        `Please wait... ${(state.downloadProgress * 100).toFixed(0)}% complete`
      );
      return false;
    }
    
    if (state.hasError) {
      Alert.alert('Model Error', state.errorMessage);
      return false;
    }
    
    Alert.alert('Model Not Ready', 'Please wait for initialization');
    return false;
  }
  
  return true;
}
```

## Integration with Crash Reporter

The wrapper is designed to work seamlessly with `CrashReporter`:

```typescript
import { CrashReporter } from '@/utils/CrashReporter';
import { safeExecuTorchGenerate, getExecuTorchState } from '@/utils/ExecuTorchWrapper';

try {
  const result = await safeExecuTorchGenerate(llm, messages);
  
  if (!result.success) {
    CrashReporter.report(
      new Error(result.error),
      'ExecuTorch generation',
      {
        modelId: modelId,
        modelState: getExecuTorchState(llm)
      }
    );
  }
  
} catch (error) {
  CrashReporter.report(
    error as Error,
    'ExecuTorch generation',
    {
      modelId: modelId,
      modelState: getExecuTorchState(llm)
    }
  );
}
```

## Best Practices

### 1. Always Use the Wrapper

❌ **Don't:**
```typescript
const result = await llm.generate(messages);
if (!result) {
  throw new Error('No result');
}
```

✅ **Do:**
```typescript
const result = await safeExecuTorchGenerate(llm, messages);
if (!result.success) {
  throw new Error(result.error);
}
```

### 2. Check Readiness Before Generation

❌ **Don't:**
```typescript
if (llm.isReady) {
  await generate();
}
```

✅ **Do:**
```typescript
if (isExecuTorchReady(llm)) {
  await safeExecuTorchGenerate(llm, messages);
}
```

### 3. Include State in Error Reports

❌ **Don't:**
```typescript
CrashReporter.report(error, 'generation');
```

✅ **Do:**
```typescript
CrashReporter.report(error, 'generation', {
  modelState: getExecuTorchState(llm)
});
```

### 4. Classify Errors Appropriately

❌ **Don't:**
```typescript
catch (error) {
  Alert.alert('Error', error.message);
}
```

✅ **Do:**
```typescript
catch (error) {
  if (isRecoverableError(error)) {
    console.warn('Recoverable:', error);
  } else if (isFatalError(error)) {
    switchToCloud();
  } else {
    Alert.alert('Error', error.message);
  }
}
```

### 5. Handle Streaming Properly

❌ **Don't:**
```typescript
const result = await llm.generate(messages);
return result; // May be undefined!
```

✅ **Do:**
```typescript
const result = await safeExecuTorchGenerate(llm, messages);
if (result.isStreaming) {
  // Response updates via llm.response
  return getExecuTorchResponse(llm) || '';
} else {
  return result.response;
}
```

## TypeScript Types

```typescript
export interface ExecuTorchLLM {
  isReady: boolean;
  downloadProgress: number;
  response?: string;
  error?: Error | string;
  generate: (messages: any[]) => Promise<string | undefined>;
  unload?: () => void;
}

export interface GenerationResult {
  success: boolean;
  response?: string;
  error?: string;
  isStreaming: boolean;
}
```

## Troubleshooting

### Issue: "Model returned undefined"

**Solution:** Use `safeExecuTorchGenerate` which handles streaming responses:
```typescript
const result = await safeExecuTorchGenerate(llm, messages);
// Check result.isStreaming and poll getExecuTorchResponse(llm)
```

### Issue: False "Model not ready" errors

**Solution:** Use `isExecuTorchReady` which checks all conditions:
```typescript
if (isExecuTorchReady(llm)) {
  // Model is actually ready
}
```

### Issue: Too many error alerts

**Solution:** Filter recoverable errors:
```typescript
if (!isRecoverableError(error)) {
  Alert.alert('Error', error.message);
}
```

## Related Files

- `utils/ExecuTorchWrapper.ts` - The wrapper implementation
- `hooks/useLocalModel.tsx` - Main usage location
- `utils/CrashReporter.ts` - Error reporting
- `constants/LocalModels.ts` - Model definitions

## Changelog

**October 15, 2025**: Initial wrapper created to fix undefined result issues

