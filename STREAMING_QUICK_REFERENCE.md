# Streaming State Management - Quick Reference

## State Variables

### Core Streaming States
```typescript
const [stream, setStream] = useState('')           // Current streaming content
const [intermediate, setIntermediate] = useState('') // Backend state messages
const [isSending, setIsSending] = useState(false)   // Message is being sent
const [streamWorking, setStreamWorking] = useState(false) // Stream actively processing
const [additionalData, setAdditionalData] = useState([]) // Generated images/videos
```

### Computed State
```typescript
// Memoized - true while any streaming activity is happening
const effectiveIsSending = useMemo(() => 
  isSending || !!intermediate || (!!stream && stream.length > 0),
  [isSending, intermediate, stream]
);

// Note: effectiveIsSending is exposed as "isSending" in ChatContext
// This means components using isSending from context get the effective value
```

### Input Disabling
```typescript
// ChatInput receives isLoading prop (which is effectiveIsSending from context)
<ChatInput isLoading={isSending} />  // isSending here is effectiveIsSending

// Inside ChatInput.tsx
<TextInput
  editable={!isLoading}  // Disabled while streaming
/>

<TouchableOpacity 
  disabled={isLoading}  // Attachment button disabled while streaming
/>
```

---

## Key Functions

### `abortCurrentStream()`
Safely aborts the current stream with synchronization.

```typescript
// Usage
await abortCurrentStream(); // Wait for abort to complete

// When to use:
// - Switching conversations
// - Sending new message
// - Resetting chat
// - Cleaning up
```

### `resetChat()`
**⚠️ Now async** - Clears all chat and streaming states.

```typescript
// Correct usage
await resetChat();

// What it does:
// 1. Aborts current stream
// 2. Clears messages
// 3. Resets all streaming states
// 4. Clears conversation ID
```

### `fetchMessages(conversationId)`
Loads messages for a conversation, aborting any ongoing stream.

```typescript
// Automatically:
// 1. Aborts previous fetch
// 2. Aborts ongoing stream
// 3. Resets streaming states
// 4. Fetches messages
```

---

## Stream Processing Flow

### Cloud Streaming (`sendMessage`)
```
1. Reset states          → setStream(''), setIntermediate(''), setIsSending(true)
2. Create controller     → new AbortController()
3. Send request          → fetch() with streaming
4. Process stream        → processStream()
   ├─ 'state'           → setIntermediate(state)
   ├─ 'stream'          → setStream(prev => prev + content)
   ├─ 'meta'            → setAdditionalData(data)
   └─ 'final'           → setIntermediate(''), set final data
5. Cleanup               → setIsSending(false), setStreamWorking(false)
```

### Local Streaming (`handleSendLocalMessage`)
```
1. Reset states          → setStream(''), setIntermediate(''), setStreamWorking(true)
2. Generate              → llm.generate(messages)
3. Update on response    → Stream updates from llmResponse
4. Cleanup               → setIsSending(false), setStreamWorking(false)
```

---

## State Lifecycle

### Normal Message Flow
```
State Sequence:
┌─────────────────────────────────────────────────┐
│ 1. isSending = true                            │
│    → Show loading indicator                     │
├─────────────────────────────────────────────────┤
│ 2. intermediate = "Processing..." (optional)   │
│    → Show backend state message                 │
├─────────────────────────────────────────────────┤
│ 3. stream = "Hello..."                         │
│    intermediate = ""                            │
│    → Show streaming content                     │
├─────────────────────────────────────────────────┤
│ 4. stream = "Hello world!"                     │
│    → Content complete                           │
├─────────────────────────────────────────────────┤
│ 5. additionalData = [images/videos] (optional) │
│    → Show generated media                       │
├─────────────────────────────────────────────────┤
│ 6. isSending = false                           │
│    streamWorking = false                        │
│    → Hide loading indicator                     │
└─────────────────────────────────────────────────┘
```

### Error Flow
```
Error Sequence:
┌─────────────────────────────────────────────────┐
│ 1. Error occurs during streaming                │
├─────────────────────────────────────────────────┤
│ 2. Clear all states:                            │
│    - setStream('')                              │
│    - setIntermediate('')                        │
│    - setAdditionalData([])                      │
│    - setStreamWorking(false)                    │
│    - setIsSending(false)                        │
├─────────────────────────────────────────────────┤
│ 3. Set error:                                   │
│    - setChatError({ type, message, statusCode })│
├─────────────────────────────────────────────────┤
│ 4. User can retry or dismiss                    │
└─────────────────────────────────────────────────┘
```

---

## Throttling Behavior

### Regular Stream Content
- Throttled to 50ms intervals
- Reduces re-renders during rapid updates
- Provides smooth visual experience

### Immediate Updates (No Throttling)
- **Intermediate states** - Backend messages show immediately
- **Additional data** - Generated images/videos show immediately

```typescript
// In useChat.tsx
const shouldUpdateImmediately = intermediate || additionalData?.length > 0;

if (!shouldUpdateImmediately && 
    timeSinceLastUpdate < MESSAGE_UPDATE_THROTTLE_MS) {
  return; // Skip update
}
```

---

## Debugging

### Enable Detailed Logs
Stream processing logs are already enabled. Look for:

```
[ChatStream] ═══════════════════════════════════════
[ChatStream] processStream called
[ChatStream] 🔄 First intermediate state received
[ChatStream] ✅ First content received
[ChatStream] 📦 Received meta with additional_data
[ChatStream] ✅ Received final response
[ChatStream] ═══════════════════════════════════════
```

### Check State Values
Use refs to inspect current values:
```typescript
console.log('Current streaming state:', {
  isSending: isSendingRef.current,
  streamWorking: streamWorkingRef.current,
  intermediate: intermediateRef.current,
});
```

---

## Common Patterns

### Checking if Streaming is Active
```typescript
// Use the computed value
if (effectiveIsSending) {
  // Streaming is happening
}
```

### Waiting for Stream to Finish
```typescript
// In a useEffect
useEffect(() => {
  if (!effectiveIsSending && wasStreaming) {
    // Stream just finished
    onStreamComplete();
  }
}, [effectiveIsSending]);
```

### Safely Switching Conversations
```typescript
const switchConversation = async (newConvId: string) => {
  // This automatically aborts streams
  await fetchMessages(newConvId);
};
```

### Handling Stream Errors
```typescript
// Errors are set in chatError state
if (chatError) {
  // Show error UI
  if (chatError.type === 'network') {
    // Handle network errors
  } else if (chatError.type === 'credit') {
    // Handle credit errors
  }
}
```

---

## Best Practices

### ✅ DO
- Use `abortCurrentStream()` before starting new streams
- Always await `resetChat()` and `abortCurrentStream()`
- Check `effectiveIsSending` (exposed as `isSending` in context) to determine streaming state
- Clear errors when starting new messages
- Use refs for cleanup functions with empty deps
- Disable input controls with `editable={!isLoading}` prop
- Add visual feedback for disabled states (opacity, color)
- Include proper `accessibilityState` for disabled controls

### ❌ DON'T
- Don't manually abort `streamControllerRef.current` - use `abortCurrentStream()`
- Don't forget to reset states when switching modes (local/cloud)
- Don't rely on immediate state updates - states are async
- Don't clear `additionalData` during streaming - it persists in messages
- Don't check individual states - use `effectiveIsSending` instead
- Don't create separate input disabling state - use `isSending` from context
- Don't forget to disable attachment/file buttons during streaming

---

## State Reset Locations

### When States are Reset

1. **Starting new message** (`sendMessage`)
   ```typescript
   setStream('');
   setIntermediate('');
   setAdditionalData([]);
   setIsSending(true);
   ```

2. **Switching conversations** (`fetchMessages`)
   ```typescript
   await abortCurrentStream();
   setStream('');
   setIntermediate('');
   setStreamWorking(false);
   setIsSending(false);
   setAdditionalData([]);
   ```

3. **On error** (`processStream` catch block)
   ```typescript
   setStream('');
   setIntermediate('');
   setAdditionalData([]);
   // (isSending cleared in finally block)
   ```

4. **Chat reset** (`resetChat`)
   ```typescript
   await abortCurrentStream();
   // All states cleared including messages
   ```

---

## Message Update Logic

```typescript
// Simplified flow
useEffect(() => {
  // Check if we should throttle
  const shouldUpdateImmediately = intermediate || additionalData?.length > 0;
  
  if (!shouldUpdateImmediately && timeSinceLastUpdate < 50) {
    return; // Throttle
  }
  
  // Update last message with current stream content
  setMessages(prev => updateLastItem(prev, message => ({
    ...message,
    content: stream,
    additional_data: additionalData?.length > 0 
      ? additionalData 
      : message.additional_data
  })));
}, [stream, additionalData, intermediate]);
```

---

## AbortController Management

### Current Implementation
```typescript
// Single controller for active stream
const streamControllerRef = useRef<AbortController | null>(null);

// Create new controller
const newController = new AbortController();
streamControllerRef.current = newController;

// Use in fetch
fetch(url, { signal: newController.signal });

// Abort safely
await abortCurrentStream(); // Handles null check and cleanup
```

### Why We Use Refs
- Controllers need to persist across renders
- Need to abort from different functions
- Cleanup needs access to latest controller

---

## Testing Stream States

### Unit Test Example
```typescript
describe('Stream state management', () => {
  it('should clear all states on error', async () => {
    // Trigger stream error
    await triggerStreamError();
    
    // Verify states cleared
    expect(stream).toBe('');
    expect(intermediate).toBe('');
    expect(additionalData).toEqual([]);
    expect(isSending).toBe(false);
  });
  
  it('should abort stream when switching conversations', async () => {
    // Start streaming
    sendMessage('test');
    
    // Switch conversation
    await fetchMessages('new-conv-id');
    
    // Verify abort called
    expect(abortCurrentStream).toHaveBeenCalled();
  });
});
```

---

## Performance Metrics

### Target Benchmarks
- ✅ Throttle interval: 50ms between updates
- ✅ Abort propagation: <50ms to cancel stream
- ✅ Re-render on intermediate: Immediate (no throttle)
- ✅ Re-render on additional_data: Immediate (no throttle)
- ✅ Memory: Controller refs cleaned up properly

---

## Migration Notes

### Breaking Changes from Previous Version
1. `resetChat()` is now async - must use `await`
2. `effectiveIsSending` is memoized - dependencies changed
3. Stream abort uses centralized function - don't access `streamControllerRef` directly

### Upgrade Checklist
- [ ] Change all `resetChat()` calls to `await resetChat()`
- [ ] Replace manual abort logic with `abortCurrentStream()`
- [ ] Update tests to handle async `resetChat()`
- [ ] Verify logging output matches new format

---

## Quick Troubleshooting

### UI Stuck with Loading Dots
**Cause:** `isSending` or `intermediate` not cleared  
**Fix:** Check error paths clear all states

### Partial Content Visible After Error
**Cause:** `stream` not cleared in error handler  
**Fix:** Verify `processStream` catch block clears states

### Race Condition on Conversation Switch
**Cause:** Stream not aborted before state reset  
**Fix:** Ensure `await abortCurrentStream()` before resetting

### Stale Values in Cleanup
**Cause:** Using empty deps without refs  
**Fix:** Use refs for state values in cleanup functions

---

## Related Files

- **`hooks/useChat.tsx`** - Main streaming logic
- **`utils/ChatStream.ts`** - Stream processing
- **`components/ChatMessage.tsx`** - UI rendering
- **`STREAMING_STATE_FIXES.md`** - Detailed fix documentation

