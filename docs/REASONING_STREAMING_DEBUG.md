# Reasoning Streaming Debug Guide

**Date:** October 21, 2025  
**Issue:** Reasoning block not showing during streaming  
**Status:** Debug logging added

## Debugging Steps

### What to Look For in Console Logs

When you send a message that should include reasoning, you should see these logs in sequence:

#### 1. ChatStream - Tag Detection
```
[ChatStream] 💬 Received content chunk: "Let me think about this <jmeReasoning>" (35 chars)
[ChatStream] 🧠 Entering reasoning mode
[ChatStream] 🧠 Content before reasoning: Let me think about this 
```

#### 2. ChatStream - Reasoning Content
```
[ChatStream] 🧠 Reasoning chunk: First, I'll analyze... | Total length: 25
[ChatStream] 🧠 Reasoning chunk: Then, I'll evaluate... | Total length: 50
[ChatStream] 🧠 Reasoning chunk: Finally, I'll conclude... | Total length: 75
```

#### 3. ChatStream - Closing Tag
```
[ChatStream] 💬 Received content chunk: "</jmeReasoning> Here's the answer" (35 chars)
[ChatStream] 🧠 Reasoning complete (closing tag): First, I'll analyze...Then, I'll evaluate...Finally, I'll conclude...
[ChatStream] 🧠 Exiting reasoning mode (closing tag)
```

#### 4. ChatPage - State Update
```
[ChatPage] 🧠 reasoningText updated: {
  length: 75,
  preview: "First, I'll analyze...Then, I'll evaluate...Finally, I'll conclude..."
}
```

#### 5. ChatPage - Passing to Message
```
[ChatPage] 🧠 Passing reasoning to last message: {
  messageIndex: 5,
  isLastMessage: true,
  reasoningLength: 75,
  reasoningPreview: "First, I'll analyze...Then, I'll evaluate...Finally, I'll..."
}
```

#### 6. ChatMessage - Rendering
```
[ChatMessage] 🧠 Rendering reasoning block: {
  hasStreamingReasoning: true,
  hasHistoricalReasoning: false,
  streamingReasoningLength: 75,
  historicalReasoningLength: 0
}
```

## Common Issues and Solutions

### Issue 1: No reasoning logs at all
**Symptoms:** 
- No `[ChatStream] 🧠` logs appear
- Reasoning tags not detected

**Possible Causes:**
1. Backend not sending `<jmeReasoning>` tags
2. Tags are in different format (e.g., `<reasoning>` instead of `<jmeReasoning>`)
3. `setReasoningText` callback not passed to `processStream`

**Check:**
```typescript
// In useChat.tsx, line 887
const res = await processStream(
  _response.body,
  setStream,
  handleError,
  setIntermediate,
  setStreamWorking,
  setAdditionalData,
  setReasoningText  // ← Should be here
);
```

**Solution:**
- Verify backend is sending correct tags
- Check raw stream data in network inspector

### Issue 2: Reasoning detected but not shown
**Symptoms:**
- `[ChatStream] 🧠` logs appear
- `[ChatPage] 🧠 reasoningText updated` appears
- But no `[ChatPage] 🧠 Passing reasoning to last message`

**Possible Causes:**
1. `reasoningText` is empty string
2. Message is not the last message
3. Logic error in ChatPage

**Check:**
```typescript
// In ChatPage.tsx, line 638-650
const isLastMessage = index === displayMessages.length - 1;
const reasoning = isLastMessage ? reasoningText : undefined;
console.log('[ChatPage] Message index:', index, 'Total:', displayMessages.length, 'IsLast:', isLastMessage);
```

**Solution:**
- Verify message is actually the last one
- Check if displayMessages array is correct

### Issue 3: Reasoning passed but not rendered
**Symptoms:**
- `[ChatPage] 🧠 Passing reasoning to last message` appears
- But no `[ChatMessage] 🧠 Rendering reasoning block`

**Possible Causes:**
1. `streamingReasoning` prop not received
2. Condition `(reasoningData.reasoning || streamingReasoning)` fails
3. Component render issue

**Check:**
```typescript
// In ChatMessage.tsx, add at top of component
console.log('[ChatMessage] Props received:', {
  hasStreamingReasoning: !!streamingReasoning,
  streamingReasoningLength: streamingReasoning?.length || 0,
  hasContent: !!content,
  role
});
```

**Solution:**
- Verify prop is being passed correctly
- Check component is re-rendering

### Issue 4: Tags split incorrectly
**Symptoms:**
- Reasoning appears in main content
- Or main content appears in reasoning
- Or both are mixed

**Possible Causes:**
1. Tag splitting logic has bug
2. Tags not properly detected across chunks

**Check:**
```
[ChatStream] 🧠 Content before reasoning: [should be clean content]
[ChatStream] 🧠 Reasoning chunk: [should only have reasoning content]
```

**Solution:**
- Review ChatStream.ts tag splitting logic
- Check if tags are being split across multiple stream chunks

## Manual Verification Steps

### Step 1: Enable Logging
All debug logs are already added. Just check your console.

### Step 2: Send Test Message
Send a message that should trigger reasoning. Example prompt:
```
"Explain quantum computing step by step"
```

### Step 3: Check Logs in Sequence
Follow the log sequence above. Note where it stops or what's missing.

### Step 4: Verify State
Add temporary logging:
```typescript
// In ChatPage, after destructuring chat
console.log('[ChatPage] Current state:', {
  messagesCount: messages.length,
  hasStream: !!stream,
  hasIntermediate: !!intermediate,
  hasReasoningText: !!reasoningText,
  reasoningTextLength: reasoningText.length,
  isSending
});
```

### Step 5: Check Component
Add temporary logging in ChatMessage:
```typescript
// At top of ChatMessage component
useEffect(() => {
  console.log('[ChatMessage] Received props:', {
    streamingReasoning: streamingReasoning?.substring(0, 50),
    hasContent: !!content,
    role
  });
}, [streamingReasoning, content, role]);
```

## Expected Behavior

### During Streaming:
1. ✅ Reasoning tags detected: `[ChatStream] 🧠 Entering reasoning mode`
2. ✅ Reasoning accumulated: `[ChatStream] 🧠 Reasoning chunk: ...`
3. ✅ State updated: `[ChatPage] 🧠 reasoningText updated`
4. ✅ Passed to message: `[ChatPage] 🧠 Passing reasoning to last message`
5. ✅ Rendered: `[ChatMessage] 🧠 Rendering reasoning block`
6. ✅ **Blue reasoning block appears with "Thinking..." title**
7. ✅ Regular content appears separately (without reasoning tags)

### After Streaming Completes:
1. ✅ Final response received: `[ChatStream] ✅ Received final response`
2. ✅ Reasoning cleared from state (but persisted in message content)
3. ✅ Message content includes reasoning tags
4. ✅ ChatMessage extracts reasoning from content
5. ✅ **Blue reasoning block appears with "Thought for X seconds" title**
6. ✅ Regular content appears separately (without reasoning tags)

## Quick Test Code

Add this to ChatPage.tsx temporarily to force a test:

```typescript
// Test reasoning display
useEffect(() => {
  if (reasoningText) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🧠 REASONING TEXT DETECTED');
    console.log('Length:', reasoningText.length);
    console.log('Content:', reasoningText);
    console.log('Messages count:', messages.length);
    console.log('Last message:', messages[messages.length - 1]);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}, [reasoningText, messages]);
```

## Checklist for Streaming Reasoning

When testing, verify each of these:

### Backend/Network:
- [ ] Backend sends `<jmeReasoning>` tags (check network tab)
- [ ] Tags are in correct format (opening and closing)
- [ ] Content is being streamed (not all at once)

### ChatStream Processing:
- [ ] `setReasoningText` callback is passed to `processStream()`
- [ ] Reasoning mode is detected (logs show "Entering reasoning mode")
- [ ] Reasoning content is accumulated (logs show chunks)
- [ ] Regular content is separated (logs show it going to setStream)
- [ ] Reasoning mode exits (logs show "Exiting reasoning mode")

### State Management:
- [ ] `reasoningText` state updates (ChatPage logs show updates)
- [ ] `reasoningText` is cleared at start of new message
- [ ] `reasoningText` is cleared when switching conversations

### Component Rendering:
- [ ] Last message receives `streamingReasoning` prop
- [ ] ChatMessage detects reasoning (logs show detection)
- [ ] ReasoningBlock component renders
- [ ] Reasoning block is visible in UI

### Visual Verification:
- [ ] Blue gradient block appears
- [ ] Title shows "Thinking..." while streaming
- [ ] Content updates in real-time
- [ ] Main message content excludes reasoning
- [ ] After completion, title changes to "Thought for X seconds"

## If Reasoning Still Doesn't Show

### Check 1: Verify reasoningText State
Add this to ChatPage right before return statement:
```typescript
console.log('💡 FINAL CHECK:', {
  reasoningText,
  messagesLength: messages.length,
  lastMessageRole: messages[messages.length - 1]?.role
});
```

### Check 2: Force Show Reasoning (Test)
Temporarily modify ChatMessage.tsx:
```typescript
// Replace the condition
{true && (  // Force show
  <ReasoningBlock
    content="TEST REASONING CONTENT"
    isStreaming={true}
  />
)}
```
If this shows, the component works but state isn't reaching it.

### Check 3: Check displayMessages
In ChatPage, log displayMessages:
```typescript
console.log('displayMessages:', displayMessages.map((m, i) => ({
  index: i,
  role: m.role,
  contentPreview: m.content?.substring(0, 30)
})));
```

## Next Steps

1. Run the app with these debug logs
2. Send a message with reasoning
3. Check console logs in sequence
4. Report which step fails or is missing
5. Share the console output

---

**Debug Mode:** Active  
**Logging Level:** Verbose  
**Expected Output:** All 6 log groups above

