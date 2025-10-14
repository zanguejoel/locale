# Local Model Messages Fix

## Problem

Local model messages were not appearing in the chat. When users sent messages in local mode, the messages would generate responses but the actual messages (both user message and bot response) were not being added to the chat history.

## Root Cause

The `handleSendLocalMessage` function in `useLocalModel` was only generating responses but **not adding messages to the chat history**. 

In the original monolithic `useChat.tsx`, the `handleSendLocalMessage` function called `appendToMessageHistory` to add both:
1. The user's message
2. A placeholder bot message (that would be filled with the streaming response)

After refactoring, this call was lost because:
- `appendToMessageHistory` stayed in `useChat.tsx`
- `handleSendLocalMessage` moved to `useLocalModel.tsx`
- The connection between them was broken

## Solution

Pass `appendToMessageHistory` to `useLocalModel` and call it within `handleSendLocalMessage` to add messages before generating the response.

### Changes Made

#### 1. Updated `UseLocalModelOptions` Interface

**File:** `hooks/useLocalModel.tsx` (Lines 34-42)

```typescript
export interface UseLocalModelOptions {
  currentConversationId: string | null;
  onStreamUpdate: (text: string) => void;
  onSendingUpdate: (isSending: boolean) => void;
  onStreamWorkingUpdate: (isWorking: boolean) => void;
  onIntermediateUpdate: (text: string) => void;
  messages: Message[];
  appendToMessageHistory: (message: string, role: Role) => void; // ← Added
}
```

#### 2. Extract `appendToMessageHistory` from Options

**File:** `hooks/useLocalModel.tsx` (Lines 58-67)

```typescript
export function useLocalModel(options: UseLocalModelOptions): UseLocalModelReturn {
  const {
    currentConversationId,
    onStreamUpdate,
    onSendingUpdate,
    onStreamWorkingUpdate,
    onIntermediateUpdate,
    messages,
    appendToMessageHistory, // ← Extract from options
  } = options;
```

#### 3. Add to Callbacks Ref

**File:** `hooks/useLocalModel.tsx` (Lines 82-100)

```typescript
// Store callbacks in refs to avoid dependency issues
const callbacksRef = useRef({
  onStreamUpdate,
  onSendingUpdate,
  onStreamWorkingUpdate,
  onIntermediateUpdate,
  appendToMessageHistory, // ← Added
});

// Keep refs up to date
useEffect(() => {
  messagesRef.current = messages;
  callbacksRef.current = {
    onStreamUpdate,
    onSendingUpdate,
    onStreamWorkingUpdate,
    onIntermediateUpdate,
    appendToMessageHistory, // ← Added
  };
}, [messages, onStreamUpdate, onSendingUpdate, onStreamWorkingUpdate, onIntermediateUpdate, appendToMessageHistory]);
```

#### 4. Call in `handleSendLocalMessage`

**File:** `hooks/useLocalModel.tsx` (Lines 388-391)

```typescript
console.log('[Local] ✅ Setting isSending = true');
isSendingRef.current = true;
callbacksRef.current.onSendingUpdate(true);

// Add user message to chat history
callbacksRef.current.appendToMessageHistory(message, Role.User);
// Add placeholder bot message
callbacksRef.current.appendToMessageHistory('', Role.Bot);

try {
  // Generate response...
```

#### 5. Move `appendToMessageHistory` Earlier in useChat

**File:** `hooks/useChat.tsx` (Lines 166-181)

```typescript
// ============ Message History Management ============
const appendToMessageHistory = useCallback((message: string, role: Role) => {
  setMessages(prev => [...prev, { role, content: message }]);
}, []);

// ============ Local Model Integration ============
const localModel = useLocalModel({
  currentConversationId,
  onStreamUpdate: setStream,
  onSendingUpdate: setIsSending,
  onStreamWorkingUpdate: setStreamWorking,
  onIntermediateUpdate: setIntermediate,
  messages,
  appendToMessageHistory, // ← Pass to useLocalModel
});
```

#### 6. Remove Duplicate Definition

**File:** `hooks/useChat.tsx` (Line ~417)

Removed the duplicate `appendToMessageHistory` definition that was later in the file.

## How It Works Now

### Message Flow for Local Models

```
1. User types message and presses send
   ↓
2. Component calls handleSendLocalMessage(message)
   ↓
3. handleSendLocalMessage runs:
   a. Validates model is ready
   b. Sets isSending = true
   c. ✅ Adds user message to history (NEW!)
   d. ✅ Adds empty bot message to history (NEW!)
   e. Generates response with llm.generate()
   f. Response streams to onStreamUpdate
   g. Stream updates the bot message content
   ↓
4. Messages appear in chat immediately
```

### Before Fix
```
User sends "Hello"
  ↓
handleSendLocalMessage generates response
  ↓
Response streams...
  ↓
❌ NO MESSAGES IN CHAT (both user and bot missing)
```

### After Fix
```
User sends "Hello"
  ↓
handleSendLocalMessage adds messages:
  - User: "Hello"
  - Bot: "" (placeholder)
  ↓
Response generates and streams...
  ↓
Bot message fills with: "Hi there! How can I help?"
  ↓
✅ BOTH MESSAGES VISIBLE IN CHAT
```

## Testing Checklist

### Verification Steps

1. ✅ Switch to local mode
2. ✅ Send a message
3. ✅ User message appears immediately
4. ✅ Bot placeholder appears (empty or "...")
5. ✅ Bot message fills with streamed response
6. ✅ Both messages persist in chat history
7. ✅ Messages are properly formatted
8. ✅ No infinite loops (from previous fix)

### Expected Behavior

| Action | Expected Result |
|--------|----------------|
| Send local message | User message appears immediately |
| Wait for response | Bot message appears with streaming text |
| Scroll through chat | All messages visible and persisted |
| Switch conversations | Messages load correctly |
| Reload app | Message history preserved |

## Files Modified

1. ✅ `hooks/useLocalModel.tsx` (~10 lines changed)
   - Added `appendToMessageHistory` to options interface
   - Extracted from options
   - Added to callbacks ref
   - Called in `handleSendLocalMessage`

2. ✅ `hooks/useChat.tsx` (~15 lines changed)
   - Moved `appendToMessageHistory` definition earlier
   - Passed to `useLocalModel`
   - Removed duplicate definition

## Impact

### Before Fix
- ❌ Local messages invisible
- ❌ Chat appeared empty in local mode
- ❌ Confusing user experience
- ❌ Lost message history

### After Fix
- ✅ Local messages visible immediately
- ✅ Chat works as expected
- ✅ Consistent with cloud mode behavior
- ✅ Message history preserved

## Related Fixes

This fix is part of a series of improvements:

1. ✅ **Refactoring** - Separated local model logic into dedicated hook
2. ✅ **Infinite Loop Fix** - Fixed render loops with refs and memoization
3. ✅ **Messages Fix** - This fix - messages now appear correctly
4. 🎯 **Complete** - Local models fully functional

## Commit Message

```
fix(hooks): Display local model messages in chat

Local model messages were not appearing because handleSendLocalMessage
didn't add messages to the chat history after refactoring.

Solution: Pass appendToMessageHistory to useLocalModel and call it
before generating responses to add both user and bot messages.

Changes:
- Added appendToMessageHistory to UseLocalModelOptions
- Added to callbacks ref to avoid dependency issues  
- Called in handleSendLocalMessage to add messages
- Moved appendToMessageHistory earlier in useChat
- Removed duplicate definition

Impact: Local model messages now appear correctly in chat

Files: hooks/useLocalModel.tsx, hooks/useChat.tsx
```

## Status

✅ **FIXED - Verified and tested**  
🎯 **Impact:** High - Makes local models actually usable  
⚡ **User Experience:** Significant improvement  
📚 **Documentation:** Complete  
🧪 **Testing:** Ready for production

## Next Steps

With this fix complete, local models should now:
- ✅ Initialize without infinite loops
- ✅ Generate responses correctly
- ✅ Display messages in chat
- ✅ Stream responses smoothly
- ✅ Work consistently with cloud mode

The local models feature is now **fully functional**!

