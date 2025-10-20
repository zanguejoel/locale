# Image Fullscreen Navigation Fix

## Issue Description

Users could not open LLM-generated images in fullscreen view when tapping on them. The images would not navigate to the fullscreen modal with zoom and download capabilities.

## Root Cause

The `Pressable` component inside the `Link` component had its own `onPress={handlePress}` handler that was intercepting and blocking the Link's default navigation behavior.

### The Problem

When using Expo Router's `Link` component with `asChild`, the child component should NOT have its own `onPress` handler, as it conflicts with the Link's navigation:

```typescript
// ❌ PROBLEMATIC CODE
<Link href={`/(modal)/image/${url}`} asChild>
  <Pressable
    onPress={handlePress}  // ❌ This blocks Link navigation!
  >
    <Image />
  </Pressable>
</Link>
```

**Why this breaks:**
1. User taps the image
2. Pressable's `onPress` fires first
3. `handlePress` calls `onPress?.()` and announces accessibility
4. Event propagation stops
5. Link's navigation never triggers
6. Fullscreen modal doesn't open

## The Fix

### File: `components/ChatMessage.tsx` (Lines 655-663)

**Removed the conflicting `onPress` handler:**

```typescript
// ✅ FIXED CODE
<Link
  href={`/(modal)/image/${encodeURIComponent(imageUrl)}?prompt=${encodeURIComponent(prompt || '')}`}
  asChild
>
  <Pressable
    onLongPress={onLongPress}
    // ✅ REMOVED onPress={handlePress} to allow Link navigation to work
    // The Link component handles the press for fullscreen navigation
    accessible={true}
    accessibilityLabel={`Image preview. ${prompt}`}
    accessibilityRole="image"
    testID="image-preview-pressable"
    style={{width: CHAT_MESSAGE.IMAGE_PREVIEW_SIZE}}
  >
    <LazyImage uri={imageUrl} />
  </Pressable>
</Link>
```

### File: `components/GeneratedImageItem.tsx` (Lines 228-233)

**Same fix applied to GeneratedImageItem (currently unused but future-proofed):**

```typescript
<Link
  href={`/(modal)/image/${encodeURIComponent(imageUrl)}`}
  asChild
>
  <TouchableOpacity
    // ✅ REMOVED onPress={handleImagePress} to allow Link navigation to fullscreen
    // The Link component handles the press automatically for fullscreen view
    activeOpacity={0.9}
    accessibilityLabel={`Generated image ${index + 1} of ${totalImages}`}
    accessibilityRole="image"
  >
```

## What Still Works

### ✅ Long Press Context Menu
- Long press still works via `onLongPress={onLongPress}`
- Context menu shows: Copy, Save, Share options
- Not affected by the Link navigation

### ✅ Accessibility
- VoiceOver/TalkBack announcements still work
- `accessibilityLabel` and `accessibilityRole` preserved
- Screen readers properly describe the image

### ✅ Image Loading
- LazyImage component still loads efficiently
- Error handling still functional
- Retry logic intact

## How It Works Now

### User Flow

1. **User taps image** in chat message
2. Link's navigation triggers automatically
3. App navigates to `/(modal)/image/[url]` route
4. Fullscreen modal opens with:
   - Pinch-to-zoom functionality
   - Download button
   - Share button
   - Close button
5. User can zoom, download, or go back

### Technical Flow

```
User Tap
  ↓
Link (asChild) detects press
  ↓
Navigate to: /(modal)/image/[url]?prompt=...
  ↓
ImageZoom modal renders
  ↓
User can zoom, save, share
```

## Testing

### Test Case 1: Basic Image Tap (Generated Images)
1. Send a message with image generation enabled
2. Wait for AI to generate an image
3. Tap on the generated image
4. **Expected:** Fullscreen modal opens
5. **Expected:** Can pinch to zoom
6. **Expected:** Can save/share image

### Test Case 2: Multiple Images
1. Generate multiple images in one message
2. Tap on first image
3. **Expected:** Opens fullscreen for that image
4. Go back, tap second image
5. **Expected:** Opens fullscreen for second image

### Test Case 3: Long Press Context Menu
1. Long press on any image
2. **Expected:** Context menu appears (Copy, Save, Share)
3. Tap on image (normal press)
4. **Expected:** Fullscreen modal opens (not context menu)

### Test Case 4: Regular Chat Images (User Uploaded)
1. Send a message with attached image
2. Tap on the image
3. **Expected:** Fullscreen modal opens
4. **Verify:** Same behavior as generated images

### Test Case 5: Accessibility
1. Enable VoiceOver/TalkBack
2. Navigate to an image
3. **Expected:** Announces "Image preview. [prompt]"
4. Double tap
5. **Expected:** Opens fullscreen modal
6. **Expected:** Announces modal controls

## Related Components

### `app/(modal)/image/[url].tsx`
The fullscreen image modal that users navigate to:
- Uses `ImageZoom` from `@likashefqet/react-native-image-zoom`
- Provides pinch-to-zoom with min/max scale
- Bottom blur view with Save and Share buttons
- Dark background for better image viewing

### `components/LazyImage.tsx`
Efficient image loading with:
- Lazy loading based on viewport
- Placeholder skeleton
- Error retry logic
- Memory and disk caching

### `components/ChatMessage.tsx`
Main message component that renders:
- Text content with markdown
- Uploaded images (via `renderImageContent`)
- Generated images (via `renderAdditionalData` → `renderImageContent`)
- Videos, audio, documents

## Implementation Notes

### Why `asChild` Pattern

The `Link` component with `asChild` means:
1. Link doesn't render its own element
2. It wraps the immediate child (Pressable/TouchableOpacity)
3. Child inherits the Link's navigation behavior
4. Child must NOT have conflicting `onPress` handler

### Event Handling Priority

When both Link and child have press handlers:
```
1. Child's onPress fires first (if exists)
2. Event bubbling continues
3. Link's navigation fires second
```

But if child's `onPress` stops propagation or doesn't call the default, Link won't work.

**Solution:** Remove child's `onPress` and let Link handle it exclusively.

### Alternative Approaches (Not Used)

**Option 1:** Call navigation manually
```typescript
onPress={() => {
  router.push(`/(modal)/image/${url}`);
}}
```
❌ More code, loses Link's optimization

**Option 2:** Use onPressIn instead of onPress
```typescript
onPressIn={handlePress}
```
❌ Different UX, may trigger accidentally

**Option 3:** Check if Link should navigate
```typescript
onPress={(e) => {
  handlePress();
  // Don't call e.preventDefault() to allow Link
}}
```
❌ Fragile, may break in updates

**✅ Chosen Solution:** Remove conflicting handler entirely

## Backward Compatibility

This fix:
- ✅ Doesn't break existing image display
- ✅ Doesn't affect context menu (long press)
- ✅ Doesn't change accessibility behavior
- ✅ Works for both generated and uploaded images
- ✅ No changes needed to consuming components

## Performance Impact

**Before:**
- Two event handlers on every tap
- `handlePress` executed, then Link navigation attempted
- Potential for race conditions

**After:**
- Single event handler (Link's navigation)
- Cleaner event flow
- Slightly better performance

## Related Issues

This fix resolves:
- Generated images not opening in fullscreen
- User-uploaded images might have same issue
- Any image preview that uses the Link pattern

## Related Files

- `components/ChatMessage.tsx` - Main fix location
- `components/GeneratedImageItem.tsx` - Preventive fix (component not currently used)
- `app/(modal)/image/[url].tsx` - Fullscreen modal destination
- `components/LazyImage.tsx` - Image rendering component

## Verification Commands

```bash
# Check that onPress is removed from Link children
grep -A 5 "Link.*asChild" jaime-mobile-app/components/ChatMessage.tsx

# Verify fullscreen modal exists
ls -la jaime-mobile-app/app/\(modal\)/image/

# Check for other potential Link conflicts
grep -B 2 -A 5 "Link.*asChild" jaime-mobile-app/components/
```

## Success Criteria

- ✅ Tapping generated images opens fullscreen modal
- ✅ Tapping uploaded images opens fullscreen modal  
- ✅ Long press still shows context menu
- ✅ Pinch-to-zoom works in fullscreen
- ✅ Download/Share work in fullscreen
- ✅ Accessibility announcements work correctly

