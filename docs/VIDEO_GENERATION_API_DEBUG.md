# Video Generation API Parameter Debug Guide

**Date:** October 8, 2025  
**Issue:** Video generation works on web but not on mobile  
**Status:** 🔍 Enhanced debugging + validation added

---

## 🎯 **Key Findings**

### Backend Requirements

The backend expects **specific model names**:

```python
# llama3_service.py line 11958+
if self.generate_video == "aws_nova_reel":
    # Generate with AWS Nova Reel
elif self.generate_video == "google_veo2":
    # Generate with Google Veo2
elif self.generate_video == "google_veo3" or self.generate_video == "google_veo3_audio":
    # Generate with Google Veo3
```

**Valid Values:**
- ✅ `"aws_nova_reel"`
- ✅ `"google_veo2"`
- ✅ `"google_veo3"`
- ✅ `"google_veo3_audio"`
- ❌ `"auto"` (old value - NOT supported)
- ❌ `"always"` (old value - NOT supported)
- ❌ `"enabled"` (doesn't work for video)

---

## 📊 **Web App vs Mobile App**

### Web App (Working) ✅
```typescript
// chat.tsx line 303
const [generateVideo, setGenerateVideo] = useState<string>('none');

// chat-input.tsx line 515
onClick={() => handleVideoOptionSelect('aws_nova_reel')}

// Sends to backend:
formData.append('generate_video', 'aws_nova_reel');  // ✅ Specific model name
```

### Mobile App (Should Work) ✅
```typescript
// AttachmentsModal.tsx
onPress={() => handleVideoGenerationChange('aws_nova_reel')}

// useChat.tsx line 753
formData.append('generate_video', options.generateVideo);  // Should be 'aws_nova_reel'
```

**Both should send the same format!**

---

## 🔍 **Debug Logging Added**

### What to Check in Console

When you select a video model and send a message, you should see:

```javascript
[Cloud] ════════════════════════════════════
[Cloud] Generation options: {
  "webSearch": false,
  "generateImage": "none",
  "imageProvider": "openai",
  "imageModel": "gpt-image-1",
  "generateVideo": "aws_nova_reel"  // ← Should show model name here
}
[Cloud] - webSearch: false
[Cloud] - generateImage: none
[Cloud] - generateVideo: aws_nova_reel  // ← Check this value!
[Cloud] ════════════════════════════════════
[Cloud] ✅ Added generate_video: aws_nova_reel
[Cloud] Valid models: aws_nova_reel, google_veo2, google_veo3, google_veo3_audio
```

### If Invalid Model Name
```javascript
[Cloud] ⚠️ INVALID VIDEO MODEL: always
[Cloud] Backend expects one of: aws_nova_reel, google_veo2, google_veo3, google_veo3_audio
```

This means the old 'always' value is being used instead of a specific model name.

---

## 🧪 **Testing Steps**

### Step 1: Select Video Model
```
1. Tap (+) button
2. Tap "AI Options"
3. Scroll to "Video Generation"
4. Tap "AWS Nova Reel"
   → Blue checkmark should appear
5. Tap ← back
```

### Step 2: Send Message
```
6. Type: "Generate a video of a sunset"
7. Tap send
8. IMMEDIATELY check console
```

### Step 3: Verify Console Output

**Look for these logs:**

#### ✅ Correct Output (Should Work)
```
[ChatInput] Sending message with options: {
  "generateVideo": "aws_nova_reel",  // ✅ Model name!
  ...
}
[Cloud] ✅ Added generate_video: aws_nova_reel
(No warning message)
```

#### ❌ Incorrect Output (Won't Work)
```
[ChatInput] Sending message with options: {
  "generateVideo": "always",  // ❌ Old value!
  ...
}
[Cloud] ⚠️ INVALID VIDEO MODEL: always
[Cloud] Backend expects one of: aws_nova_reel, ...
```

### Step 4: Check Backend Response

**If model name is correct:**
```
[ChatStream] State update: Generating video with AWS Nova Reel...
[ChatStream] State update: Video generation in progress...
(After 30-90 seconds)
[Cloud] Processing additional_data: [{"data_type":"video","s3_url":"..."}]
[Cloud] Creating separate messages for 1 video(s)
```

**If model name is wrong:**
```
[ChatStream] Received final response
[Cloud] ⚠️ No additional_data in final result
(No video appears)
```

---

## 🔧 **Common Issues & Fixes**

### Issue 1: Old 'always' Value Still Used

**Symptom:**
```
[Cloud] ⚠️ INVALID VIDEO MODEL: always
```

**Cause:** State not updating when selecting model

**Fix:** Clear app cache/restart app, then re-select model

---

### Issue 2: generateVideo is 'none'

**Symptom:**
```
[Cloud] No video generation (generateVideo is none or missing)
```

**Cause:** Model not selected or selection didn't save

**Fix:** 
1. Verify checkmark appears on model
2. Check state in ChatInput logs
3. Ensure options are passed to sendMessage

---

### Issue 3: Wrong Parameter Format

**Symptom:** Backend returns error or ignores video request

**Check formData:**
```javascript
// Should be:
generate_video: "aws_nova_reel"  // ✅

// NOT:
generate_video: "always"  // ❌
generate_video: "enabled"  // ❌
generateVideo: "aws_nova_reel"  // ❌ (wrong parameter name)
```

---

## 📋 **Validation Checklist**

### Before Sending Message
- [ ] Video model selected in AI Options
- [ ] Checkmark visible on selected model
- [ ] Options modal closed (tap ← back)
- [ ] Console ready to view logs

### After Sending Message
- [ ] Check `[ChatInput] Sending message with options:` log
- [ ] Verify `generateVideo` shows model name (not 'always')
- [ ] Check `[Cloud] ✅ Added generate_video:` log
- [ ] No warning about invalid model
- [ ] Backend responds with generating status
- [ ] Video appears after generation

---

## 🔬 **Deep Debug**

### Inspect Full Request

Add this temporarily to see EXACTLY what's being sent:

```typescript
// In useChat.tsx, after building formData
console.log('[Cloud] FormData contents:');
for (let pair of formData.entries()) {
  console.log(`  ${pair[0]}: ${pair[1]}`);
}
```

**Expected output:**
```
[Cloud] FormData contents:
  text: Generate a video of a sunset
  model: gpt-4o
  conversation_id: 64924
  generate_video: aws_nova_reel  // ✅ Should be model name
```

---

## 💡 **Possible Root Causes**

### Cause 1: Model Name Not Persisted
**Issue:** Selection works in UI but state doesn't update

**Debug:**
```typescript
// In AttachmentsModal.tsx handleVideoGenerationChange
console.log('[AttachmentsModal] Changing video to:', value);
console.log('[AttachmentsModal] Current options before change:', generationOptions);
```

---

### Cause 2: Options Not Passed to sendMessage
**Issue:** ChatInput has correct state but doesn't pass to useChat

**Debug:**
```typescript
// In ChatInput.tsx onSend
console.log('[ChatInput] Generation options state:', generationOptions);
console.log('[ChatInput] Passing options to onShouldSend:', options);
```

---

### Cause 3: Backend Doesn't Support Model
**Issue:** Model name is correct but backend rejects it

**Debug:** Check backend logs for:
```
INFO: generate_video parameter: aws_nova_reel
ERROR: Unknown video model: aws_nova_reel
```

---

## 📝 **What to Report**

Please copy and paste the console output showing:

1. **Options state when sending:**
```
[ChatInput] Sending message with options: {...}
[ChatInput] Generation options state: {...}
```

2. **FormData being sent:**
```
[Cloud] ════════════════════════════════════
[Cloud] Generation options: {...}
[Cloud] - generateVideo: ???
[Cloud] ════════════════════════════════════
[Cloud] ✅ Added generate_video: ???
```

3. **Backend response:**
```
[ChatStream] State update: ???
[Cloud] Processing additional_data: ???
```

4. **Any warnings:**
```
[Cloud] ⚠️ INVALID VIDEO MODEL: ???
```

With this information, I can pinpoint the exact issue!

---

## ✅ **Changes Made for Debugging**

### useChat.tsx
- **Lines 745-750:** Enhanced console logging with separators
- **Lines 752-765:** Video parameter validation and warning
- Shows valid model names if invalid value detected

### AttachmentsModal.tsx
- **Lines 127-129:** Use 'enabled' for images (web app compatibility)
- No changes needed for video (already using model names)

### GenerationOptions.tsx
- **Lines 10-16:** Updated interface documentation
- **Lines 84, 250:** Fixed linter errors (primaryDark)

---

## 🚀 **Next Steps**

1. **Select a video model** (e.g., AWS Nova Reel)
2. **Send a message** requesting video
3. **Check console** for the logs above
4. **Copy the output** showing:
   - What generateVideo value is
   - Whether warning appears
   - What backend responds

This will tell us exactly where the problem is!

---

**Status:** 🟡 **Debug Mode Active**  
**Action Required:** Test and share console logs

