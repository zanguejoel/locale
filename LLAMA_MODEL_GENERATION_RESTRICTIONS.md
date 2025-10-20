# Llama Model Generation Restrictions Implementation

## Overview

This document describes the implementation of disabling image and video generation capabilities when users select Llama models in the mobile app. The solution uses a scalable, model-capabilities-based approach.

## Implementation Date

October 20, 2025

## Problem Statement

Llama models (Llama 3.3 70B, Llama 4 Scout 17B, Llama 4 Maverick 17B) cannot generate images or videos. Users should not be able to enable these options when a Llama model is selected.

## Solution: Model Capabilities Approach

We extended the existing `ModelCapabilities` interface to include generation flags for images and videos. This approach is:
- ✅ **Scalable**: Easy to configure per model
- ✅ **Maintainable**: Self-documenting in model configuration
- ✅ **Type-safe**: TypeScript enforced
- ✅ **Future-proof**: Can easily add more capability restrictions

## Architecture

### 1. Model Capabilities Extension

**File**: `constants/Models.ts`

Added two new optional fields to the `ModelCapabilities` interface:

```typescript
export interface ModelCapabilities {
  vision?: boolean;
  search?: boolean;
  pdf?: boolean;
  reasoning?: boolean;
  imageGeneration?: boolean; // Can generate images (default: true if undefined)
  videoGeneration?: boolean; // Can generate videos (default: true if undefined)
}
```

### 2. Llama Model Configuration

All three Llama models now explicitly disable image and video generation:

```typescript
{
  id: 'us.meta.llama3-3-70b-instruct-v1:0',
  name: 'LLama 3.3 70B',
  // ... other properties
  capabilities: {
    vision: true,
    search: true,
    pdf: true,
    reasoning: false,
    imageGeneration: false,  // ← Disabled
    videoGeneration: false   // ← Disabled
  }
}
```

### 3. Helper Function

**File**: `constants/Models.ts`

Created `canGenerateMedia()` helper function:

```typescript
export const canGenerateMedia = (modelId: string): { image: boolean; video: boolean } => {
  const model = getModelById(modelId);
  if (!model) {
    // Default to true if model not found
    return { image: true, video: true };
  }
  
  // Default to true if capability is undefined
  return {
    image: model.capabilities.imageGeneration !== false,
    video: model.capabilities.videoGeneration !== false
  };
};
```

**Returns**: Object with `image` and `video` boolean flags

### 4. ChatInput Integration

**File**: `components/ChatInput.tsx`

#### Changes:

1. **Import the helper**:
```typescript
import { canGenerateMedia } from '@/constants/Models';
```

2. **Added prop**:
```typescript
currentModelId?: string; // Current selected model ID to check generation capabilities
```

3. **Check capabilities**:
```typescript
const mediaCapabilities = currentModelId ? canGenerateMedia(currentModelId) : { image: true, video: true };
```

4. **Auto-disable on model switch** (useEffect):
```typescript
useEffect(() => {
  // Only apply restrictions for cloud models (not local)
  if (isLocal) return;

  const needsUpdate = 
    (!mediaCapabilities.image && generationOptions.generateImage !== 'none') ||
    (!mediaCapabilities.video && generationOptions.generateVideo !== 'none');

  if (needsUpdate) {
    setGenerationOptions(prev => ({
      ...prev,
      generateImage: mediaCapabilities.image ? prev.generateImage : 'none',
      generateVideo: mediaCapabilities.video ? prev.generateVideo : 'none',
    }));
    
    // Show a subtle haptic feedback when options are auto-disabled
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}, [currentModelId, mediaCapabilities.image, mediaCapabilities.video, isLocal]);
```

5. **Pass to AttachmentsModal**:
```typescript
<AttachmentsModal
  // ... other props
  canGenerateImage={mediaCapabilities.image}
  canGenerateVideo={mediaCapabilities.video}
/>
```

### 5. ChatPage Integration

**File**: `components/ChatPage.tsx`

Pass the current model ID to ChatInput:

```typescript
<ChatInput
  // ... other props
  currentModelId={isLocal ? selectedLocalModel?.id : selectedCloudModel?.id}
/>
```

### 6. AttachmentsModal UI Updates

**File**: `components/AttachmentsModal.tsx`

#### New Props:

```typescript
interface AttachmentsModalProps {
  // ... existing props
  canGenerateImage?: boolean; // Whether current model supports image generation
  canGenerateVideo?: boolean; // Whether current model supports video generation
}
```

#### Image Generation Toggle:

```typescript
<TouchableOpacity
  style={[
    styles.singleLineCard,
    generationOptions.generateImage !== 'none' && styles.singleLineCardActive,
    !canGenerateImage && styles.disabledCard  // ← Disabled styling
  ]}
  onPress={() => {
    if (!canGenerateImage) return;  // ← Prevent interaction
    // ... existing logic
  }}
  disabled={!canGenerateImage}  // ← Disable button
  accessibilityState={{ 
    checked: generationOptions.generateImage !== 'none',
    disabled: !canGenerateImage  // ← Accessibility
  }}
>
  <View style={[styles.iconBadge, { 
    backgroundColor: '...',
    opacity: canGenerateImage ? 1 : 0.5  // ← Dimmed icon
  }]}>
    <Ionicons name="image" size={18} color="#a855f7" />
  </View>
  <Text style={[
    styles.optionTitle,
    !canGenerateImage && styles.disabledText  // ← Dimmed text
  ]}>Image Generation</Text>
  {!canGenerateImage && (  // ← Lock icon
    <Ionicons 
      name="lock-closed" 
      size={16} 
      color={theme.colors.textSecondary} 
      style={{ marginRight: 8, opacity: 0.6 }}
    />
  )}
  <Switch
    value={generationOptions.generateImage !== 'none'}
    onValueChange={/* ... */}
    disabled={!canGenerateImage}  // ← Disable switch
    // ... style props
  />
</TouchableOpacity>
```

#### Video Generation Toggle:

Same pattern as image generation (disabled state, lock icon, dimmed appearance).

#### Info Banner:

```typescript
{/* Info Banner for Disabled Features */}
{(!canGenerateImage || !canGenerateVideo) && (
  <View style={styles.infoBanner}>
    <Ionicons 
      name="information-circle-outline" 
      size={18} 
      color={theme.colors.textSecondary}
      style={{ marginRight: 8 }}
    />
    <Text style={styles.infoBannerText}>
      {!canGenerateImage && !canGenerateVideo 
        ? 'Image and video generation are not available for the selected model.'
        : !canGenerateImage 
        ? 'Image generation is not available for the selected model.'
        : 'Video generation is not available for the selected model.'
      }
    </Text>
  </View>
)}
```

#### New Styles:

```typescript
// Disabled states
disabledCard: {
  opacity: 0.5,
  backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.01)',
},
disabledText: {
  opacity: 0.6,
},
// Info banner for disabled features
infoBanner: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
  borderRadius: 12,
  padding: 14,
  marginTop: 8,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
},
infoBannerText: {
  flex: 1,
  fontSize: 13,
  lineHeight: 18,
  color: theme.colors.textSecondary,
},
```

### 7. Local Models Support

**File**: `constants/LocalModels.ts`

Added helper function for consistency:

```typescript
/**
 * Check if a local model can generate images and/or videos
 * Note: Local models run on-device and cannot generate images or videos
 * This function is provided for consistency with cloud model capabilities
 */
export const canLocalModelGenerateMedia = (_modelId: string): { image: boolean; video: boolean } => {
  // Local models running on-device cannot generate images or videos
  return { image: false, video: false };
};
```

**Note**: Local models already hide all AI generation options via `isLocal` flag, so this function is mainly for documentation.

## User Experience Flow

### Scenario 1: User Selects Llama Model

1. User opens model selector
2. Selects "Llama 3.3 70B"
3. **Automatic behavior**:
   - Image generation option is disabled (if it was enabled)
   - Video generation option is disabled (if it was enabled)
   - Subtle haptic feedback provides confirmation
4. User opens AI Options modal
5. **Visual feedback**:
   - Image/Video toggles are dimmed (50% opacity)
   - Lock icons appear next to disabled options
   - Switches are disabled (grayed out)
   - Info banner displays: "Image and video generation are not available for the selected model."
6. User cannot enable these options

### Scenario 2: User Switches from Llama to Another Model

1. User currently has Llama model selected
2. Switches to "Claude Sonnet 4.5"
3. **Automatic behavior**:
   - Image and video generation options become available
   - No auto-enablement (user must manually enable if desired)
4. User opens AI Options modal
5. **Visual feedback**:
   - Image/Video toggles are fully visible (100% opacity)
   - No lock icons
   - Switches are interactive
   - No info banner
6. User can toggle these options on/off

### Scenario 3: User Has Image Generation Enabled, Then Switches to Llama

1. User has Claude model selected with image generation ON
2. Switches to "Llama 4 Scout 17B"
3. **Automatic behavior**:
   - Image generation is immediately disabled
   - `generateImage` option set to 'none'
   - Haptic feedback confirms the change
4. Next message sent will NOT include image generation

## Affected Models

### Cloud Llama Models (Disabled):
- ❌ Llama 3.3 70B (`us.meta.llama3-3-70b-instruct-v1:0`)
- ❌ Llama 4 Scout 17B (`us.meta.llama4-scout-17b-instruct-v1:0`)
- ❌ Llama 4 Maverick 17B (`us.meta.llama4-maverick-17b-instruct-v1:0`)

### Local Llama Models (Already Restricted):
- ❌ Llama 3.2 1B (`llama-3.2-1b`)
- ❌ Llama 3.2 3B (`llama-3.2-3b`)

**Note**: Local models hide all generation options by design via `isLocal` flag.

### Other Models (Enabled by Default):
- ✅ All Claude models
- ✅ All GPT models
- ✅ All Gemini models
- ✅ All Grok models

## Testing Checklist

### Manual Testing:

- [ ] Select Llama 3.3 70B → Verify image/video options are disabled
- [ ] Select Llama 4 Scout 17B → Verify image/video options are disabled
- [ ] Select Llama 4 Maverick 17B → Verify image/video options are disabled
- [ ] Select Claude Sonnet 4.5 → Verify image/video options are enabled
- [ ] Enable image generation → Switch to Llama → Verify auto-disabled
- [ ] Enable video generation → Switch to Llama → Verify auto-disabled
- [ ] Switch from Llama to Claude → Verify options become available (not auto-enabled)
- [ ] Verify lock icons appear on disabled options
- [ ] Verify info banner displays correct message
- [ ] Verify haptic feedback when options auto-disable
- [ ] Verify switches are visually disabled (grayed out)
- [ ] Verify TouchableOpacity doesn't respond when disabled
- [ ] Test with local models → Verify AI options completely hidden

### Accessibility Testing:

- [ ] VoiceOver announces disabled state correctly
- [ ] Screen reader reads info banner message
- [ ] Disabled switches have correct accessibility state

## Benefits of This Approach

1. **Scalable**: Easy to add restrictions for other models
2. **Maintainable**: Restrictions defined in model configuration
3. **Type-safe**: TypeScript catches missing capabilities
4. **User-friendly**: Clear visual feedback with lock icons and info banners
5. **Automatic**: Options auto-disable when switching models
6. **Consistent**: Same pattern can be applied to other features
7. **Documented**: Capability flags self-document model limitations

## Future Enhancements

1. **Add capability badges in model selector**
   - Show icons indicating which models support image/video generation
   - Example: 🖼️ 🎥 icons next to model names

2. **Tooltip on hover** (if hover is supported)
   - Show detailed explanation when user taps disabled option

3. **Model recommendation based on needs**
   - "You enabled image generation. We recommend Claude Sonnet for best results."

4. **Capability filtering in model selector**
   - Allow users to filter models by capabilities
   - "Show only models that support image generation"

## Related Files

### Modified Files:
- ✅ `constants/Models.ts` - Added capabilities and helper
- ✅ `constants/LocalModels.ts` - Added helper for consistency
- ✅ `components/ChatInput.tsx` - Added capability checking
- ✅ `components/ChatPage.tsx` - Pass model ID to ChatInput
- ✅ `components/AttachmentsModal.tsx` - Added disabled states and UI

### Helper Functions:
- `canGenerateMedia(modelId: string)` - Cloud models
- `canLocalModelGenerateMedia(modelId: string)` - Local models
- `isLlamaModel(modelId: string)` - Existing helper (still useful)

## Technical Notes

### Why Default to True?

```typescript
imageGeneration?: boolean; // Default: true if undefined
```

We default to `true` if the capability is undefined to avoid breaking existing models. Only Llama models explicitly set these to `false`.

### Why Not Use isLlamaModel()?

While we could use the existing `isLlamaModel()` helper, the capability-based approach is more flexible:
- Easy to disable for other models if needed
- Can have per-model granularity (e.g., one model supports images but not videos)
- Self-documenting in model configuration
- Follows SOLID principles (Open-Closed Principle)

### Local Model Handling

Local models bypass all generation option logic because:
1. AI Options section is hidden when `isLocal={true}` in AttachmentsModal
2. Generation options are never sent to backend for local models
3. On-device models physically cannot generate images/videos

The `canLocalModelGenerateMedia()` function is added for documentation and future use.

## Conclusion

This implementation provides a robust, scalable solution for disabling image and video generation when Llama models are selected. The model-capabilities approach ensures maintainability and makes it easy to apply similar restrictions to other models or features in the future.

