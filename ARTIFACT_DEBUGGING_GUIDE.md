# 🐛 Artifact Detection - Debugging Guide

## ✅ Debug Improvements Added

**Date:** October 19, 2025  
**Status:** ✅ **Enhanced with Debug Logging**  
**Changes:** Comprehensive console logging added  

---

## 🔍 What Was Fixed

### **Issue: Artifacts Not Being Detected**

**Root Cause:**
- Message ID mismatch between finalized artifacts and message artifacts
- Complexity in ID tracking across context and components

**Solution:**
- ✅ Simplified to extract artifacts directly from message content
- ✅ Added comprehensive debug logging
- ✅ Removed dependency on context-based artifact lookup
- ✅ Each message now self-contained with its artifacts

### Files Modified (3 files)

1. ✅ **`utils/ArtifactParser.ts`**
   - Added detailed console logging
   - Shows content preview
   - Shows extraction steps
   - Shows final artifact count

2. ✅ **`components/ChatMessage.tsx`**
   - Simplified artifact extraction (always from content)
   - Added debug logging
   - Shows what artifacts were found
   - Removed unused providedArtifacts dependency

3. ✅ **`components/ChatPage.tsx`**
   - Updated handleArtifactPress to accept artifact array
   - Simplified artifact passing
   - Added debug logging

---

## 🧪 Testing with Debug Logs

### Step 1: Open the App

Run the app and open the debug console:

```bash
# Terminal 1: Start Metro
npm start

# Terminal 2: Run app
npm run ios  # or android

# Watch console logs in Metro terminal
```

### Step 2: Test Artifact Generation

Send this message:
> "Write a Python function to reverse a string"

### Step 3: Check Console Logs

You should see this sequence of logs:

```
[ArtifactParser] Searching for artifacts in content (length: XXX)
[ArtifactParser] Content preview: Here's a function...
[ArtifactParser] Found artifact tag with attributes: type="code" title="Reverse String" language="python"
[ArtifactParser] Parsed - type: code title: Reverse String language: python
[ArtifactParser] ✅ Created artifact: message-1234567890-artifact-0 Reverse String
[ArtifactParser] Total artifacts extracted: 1
[ChatMessage] ✅ Extracted artifacts from content: 1
[ChatMessage] Artifacts: [ { id: "...", title: "Reverse String", type: "code" } ]
```

---

## 🔍 Debug Scenarios

### Scenario 1: No Artifacts Found ❌

**Console shows:**
```
[ArtifactParser] Searching for artifacts in content (length: 150)
[ArtifactParser] Content preview: Here's how to do it...
[ArtifactParser] Total artifacts extracted: 0
[ChatMessage] No artifacts found in content
```

**Possible Causes:**
1. **Backend not sending artifacts** - Check backend response
2. **Artifacts toggle is OFF** - Check AttachmentsModal setting
3. **Backend doesn't support artifacts** - Verify backend version
4. **Wrong artifact tag format** - Should be `<jmeArtifact>` not `<artifact>`

**How to Check:**
```typescript
// Add temporary log in useChat.tsx after stream updates
useEffect(() => {
  console.log('[DEBUG] Stream content:', stream);
}, [stream]);
```

---

### Scenario 2: Tags Found But Not Parsed ⚠️

**Console shows:**
```
[ArtifactParser] Found artifact tag with attributes: type="code"
[ArtifactParser] Parsed - type: code title: undefined language: python
[ArtifactParser] ⚠️ Skipping artifact - missing type or title
```

**Cause:** Missing `title` attribute in artifact tag

**Solution:** Backend must include both `type` and `title`:
```xml
<!-- ❌ Wrong (no title) -->
<jmeArtifact type="code" language="python">

<!-- ✅ Correct -->
<jmeArtifact type="code" title="Function Name" language="python">
```

---

### Scenario 3: Content Not Showing ❌

**Console shows:**
```
[ChatMessage] ✅ Extracted artifacts from content: 1
[ChatMessage] Artifacts: [ { id: "...", title: "Code", type: "code" } ]
```

**But indicator doesn't appear**

**Possible Causes:**
1. **Style issue** - Check `artifactsContainer` style
2. **Component not imported** - Verify ArtifactIndicator import
3. **Rendering condition** - Check if block is reached

**How to Check:**
```typescript
// In ChatMessage.tsx, add log before render
console.log('[ChatMessage] Rendering', messageArtifacts.length, 'artifacts');
```

---

### Scenario 4: Modal Not Opening 🚫

**Console shows:**
```
[ChatMessage] ✅ Extracted artifacts from content: 1
[ChatPage] Artifact pressed: Code Function
[ChatPage] Opening modal with 1 artifacts, index: 0
```

**But modal doesn't open**

**Possible Causes:**
1. **Modal state not updating** - Check artifactModalVisible
2. **Component not imported** - Verify ArtifactViewerModal import
3. **Modal blocked** - Check other modals aren't blocking

**How to Check:**
```typescript
// In ChatPage.tsx
console.log('[DEBUG] Modal visible:', artifactModalVisible);
console.log('[DEBUG] Selected artifacts:', selectedArtifacts);
```

---

## 🔧 Manual Verification Steps

### Step 1: Verify Backend Response

**Add temporary logging in useChat.tsx:**

```typescript
// After stream processing completes
useEffect(() => {
  if (stream && !isSending) {
    console.log('[DEBUG] Final stream content:', stream);
    console.log('[DEBUG] Contains jmeArtifact?', stream.includes('<jmeArtifact'));
  }
}, [stream, isSending]);
```

### Step 2: Check Artifact Toggle

1. Tap "+" button
2. Look for Artifacts toggle (purple cube)
3. Verify it's **ON** (enabled)
4. If OFF, turn it ON
5. Try sending message again

### Step 3: Test with Simple Example

Use this exact prompt:
> "Show me this code: <jmeArtifact type='code' title='Test'>hello world</jmeArtifact>"

This tests if parsing works at all.

### Step 4: Check Component Rendering

Add this log in ChatMessage render section:

```typescript
// Before return statement
console.log('[ChatMessage] Will render:', {
  hasArtifacts: messageArtifacts.length > 0,
  artifactCount: messageArtifacts.length,
  displayContent: displayContent?.substring(0, 50)
});
```

---

## 📊 Expected vs Actual Flow

### Expected Flow ✅

```
1. Backend sends: <jmeArtifact type="code" title="Sort">...code...</jmeArtifact>
2. useChat receives in stream
3. ChatMessage receives in content prop
4. extractArtifactsFromMessage() finds tag
5. Returns array with 1 artifact
6. ArtifactIndicator renders
7. User taps → Modal opens
```

### If Not Working ❌

**Check each step:**

```
Step 1: Backend sending artifacts?
  → Check: stream content in useChat
  → Fix: Ensure need_artifact='true' is sent

Step 2: Stream received in ChatMessage?
  → Check: content prop in ChatMessage
  → Fix: Verify message is passed correctly

Step 3: Parser finding tags?
  → Check: Console logs from extractArtifactsFromMessage
  → Fix: Verify tag format matches regex

Step 4: Artifacts array populated?
  → Check: messageArtifacts.length
  → Fix: Check memoization dependencies

Step 5: Indicator rendering?
  → Check: View in React DevTools
  → Fix: Check styles, imports

Step 6: Modal opening?
  → Check: artifactModalVisible state
  → Fix: Verify onPress handler
```

---

## 🛠️ Quick Debug Checklist

Run through this checklist in order:

### Backend Check
- [ ] Open Metro console
- [ ] Send test message: "Write a Python function"
- [ ] Check console for stream content
- [ ] Verify stream contains `<jmeArtifact` tags

### Parser Check
- [ ] Look for `[ArtifactParser]` logs
- [ ] Should show "Searching for artifacts"
- [ ] Should show "Found artifact tag"
- [ ] Should show "Created artifact"
- [ ] Should show "Total artifacts extracted: 1"

### Component Check
- [ ] Look for `[ChatMessage]` logs
- [ ] Should show "Extracted artifacts from content: 1"
- [ ] Should show artifact details (id, title, type)

### UI Check
- [ ] Scroll through chat messages
- [ ] Look for artifact indicator below bot message
- [ ] Should see gradient card with icon
- [ ] Should show artifact title

### Interaction Check
- [ ] Tap artifact indicator
- [ ] Look for `[ChatPage]` logs
- [ ] Should show "Artifact pressed"
- [ ] Should show "Opening modal"
- [ ] Modal should appear

---

## 🔍 Common Issues & Solutions

### Issue 1: "Total artifacts extracted: 0"

**Meaning:** Parser isn't finding any `<jmeArtifact>` tags

**Solutions:**

**A. Backend not sending artifacts**
```typescript
// Check in useChat.tsx
console.log('[DEBUG] Options sent:', options);
// Should show: { enableArtifacts: true }

console.log('[DEBUG] Stream content:', stream);
// Should contain: <jmeArtifact type="..." title="...">
```

**Fix:** Ensure artifacts toggle is ON and backend supports it

**B. Wrong tag format**
```xml
<!-- ❌ Wrong formats -->
<artifact type="code">
<Artifact type="code">
<jmeartifact type="code">

<!-- ✅ Correct format -->
<jmeArtifact type="code" title="Function Name" language="python">
code here
</jmeArtifact>
```

**Fix:** Update backend to use correct tag format

---

### Issue 2: "Extracted artifacts but indicator not showing"

**Meaning:** Parser worked, but UI isn't rendering

**Check:**
```typescript
// In ChatMessage.tsx, add log
console.log('[DEBUG] Rendering artifacts container?', messageArtifacts.length > 0);
console.log('[DEBUG] Role is Bot?', role === Role.Bot);
```

**Solutions:**

**A. Import missing**
```typescript
// Verify in ChatMessage.tsx
import ArtifactIndicator from './artifacts/ArtifactIndicator';
```

**B. Style issue**
```typescript
// Check style exists
artifactsContainer: {
  marginTop: 12,
  gap: 8,
},
```

**C. Conditional rendering**
```typescript
// Make sure this block exists
{messageArtifacts.length > 0 && (
  <View style={styles.artifactsContainer}>
    ...
  </View>
)}
```

---

### Issue 3: "Indicator shows but modal doesn't open"

**Meaning:** UI rendering but tap handler broken

**Check:**
```typescript
// In ChatPage.tsx
console.log('[DEBUG] handleArtifactPress called?');
console.log('[DEBUG] Modal state:', artifactModalVisible);
```

**Solutions:**

**A. Handler not passed**
```typescript
// In ChatPage.tsx, verify
<ChatMessage
  {...item}
  onArtifactPress={handleArtifactPress} // ← Must be present
/>
```

**B. Modal not imported**
```typescript
// Verify in ChatPage.tsx
import ArtifactViewerModal from '@/components/artifacts/ArtifactViewerModal';
```

**C. Modal not rendered**
```typescript
// At end of ChatPage component
<ArtifactViewerModal
  visible={artifactModalVisible}
  artifacts={selectedArtifacts}
  initialIndex={selectedArtifactIndex}
  onClose={handleCloseArtifactModal}
/>
```

---

## 📋 Debug Commands Reference

### Add These Temporarily for Testing

**In `utils/ArtifactParser.ts`** (already added ✅)
- Shows what content is being parsed
- Shows artifacts found
- Shows final count

**In `components/ChatMessage.tsx`** (already added ✅)
- Shows artifact extraction results
- Shows artifact details

**In `components/ChatPage.tsx`** (already added ✅)
- Shows when artifact is tapped
- Shows modal opening

**In `hooks/useChat.tsx`** (add if needed)
```typescript
// After stream updates
useEffect(() => {
  if (stream) {
    console.log('[useChat] Stream length:', stream.length);
    console.log('[useChat] Has artifact tags?', stream.includes('<jmeArtifact'));
  }
}, [stream]);
```

---

## 🧪 Test Artifact Tag Manually

### Quick Test (Copy-Paste This)

Send this exact message to your AI:

```
Please respond with this exact text:

Here's a test function:

<jmeArtifact type="code" title="Test Function" language="javascript">
function test() {
  return "Hello World";
}
</jmeArtifact>

That's the test!
```

**Expected Console Output:**
```
[ArtifactParser] Searching for artifacts in content (length: ~200)
[ArtifactParser] Content preview: Here's a test function...
[ArtifactParser] Found artifact tag with attributes: type="code" title="Test Function" language="javascript"
[ArtifactParser] Parsed - type: code title: Test Function language: javascript
[ArtifactParser] ✅ Created artifact: message-...-artifact-0 Test Function
[ArtifactParser] Total artifacts extracted: 1
[ChatMessage] ✅ Extracted artifacts from content: 1
[ChatMessage] Artifacts: [ { id: "...", title: "Test Function", type: "code" } ]
```

**Expected UI:**
- ✅ Indicator appears below message
- ✅ Shows code icon
- ✅ Shows "Test Function" title
- ✅ Can tap to open modal

---

## 📊 Console Log Reference

### Success Pattern ✅

```
[ArtifactParser] Searching for artifacts...     ← Parsing started
[ArtifactParser] Found artifact tag...          ← Tag detected
[ArtifactParser] Parsed - type: code...         ← Attributes extracted
[ArtifactParser] ✅ Created artifact...         ← Artifact created
[ArtifactParser] Total artifacts extracted: 1   ← Success!
[ChatMessage] ✅ Extracted artifacts...         ← Component received
```

### Failure Pattern ❌

```
[ArtifactParser] Searching for artifacts...     ← Parsing started
[ArtifactParser] Content preview: ...           ← Shows content
[ArtifactParser] Total artifacts extracted: 0   ← Nothing found!
[ChatMessage] No artifacts found in content     ← Component got nothing
```

**If you see the failure pattern:**
1. Check the content preview - does it contain `<jmeArtifact`?
2. If NO → Backend not sending artifacts
3. If YES → Tag format is wrong

---

## 🎯 Verification Steps

### 1. Verify Artifacts Toggle is ON

```typescript
// In ChatInput.tsx (already set)
enableArtifacts: true  // ← Default
```

**Check:**
- Tap "+" button in chat
- See Artifacts toggle (purple cube)
- Verify switch is ON (purple)

### 2. Verify Backend Integration

**The request should include:**
```
need_artifact: 'true'
```

**Check in useChat.tsx:**
```typescript
// Around line 720
if (options?.enableArtifacts !== undefined) {
  formData.append('need_artifact', options.enableArtifacts ? 'true' : 'false');
}
```

### 3. Verify Tag Format

**Backend must send:**
```xml
<jmeArtifact type="code" title="Function Name" language="python">
def example():
    pass
</jmeArtifact>
```

**Required attributes:**
- `type` - Artifact type (code, mermaid, markdown, etc.)
- `title` - Artifact title (shown in UI)

**Optional attributes:**
- `language` - Programming language (for syntax highlighting)

### 4. Verify Component Chain

**Check all components are connected:**

```
useChat.tsx
  ↓ (stream with artifact tags)
ChatMessage.tsx
  ↓ (extracts artifacts from content)
ArtifactIndicator.tsx
  ↓ (displays indicator)
ChatPage.tsx
  ↓ (handles tap)
ArtifactViewerModal.tsx
  ↓ (shows artifact)
```

---

## 🐛 Specific Debugging Commands

### Check Stream Content

Add to `hooks/useChat.tsx` (temporarily):

```typescript
// In the sendMessage function, after processStream
console.log('=== STREAM DEBUG ===');
console.log('Stream length:', stream.length);
console.log('Stream content:', stream);
console.log('Contains artifact?', stream.includes('<jmeArtifact'));
console.log('==================');
```

### Check Message Content

Add to `components/ChatMessage.tsx` (temporarily):

```typescript
// In component body, before extracting artifacts
useEffect(() => {
  if (role === Role.Bot && content) {
    console.log('=== MESSAGE DEBUG ===');
    console.log('Content length:', content.length);
    console.log('Content:', content);
    console.log('====================');
  }
}, [content, role]);
```

### Check Artifact Rendering

Add to `components/ChatMessage.tsx` (temporarily):

```typescript
// Before return statement
console.log('=== RENDER DEBUG ===');
console.log('Will render artifacts?', messageArtifacts.length > 0);
console.log('Artifacts to render:', messageArtifacts);
console.log('===================');
```

---

## 🔍 Advanced Debugging

### Use React DevTools

1. Install React DevTools in browser
2. Connect to Metro
3. Inspect ChatMessage component
4. Check props: `content`, `messageArtifacts`
5. Verify state updates

### Check Network Requests

1. Open Network tab in browser/Reactotron
2. Look for `/chat` POST request
3. Check request body includes `need_artifact=true`
4. Check response includes `<jmeArtifact>` tags

### Test Regex Directly

Open Node.js or browser console:

```javascript
const content = `Text <jmeArtifact type="code" title="Test">code</jmeArtifact> more text`;
const regex = /<jmeArtifact\s+([^>]+)>([\s\S]*?)<\/jmeArtifact>/g;
const match = regex.exec(content);
console.log('Match:', match);
// Should show: ["<jmeArtifact...>", "type="code" title="Test"", "code"]
```

---

## ✅ Resolution Checklist

When artifacts are working, you should see:

- [x] Console shows "[ArtifactParser] Total artifacts extracted: X" (X > 0)
- [x] Console shows "[ChatMessage] ✅ Extracted artifacts from content: X"
- [x] Artifact indicator appears in chat UI
- [x] Indicator shows correct icon and title
- [x] Tapping indicator shows "[ChatPage] Artifact pressed"
- [x] Modal opens with artifact content
- [x] Can copy and share artifact
- [x] Can navigate if multiple artifacts

---

## 🚀 Next Steps After Fixing

Once artifacts are detected:

1. **Remove debug logs** (or reduce verbosity)
2. **Test all artifact types** (code, markdown, mermaid)
3. **Test multiple artifacts** in one message
4. **Test streaming artifacts** (real-time updates)
5. **Test toggle ON/OFF** behavior
6. **Test theme switching** (light/dark)

---

## 📞 Support

### Still Not Working?

**Gather this information:**

1. **Console logs** - Copy all `[ArtifactParser]` and `[ChatMessage]` logs
2. **Backend response** - Copy the actual response text
3. **Artifacts toggle** - Screenshot of the toggle state
4. **App version** - Check package.json version
5. **Dependencies** - Run `npm list react-native-webview`

### Common Final Checks

```bash
# Clear cache
npm start -- --reset-cache

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild app
npm run ios  # or android

# Check for TypeScript errors
npm run type-check
```

---

## 🎯 Quick Fix Summary

### What We Fixed

1. ✅ **Simplified artifact extraction** - Extract directly from content
2. ✅ **Added comprehensive logging** - Easy to debug
3. ✅ **Removed ID dependency** - No more ID mismatches
4. ✅ **Updated type signatures** - Support artifact array passing

### Files Modified

- ✅ `utils/ArtifactParser.ts` - Added debug logs
- ✅ `components/ChatMessage.tsx` - Simplified extraction
- ✅ `components/ChatPage.tsx` - Updated handler

---

## 🎉 Summary

**Debugging tools added:**
- ✅ Comprehensive console logging
- ✅ Content preview in logs
- ✅ Step-by-step parsing feedback
- ✅ Success/failure indicators

**Next steps:**
1. Run the app
2. Send a message requesting code
3. Watch the console logs
4. Follow the debug flow above
5. Identify where it's failing
6. Apply the appropriate fix

**Most likely issue:** Backend not sending `<jmeArtifact>` tags
**Most likely fix:** Ensure artifacts toggle is ON and backend is configured

---

**🔍 Debug away! The logs will tell you exactly what's happening.**

*Enhanced with comprehensive logging • Easy to debug • Clear error messages*

