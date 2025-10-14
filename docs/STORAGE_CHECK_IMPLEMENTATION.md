# Storage Check Before Model Download

**Date**: October 13, 2025  
**Status**: ✅ Complete  
**Feature**: Automatic storage space verification before downloading local models

---

## 🎯 Overview

Added automatic storage space checking that verifies sufficient device storage before allowing local model downloads. The system checks available storage against required space (with a 20% buffer) and alerts users if they need to free up space.

---

## ✨ What Was Implemented

### 1. **Pre-Download Storage Verification**

Before showing the download confirmation alert, the system now:
1. Checks available device storage
2. Calculates required space with 20% buffer
3. Compares available vs. required space
4. Blocks download if insufficient space
5. Shows helpful alert with exact amounts needed

### 2. **Insufficient Storage Alert**

**Example Alert:**
```
⚠️ Insufficient Storage

Not enough space to download Llama 3.2 1B.

Required: 1.44 GB (with 20% buffer)
Available: 850 MB

Please free up approximately 590 MB to continue.

Tip: You can delete unused models from this screen to free up space.

[OK]
```

---

## 🔧 Technical Implementation

### Storage Check Logic

```typescript
// Check available storage first
try {
  const deviceStorage = await ModelFileManager.getDeviceStorageInfo();
  const requiredBytes = ModelFileManager.parseSizeString(modelSize);
  const requiredWithBuffer = requiredBytes * 1.2; // 20% buffer
  
  if (deviceStorage.freeSpace < requiredWithBuffer) {
    const freeSpaceFormatted = ModelFileManager.formatFileSize(deviceStorage.freeSpace);
    const requiredFormatted = ModelFileManager.formatFileSize(requiredWithBuffer);
    
    Alert.alert(
      '⚠️ Insufficient Storage',
      `Not enough space to download ${modelName}.\n\n` +
      `Required: ${requiredFormatted} (with 20% buffer)\n` +
      `Available: ${freeSpaceFormatted}\n\n` +
      `Please free up approximately ${ModelFileManager.formatFileSize(requiredWithBuffer - deviceStorage.freeSpace)} to continue.\n\n` +
      `Tip: You can delete unused models from this screen to free up space.`,
      [{ text: 'OK' }]
    );
    return;
  }
} catch (error) {
  console.error('Error checking storage:', error);
  // Continue with download if storage check fails
}
```

### Key Functions Used

1. **`ModelFileManager.getDeviceStorageInfo()`**
   - Returns: `{ totalSpace, freeSpace, usedSpace, percentUsed }`
   - Gets real-time device storage information

2. **`ModelFileManager.parseSizeString(sizeStr)`**
   - Converts model size string (e.g., "1.2GB") to bytes
   - Handles KB, MB, GB units

3. **`ModelFileManager.formatFileSize(bytes)`**
   - Converts bytes to human-readable format
   - Auto-selects appropriate unit (KB, MB, GB)

---

## 📍 Where Storage Check Occurs

### 1. **Model Manager Screen** (`app/model-manager.tsx`)
- Checks storage before "Download Model" action
- Prevents download if insufficient space
- Changed `handleDownloadModel` to async function

### 2. **Sidebar/Drawer Toggle** (`components/ChatCustomDrawerContent.tsx`)
- Checks storage before switching to local mode
- Prevents mode switch if insufficient space
- Added import for `ModelFileManager`

---

## 💡 User Experience Flow

### Sufficient Storage:
```
User taps "Download Model"
         ↓
Storage check: ✅ Enough space
         ↓
Show download confirmation alert
         ↓
User confirms → Download begins
```

### Insufficient Storage:
```
User taps "Download Model"
         ↓
Storage check: ❌ Not enough space
         ↓
Show insufficient storage alert
         ↓
Download blocked
         ↓
User can:
  • Delete unused models
  • Delete other files
  • Try again later
```

---

## 📊 Storage Buffer

### Why 20% Buffer?

The system requires 20% extra space beyond the model size:

| Model Size | Buffer | Total Required | Reason |
|------------|--------|----------------|--------|
| 1.0 GB | 200 MB | 1.2 GB | Extraction, temp files, system overhead |
| 500 MB | 100 MB | 600 MB | Safe margin for download process |
| 135 MB | 27 MB | 162 MB | Prevents "out of space" during install |

**Benefits:**
- Prevents mid-download failures
- Accounts for extraction overhead
- Leaves room for system operations
- Better user experience (no partial downloads)

---

## 🎨 Alert Features

### Information Provided:
- **Model Name**: Which model needs space
- **Required Space**: Exact amount with buffer
- **Available Space**: Current free space
- **Space Needed**: How much to free up
- **Helpful Tip**: Where to delete unused models

### User-Friendly Formatting:
- Automatic unit conversion (MB/GB)
- Precise calculations
- Clear action items
- Helpful guidance

---

## 🔒 Error Handling

### Graceful Degradation:

```typescript
try {
  // Perform storage check
} catch (error) {
  console.error('Error checking storage:', error);
  // Continue with download if storage check fails
}
```

**Why?**
- Storage API might fail on some devices
- Don't block user if check fails
- Log error for debugging
- Better to attempt download than block completely

---

## 📝 Files Modified

1. **`app/model-manager.tsx`**
   - Added storage check before download
   - Changed `handleDownloadModel` to async
   - Added insufficient storage alert

2. **`components/ChatCustomDrawerContent.tsx`**
   - Added import for `ModelFileManager`
   - Added storage check before mode switch
   - Added insufficient storage alert

---

## ✅ Benefits

### For Users:
1. **No Surprise Failures**: Know before download if there's enough space
2. **Clear Guidance**: Exact amounts needed to free up
3. **Helpful Tips**: Where to delete unused models
4. **Better UX**: Prevents frustrating mid-download failures

### For System:
1. **Prevents Partial Downloads**: Ensures enough space upfront
2. **Reduces Support**: Fewer "download failed" issues
3. **System Stability**: Maintains device health with buffer
4. **Resource Management**: Smart storage allocation

---

## 🧪 Testing Scenarios

To test the storage check feature:

### Test 1: Sufficient Storage
1. Ensure device has >2GB free space
2. Try downloading small model (135MB)
3. ✅ Should show download confirmation
4. ✅ Should proceed with download

### Test 2: Insufficient Storage
1. Simulate low storage (or use test device)
2. Try downloading large model (1.2GB)
3. ✅ Should show insufficient storage alert
4. ✅ Should block download
5. ✅ Should show correct amounts

### Test 3: Border Case
1. Have exactly enough space (no buffer)
2. Try downloading model
3. ✅ Should block download (needs 20% buffer)
4. ✅ Should show amount to free up

### Test 4: Error Handling
1. Simulate storage API failure
2. Try downloading model
3. ✅ Should continue to download confirmation
4. ✅ Should log error to console

---

## 📊 Storage Calculation Examples

### Example 1: Llama 3.2 1B (~1.2GB)
```
Model Size:        1.2 GB
Buffer (20%):      240 MB
Total Required:    1.44 GB

If Available:      1.0 GB
Status:            ❌ Insufficient
Need to Free:      440 MB
```

### Example 2: SmolLM2 135M (~135MB)
```
Model Size:        135 MB
Buffer (20%):      27 MB
Total Required:    162 MB

If Available:      200 MB
Status:            ✅ Sufficient
Proceed:           Download allowed
```

### Example 3: Qwen 2.5 1.5B (~1.5GB)
```
Model Size:        1.5 GB
Buffer (20%):      300 MB
Total Required:    1.8 GB

If Available:      1.7 GB
Status:            ❌ Insufficient
Need to Free:      100 MB
```

---

## 🚀 Future Enhancements

Potential improvements:

1. **Smart Cleanup**: Auto-suggest which models to delete
2. **Cache Clearing**: Offer to clear app cache first
3. **External Storage**: Check SD card availability (Android)
4. **Download Queue**: Queue downloads for when space becomes available
5. **Compression**: Use compressed models to reduce space requirements
6. **Progressive Download**: Download in chunks, verify space at each step
7. **Storage Warnings**: Show warning at 80% full, error at 90% full

---

## ✨ Summary

Successfully implemented automatic storage checking that:
- ✅ Verifies sufficient space before downloads
- ✅ Uses 20% buffer for safety
- ✅ Shows clear, helpful alerts
- ✅ Prevents mid-download failures
- ✅ Provides exact amounts needed
- ✅ Handles errors gracefully
- ✅ Works in both model manager and sidebar
- ✅ No linter errors
- ✅ User-friendly error messages

Users will no longer experience frustrating download failures due to insufficient storage. The system proactively checks and clearly communicates space requirements before any download begins.

