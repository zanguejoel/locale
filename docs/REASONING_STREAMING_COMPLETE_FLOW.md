# Reasoning Streaming - Complete Flow

**Date:** October 21, 2025  
**Status:** ✅ Fully Implemented

## Complete Streaming Flow

### Phase 1: Message Sent
```
User types message → Send button pressed
                    ↓
sendMessage() called
                    ↓
Reset states: stream='', reasoningText='', intermediate=''
                    ↓
Create user message + empty bot message
                    ↓
POST to /yia-stream with FormData (includes model ID)
```

### Phase 2: Streaming Begins
```
Backend starts streaming
                    ↓
Stream chunks arrive: "Let me think <jmeReasoning>First, I'll..."
                    ↓
ChatStream detects <jmeReasoning> tag
                    ↓
[ChatStream] 🧠 Entering reasoning mode
                    ↓
Content split:
  - "Let me think " → setStream()
  - "First, I'll..." → setReasoningText()
```

### Phase 3: Reasoning Streams
```
More chunks: "analyze the problem..."
                    ↓
[ChatStream] 🧠 Reasoning chunk: analyze the problem... | Total length: 50
                    ↓
setReasoningText(prev => prev + "analyze the problem...")
                    ↓
reasoningText state updates
                    ↓
[ChatPage] 🧠 reasoningText updated: { length: 50, preview: "..." }
                    ↓
Re-render triggered
                    ↓
Last message receives streamingReasoning="First, I'll analyze the problem..."
                    ↓
ChatMessage renders ReasoningBlock with:
  - content: "First, I'll analyze the problem..."
  - isStreaming: true
                    ↓
ReasoningBlock displays:
  - Title: "Thinking..."
  - isExpanded: true (auto-expanded)
  - Content: Markdown-rendered reasoning (updating in real-time)
  - Icon: Analytics (blue)
```

### Phase 4: Reasoning Completes
```
Final chunk: "...conclusion</jmeReasoning> So the answer is 42"
                    ↓
ChatStream detects </jmeReasoning> closing tag
                    ↓
Content split:
  - "...conclusion" → setReasoningText()
  - " So the answer is 42" → setStream()
                    ↓
[ChatStream] 🧠 Reasoning complete (closing tag): First, I'll analyze...conclusion
[ChatStream] 🧠 Exiting reasoning mode
                    ↓
reasoning mode = false
```

### Phase 5: Streaming Completes
```
Backend sends final event: { type: 'final', data: {...} }
                    ↓
ChatStream receives final
                    ↓
[ChatStream] ✅ Received final response
                    ↓
Returns to sendMessage()
                    ↓
finally block executes
```

### Phase 6: Finalization
```
finally block:
                    ↓
Get final values from refs:
  - finalStreamContent = streamRef.current = "Let me think  So the answer is 42"
  - finalReasoningContent = reasoningTextRef.current = "First, I'll analyze...conclusion"
                    ↓
Combine reasoning back into content:
  finalContent = "Let me think  So the answer is 42\n\n<jmeReasoning>First, I'll analyze...conclusion</jmeReasoning>"
                    ↓
[Chat] 🧠 Combining reasoning into final message content
[Chat] 🧠 Stream length: 45, Reasoning length: 75
                    ↓
Update last message:
  message.content = finalContent
                    ↓
Clear reasoningText state: setReasoningText('')
                    ↓
Component re-renders
```

### Phase 7: Re-render After Streaming
```
ChatMessage receives updated message:
  - content: "Let me think...<jmeReasoning>...</jmeReasoning>...42"
  - streamingReasoning: undefined (cleared)
                    ↓
extractReasoningFromStream(content) detects tags
                    ↓
reasoningData = {
  reasoning: { content: "First, I'll analyze...conclusion", isComplete: true },
  contentWithoutReasoning: "Let me think  So the answer is 42"
}
                    ↓
[ChatMessage] 🧠 Extracted reasoning from content: { isComplete: true, source: "historical/completed" }
                    ↓
ReasoningBlock renders with:
  - content: "First, I'll analyze...conclusion"
  - isStreaming: false
                    ↓
Title calculates duration:
  - wordCount = 75 words / 20 = 3.75 → 4 seconds
  - Title: "Thought for 4 seconds"
                    ↓
ReasoningBlock displays:
  - Title: "Thought for 4 seconds" ✅ (UPDATED from "Thinking...")
  - isExpanded: true (remains expanded)
  - Content: Markdown-rendered reasoning
  - Icon: Analytics (blue)
```

## Key Implementation Details

### Auto-Expand During Streaming
```typescript
// In ReasoningBlock.tsx
const [isExpanded, setIsExpanded] = useState(isStreaming); // Auto-expand if streaming

useEffect(() => {
  if (isStreaming && !isExpanded) {
    setIsExpanded(true);
    rotateValue.value = withTiming(180, { duration: 200 });
  }
}, [isStreaming]);
```

### Title Updates Automatically
```typescript
// Title changes based on isStreaming prop
{isStreaming ? 'Thinking...' : `Thought for ${thinkingSeconds} second${thinkingSeconds !== 1 ? 's' : ''}`}
```

When `isStreaming` changes from `true` → `false`, the title automatically updates!

### Content Combination After Streaming
```typescript
// In useChat.tsx - finally block
const finalStreamContent = streamRef.current;
const finalReasoningContent = reasoningTextRef.current;

if (finalReasoningContent && finalReasoningContent.trim()) {
  const finalContent = finalStreamContent + '\n\n' + 
    `<jmeReasoning>${finalReasoningContent}</jmeReasoning>`;
  
  setMessages(prev => updateLastItem(prev, message => ({
    ...message,
    content: finalContent,
  })));
  
  setReasoningText(''); // Clear state
}
```

## Visual Timeline

```
Time 0s: Message sent
         └─ Blue block: [Hidden]

Time 1s: Reasoning starts
         └─ Blue block: "Thinking..." [Expanded, Empty]

Time 2s: Reasoning streaming
         └─ Blue block: "Thinking..." [Expanded, "First, I'll analyze..."]

Time 3s: Reasoning streaming
         └─ Blue block: "Thinking..." [Expanded, "First, I'll analyze the problem..."]

Time 4s: Reasoning completes, streaming continues
         └─ Blue block: "Thinking..." [Expanded, "First, I'll analyze the problem and conclude..."]

Time 5s: Streaming completes
         └─ Blue block: "Thought for 4 seconds" [Expanded, Full markdown content]
```

## State Transitions

| State | streamingReasoning | reasoningData | isStreaming | Title | Expanded | Content Source |
|-------|-------------------|---------------|-------------|-------|----------|----------------|
| **No reasoning** | undefined | null | false | N/A | N/A | N/A |
| **Streaming starts** | "" | null | true | "Thinking..." | true | streamingReasoning |
| **Streaming active** | "First..." | null | true | "Thinking..." | true | streamingReasoning |
| **Stream completes** | "First...conclusion" | null | true | "Thinking..." | true | streamingReasoning |
| **Finalized** | undefined | extracted | false | "Thought for 4s" | true | reasoningData |
| **User collapses** | undefined | extracted | false | "Thought for 4s" | false | reasoningData |

## Why This Works

1. **Auto-expand:** `useState(isStreaming)` initializes as expanded when streaming
2. **Real-time updates:** `streamingReasoning` prop updates trigger re-renders
3. **Smooth transition:** When streaming ends:
   - Reasoning added to message content
   - `streamingReasoning` cleared
   - Component extracts from content
   - `isStreaming` becomes false
   - Title updates automatically
4. **Persistence:** Reasoning remains in message content for historical display

## Console Log Sequence

```
[ChatStream] 🧠 Entering reasoning mode
[ChatStream] 🧠 Reasoning chunk: First... | Total length: 10
[ChatPage] 🧠 reasoningText updated: { length: 10, preview: "First..." }
[ChatPage] 🧠 Passing reasoning to last message: { reasoningLength: 10, ... }
[ChatMessage] 🧠 Rendering reasoning block: { hasStreamingReasoning: true, ... }

... more chunks ...

[ChatStream] 🧠 Reasoning complete: First, I'll analyze...conclusion
[ChatStream] 🧠 Exiting reasoning mode
[ChatStream] ✅ Received final response
[Chat] 🧠 Combining reasoning into final message content
[Chat] 🧠 Stream length: 45, Reasoning length: 75
[Chat] 🧠 Final content preview: Let me think  So the answer is 42\n\n<jmeReasoning>First, I'll analyze...
[ChatMessage] 🧠 Extracted reasoning from content: { isComplete: true, source: "historical/completed" }
[ChatMessage] 🧠 Rendering reasoning block: { hasStreamingReasoning: false, hasHistoricalReasoning: true, ... }
```

## User Experience

### What User Sees:

1. **User sends message**
2. **Reasoning appears:** Blue block with "Thinking..." (expanded)
3. **Text streams in:** "First, I'll analyze..." (visible, updating)
4. **More text:** "...the problem step by step..." (visible, updating)
5. **Reasoning completes:** "...and reach a conclusion." (visible)
6. **Title updates:** "Thinking..." → "Thought for 4 seconds" ✨
7. **Block stays expanded** (user can collapse if desired)
8. **Main answer appears:** "So the answer is 42"

### Perfect Flow:
- ✅ Reasoning visible during streaming
- ✅ Real-time text updates
- ✅ Title updates after completion
- ✅ No flicker or jump
- ✅ Smooth transition

---

**Status:** Complete with refs and finalization logic  
**Ready for:** User testing  
**Expected:** Smooth streaming with auto-updating title

