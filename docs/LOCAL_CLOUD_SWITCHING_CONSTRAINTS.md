# Local ↔️ Cloud Model Switching: Bugs Fixed & Constraints

## 🐛 Bugs Fixed

### 1. **Conversation Cleared on Mode Switch** ⭐ CRITICAL
**Problem:** When switching from cloud → local (or vice versa), conversation was briefly cleared and then reloaded
- Multiple race conditions causing old conversation to refetch after clearing
- Root causes:
  1. `resetChat()` didn't clear `currentConversationId` 
  2. Effect had `conversations` as dependency, triggering refetch during mode switch
  3. Navigation async delay allowed old `id` to trigger refetch

**Fix:** Three-part solution across multiple files

**Part 1: Clear conversation ID in resetChat** (useChat.tsx line 1219)
```typescript
const resetChat = useCallback(() => {
  setMessages([]);
  setStream('');
  setIntermediate('');
  setAdditionalData([]);
  setCurrentConversationId(null);  // ✅ Prevent refetch with stale ID
}, []);
```

**Part 2: Split effects to avoid race condition** (ChatPage.tsx lines 164-199)
```typescript
// ❌ OLD (buggy) - conversations dependency caused refetch
useEffect(() => {
  if (id) {
    setCurrentRoom(id);  // Refetches when conversations changes!
    // ... model selection code using conversations ...
  }
}, [id, conversations, resetChat]);

// ✅ NEW (fixed) - split into two effects
// Effect 1: Handle conversation loading (no conversations dependency)
useEffect(() => {
  if (id) {
    setCurrentRoom(id);  // Only runs when id changes
  } else {
    resetChat();  // Clear when id is undefined
  }
}, [id, resetChat, setCurrentRoom]);

// Effect 2: Update model selection (doesn't trigger fetch)
useEffect(() => {
  if (id) {
    const conv = conversations.find(c => c.id === id);
    // Update model selection...
  }
}, [id, conversations]);
```

**Part 3: Remove premature resetChat call** (ChatCustomDrawerContent.tsx)
```typescript
// ❌ OLD: resetChat() before navigation
resetChat();
router.push('/(chat)/new');

// ✅ NEW: Let navigation trigger clearing
setIsLocal(true);
router.push('/(chat)/new');  // resetChat() happens in effect
```

**Key insights:** 
- Clearing must happen AFTER navigation completes, not before
- `currentConversationId` must be cleared to prevent refetch
- Effect dependencies must not cause unintended refetches during mode switch

### 2. **Incomplete State Cleanup on Mode Switch**
**Problem:** When switching from local → cloud, local model state persisted
- Test flags (`hasTestedModelReady`, `hasTestedOnSwitch`) weren't reset
- Progress/ready state remained in memory
- Could cause initialization issues when switching back

**Fix:** Added cleanup logic in initialization effect (useChat.tsx lines 173-181)
```typescript
} else if (!isLocal && shouldInitializeLLM) {
  console.log('[Local] Switched to cloud mode - cleaning up local state...');
  setShouldInitializeLLM(false);
  setHasTestedModelReady(false);
  setHasTestedOnSwitch(false);
  setLocalModelDownloadProgress(0);
  setIsLocalModelReady(false);
}
```

### 3. **Polling Intervals Not Terminated**
**Problem:** Progress and ready state polling continued running after switching to cloud
- Wasted CPU cycles
- Potential memory leaks
- Battery drain

**Fix:** Early return in polling effect now properly cleans up (useChat.tsx line 1311-1316)

### 4. **Stream Conflicts Between Local and Cloud**
**Problem:** Local LLM response updates could interfere with cloud streaming
- Effect at line 250 updated stream from local model even in cloud mode
- Stale local responses could appear

**Fix:** Added mode check to prevent local updates in cloud mode (useChat.tsx)

### 5. **Ongoing Requests Not Aborted**
**Problem:** When switching modes mid-generation:
- Cloud streams continued in background when switching to local
- Local generation continued when switching to cloud

**Fix:** Added AbortController cleanup (useChat.tsx lines 1444-1449, 1461-1465)
```typescript
// Abort cloud stream when switching to local
if (streamControllerRef.current) {
  streamControllerRef.current.abort();
  streamControllerRef.current = null;
}

// Clear local generation when switching to cloud
if (isSending) {
  setIsSending(false);
}
```

---

## 🔒 Functionality Constraints

### **Local Models CANNOT Do:**

| Feature | Local | Cloud | Notes |
|---------|-------|-------|-------|
| Web Search | ❌ | ✅ | Requires internet API access |
| Image Generation | ❌ | ✅ | Too computationally intensive |
| Video Generation | ❌ | ✅ | Too computationally intensive |
| File Attachments | ❌ | ✅ | No vision model support |
| Audio Input | ❌ | ✅ | No STT in local model |
| Multi-file Upload | ❌ | ✅ | Not implemented for local |
| Conversation Sync | ⚠️ | ✅ | Local saves locally only |
| Full Context History | ❌ | ✅ | Limited to 20 messages (see below) |
| Real-time Streaming | ⚠️ | ✅ | Polling-based, not true streaming |

### **Context Window Limitations**

**Local Models:**
```typescript
const MAX_CONTEXT_MESSAGES = 20; // ~10 conversation turns
const contextMessages = conversationHistory.slice(-MAX_CONTEXT_MESSAGES);
```
- Only last 20 messages sent to model (line 384-385)
- Most local models have 2K-4K token limits
- Longer conversations lose earlier context

**Cloud Models:**
- Full conversation history maintained
- Token limits vary by model (typically 8K-128K+)

### **Device Requirements**

**Hardware:**
- ✅ ARMv8 or better architecture (64-bit)
- ✅ Minimum 4GB RAM (varies by model)
- ✅ 1.2GB - 3GB+ storage per model
- ❌ x86/Emulators not supported

**Software:**
- iOS: 14.0+
- Android: API level 26+ (Android 8.0+)

**Supported Models:**
| Model | Size | RAM Needed | Context | Speed |
|-------|------|------------|---------|-------|
| Llama 3.2 1B | ~1.2GB | 2GB+ | 2K tokens | Fast |
| Llama 3.2 3B | ~2.5GB | 4GB+ | 2K tokens | Medium |
| Qwen 2.5 0.5B | ~600MB | 2GB+ | 2K tokens | Very Fast |

### **Performance Characteristics**

**Local Models:**
- ⏱️ First message: 5-30 seconds (model loading)
- ⏱️ Subsequent: 0.5-3 seconds per message
- 🔋 Battery intensive during generation
- 📱 Device gets warm during use
- 💾 Storage space required for download

**Cloud Models:**
- ⏱️ Every message: 1-5 seconds (network dependent)
- ⏱️ No warm-up delay
- 🔋 Minimal battery impact
- 📱 Device stays cool
- 🌐 Requires internet connection

---

## ⚠️ Switching Behavior

### **What Happens When You Switch:**

**Cloud → Local:**
- ✅ Creates a NEW local conversation
- ❌ Cloud conversation history is CLEARED (no preservation)
- ✅ Starts with empty chat for local mode
- ℹ️ Model downloads on first message (if not already downloaded)

**Local → Cloud:**
- ✅ Creates a NEW cloud conversation (saved to server)
- ❌ Local conversation is CLEARED (no preservation)
- ✅ Starts with empty chat for cloud mode
- ℹ️ Cloud models available immediately (no download)

### **Safe to Switch:**
- ✅ Between messages (when not generating)
- ✅ While viewing conversation history
- ✅ In settings/configuration

### **Handle with Care:**
- ⚠️ During message generation (will abort current request)
- ⚠️ During file upload (may lose file)
- ⚠️ During local model download (will pause download)

### **Mode Switch Flow:**

**Cloud → Local:**
1. Delete current conversation: `deleteConversation()`
2. Clear all conversation history: `clearAllConversations()`
3. Reset chat state: `resetChat()`
4. Set mode to local: `setIsLocal(true)`
5. Navigate to new conversation: `router.push('/(chat)/new')`
6. Abort any ongoing cloud stream
7. Initialize ExecuTorch library: `shouldInitializeLLM = true`
8. Download model if not present (shows progress)
9. Test model readiness with "Hi" message
10. Ready to accept user messages

**Local → Cloud:**
1. Delete current conversation: `deleteConversation()`
2. Clear all conversation history: `clearAllConversations()`
3. Reset chat state: `resetChat()`
4. Set mode to cloud: `setIsLocal(false)`
5. Create new server-side conversation
6. Navigate to new conversation: `router.push('/(chat)/{id}')`
7. Abort any local generation
8. Clean up all local state flags
9. Stop polling intervals
10. Set `shouldInitializeLLM = false`
11. Ready to accept user messages immediately

---

## 🔍 Debugging Tips

**Enable debug logs:** Uncomment console.log statements in useChat.tsx

**Check mode state:**
```typescript
console.log({
  isLocal,
  shouldInitializeLLM,
  hasTestedModelReady,
  hasTestedOnSwitch,
  localModelDownloadProgress,
  isLocalModelReady
});
```

**Monitor abort controllers:**
- `streamControllerRef.current` - Cloud streaming
- `fetchControllerRef.current` - Message fetching

**Track model status:**
```typescript
llm.isReady // Model loaded and ready
llm.downloadProgress // 0.0 - 1.0
llm.isGenerating // Currently generating
llm.error // Any errors
```

---

## 📋 Best Practices

### **For Users:**
1. **Switch between messages** - Don't interrupt generation
2. **Check storage** - Ensure enough space before downloading models
3. **Use local for privacy** - No data sent to servers
4. **Use cloud for features** - Web search, images, files require cloud

### **For Developers:**
1. **Always cleanup state** - Clear flags, abort controllers, intervals
2. **Test mode switches** - Verify no memory leaks or state conflicts
3. **Handle edge cases** - Mid-generation switches, network errors
4. **Provide feedback** - Show download progress, initialization status
5. **Graceful degradation** - Disable unsupported features in local mode

---

## 🚀 Future Improvements

**Potential Enhancements:**
- [ ] Support file attachments in local mode (vision models)
- [ ] Increase context window for local models
- [ ] Pause/resume model downloads
- [ ] Multiple local models loaded simultaneously
- [ ] Hybrid mode (local for text, cloud for images)
- [ ] Background model pre-loading
- [ ] Smart model switching based on query type

---

**Last Updated:** October 10, 2025
**Related Files:**
- `jaime-mobile-app/hooks/useChat.tsx` - Main chat hook
- `jaime-mobile-app/utils/DeviceCapabilities.ts` - Device support checks
- `jaime-mobile-app/constants/LocalModels.ts` - Model definitions

