# Streaming Architecture - Visual Guide

**Last Updated:** October 27, 2025  
**Purpose:** Visual reference for the new streaming architecture

---

## 🏗️ System Architecture

### Current Architecture (BEFORE)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatContext                             │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  STATE (All Global):                                      │ │
│  │  • messages: Message[]                                    │ │
│  │  • stream: string                                         │ │
│  │  • intermediate: string                                   │ │
│  │  • isSending: boolean                                     │ │
│  │  • streamWorking: boolean                                 │ │
│  │  • additionalData: any[]                                  │ │
│  │                                                            │ │
│  │  PROBLEM: Every update to stream/intermediate/isSending  │ │
│  │           causes ENTIRE context to re-render             │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Every stream update triggers
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     ALL Consumers Re-render                     │
├─────────────────────────────────────────────────────────────────┤
│  • ChatPage                    → Full page re-render           │
│  • ChatMessage (all instances) → All messages re-render        │
│  • ChatInput                   → Input re-renders              │
│  • Drawer components           → Navigation components lag     │
│  • Header components           → Header re-renders             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    RESULT: Laggy navigation,
                           poor scroll performance
```

---

### New Architecture (AFTER)

```
┌──────────────────────────────┐  ┌──────────────────────────────┐
│       ChatContext            │  │   StreamingStateContext      │
│  ┌────────────────────────┐  │  │  ┌────────────────────────┐ │
│  │  STATE (Stable):       │  │  │  │  STATE (Isolated):     │ │
│  │  • messages            │  │  │  │  • activeStreams Map   │ │
│  │  • conversations       │  │  │  │    ├─ conv-1: {       │ │
│  │  • currentConvId       │  │  │  │    │   content: "...", │ │
│  │  • isLoading           │  │  │  │    │   intermediate,   │ │
│  │                        │  │  │  │    │   isActive,       │ │
│  │  NO streaming state!   │  │  │  │    │   controller      │ │
│  │  → Navigation unaffected│ │  │  │    └─ }               │ │
│  └────────────────────────┘  │  │  │    ├─ conv-2: {...}   │ │
└──────────────────────────────┘  │  │    └─ conv-3: {...}   │ │
                                   │  │                        │ │
                                   │  │  PER-CONVERSATION!     │ │
                                   │  └────────────────────────┘ │
                                   └──────────────────────────────┘
        ↓                                      ↓
        ↓                          useConversationStream(convId)
        ↓                                      ↓
        ↓                          Returns ONLY this conv's stream
        ↓                                      ↓
┌───────────────────┐              ┌───────────────────┐
│    ChatPage       │              │  Streaming State  │
│  ┌─────────────┐  │              │  for Current Conv │
│  │ No streaming│  │              │  ┌─────────────┐  │
│  │ state here  │  │              │  │ isStreaming │  │
│  │             │  │              │  │ content     │  │
│  │ Just stable │  │              │  │ intermediate│  │
│  │ messages    │  │              │  └─────────────┘  │
│  └─────────────┘  │              └───────────────────┘
└───────────────────┘                        ↓
        ↓                          Only affects current
        ↓                          conversation's UI
        ↓                                      ↓
┌──────────────────────────────────────────────────────────┐
│              SELECTIVE Re-renders                        │
├──────────────────────────────────────────────────────────┤
│  ✅ ChatPage         → No re-render (no streaming state) │
│  ✅ ChatMessage (others) → No re-render (memoized)       │
│  ✅ ChatMessage (last)   → Re-render (streaming)         │
│  ✅ Drawer           → No re-render (isolated)           │
│  ✅ Header           → No re-render (separate indicator) │
└──────────────────────────────────────────────────────────┘
                              ↓
            RESULT: Smooth navigation,
                   60 FPS scrolling
```

---

## 🔄 Stream Lifecycle

### Phase 1: Stream Creation

```
User sends message
      ↓
┌──────────────────────────────────┐
│  sendMessage() in useChat        │
├──────────────────────────────────┤
│  1. Generate temp message ID     │
│  2. Add user message to messages │
│  3. Add empty bot message        │
│  4. Create AbortController       │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  StreamingStateContext.addStream │
├──────────────────────────────────┤
│  activeStreams.set(convId, {     │
│    conversationId: convId,       │
│    content: '',                  │
│    intermediate: '',             │
│    isActive: true,               │
│    controller: controller,       │
│    progress: 0,                  │
│    timestamp: Date.now()         │
│  })                              │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  Start fetch with streaming      │
│  signal: controller.signal       │
└──────────────────────────────────┘
```

---

### Phase 2: Stream Processing

```
Stream chunks arrive
      ↓
┌──────────────────────────────────┐
│  processStream() in ChatStream   │
├──────────────────────────────────┤
│  for await (chunk of stream) {   │
│    if (chunk.type === 'state')   │
│      → Update intermediate       │
│    if (chunk.type === 'stream')  │
│      → Update content            │
│    if (chunk.type === 'meta')    │
│      → Update additionalData     │
│  }                               │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  StreamBatcher.schedule()        │
├──────────────────────────────────┤
│  Batch updates using RAF         │
│  → Only 1 update per frame       │
│  → Smooth 60 FPS performance     │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  StreamingStateContext.update    │
├──────────────────────────────────┤
│  activeStreams.set(convId, {     │
│    ...existing,                  │
│    content: newContent,          │
│    progress: calculateProgress() │
│  })                              │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  ONLY components using           │
│  useConversationStream(convId)   │
│  re-render                       │
└──────────────────────────────────┘
```

---

### Phase 3: Stream Completion

```
Stream finishes
      ↓
┌──────────────────────────────────┐
│  processStream() completes       │
│  • Sets intermediate = ''        │
│  • Marks stream as complete      │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  Update final message in         │
│  ChatContext.messages            │
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  StreamingStateContext cleanup   │
├──────────────────────────────────┤
│  • Mark isActive = false         │
│  • Persist state to MMKV         │
│  • Keep in memory for 5 minutes  │
│  • Then remove from activeStreams│
└──────────────────────────────────┘
      ↓
┌──────────────────────────────────┐
│  Update conversation list        │
│  • Mark as "has new content"     │
│  • Update timestamp              │
└──────────────────────────────────┘
```

---

## 🎭 User Interaction Flows

### Flow 1: Send Message and Stay

```
User types message → Presses send
      ↓
Message appears in chat (user message)
      ↓
Empty bot message appears with loading dots
      ↓
Stream starts → content fills in character by character
      ↓
User scrolls up to read older messages
      ↓
Auto-scroll stops (respects user scroll)
      ↓
"Streaming..." button appears at bottom
      ↓
User clicks "Streaming..." button
      ↓
Scrolls to bottom → auto-scroll resumes
      ↓
Stream completes → loading dots disappear
      ↓
Complete message visible
```

---

### Flow 2: Send Message and Navigate Away

```
User types message → Presses send
      ↓
Message appears in chat (user message)
      ↓
Empty bot message appears with loading dots
      ↓
Stream starts → content begins filling in
      ↓
User opens drawer (swipes from left)
      ↓
✅ Drawer opens INSTANTLY (<150ms)
      ↓
✅ Stream continues in BACKGROUND
      ↓
User navigates to Settings
      ↓
✅ Settings opens quickly
      ↓
✅ Stream still running in background
      ↓
User navigates back to original conversation
      ↓
✅ Sees completed message (or streaming if still going)
      ↓
✅ Conversation list showed badge during streaming
```

---

### Flow 3: Multiple Conversations Streaming

```
User in Conversation A → Sends message
      ↓
Stream A starts (ACTIVE)
      ↓
User switches to Conversation B → Sends message
      ↓
Stream B starts (ACTIVE)
Stream A moves to BACKGROUND
      ↓
User switches to Conversation C → Sends message
      ↓
Stream C starts (ACTIVE)
Stream B moves to BACKGROUND
Stream A reaches limit → ABORTED (oldest background)
      ↓
Stream C completes
      ↓
User switches back to Conversation B
      ↓
Stream B still running → Shows progress
```

---

## 🧩 Component Interaction

### Component Tree with State Flow

```
<AppProviders>
  │
  ├─ <ChatProvider>
  │   ├─ messages ─────────────────┐
  │   ├─ conversations ────────────┤
  │   └─ currentConversationId ────┤
  │                                 │
  ├─ <StreamingStateProvider>      │
  │   ├─ activeStreams Map ────────┤
  │   └─ stream operations ────────┤
  │                                 │
  │   <Stack.Navigator>             │
  │     │                           │
  │     ├─ <Header>                 │
  │     │   └─ <StreamingIndicator> (uses StreamingState)
  │     │                           │
  │     ├─ <Drawer.Navigator>       │
  │     │   │                       │
  │     │   ├─ <CustomDrawerContent>
  │     │   │   ├─ conversations list (from ChatContext)
  │     │   │   └─ streaming badges (from StreamingState)
  │     │   │                       │
  │     │   └─ <ChatPage>           │
  │     │       ├─ uses: currentConversationId
  │     │       ├─ uses: messages   │
  │     │       ├─ uses: useConversationStream(id)
  │     │       │                   │
  │     │       ├─ <FlashList>      │
  │     │       │   └─ <ChatMessage> (memoized)
  │     │       │       ├─ content from messages
  │     │       │       └─ streaming state if last message
  │     │       │                   │
  │     │       └─ <ChatInput>      │
  │     │           └─ disabled during streaming
  │     │                           │
  │     └─ <Settings>               │
  │         └─ No streaming state   │
  │            → Opens quickly      │
  └─────────────────────────────────┘

Key: ─── Stable data flow (rarely changes)
     ≈≈≈ Streaming data flow (frequently updates)
```

---

## 💾 State Storage Strategy

### Memory (Active)

```
┌────────────────────────────────────────┐
│  StreamingStateContext                 │
│  ┌──────────────────────────────────┐  │
│  │  activeStreams: Map              │  │
│  │  ├─ Active (1):                  │  │
│  │  │   └─ Full state + controller  │  │
│  │  ├─ Background (2):              │  │
│  │  │   ├─ Full state + controller  │  │
│  │  │   └─ Full state + controller  │  │
│  │  └─ Completed (auto-cleanup):    │  │
│  │      └─ Removed after 5 min      │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

### Persistent (MMKV)

```
┌────────────────────────────────────────┐
│  MMKV Storage                          │
│  ┌──────────────────────────────────┐  │
│  │  Key: stream_conv-123            │  │
│  │  Value: {                        │  │
│  │    content: "Hello...",          │  │
│  │    intermediate: "",             │  │
│  │    timestamp: 1234567890,        │  │
│  │    status: "completed"           │  │
│  │  }                               │  │
│  │  TTL: 5 minutes                  │  │
│  └──────────────────────────────────┘  │
│                                        │
│  Used for:                             │
│  • Crash recovery                      │
│  • App reload recovery                 │
│  • Background stream persistence       │
│  • "Resume where left off"             │
└────────────────────────────────────────┘
```

---

## 🎯 Performance Flow

### Before Optimization

```
Stream update (every 50ms)
      ↓
ChatContext re-renders
      ↓
ALL consumers notified
      ↓
┌─────────────────────────────────────┐
│  Component Re-renders:              │
│  • ChatPage: YES (has stream state) │
│  • ChatMessage[0]: YES (no memo)    │
│  • ChatMessage[1]: YES (no memo)    │
│  • ChatMessage[2]: YES (no memo)    │
│  • ... (all messages)               │
│  • ChatInput: YES (context changed) │
│  • Drawer: YES (context changed)    │
│  • Header: YES (context changed)    │
└─────────────────────────────────────┘
      ↓
Total: ~100 re-renders per second
      ↓
Result: 30-40 FPS, laggy navigation
```

---

### After Optimization

```
Stream update (batched via RAF)
      ↓
StreamingStateContext updates ONLY convId's state
      ↓
Only components using useConversationStream(convId) notified
      ↓
┌─────────────────────────────────────┐
│  Component Re-renders:              │
│  • ChatPage: NO (no stream state)   │
│  • ChatMessage[0]: NO (memoized)    │
│  • ChatMessage[1]: NO (memoized)    │
│  • ChatMessage[2]: NO (memoized)    │
│  • ... (memoized)                   │
│  • ChatMessage[last]: YES (content) │
│  • ChatInput: NO (isolated state)   │
│  • Drawer: NO (isolated state)      │
│  • Header: NO (separate indicator)  │
└─────────────────────────────────────┘
      ↓
Total: ~1-2 re-renders per second
      ↓
Result: 55-60 FPS, smooth navigation
```

---

## 🔌 API Integration Points

### WebSocket/SSE Streaming

```
┌──────────────────┐
│  Backend Server  │
└────────┬─────────┘
         │ WebSocket / SSE
         │ streaming
         ↓
┌────────────────────────────────┐
│  processStream()               │
│  (utils/ChatStream.ts)         │
├────────────────────────────────┤
│  Parses:                       │
│  • data: {type: 'state', ...}  │
│  • data: {type: 'stream', ...} │
│  • data: {type: 'meta', ...}   │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│  StreamBatcher                 │
│  (utils/StreamBatcher.ts)      │
├────────────────────────────────┤
│  Batches updates via RAF       │
│  → Smooth 60 FPS delivery      │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│  StreamingStateContext         │
│  Updates activeStreams Map     │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│  useConversationStream hook    │
│  Returns state to UI           │
└────────┬───────────────────────┘
         │
         ↓
┌────────────────────────────────┐
│  ChatMessage component         │
│  Displays streaming content    │
└────────────────────────────────┘
```

---

## 🎨 UI State Indicators

### Visual Feedback Map

```
┌─────────────────────────────────────────────────────────────┐
│  Header                                                     │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  🔵 Generating... (345 chars)                        │  │
│  │  ← Always visible when streaming                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Drawer (Conversation List)                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  📝 Conversation A                   🔵 Streaming     │  │
│  │  📝 Conversation B                   ✅ Complete      │  │
│  │  📝 Conversation C                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Chat View                                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  [Older messages...]                                  │  │
│  │                                                        │  │
│  │  User: Tell me about React Native                     │  │
│  │                                                        │  │
│  │  Bot: React Native is... [streaming content]          │  │
│  │       ⋯⋯⋯ (typing animation)                          │  │
│  │                                                        │  │
│  │                                    ┌────────────────┐ │  │
│  │                                    │ 🔵 Streaming...│ │  │
│  │                                    │   345 chars    │ │  │
│  │                                    │   [Stop] [↓]   │ │  │
│  │                                    └────────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Memory Management

### Stream Lifecycle Memory

```
Time →
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

0s: Stream created
    Memory: +2KB (controller + state)
    
1-30s: Stream active
    Memory: +50-200KB (accumulated content)
    
30s: Stream completes
    Memory: Content moved to message
           Stream state marked inactive
    
5min: Cleanup timer
    Memory: -2KB (state removed)
           Content remains in messages
    
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total overhead per stream:
• Active: ~200KB
• Completed: ~2KB (state only)
• After cleanup: 0KB (removed)

Max memory with limits:
• 1 active + 2 background = ~600KB
• Negligible impact on app
```

---

## 🔐 Error Handling

### Error Flow Diagram

```
Error occurs in stream
      ↓
┌──────────────────────────────────┐
│  processStream() catch block     │
└──────┬───────────────────────────┘
       │
       ├─ Clear stream state
       │  • content = ''
       │  • intermediate = ''
       │  
       ├─ Set error in ChatContext
       │  • setChatError({
       │      type: 'network',
       │      message: 'Stream failed'
       │    })
       │
       ├─ Clean up controller
       │  • controller.abort()
       │  • controller = null
       │
       └─ Update UI
          • Show error banner
          • Enable retry button
          • Log to analytics
      ↓
┌──────────────────────────────────┐
│  UI shows error state            │
│  • Error banner visible          │
│  • Last message shows error      │
│  • User can retry or dismiss     │
└──────────────────────────────────┘
```

---

## ✅ Testing Points

### Unit Test Coverage

```
StreamingStateContext
├─ ✅ Creates streams correctly
├─ ✅ Updates stream state
├─ ✅ Isolates per conversation
├─ ✅ Enforces stream limits
├─ ✅ Aborts oldest when limit reached
└─ ✅ Cleans up completed streams

useConversationStream
├─ ✅ Returns correct stream for convId
├─ ✅ Returns null for non-existent stream
├─ ✅ Re-renders only when stream updates
└─ ✅ Handles conversation switch

StreamBatcher
├─ ✅ Batches rapid updates
├─ ✅ Delivers once per frame
├─ ✅ Flushes pending on unmount
└─ ✅ Handles cancellation

StreamPersistence
├─ ✅ Persists stream state to MMKV
├─ ✅ Recovers valid state
├─ ✅ Rejects expired state (>5min)
└─ ✅ Handles corrupt data
```

---

## 🎯 Success Metrics

### How to Measure

```typescript
// Add performance monitoring
const performanceMonitor = {
  renderCount: 0,
  frameDrops: 0,
  navigationTimes: [],
  
  trackRender: () => {
    performanceMonitor.renderCount++;
  },
  
  trackNavigation: (duration: number) => {
    performanceMonitor.navigationTimes.push(duration);
  },
  
  getStats: () => ({
    avgRenderCount: performanceMonitor.renderCount / timeElapsed,
    avgNavigationTime: avg(performanceMonitor.navigationTimes),
    frameDropPercent: performanceMonitor.frameDrops / totalFrames * 100
  })
};
```

### Target Metrics

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| Re-renders/sec | 100 | 2 | 🎯 |
| Drawer open | 500ms | <150ms | 🎯 |
| Scroll FPS | 35 | 58 | 🎯 |
| Button response | 300ms | <100ms | 🎯 |
| Memory overhead | N/A | <1MB | 🎯 |

---

## 📚 Code Examples

### Example 1: Using New Hook

```typescript
// OLD: Direct context usage
const ChatPage = () => {
  const { stream, intermediate, isSending } = useChat();
  
  // Problem: Re-renders on every stream update
  return <View>...</View>;
};

// NEW: Isolated stream access
const ChatPage = () => {
  const { id } = useParams();
  const { isSending } = useChat(); // Stable
  const { content, intermediate } = useConversationStream(id); // Isolated
  
  // Only re-renders when THIS conversation's stream updates
  return <View>...</View>;
};
```

---

### Example 2: Memoized Message

```typescript
// OLD: No memoization
const ChatMessage = (props: ChatMessageProps) => {
  return <View>...</View>;
};

// NEW: Properly memoized
const ChatMessage = memo((props: ChatMessageProps) => {
  return <View>...</View>;
}, (prev, next) => {
  // Return TRUE if props are EQUAL (skip re-render)
  return (
    prev.content === next.content &&
    prev.loading === next.loading &&
    prev.reaction === next.reaction &&
    JSON.stringify(prev.artifacts) === JSON.stringify(next.artifacts)
  );
});
```

---

### Example 3: Stream Batching

```typescript
// OLD: Direct state updates
for await (const chunk of stream) {
  setStream(prevStream + chunk); // 60+ updates/sec
}

// NEW: Batched updates
const batcher = new StreamBatcher();
for await (const chunk of stream) {
  const newContent = currentContent + chunk;
  batcher.schedule(newContent, (content) => {
    setStream(content); // 1 update/frame (60fps)
  });
}
```

---

This visual guide provides a comprehensive overview of the new streaming architecture. Reference specific sections during implementation and code reviews.

*Keep this diagram handy for architectural discussions!*

