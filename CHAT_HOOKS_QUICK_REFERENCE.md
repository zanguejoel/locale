# Chat Hooks - Quick Reference

## 📁 File Structure

```
hooks/
├── useChat.tsx          (~900 lines) - Cloud chat management
└── useLocalModel.tsx    (~500 lines) - Local model management
```

## 🎯 What's Where

### useChat.tsx - Cloud Chat
```typescript
✅ Message sending and receiving
✅ Conversation management
✅ File uploads
✅ Streaming responses
✅ Error handling
✅ Cloud API integration
```

### useLocalModel.tsx - Local Models
```typescript
✅ Model initialization
✅ Download progress tracking
✅ Local message generation
✅ Device capability checks
✅ Crash protection
✅ Mode switching
```

## 🔌 How to Use

### In Your Component

```typescript
import { useChat } from '@/hooks/useChat';

function ChatComponent() {
  const {
    // Cloud chat
    messages,
    sendMessage,
    conversations,
    
    // Local models
    isLocal,
    setIsLocal,
    handleSendLocalMessage,
    localModelDownloadProgress,
    isLocalModelReady,
    
    // Shared
    isSending,
    stream,
    chatError
  } = useChat();
  
  // Send cloud message
  await sendMessage("Hello", "text");
  
  // Send local message
  if (isLocal) {
    await handleSendLocalMessage("Hello");
  }
  
  // Switch to local mode
  setIsLocal(true);
  
  // Check download progress
  console.log(`Download: ${localModelDownloadProgress * 100}%`);
}
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│          ChatProvider Component              │
├─────────────────────────────────────────────┤
│                                             │
│  ┌────────────────┐    ┌─────────────────┐ │
│  │   useChat      │◄───┤ useLocalModel   │ │
│  │   (Main Hook)  │    │ (Delegated)     │ │
│  └────────────────┘    └─────────────────┘ │
│         │                      │            │
│         │                      │            │
│    ┌────▼─────┐          ┌────▼────┐       │
│    │  Cloud   │          │  Local  │       │
│    │  Chat    │          │  Models │       │
│    │  Logic   │          │  Logic  │       │
│    └──────────┘          └─────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

## 📊 State Organization in useChat.tsx

```typescript
// ============ Conversation State ============
conversations, currentConversationId

// ============ Message State ============
messages, additionalData

// ============ Loading & Sending State ============
isLoading, isSending, isChatLoading

// ============ Streaming State ============
stream, intermediate, streamWorking

// ============ Error State ============
error, chatError

// ============ File Handling State ============
files, pastedActive

// ============ Request Management ============
streamControllerRef, fetchControllerRef

// ============ Local Model Integration ============
const localModel = useLocalModel({ ... })
```

## 🔄 Message Flow

### Cloud Message
```
User Input
    ↓
sendMessage()
    ↓
POST /chat
    ↓
processStream()
    ↓
setStream()
    ↓
messages updated
    ↓
UI renders
```

### Local Message
```
User Input
    ↓
handleSendLocalMessage()
    ↓
llm.generate()
    ↓
onStreamUpdate()
    ↓
messages updated
    ↓
UI renders
```

## 🔀 Mode Switching

### Switch to Local
```typescript
setIsLocal(true)
    ↓
useLocalModel detects change
    ↓
Check crash protection
    ↓
Initialize ExecuTorch (deferred)
    ↓
Download model (if needed)
    ↓
Model ready
```

### Switch to Cloud
```typescript
setIsLocal(false)
    ↓
useLocalModel detects change
    ↓
Clean up local state
    ↓
Reset streaming states
    ↓
Cloud mode active
```

## 🎨 Key Features

### Optimizations
- ⚡ **Throttled Updates:** 50ms for messages
- ⚡ **Optimized Polling:** 5s progress, 3s ready state
- ⚡ **Memoization:** Prevents unnecessary re-renders
- ⚡ **RequestAnimationFrame:** Smooth UI updates
- ⚡ **InteractionManager:** Deferred heavy operations

### Error Handling
- 🛡️ **Crash Protection:** Auto-disable on repeated crashes
- 🛡️ **Network Errors:** Graceful degradation
- 🛡️ **Invalid Models:** User-friendly prompts
- 🛡️ **Memory Errors:** Device capability checks

### Lifecycle Management
- 🔄 **Cleanup:** Proper unmount handling
- 🔄 **Abort Controllers:** Cancel ongoing requests
- 🔄 **State Sync:** Ref-based cleanup prevention

## 🐛 Common Debugging

### Check Local Model State
```typescript
console.log('[Debug] Local Model:', {
  isLocal: localModel.isLocal,
  progress: localModel.localModelDownloadProgress,
  ready: localModel.isLocalModelReady,
  supported: localModel.isLocalLLMSupported
});
```

### Check Chat State
```typescript
console.log('[Debug] Chat:', {
  isSending,
  hasStream: !!stream,
  hasIntermediate: !!intermediate,
  messagesCount: messages.length,
  currentConvo: currentConversationId
});
```

### Monitor Streaming
```typescript
console.log('[Debug] Streaming:', {
  streamWorking,
  streamLength: stream?.length || 0,
  intermediate,
  effectiveIsSending
});
```

## 🚨 Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| Local models disabled | `CrashReporter.isLocalModelsDisabled()` | Wait 30min or re-enable |
| Model not downloading | Network, storage space | Check device capabilities |
| isSending stuck | `effectiveIsSending` logic | Check finally blocks execute |
| Messages not updating | Throttle timing | Verify stream/additionalData |
| Context re-rendering | Memo dependencies | Check contextValue deps |

## 📝 Quick Commands

```bash
# Check file sizes
wc -l hooks/useChat.tsx hooks/useLocalModel.tsx

# Search for TODO/FIXME
grep -n "TODO\|FIXME" hooks/useChat.tsx hooks/useLocalModel.tsx

# Check for console.logs
grep -n "console\." hooks/useChat.tsx hooks/useLocalModel.tsx

# Count state variables
grep -n "useState" hooks/useChat.tsx hooks/useLocalModel.tsx | wc -l
```

## 🎯 Next Steps

### To Add Cloud Features
1. Edit `hooks/useChat.tsx`
2. Add state/function
3. Export via context

### To Add Local Features
1. Edit `hooks/useLocalModel.tsx`
2. Add state/function
3. Return from hook
4. Pass through context in `useChat.tsx`

### To Debug Issues
1. Enable `__DEV__` logs
2. Check state in debugger
3. Monitor network/console
4. Test in isolation

## 📚 Related Files

- `utils/ChatStream.ts` - Stream processing
- `utils/DeviceCapabilities.ts` - Device checks
- `utils/CrashReporter.ts` - Crash protection
- `utils/DownloadedModelsTracker.ts` - Model tracking
- `constants/LocalModels.ts` - Model definitions
- `hooks/useDefaultLocalModel.tsx` - Model selection

