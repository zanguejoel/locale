# Video Generation UI Simplification

## Change Summary

Simplified the video generation UI to match the image generation pattern for consistency and better UX.

## What Changed

### File: `components/AttachmentsModal.tsx`

**Before:** Complex video model selection with detailed list view
- Large section with header showing current selection
- 5 separate buttons (None, AWS Nova Reel, Veo2, Veo3, Veo3+Audio)
- Each option showed icon, name, cost, and features
- Took up significant vertical space

**After:** Clean toggle with compact model selection
- Simple toggle switch (matches image generation pattern)
- When enabled, shows 2 inline buttons: AWS Nova and Veo3
- Defaults to Veo3 when enabled
- Uses same styling as image generation for consistency

## Code Changes

### Removed (Lines 318-484):
```typescript
// Old complex video section
<View style={styles.section}>
  <View style={styles.sectionHeaderRow}>
    <View style={styles.iconBadge}>
      <Ionicons name="videocam" size={18} color="#ec4899" />
    </View>
    <View>
      <Text style={styles.sectionHeaderTitle}>Video Generation</Text>
      <Text style={styles.sectionHeaderSubtitle}>
        {generationOptions.generateVideo === 'none' ? 'Off' : ...}
      </Text>
    </View>
  </View>

  <View style={styles.videoModelsContainer}>
    {/* 5 separate option buttons with detailed info */}
  </View>
</View>
```

### Added (Lines 318-394):
```typescript
// New simple toggle matching image generation
<TouchableOpacity
  style={[
    styles.singleLineCard,
    generationOptions.generateVideo !== 'none' && styles.singleLineCardActive
  ]}
  onPress={() => {
    const nextValue = generationOptions.generateVideo === 'none' ? 'google_veo3' : 'none';
    handleVideoGenerationChange(nextValue);
  }}
>
  <View style={styles.iconBadge}>
    <Ionicons name="videocam" size={18} color="#ec4899" />
  </View>
  <Text style={styles.optionTitle}>Video Generation</Text>
  <Switch
    value={generationOptions.generateVideo !== 'none'}
    onValueChange={(value) => {
      handleVideoGenerationChange(value ? 'google_veo3' : 'none');
    }}
  />
</TouchableOpacity>

{/* Video Model Selection (when enabled) */}
{generationOptions.generateVideo !== 'none' && (
  <View style={styles.expandedSection}>
    <View style={styles.optionRow}>
      <Text style={styles.optionRowLabel}>Model</Text>
      <View style={styles.inlineButtonGroup}>
        <TouchableOpacity onPress={() => handleVideoGenerationChange('aws_nova_reel')}>
          <Text>AWS Nova</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleVideoGenerationChange('google_veo3')}>
          <Text>Veo3</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
)}
```

### Removed Styles:
- `section` (no longer used)
- `videoModelsContainer`
- `videoModelOption`
- `videoModelOptionSelected`
- `videoModelLeft`
- `videoModelInfo`
- `videoModelName`
- `videoModelNameSelected`
- `videoModelCost`
- `sectionHeaderRow`
- `sectionHeaderTitle`
- `sectionHeaderSubtitle`

All video UI now uses the same shared styles as image generation:
- `singleLineCard`
- `singleLineCardActive`
- `iconBadge`
- `optionTitle`
- `expandedSection`
- `optionRow`
- `optionRowLabel`
- `inlineButtonGroup`
- `inlineButton`
- `inlineButtonActive`
- `inlineButtonText`
- `inlineButtonTextActive`

## User Experience

### Before
1. Scroll through AI Options
2. See large Video Generation section
3. Click one of 5 detailed option buttons
4. Each button showed cost and features
5. Visual hierarchy competed with other options

### After
1. Scroll through AI Options (more compact)
2. See Video Generation toggle (same as Image Generation)
3. Toggle ON to enable (defaults to Veo3)
4. Choose between AWS Nova or Veo3 if desired
5. Consistent visual hierarchy with other options

## Benefits

1. **Visual Consistency**: Matches image generation pattern exactly
2. **Space Efficient**: Reduced vertical space by ~60%
3. **Simpler Choices**: 2 main options instead of 5
4. **Faster Access**: One toggle to enable (smart default)
5. **Cleaner Code**: Reuses existing styles, removed ~200 lines
6. **Better UX**: Less overwhelming, clearer hierarchy

## Model Selection

**Available Models:**
- **AWS Nova Reel** (`aws_nova_reel`) - Fast, 36 credits
- **Google Veo3** (`google_veo3`) - Latest, 300 credits

**Removed from UI** (still supported by backend if needed):
- `google_veo2` - Superseded by Veo3
- `google_veo3_audio` - Specialized use case

**Default:** `google_veo3` when video generation is enabled

## Migration Notes

If users were using Veo2 or Veo3+Audio:
- These are still supported by the backend
- They default to Veo3 in the new UI
- Can be added back to UI if needed

## Testing

### Test Case 1: Enable Video Generation
1. Open Attachments & AI modal
2. Toggle Video Generation ON
3. **Expected:** Model options appear (AWS Nova, Veo3)
4. **Expected:** Veo3 is selected by default
5. Send a message
6. **Expected:** Video generated using Veo3

### Test Case 2: Switch Video Models
1. Enable Video Generation
2. Switch to AWS Nova
3. **Expected:** AWS Nova selected (visual feedback)
4. Send a message
5. **Expected:** Video generated using AWS Nova Reel
6. Switch back to Veo3
7. **Expected:** Veo3 selected

### Test Case 3: Disable Video Generation
1. Toggle Video Generation OFF
2. **Expected:** Model selection disappears
3. Send a message
4. **Expected:** No video generation

### Test Case 4: UI Consistency
1. Compare Image Generation and Video Generation sections
2. **Expected:** Both use identical layout patterns
3. **Expected:** Same toggle style, same inline buttons
4. **Expected:** Consistent spacing and colors

## Rollback Instructions

If you need to restore the detailed video model list:

1. Restore the old section from git history (lines 318-484)
2. Restore the removed styles
3. The backend still supports all video models

## Related Files

- `components/AttachmentsModal.tsx` - UI implementation
- `components/ChatInput.tsx` - Default generation options state
- `components/GenerationOptions.tsx` - Type definitions

## Notes

- All video models are still supported by the backend
- This is purely a UI simplification
- Focus on the 2 most commonly used models
- Consistent with overall AI Options design language
- Reduces user decision fatigue
- Makes the modal more scannable

