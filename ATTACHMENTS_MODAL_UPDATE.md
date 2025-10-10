# Attachments Modal Update - Plus Button Behavior

## Issue
When files were selected, pressing the "+" button would open the FilePreviewModal instead of the AttachmentsModal. This was redundant since the file preview is already shown above the chat input.

## Solution
Changed the "+" button to **always** open the AttachmentsModal, regardless of whether files are selected.

## Changes Made

### ChatInput.tsx

#### 1. Simplified Plus Button Logic
**Before:**
```typescript
onPress={async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // If files exist, show preview modal, otherwise show attachments modal
  if (files.length > 0) {
    setShowFilePreviewModal(true);
  } else {
    setShowAttachmentsModal(true);
  }
}}
```

**After:**
```typescript
onPress={async () => {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  // Always show attachments modal - file preview is already visible above input
  setShowAttachmentsModal(true);
}}
```

#### 2. Removed Unused Code
- Removed `showFilePreviewModal` state
- Removed `handleBackToAttachments` callback
- Removed `removeFile` and `clearAllFiles` functions (handled in ChatPage)
- Removed FilePreviewModal component usage
- Kept only the `SelectedFile` type import

#### 3. Updated Accessibility Labels
- Changed from conditional labels to consistent "Show attachments and AI options"
- Updated hint to mention AI settings

## File Preview Location

Files are displayed in **ChatPage.tsx** (lines 709-740):
```typescript
{files.length > 0 && (
  <View style={styles.attachmentPreviewContainer}>
    <ScrollView horizontal>
      {files.map((file, index) => (
        <View key={`file-${index}`}>
          <Image source={{ uri: file.uri }} />
          <TouchableOpacity onPress={() => removeFile(index)}>
            <Ionicons name="close-circle" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  </View>
)}
```

This preview is shown **above the chat input** with:
- Horizontal scrollable list of files
- Thumbnail previews
- Individual remove buttons
- File count badge on the "+" button

## User Experience

### Previous Flow (Confusing)
1. User attaches a file → File preview shows above input
2. User clicks "+" → FilePreviewModal opens (duplicate preview)
3. User confused by two previews

### New Flow (Consistent)
1. User attaches a file → File preview shows above input
2. User clicks "+" → AttachmentsModal opens (can add more files or configure AI options)
3. Clear separation: Preview stays visible, modal for actions

## Benefits

1. **Consistency**: "+" button always does the same thing
2. **No Redundancy**: File preview only shown in one place
3. **Better UX**: Users can see their files while adding more
4. **Cleaner Code**: Removed unused modal and navigation logic
5. **Clear Purpose**: "+" = Add attachments or configure options

## Components Affected

- ✅ `ChatInput.tsx` - Simplified button logic, removed unused modal
- ✅ `ChatPage.tsx` - Unchanged (already handles file preview)
- ✅ `AttachmentsModal.tsx` - Unchanged (works perfectly as-is)

## Testing Checklist

- [x] "+" button opens AttachmentsModal when no files selected
- [x] "+" button opens AttachmentsModal when files are selected
- [x] File count badge shows correctly when files are attached
- [x] File preview remains visible above input
- [x] Can add more files from AttachmentsModal
- [x] Can access AI Options from AttachmentsModal
- [x] No linting errors

## Notes

- FilePreviewModal component still exists but is no longer used in ChatInput
- Could be removed entirely or repurposed for future features
- File management (add/remove) is handled by ChatPage, not ChatInput

