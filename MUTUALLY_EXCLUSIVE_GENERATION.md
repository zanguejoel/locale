# Mutually Exclusive Image and Video Generation

## Change Summary

Made image generation and video generation mutually exclusive - enabling one automatically disables the other.

## Why This Change?

**Problem:**
- Users could accidentally enable both image and video generation
- Generating both simultaneously is expensive (credits)
- Creates confusing UX (which media will be generated?)
- Backend may not handle dual generation well

**Solution:**
- When image generation is turned ON → video generation turns OFF
- When video generation is turned ON → image generation turns OFF
- Clear, predictable behavior

## What Changed

### File: `components/AttachmentsModal.tsx`

**Updated Handler 1: `handleImageGenerationChange`** (Lines 64-74)
```typescript
const handleImageGenerationChange = (value: string) => {
  if (!generationOptions || !onGenerationOptionsChange) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
  // If enabling image generation, disable video generation (mutually exclusive)
  const updates = value !== 'none' 
    ? { generateImage: value, generateVideo: 'none' }
    : { generateImage: value };
  
  onGenerationOptionsChange({ ...generationOptions, ...updates });
};
```

**Updated Handler 2: `handleVideoGenerationChange`** (Lines 76-91)
```typescript
const handleVideoGenerationChange = (value: string) => {
  if (!generationOptions || !onGenerationOptionsChange) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  
  // Toggle off if selecting the same model, otherwise switch to new model
  if (generationOptions.generateVideo === value) {
    onGenerationOptionsChange({ ...generationOptions, generateVideo: 'none' });
  } else {
    // If enabling video generation, disable image generation (mutually exclusive)
    const updates = value !== 'none'
      ? { generateVideo: value, generateImage: 'none' }
      : { generateVideo: value };
    
    onGenerationOptionsChange({ ...generationOptions, ...updates });
  }
};
```

## Behavior

### Scenario 1: Enable Image Generation (Video is OFF)
1. User toggles Image Generation ON
2. Image generation enabled (Gemini, always mode)
3. Video generation remains OFF
4. ✅ Normal behavior

### Scenario 2: Enable Image Generation (Video is ON)
1. Video generation is already ON (Veo3)
2. User toggles Image Generation ON
3. Image generation enabled (Gemini, always mode)
4. Video generation automatically turns OFF
5. ✅ Mutually exclusive behavior

### Scenario 3: Enable Video Generation (Image is OFF)
1. User toggles Video Generation ON
2. Video generation enabled (Veo3)
3. Image generation remains OFF
4. ✅ Normal behavior

### Scenario 4: Enable Video Generation (Image is ON)
1. Image generation is already ON (Gemini)
2. User toggles Video Generation ON
3. Video generation enabled (Veo3)
4. Image generation automatically turns OFF
5. ✅ Mutually exclusive behavior

### Scenario 5: Switch Between Providers/Models
1. Image generation is ON
2. User switches from OpenAI to Gemini
3. Image generation stays ON (different provider)
4. Video generation stays OFF
5. ✅ No unintended switching

### Scenario 6: Disable Current Generation
1. Image generation is ON, Video is OFF
2. User toggles Image Generation OFF
3. Image generation turns OFF
4. Video generation stays OFF (no auto-enable)
5. ✅ User control preserved

## Technical Details

### Logic Flow

**When Enabling Image:**
```typescript
if (value !== 'none') {
  // Enabling image generation
  updates = {
    generateImage: value,      // Enable image
    generateVideo: 'none'      // Disable video
  }
} else {
  // Disabling image generation
  updates = {
    generateImage: 'none'      // Just disable image
    // Don't touch video
  }
}
```

**When Enabling Video:**
```typescript
if (value !== 'none') {
  // Enabling video generation
  updates = {
    generateVideo: value,      // Enable video
    generateImage: 'none'      // Disable image
  }
} else {
  // Disabling video generation
  updates = {
    generateVideo: 'none'      // Just disable video
    // Don't touch image
  }
}
```

### Edge Cases Handled

1. ✅ **Switching models within same type** - Doesn't affect the other type
2. ✅ **Switching providers (image)** - Doesn't trigger video disable
3. ✅ **Toggling OFF** - Doesn't auto-enable the other type
4. ✅ **Multiple rapid toggles** - Each toggle is handled correctly

## User Experience

### Before
```
Image Generation: ON (Gemini)
Video Generation: ON (Veo3)
❌ Both enabled - confusing and expensive
```

### After
```
Image Generation: ON (Gemini)
Video Generation: OFF
✅ Clear - only one active at a time

OR

Image Generation: OFF
Video Generation: ON (Veo3)
✅ Clear - only one active at a time
```

## Benefits

1. **Prevents Accidental Double Generation**
   - Users won't waste credits on unintended dual generation
   - Clear which media type will be generated

2. **Better UX**
   - Predictable behavior
   - Visual feedback shows one toggle OFF when other is ON
   - No confusion about what will be generated

3. **Cost Control**
   - Prevents expensive dual generation
   - Users make conscious choice: image OR video

4. **Backend Compatibility**
   - Ensures backend receives clear single-generation request
   - Avoids potential conflicts in generation pipeline

## Testing

### Test Case 1: Basic Mutual Exclusion (Image → Video)
1. Toggle Image Generation ON
2. **Expected:** Image ON, Video OFF
3. Toggle Video Generation ON
4. **Expected:** Video ON, Image OFF (automatically switched)
5. Check UI: Image toggle should visually show OFF state

### Test Case 2: Basic Mutual Exclusion (Video → Image)
1. Toggle Video Generation ON
2. **Expected:** Video ON, Image OFF
3. Toggle Image Generation ON
4. **Expected:** Image ON, Video OFF (automatically switched)
5. Check UI: Video toggle should visually show OFF state

### Test Case 3: Disable Current (No Auto-Enable)
1. Toggle Image Generation ON
2. **Expected:** Image ON, Video OFF
3. Toggle Image Generation OFF
4. **Expected:** Image OFF, Video OFF (stays OFF)
5. Check UI: Both toggles should show OFF

### Test Case 4: Model Switching (No Cross-Toggle)
1. Toggle Image Generation ON
2. Switch from Gemini to OpenAI
3. **Expected:** Image stays ON with OpenAI, Video stays OFF
4. Switch back to Gemini
5. **Expected:** Image stays ON with Gemini, Video stays OFF

### Test Case 5: Video Model Switching
1. Toggle Video Generation ON (defaults to Veo3)
2. Switch to AWS Nova
3. **Expected:** Video stays ON with AWS Nova, Image stays OFF
4. Switch back to Veo3
5. **Expected:** Video stays ON with Veo3, Image stays OFF

### Test Case 6: Send Message with One Active
1. Toggle Image Generation ON
2. Send a message
3. **Expected:** Image generated, no video
4. Toggle Image OFF, toggle Video ON
5. Send another message
6. **Expected:** Video generated, no image

## Related Changes

This change builds on:
- Image Generation Mode simplification (always mode by default)
- Video Generation UI simplification (2 model options)
- Gemini as default image provider

All these changes work together to create a streamlined, clear generation experience.

## Rollback Instructions

If you need to allow simultaneous generation:

1. Remove the additional fields from the updates in both handlers
2. Restore original logic:

```typescript
// Simple version without mutual exclusion
const handleImageGenerationChange = (value: string) => {
  onGenerationOptionsChange({ ...generationOptions, generateImage: value });
};

const handleVideoGenerationChange = (value: string) => {
  onGenerationOptionsChange({ ...generationOptions, generateVideo: value });
};
```

## Related Files

- `components/AttachmentsModal.tsx` - Handler implementation
- `components/ChatInput.tsx` - Generation options state
- `components/GenerationOptions.tsx` - Type definitions

## Notes

- Both generation types still supported by backend
- This is purely a UX improvement
- Users can still generate both types (just not in same message)
- Can toggle between types freely
- No breaking changes to existing functionality

