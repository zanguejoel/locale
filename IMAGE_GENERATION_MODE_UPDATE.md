# Image Generation Mode - UI Simplification

## Change Summary

Simplified the image generation UI by:
1. Hiding the Mode selection and defaulting to "always" mode when image generation is enabled
2. Setting Gemini as the default image provider (instead of OpenAI)

## What Changed

### File: `components/AttachmentsModal.tsx`

**Change 1: Default to 'always' mode**
- Lines 233-236, 249-251
- When toggling image generation ON, it now defaults to `'always'` instead of `'auto'`
- Users no longer need to choose between Auto and Always modes

**Change 2: Hidden Mode selection UI**
- Lines 263-308
- Removed the "Mode" selection buttons (Auto/Always)
- Kept only the "Provider" selection (OpenAI/Gemini)
- Added explanatory comment in code

### File: `components/ChatInput.tsx`

**Change 3: Set Gemini as default provider**
- Line 59-60
- Changed default `imageProvider` from `'openai'` to `'gemini'`
- Changed default `imageModel` from `'gpt-image-1'` to `'gemini-2.5-flash-image-preview'`
- When users enable image generation, Gemini will be pre-selected with the correct model name

### File: `components/AttachmentsModal.tsx` (Provider Handler)

**Change 4: Auto-update model name when switching providers**
- Lines 81-93
- Enhanced `handleImageProviderChange` to automatically set the correct model name
- OpenAI uses: `'gpt-image-1'`
- Gemini uses: `'gemini-2.5-flash-image-preview'`
- Ensures model name always matches the selected provider

## Before vs After

### Before
```typescript
// Default state in ChatInput.tsx
imageProvider: 'openai',      // OpenAI was default
imageModel: 'gpt-image-1',    // Static model name, not updated on provider change

// When enabling image generation
const nextValue = generationOptions.generateImage === 'none' ? 'auto' : 'none';

// UI showed both Mode and Provider options
<View style={styles.optionRow}>
  <Text>Mode</Text>
  <View>
    <Button>Auto</Button>
    <Button>Always</Button>
  </View>
</View>
<View style={styles.optionRow}>
  <Text>Provider</Text>
  <View>
    <Button>OpenAI</Button>  {/* OpenAI selected by default */}
    <Button>Gemini</Button>
  </View>
</View>
```

### After
```typescript
// Default state in ChatInput.tsx
imageProvider: 'gemini',                      // Gemini is now default
imageModel: 'gemini-2.5-flash-image-preview', // Correct model name for Gemini

// Provider change handler updates model name automatically
const handleImageProviderChange = (provider: string) => {
  const modelName = provider === 'openai' 
    ? 'gpt-image-1' 
    : 'gemini-2.5-flash-image-preview';
  
  onGenerationOptionsChange({ 
    ...generationOptions, 
    imageProvider: provider,
    imageModel: modelName, // Auto-updated based on provider
  });
};

// When enabling image generation - always use 'always' mode
const nextValue = generationOptions.generateImage === 'none' ? 'always' : 'none';

// UI shows only Provider options
<View style={styles.optionRow}>
  <Text>Provider</Text>
  <View>
    <Button>OpenAI</Button>
    <Button>Gemini</Button>  {/* Gemini selected by default */}
  </View>
</View>
```

## User Experience

### Old Behavior
1. User toggles Image Generation ON
2. Image generation enabled in 'auto' mode (generates images only when detected)
3. OpenAI provider selected by default
4. User could manually switch to 'always' mode via Mode buttons
5. User could switch to Gemini provider manually
6. Multi-step process to configure image generation

### New Behavior
1. User toggles Image Generation ON
2. Image generation enabled in 'always' mode (generates images for every message)
3. Gemini provider selected by default
4. Mode selection hidden - always uses 'always' mode
5. User can still switch to OpenAI provider if desired
6. Simplified, one-step process

## Technical Details

### State Management
- `generateImage` state can be: `'none'`, `'auto'`, or `'always'`
- When OFF: `generateImage = 'none'`
- When ON: `generateImage = 'always'` (previously defaulted to `'auto'`)
- `imageProvider` defaults to `'gemini'` (previously `'openai'`)
- `imageModel` automatically updated based on provider:
  - `'openai'` → `'gpt-image-1'`
  - `'gemini'` → `'gemini-2.5-flash-image-preview'`
- Users can still manually switch between `'openai'` and `'gemini'` providers

### Model Name Mapping
The app now correctly maps providers to their backend model names:

```typescript
// Provider → Model Name mapping
const getModelName = (provider: string) => {
  return provider === 'openai' 
    ? 'gpt-image-1'                      // OpenAI DALL-E model
    : 'gemini-2.5-flash-image-preview';  // Gemini Imagen model
};
```

This ensures the backend receives the correct model identifier for each provider.

### Toggle Logic
```typescript
// Image Generation Toggle - Switch component
onValueChange={(value) => {
  handleImageGenerationChange(value ? 'always' : 'none');
}}

// Image Generation Toggle - TouchableOpacity
onPress={() => {
  const nextValue = generationOptions.generateImage === 'none' ? 'always' : 'none';
  handleImageGenerationChange(nextValue);
}}
```

### Backend Compatibility
- Backend still supports all three modes: `'none'`, `'auto'`, `'always'`
- This is purely a UI simplification
- If needed, the Mode selection can be restored by uncommenting the removed section

## Benefits

1. **Simplified UX**: One less decision for users to make
2. **Cleaner UI**: Less clutter in the attachments modal
3. **Consistent Behavior**: Always generates images when enabled
4. **Faster Workflow**: One toggle instead of toggle + mode selection

## Rollback Instructions

If you need to restore the Mode selection:

1. Find the comment `{/* Mode selection hidden - always uses 'always' mode by default */}` (line 266)
2. Restore the deleted Mode selection UI from git history
3. Change the default back to `'auto'` in the toggle handlers

## Testing

### Test Case 1: Enable Image Generation with Gemini Default
1. Open Attachments & AI modal
2. Toggle Image Generation ON
3. **Expected:** Provider options appear with Gemini selected by default
4. **Expected:** No Mode selection visible
5. Send a message
6. **Expected:** Image generation occurs using Gemini provider

### Test Case 2: Disable Image Generation
1. Toggle Image Generation OFF
2. **Expected:** Provider options disappear
3. Send a message
4. **Expected:** No image generation

### Test Case 3: Switch Providers and Verify Model Names
1. Enable Image Generation (Gemini is default)
2. Send a message
3. **Expected:** Image generated using Gemini (`gemini-2.5-flash-image-preview`)
4. Switch to OpenAI provider
5. Send another message
6. **Expected:** Image generated using OpenAI (`gpt-image-1`)
7. Switch back to Gemini
8. **Expected:** Model automatically updates to `gemini-2.5-flash-image-preview`
9. **Verify:** Check backend logs to confirm correct model names are sent

## Related Files

- `components/AttachmentsModal.tsx` - UI implementation (Mode selection removal + model name mapping)
- `components/ChatInput.tsx` - Default generation options state (Gemini default + correct model name)
- `components/GenerationOptions.tsx` - Type definitions

## Notes

- The 'auto' mode is still available in the backend but hidden from UI
- Gemini is now the default provider with correct model name (`gemini-2.5-flash-image-preview`)
- Model names automatically update when switching providers:
  - OpenAI: `gpt-image-1`
  - Gemini: `gemini-2.5-flash-image-preview`
- This ensures backend compatibility and correct image generation
- This change makes image generation more predictable for users
- Users who want conditional image generation can toggle it on/off per message
- Users can still manually switch to OpenAI provider if preferred

## Backend Model Names Reference

| Provider | Model Name | Description |
|----------|-----------|-------------|
| OpenAI | `gpt-image-1` | DALL-E image generation |
| Gemini | `gemini-2.5-flash-image-preview` | Imagen 3 image generation |

