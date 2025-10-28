# 🧪 Artifact Streaming - Quick Test Guide

**Quick reference for testing smooth artifact streaming**

---

## 🎯 What to Test

The goal is to verify that **raw artifact tags are never visible** during streaming.

---

## 🔍 Test Scenarios

### Test 1: Basic Code Artifact

**Prompt:** "Write a JavaScript function to calculate fibonacci numbers"

**Expected Behavior:**
1. ✅ No `<jmeArtifact>` tags visible at any point
2. ✅ Artifact indicator appears immediately when tag is detected
3. ✅ Shows "Generating..." status with progress bar
4. ✅ Content preview updates as code streams in
5. ✅ Progress bar animates from 0% to ~95%
6. ✅ Status changes to "Tap to view" when complete

**What to Watch For:**
- ❌ Raw tag flash: `<jmeArtifact type="code" title="...">` should NEVER appear
- ❌ Partial content in message: Code should be in indicator, not message text
- ❌ Tag leakage: No `</jmeArtifact>` visible in message

---

### Test 2: Multiple Artifacts

**Prompt:** "Create a calculator in Python and then show the tests for it"

**Expected Behavior:**
1. ✅ First artifact indicator appears
2. ✅ Text between artifacts still displays
3. ✅ Second artifact indicator appears
4. ✅ Both stream independently with progress bars
5. ✅ No raw tags visible for either artifact

**Example Layout:**
```
Bot Message:
├─ Text: "Here's the calculator:"
├─ Artifact Indicator: Calculator (streaming...)
├─ Text: "And here are the tests:"
└─ Artifact Indicator: Tests (streaming...)
```

---

### Test 3: Mixed Content

**Prompt:** "Explain functions and show an example"

**Expected Behavior:**
1. ✅ Explanation text appears first
2. ✅ Artifact indicator appears inline
3. ✅ Any text after artifact also displays
4. ✅ No tags visible in the text portions

**Example:**
```
"Functions are reusable blocks of code..."

[Artifact Indicator: Example Function]

"This demonstrates the key concepts..."
```

---

### Test 4: Mermaid Diagram

**Prompt:** "Create a flowchart showing the login process"

**Expected Behavior:**
1. ✅ Mermaid artifact indicator appears
2. ✅ Progress bar shows diagram generation
3. ✅ Preview shows mermaid syntax (not raw tags)
4. ✅ Can tap to view full diagram

---

## 📱 Visual Indicators of Success

### During Streaming:
```
┌────────────────────────────────────────────────┐
│  [📄]  Function Example           [⚡] 68%     │
│                                                │
│  function fibonacci(n) {                       │
│    if (n <= 1) return n;...                    │
│                                                │
│  [████████████░░░░░░░░]                        │
│  [CODE] [javascript] Generating...         [→] │
└────────────────────────────────────────────────┘
```

### After Complete:
```
┌────────────────────────────────────────────────┐
│  [📄]  Function Example                        │
│                                                │
│  function fibonacci(n) {                       │
│    if (n <= 1) return n;...                    │
│                                                │
│  [CODE] [javascript] [●] Tap to view       [→] │
└────────────────────────────────────────────────┘
```

---

## 🔍 Debugging Tips

### If you see raw tags:

1. **Check isSending flag:**
```typescript
console.log('[ChatMessage] isSending:', isSending);
```

2. **Check content parsing:**
```typescript
console.log('[ChatMessage] Content segments:', contentSegments.length);
console.log('[ChatMessage] Has artifact tags:', hasArtifactTags(content));
```

3. **Check artifact extraction:**
```typescript
console.log('[ContentParser] Found streaming artifact:', artifact.title);
console.log('[ContentParser] isStreaming:', artifact.isStreaming);
```

### Expected Console Output During Streaming:

```
[ChatStream] 💬 Received content chunk: "<jmeArtifact type=\"code\" title=\"Calculator\">" (45 chars)
[ContentParser] Parsing content (length: 45, streaming: true)
[ContentParser] ⚡ Found streaming artifact at index 0: Calculator
[ChatMessage] ✅ Parsed content into 1 segments (1 artifacts, 0 documents, streaming: true)
[ChatMessage] 🔧 Stripped streaming artifact tags from text segment
```

---

## ⚠️ Common Issues

### Issue 1: Tags briefly visible

**Cause:** Content not being stripped during streaming

**Fix:** Verify `stripStreamingArtifactTags()` is called in `renderContentSegments()`

```typescript
if (isSending && hasArtifactTags(textContent)) {
  textContent = stripStreamingArtifactTags(textContent);
}
```

---

### Issue 2: No artifact indicator appears

**Cause:** `isStreaming` flag not passed to parser

**Fix:** Verify in `ChatMessage.tsx`:
```typescript
const segments = parseContentSegments(
  reasoningData.contentWithoutReasoning, 
  'message-' + (timestamp || Date.now()),
  isSending // ← Must be passed!
);
```

---

### Issue 3: Multiple artifacts overlap

**Cause:** Segments not properly ordered

**Fix:** Check `ContentParser.parseContentSegments()` sorts matches by position:
```typescript
tagMatches.sort((a, b) => a.startIndex - b.startIndex);
```

---

## 📊 Performance Check

During streaming, you should see:

```
[ChatStream] 📦 Chunk 1 received (128 chars)
[ChatStream] 🔍 Parsed 1 results from chunk 1
[useChat] Throttled artifact extraction (200ms interval)
[ContentParser] Parsing content (length: 128, streaming: true)
[ChatMessage] Re-render with updated content
```

**Key Points:**
- ✅ Artifact extraction throttled to 200ms intervals
- ✅ Content parsing uses memoization
- ✅ No excessive re-renders
- ✅ Smooth 60fps animation

---

## 🎯 Success Criteria

**All tests pass if:**

✅ No raw `<jmeArtifact>` tags visible at any point  
✅ Artifact indicators appear immediately  
✅ Progress bars animate smoothly  
✅ Content previews update in real-time  
✅ Status changes from "Generating..." to "Tap to view"  
✅ Tapping opens artifact modal with full content  
✅ No performance issues or stuttering  
✅ Mixed content (text + artifacts) renders correctly  

---

## 🚀 Quick Test Commands

Run these in the app to trigger artifact generation:

```typescript
// Code artifact
"Write a function to reverse a string"

// Mermaid diagram
"Create a flowchart for user registration"

// Multiple artifacts
"Create a class and its unit tests"

// Mixed content
"Explain recursion with an example"
```

---

## 📞 Need Help?

Check the logs for these key indicators:

- `[ContentParser]` - Artifact parsing and stripping
- `[ChatMessage]` - Content rendering and segments
- `[ChatStream]` - Stream chunks and parsing
- `[useChat]` - Artifact extraction and throttling

---

**Happy Testing! 🎉**

Remember: If you see raw tags, something is wrong. They should NEVER be visible to users.

