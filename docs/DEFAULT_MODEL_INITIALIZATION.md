# Default Model Initialization on App Launch

**Date**: October 2, 2025  
**Feature**: Ensure default models are loaded and displayed on app launch

## Implementation

### 1. Auto-Initialize Default Models on First Launch ✅

**Cloud Model:**
- Default: `claude-sonnet-4-5-20250929` (Claude Sonnet 4.5)
- Stored in: MMKV storage key `default_model_id`
- Initialization: Automatically set on first app launch if not present

**Local Model:**
- Default: `tiny-mamba` (Tiny Mamba - ~80MB)
- Stored in: MMKV storage key `default_local_model_id`
- Initialization: Automatically set on first app launch if not present
- **Why Tiny Mamba?** Lightest model (80MB) for fastest initial setup

### 2. Reactive Model Loading ✅

**Before:**
```typescript
// Synchronous, non-reactive
const selectedCloudModel = getModelById(getDefaultModelId());
const selectedLocalModel = getLocalModelById(getDefaultLocalModelId());
```

**After:**
```typescript
// Reactive hooks that update when storage changes
const selectedCloudModel = useDefaultModel();
const selectedLocalModel = useDefaultLocalModel();
```

**Benefits:**
- Models load immediately on app launch
- Automatically update when user changes selection in settings
- Listen for storage changes and re-render
- Type-safe with full model objects

### 3. Initialization Logging ✅

Added console logs to track initialization:
```typescript
console.log('[DefaultModel] Initialized default cloud model:', DEFAULT_MODEL_ID);
console.log('[DefaultLocalModel] Initialized default local model:', DEFAULT_LOCAL_MODEL_ID);
console.log('[ChatPage] Models loaded on launch:');
console.log('  Cloud Model:', selectedCloudModel?.displayName);
console.log('  Local Model:', selectedLocalModel?.displayName);
```

## Files Modified

### `hooks/useDefaultModel.ts`
- Added storage initialization in useState initializer
- Sets `default_model_id` to `DEFAULT_MODEL_ID` if not present
- Logs initialization for debugging
- Returns Model object (not just ID)

### `hooks/useDefaultLocalModel.ts`
- Added storage initialization in useState initializer
- Sets `default_local_model_id` to `DEFAULT_LOCAL_MODEL_ID` if not present
- Logs initialization for debugging
- Returns LocalModel object (not just ID)

### `components/ChatPage.tsx`
- Changed from `getDefaultModelId()` to `useDefaultModel()` hook
- Changed from `getDefaultLocalModelId()` to `useDefaultLocalModel()` hook
- Added useEffect to log models on component mount
- Now gets full model objects with all properties
- Displays model names dynamically

## Flow

### First App Launch:
```
1. App starts
2. ChatPage mounts
3. useDefaultModel() hook runs
   → Checks storage for 'default_model_id'
   → Not found, so initializes with DEFAULT_MODEL_ID
   → Stores 'claude-sonnet-4-5-20250929' in MMKV
   → Returns Claude Sonnet 4.5 model object
   
4. useDefaultLocalModel() hook runs
   → Checks storage for 'default_local_model_id'
   → Not found, so initializes with DEFAULT_LOCAL_MODEL_ID
   → Stores 'tiny-mamba' in MMKV
   → Returns Tiny Mamba model object (~80MB)

5. Models displayed in UI:
   → Header: "Claude Sonnet 4.5" (or Tiny Mamba if local mode)
   → Empty chat: "Using: Claude Sonnet 4.5"
```

### Subsequent App Launches:
```
1. App starts
2. ChatPage mounts
3. useDefaultModel() hook runs
   → Checks storage for 'default_model_id'
   → Found: 'claude-sonnet-4-5-20250929'
   → Returns Claude Sonnet 4.5 model object
   
4. useDefaultLocalModel() hook runs  
   → Checks storage for 'default_local_model_id'
   → Found: 'tiny-mamba'
   → Returns Tiny Mamba model object (~80MB)

5. Models displayed immediately
```

### When User Changes Model in Settings:
```
1. User opens Settings
2. User taps "Default AI Model"
3. User selects different model (e.g., "Claude Sonnet 4")
4. Settings saves new model ID to MMKV storage
5. Storage listener in useDefaultModel() detects change
6. Hook updates state with new model
7. ChatPage re-renders with new model name
8. Header and empty state update automatically
```

## Benefits

1. ✅ **Instant Load** - Models loaded immediately on app launch
2. ✅ **Persistent** - Remembers user's choice across app restarts
3. ✅ **Reactive** - UI updates automatically when model changes
4. ✅ **Type-Safe** - Full TypeScript support with model objects
5. ✅ **Debuggable** - Console logs show initialization flow
6. ✅ **Fallback** - Always defaults to valid models if storage corrupted

## Testing Checklist

- [x] First app launch initializes default models
- [x] Models are stored in MMKV
- [x] Model names display in header
- [x] Model names display in empty chat state
- [x] Changing model in settings updates display
- [x] Switching between local/cloud updates display
- [x] App remembers model selection after restart
- [x] Console logs show correct initialization

## Console Output Expected

On first launch:
```
[DefaultModel] Initialized default cloud model: claude-sonnet-4-5-20250929
[DefaultLocalModel] Initialized default local model: tiny-mamba
[ChatPage] Models loaded on launch:
  Cloud Model: Claude Sonnet 4.5 (ID: claude-sonnet-4-5-20250929)
  Local Model: Tiny Mamba (ID: tiny-mamba)
```

On subsequent launches:
```
[ChatPage] Models loaded on launch:
  Cloud Model: Claude Sonnet 4.5 (ID: claude-sonnet-4-5-20250929)
  Local Model: Tiny Mamba (ID: tiny-mamba)
```

