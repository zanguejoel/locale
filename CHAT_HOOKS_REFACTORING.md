# Chat Hooks Refactoring

## Overview

The chat functionality has been refactored to separate concerns between cloud-based chat and local model management. This improves code maintainability, readability, and testability.

## File Structure

### Before
- `hooks/useChat.tsx` - Single 1,981-line file handling both cloud chat and local models

### After
- `hooks/useChat.tsx` - ~900 lines - Cloud chat management
- `hooks/useLocalModel.tsx` - ~500 lines - Local model management

## New Architecture

### 1. `useLocalModel.tsx` - Local Model Hook

**Purpose:** Manages all local LLM model state and operations

**Responsibilities:**
- Local model initialization and configuration
- Model download progress tracking
- Model readiness detection
- Local message generation
- Device capability checks
- Crash detection and recovery
- Model state synchronization

**State Management:**
```typescript
// Local mode toggle
isLocal: boolean
setIsLocal: (value: boolean) => void

// Model status
localModelDownloadProgress: number  // 0-1
isLocalModelReady: boolean
isLocalLLMSupported: boolean

// Operations
handleSendLocalMessage: (message: string) => Promise<void>
clearLocalModel: () => void
```

**Key Features:**
- **Deferred Initialization:** Uses `InteractionManager` to avoid blocking UI
- **Crash Protection:** Integrates with `CrashReporter` to prevent crash loops
- **Progress Tracking:** Real-time download progress with optimized polling
- **Context Management:** Limits conversation history to avoid token limits
- **App State Monitoring:** Pauses downloads when app goes to background

### 2. `useChat.tsx` - Cloud Chat Hook

**Purpose:** Manages cloud-based chat functionality and orchestrates local model integration

**State Organization:**
```typescript
// ============ Conversation State ============
conversations: Conversations[]
currentConversationId: string | null

// ============ Message State ============
messages: Message[]
additionalData: any[]

// ============ Loading & Sending State ============
isLoading: boolean
isSending: boolean
isChatLoading: boolean

// ============ Streaming State ============
stream: string
intermediate: string
streamWorking: boolean

// ============ Error State ============
error: string
chatError: ChatError | null

// ============ File Handling State ============
files: any[]
pastedActive: boolean
```

**Integration Pattern:**
```typescript
const localModel = useLocalModel({
  currentConversationId,
  onStreamUpdate: setStream,
  onSendingUpdate: setIsSending,
  onStreamWorkingUpdate: setStreamWorking,
  onIntermediateUpdate: setIntermediate,
  messages,
});

// Access local model functionality
const { isLocal, setIsLocal, handleSendLocalMessage } = localModel;
```

## Benefits

### 1. **Separation of Concerns**
- Cloud chat logic is isolated from local model logic
- Each hook has a single, clear responsibility
- Easier to understand and modify each part independently

### 2. **Improved Maintainability**
- Smaller, more focused files
- Clear state organization with labeled sections
- Reduced cognitive load when making changes

### 3. **Better Testability**
- Local model logic can be tested independently
- Mock local model hook for cloud chat tests
- Mock chat context for local model tests

### 4. **Reusability**
- `useLocalModel` can be used in other contexts beyond chat
- Could support multiple local model instances if needed
- Easier to swap implementations

### 5. **Performance**
- Reduced unnecessary re-renders through better memoization
- Optimized polling intervals (5s for progress, 3s for ready state)
- Throttled message updates (50ms)

## State Flow

### Cloud Message Flow
```
User Input → sendMessage() → fetch(/chat) → processStream() 
→ setStream() → messages updated → UI renders
```

### Local Message Flow
```
User Input → handleSendLocalMessage() → llm.generate() 
→ onStreamUpdate() → messages updated → UI renders
```

### Mode Switching Flow
```
setIsLocal(true) → useLocalModel detects change 
→ Initializes ExecuTorch → Downloads model → Ready for use

setIsLocal(false) → useLocalModel detects change 
→ Cleans up local state → Switches to cloud
```

## Migration Guide

### For Components Using Chat

**No changes required!** The `ChatContext` API remains the same:

```typescript
const {
  messages,
  sendMessage,
  isLocal,
  setIsLocal,
  handleSendLocalMessage,
  localModelDownloadProgress,
  isLocalModelReady,
  // ... all other properties remain the same
} = useChat();
```

### For New Features

**Adding Cloud Chat Features:**
Edit `hooks/useChat.tsx` only

**Adding Local Model Features:**
Edit `hooks/useLocalModel.tsx` only

**Features Affecting Both:**
1. Add to respective hook
2. Pass data through `useLocalModel` options if needed
3. Update context interface if exposing to components

## Code Organization Principles

### State Grouping
States are grouped by logical concern with clear section headers:
```typescript
// ============ Conversation State ============
const [conversations, setConversations] = useState<Conversations[]>([]);
const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
```

### Effect Organization
Effects are organized with descriptive comments:
```typescript
// ============ Cleanup on Unmount ============
useEffect(() => {
  // cleanup logic
}, []);
```

### Callback Naming
- `handle*` for user actions: `handleSendLocalMessage`
- `fetch*` for API calls: `fetchMessages`, `fetchConversation`
- `create*` for creation: `createNewConversation`
- `clear*` for cleanup: `clearChat`, `clearLocalModel`

## Performance Optimizations

### 1. **Throttled Updates**
```typescript
const MESSAGE_UPDATE_THROTTLE_MS = 50;
// Updates messages at most every 50ms during streaming
```

### 2. **Optimized Polling**
```typescript
// Progress: 5 seconds (only while downloading)
progressInterval = setInterval(updateModelState, 5000);

// Ready state: 3 seconds (only until ready)
readyInterval = setInterval(updateReadyState, 3000);
```

### 3. **Memoization**
```typescript
const effectiveIsSending = useMemo(() => 
  isSending || !!intermediate || (!!stream && stream.length > 0),
  [isSending, intermediate, stream]
);
```

### 4. **RequestAnimationFrame**
```typescript
requestAnimationFrame(() => {
  if (!isMounted) return;
  setLocalModelDownloadProgress(progress);
});
```

## Error Handling

### Local Model Errors
- **Invalid Model Source:** Prompts to select different model
- **Device Not Supported:** Shows device capability message
- **Model Still Loading:** Informs user of download progress
- **Memory Error:** Suggests smaller model or cloud
- **Crash Loop:** Temporarily disables local models (30 min)

### Cloud Chat Errors
- **Network Error:** `chatError` with type 'network'
- **API Error:** `chatError` with type 'api'
- **Credit Error:** `chatError` with type 'credit'
- **Permission Error:** `chatError` with type 'permission'

## Testing Strategy

### Unit Tests

**useLocalModel:**
```typescript
- Test model initialization
- Test download progress tracking
- Test message generation
- Test error handling
- Test mode switching
- Test crash protection
```

**useChat:**
```typescript
- Test message sending
- Test streaming
- Test conversation management
- Test file uploads
- Test error handling
```

### Integration Tests
```typescript
- Test switching between local and cloud
- Test message history persistence
- Test concurrent operations
- Test abort handling
```

## Future Improvements

### Potential Enhancements
1. **Multiple Model Support:** Allow switching between different local models
2. **Model Caching:** Improve download resume capabilities
3. **Streaming Optimization:** Reduce latency for first token
4. **Better Progress:** Show estimated time remaining
5. **Model Management:** UI for managing downloaded models

### Refactoring Opportunities
1. **Extract File Handling:** Create `useFileUpload` hook
2. **Extract Streaming:** Create `useStreamProcessor` hook
3. **Extract Conversation Management:** Create `useConversations` hook
4. **Message History:** Create `useMessageHistory` hook

## Debugging

### Enable Debug Logs
```typescript
// In useChat.tsx
if (__DEV__) {
  console.log('[useChat] Context value updated', ...);
}

// In useLocalModel.tsx
console.log('[Local] Model state:', ...);
```

### Common Issues

**"Local models temporarily disabled"**
- Check `CrashReporter.isLocalModelsDisabled()`
- Wait 30 minutes or call `CrashReporter.reenableLocalModels()`

**"Model still loading"**
- Check `localModelDownloadProgress` (should be < 1.0)
- Check network connection
- Check available storage space

**"isSending stuck at true"**
- Check `effectiveIsSending` logic
- Verify `finally` blocks are executing
- Check for unhandled promise rejections

## Conclusion

This refactoring improves code quality while maintaining backward compatibility. The separation of concerns makes the codebase more maintainable and sets the foundation for future enhancements.

### Key Takeaways
✅ Cleaner separation between cloud and local functionality
✅ Better state organization with clear sections
✅ Improved maintainability and testability
✅ No breaking changes to component API
✅ Better error handling and recovery
✅ Performance optimizations throughout

