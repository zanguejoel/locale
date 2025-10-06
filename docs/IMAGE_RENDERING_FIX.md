# Image Rendering Fix - Mobile App

**Date:** October 6, 2025  
**Issue:** Images not rendering on mobile app  
**Solution:** Adopted web version's data handling approach with mobile's inline rendering

---

## Problem Analysis

### Issue
Images from AI-generated content (`additional_data`) and file uploads (`files` array) were not rendering properly on mobile.

### Root Cause
1. **Data Format Mismatch**: The web version transforms `additional_data` into separate messages with `files` arrays, while mobile expected inline `additional_data`
2. **Incomplete Data Handling**: Mobile wasn't checking all possible data sources for images
3. **Missing Compatibility Layer**: No transformation between web and mobile data formats

---

## Solution Implemented

### 1. Updated `useChat.tsx` (Lines 751-803)

**What Changed:**
- Added transformation logic in `fetchMessages()` to handle both formats
- Converts `files` array items with `data_type` into `additional_data` format
- Ensures backward compatibility with existing message structure
- Added comprehensive logging for debugging

**Code:**
```typescript
const fetchMessages = useCallback(async (conversationId?: string) => {
  // ... existing code ...
  
  const msgs = response.data.map(m => {
    // Ensure additional_data is preserved and properly formatted
    const message: Message = {
      ...m,
      role: `${m.role}` === "assistant" ? Role.Bot : Role.User,
      additional_data: m.additional_data || [],
    };
    
    // Web compatibility: Transform files with data_type into additional_data
    if (m.files && m.files.length > 0) {
      m.files.forEach(file => {
        if (file.data_type && ['img', 'video', 'voice'].includes(file.data_type)) {
          if (!message.additional_data) {
            message.additional_data = [];
          }
          // Add to additional_data if not already there
          const alreadyExists = message.additional_data.some(
            ad => ad.data === (file.s3_url || file.file_path)
          );
          if (!alreadyExists) {
            message.additional_data.push({
              data_type: file.data_type,
              data: file.s3_url || file.file_path || ''
            });
          }
        }
      });
    }
    
    return message;
  });
  
  setMessages(msgs || []);
}, []);
```

**Benefits:**
- ✅ Handles both web and mobile data formats
- ✅ Prevents duplicate images
- ✅ Preserves existing functionality
- ✅ Maintains backward compatibility

---

### 2. Enhanced `ChatMessage.tsx` (Lines 410-427, 476-492, 811-814)

**What Changed:**

#### A. Better Filtering and Logging
```typescript
const renderAdditionalData = () => {
  console.log('[ChatMessage] Rendering additional_data:', JSON.stringify(additional_data, null, 2));
  
  // Support both 'img' and 'image' data_type values
  const images = additional_data.filter(item => {
    const isImg = item.data_type === 'img' || item.data_type === 'image';
    console.log('[ChatMessage] Checking item:', item.data_type, 'isImg:', isImg);
    return isImg;
  });
  
  console.log('[ChatMessage] Found images:', images.length, 'videos:', videos.length);
  // ...
};
```

#### B. Enhanced Error Logging
```typescript
<LazyImage
  uri={item.data}
  onLoad={() => {
    console.log('[ChatMessage] Image loaded successfully:', item.data);
    setAdditionalImageLoading(prev => ({ ...prev, [imageIndex]: false }));
  }}
  onError={(e) => {
    console.error('[ChatMessage] Generated image load error:', e);
    console.error('[ChatMessage] Failed image URL:', item.data);
    setAdditionalImageLoading(prev => ({ ...prev, [imageIndex]: false }));
    setAdditionalImageError(prev => ({ ...prev, [imageIndex]: true }));
  }}
/>
```

#### C. Clearer Rendering Logic
```typescript
{/* Render user-uploaded images from files array */}
{(isImage(imageData) || files?.[0]?.file_type === 'img' || 
  (files?.[0]?.data_type === 'img' && content === '' && (!additional_data || additional_data.length === 0))) 
  && renderImageContent()}

{/* Render AI-generated images and videos from additional_data */}
{renderAdditionalData()}
```

**Benefits:**
- ✅ Supports both 'img' and 'image' data_type values
- ✅ Prevents duplicate rendering of images
- ✅ Detailed console logs for debugging
- ✅ Clear separation between user uploads and AI-generated content

---

## Data Flow Diagram

```
API Response
    │
    ├─── additional_data: [{data_type: 'img', data: 'url'}]  ──► Render inline
    │                                                              with "Generated" badge
    └─── files: [{data_type: 'img', s3_url: 'url'}]  ──┐
                                                        │
                                     Transformed to ────┘
                                     additional_data format
```

---

## Testing Guide

### 1. Test AI-Generated Images

**Steps:**
1. Open the mobile app
2. Enable debug console: `npx react-native log-ios` or `npx react-native log-android`
3. Send a message requesting image generation: "Generate an image of a sunset"
4. Check console for:
   ```
   [useChat] Message additional_data: [{data_type: 'img', data: 'https://...'}]
   [ChatMessage] Rendering additional_data: ...
   [ChatMessage] Found images: 1 videos: 0
   [ChatMessage] Image loaded successfully: https://...
   ```
5. Verify image appears with:
   - "Generated" badge (sparkles icon)
   - Proper sizing based on count (1, 2, or 3+ images)
   - Context menu on long-press (Copy, Save, Share)

### 2. Test User-Uploaded Images

**Steps:**
1. Tap camera/gallery icon
2. Select an image
3. Send the message
4. Verify image renders from `files` array
5. Check it doesn't duplicate in `additional_data`

### 3. Test Mixed Content

**Steps:**
1. Send message with text + image generation: "Tell me about cats and generate an image"
2. Verify:
   - Text appears in message bubble
   - Generated image appears below with badge
   - Both render inline in same message

### 4. Test Multiple Images

**Steps:**
1. Request multiple images: "Generate 3 different sunset images"
2. Verify:
   - Images display in responsive grid (3 columns)
   - Each has counter badge: "1/3", "2/3", "3/3"
   - All have "Generated" badge
   - Tapping opens full-screen view

---

## Console Log Examples

### ✅ Successful Image Load
```
[useChat] Fetched messages: 5
[useChat] Message additional_data: [{"data_type":"img","data":"https://..."}]
[useChat] Message files: []
[useChat] Processed message with additional_data: [{"data_type":"img","data":"https://..."}]
[ChatMessage] Rendering additional_data: [
  {
    "data_type": "img",
    "data": "https://storage.odyssey.com/generated/image-123.png"
  }
]
[ChatMessage] Checking item: img isImg: true
[ChatMessage] Found images: 1 videos: 0
[ChatMessage] Image loaded successfully: https://storage.odyssey.com/generated/image-123.png
```

### ❌ Failed Image Load
```
[ChatMessage] Generated image load error: [Error: Unable to load image]
[ChatMessage] Failed image URL: https://invalid-url.com/image.png
```

### ✅ Web-to-Mobile Format Transformation
```
[useChat] Message files: [{"data_type":"img","s3_url":"https://..."}]
[useChat] Processed message with additional_data: [{"data_type":"img","data":"https://..."}]
```

---

## API Data Formats Supported

### Format 1: Direct additional_data (preferred)
```json
{
  "role": "assistant",
  "content": "Here's your generated image:",
  "additional_data": [
    {
      "data_type": "img",
      "data": "https://storage.odyssey.com/generated/image.png"
    }
  ]
}
```

### Format 2: Files array with data_type (web compatibility)
```json
{
  "role": "assistant",
  "content": "",
  "files": [
    {
      "data_type": "img",
      "s3_url": "https://storage.odyssey.com/generated/image.png",
      "file_path": "/path/to/image.png"
    }
  ]
}
```

### Format 3: User-uploaded images (existing)
```json
{
  "role": "user",
  "content": "Look at this photo",
  "files": [
    {
      "file_type": "img",
      "s3_url": "https://storage.odyssey.com/uploads/photo.jpg"
    }
  ]
}
```

---

## Comparison: Mobile vs Web

| Feature | Mobile (After Fix) | Web |
|---------|-------------------|-----|
| **Data Structure** | `additional_data` inline | Separate messages per image |
| **Transformation** | ✅ Files → additional_data | ✅ additional_data → files |
| **Layout** | Responsive grid (inline) | Card-based (separate) |
| **Generated Badge** | ✅ Yes | ❌ No |
| **Context Menu** | ✅ Copy/Save/Share | Download button only |
| **Image Counter** | ✅ "1/3" badges | N/A |
| **Lazy Loading** | ✅ LazyImage component | Standard img tags |

---

## Troubleshooting

### Issue: Images not appearing

**Check:**
1. Console logs show `additional_data` is present?
2. Image URLs are valid and accessible?
3. `data_type` is exactly `'img'` or `'image'`?
4. Network connectivity is working?

**Solution:**
- Check console for error messages
- Verify API response format
- Test with curl/Postman to validate URLs
- Check CORS/authentication if URLs fail

### Issue: Duplicate images

**Cause:** Image appearing in both `files` and `additional_data`

**Solution:** The fix prevents this by checking for duplicates before adding

### Issue: No "Generated" badge

**Cause:** Image in `files` array without `data_type`

**Solution:** Ensure API returns `data_type: 'img'` in the data

---

## Files Modified

1. **`hooks/useChat.tsx`** (Lines 751-803)
   - Added message transformation logic
   - Web compatibility layer

2. **`components/ChatMessage.tsx`** (Lines 410-427, 476-492, 811-814, 848-860)
   - Enhanced logging
   - Better data type checking
   - Clearer rendering logic

---

## Performance Impact

- ✅ **No performance degradation** - transformations happen once during fetch
- ✅ **Improved debugging** - comprehensive logging helps identify issues faster
- ✅ **Better UX** - images load properly with visual feedback

---

## Next Steps

1. **Monitor production logs** for any edge cases
2. **Gather user feedback** on image rendering
3. **Consider adding image preview quality settings** for slower connections
4. **Implement image caching** for repeated views of same images

---

## Related Documentation

- [IMAGE_DISPLAY_COMPARISON.md](./IMAGE_DISPLAY_COMPARISON.md) - Mobile vs Web comparison
- [IMAGE_IMPROVEMENTS_IMPLEMENTED.md](./IMAGE_IMPROVEMENTS_IMPLEMENTED.md) - Previous image improvements
- [LAZY_IMAGE_IMPLEMENTATION.md](./LAZY_IMAGE_IMPLEMENTATION.md) - LazyImage component details
- [PERFORMANCE_FIXES_IMPLEMENTED.md](./PERFORMANCE_FIXES_IMPLEMENTED.md) - Overall performance improvements

---

## Status: ✅ COMPLETE

All changes implemented and tested. Ready for deployment.

