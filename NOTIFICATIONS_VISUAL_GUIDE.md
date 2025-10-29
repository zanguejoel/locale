# Background Stream Notifications - Visual Guide

## 📱 User Flow

```
┌─────────────────────────────────────────────────┐
│                    Chat A                       │
│  You: "Write a detailed essay about AI"        │
│  AI: Streaming response...                     │
│                                                 │
│  [User taps Chat B in drawer]                  │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│                    Chat B                       │
│  You: "What's the weather?"                    │
│  AI: Loading...                                │
│                                                 │
│  [Chat A continues streaming in background]    │
└─────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────┐
│                    Chat B                       │
│  You: "What's the weather?"                    │
│  AI: "It's sunny today..."                     │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │ 🎉 AI response completed in background   │ │ ← Toast appears
│  └───────────────────────────────────────────┘ │
│              ↑ Haptic vibration                 │
└─────────────────────────────────────────────────┘
```

---

## 🎨 Toast Visual Mockup

```
┌─────────────────────────────────────────────────┐
│                  Chat Screen                    │
│                                                 │
│  Messages...                                   │
│  Messages...                                   │
│  Messages...                                   │
│                                                 │
│  [Chat Input]                                  │
│                                                 │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │
│  ┃ 📬 AI response completed in background     ┃ │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│  ↑ Green background (#10b981)                   │
│  ↑ White text                                   │
│  ↑ Bottom position (non-intrusive)              │
│  ↑ 3.5 second duration                          │
│  ↑ Tap to dismiss                               │
└─────────────────────────────────────────────────┘
```

---

## 🔄 State Transitions

### Before Implementation
```
Chat A (Streaming) → Navigate to Chat B → Stream Continues
                                           ↓
                                    (User doesn't know when complete)
```

### After Implementation
```
Chat A (Streaming) → Navigate to Chat B → Stream Continues
                                           ↓
                                    Stream Completes
                                           ↓
                                    Toast + Haptic ✅
                                           ↓
                                    User is informed!
```

---

## 🎯 Decision Tree

```
Stream Completes
    ↓
Is conversation focused?
    ↓
    ├─ YES → No notification (user already sees it)
    │
    └─ NO → Is stream still active (not aborted)?
            ↓
            ├─ YES → Show toast + haptic ✅
            │
            └─ NO → No notification (was aborted)
```

---

## 📊 State Management Architecture

```
┌──────────────────────────────────────────────────────┐
│            StreamingStateContext                     │
│                                                      │
│  Map<conversationId, StreamState>                   │
│  {                                                   │
│    conversationId: "chat-123",                      │
│    isActive: false,        ← User navigated away    │
│    isStreaming: true,      ← Stream still active    │
│    controller: AbortController,                     │
│    timestamp: 1234567890,                           │
│    progress: 1250         ← Characters received     │
│  }                                                   │
└──────────────────────────────────────────────────────┘
                      ↓
                completeStream()
                      ↓
            Check: !isActive && isStreaming?
                      ↓
                    YES ✅
                      ↓
              Toast.show() + Haptics
```

---

## 🧪 Test Matrix

| User Action | Stream State | Active? | Notification? |
|-------------|-------------|---------|---------------|
| Send → Stay | Streaming | ✅ Yes | ❌ No |
| Send → Leave | Streaming | ❌ No | ✅ Yes |
| Send → Leave → Return | Streaming | ✅ Yes | ❌ No |
| Abort stream | Aborted | ❌ No | ❌ No |
| Error occurs | Error | ❌ No | ❌ No |

---

## 🎨 Color Scheme

### Toast Background
```
#10b981 - Emerald Green
━━━━━━━━━━━━━━━━━━━━━━
█████████████████████ RGB(16, 185, 129)
Success / Completion color
Accessible contrast with white text
```

### Toast Text
```
#ffffff - White
━━━━━━━━━━━━━━━━━━━━━━
█████████████████████ RGB(255, 255, 255)
High contrast on green background
Easy to read at a glance
```

---

## 📏 Timing Diagram

```
Time (seconds)
0s ────────────────────────────────────── Stream starts
              User navigates away ────────── 2s
                                    ────────── 4s
                                    ────────── 6s
                                    ────────── 8s
                         Stream completes ──── 10s
                         Toast appears ─────── 10s
                         Haptic triggers ───── 10s
                                    ────────── 12s
                         Toast fades out ───── 13.5s
```

---

## 🔧 Code Flow Diagram

```
┌─────────────────────────────────────────────────┐
│ User sends message in Chat A                    │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ useChat.sendMessage()                           │
│ ├─ globalStreamManager.startStream()            │
│ └─ streamingState.startStream() ← Register     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ User navigates to Chat B                        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ useChat.fetchMessages(chatB)                    │
│ └─ streamingState.setActiveConversation(chatB) │
│    ├─ Chat A: isActive = false                  │
│    └─ Chat B: isActive = true                   │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ Chat A stream completes                         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ useChat.sendMessage() finally block             │
│ └─ streamingState.completeStream(chatA)         │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ StreamingStateContext.completeStream()          │
│ ├─ Check: !isActive && isStreaming? ✅         │
│ ├─ Haptics.notificationAsync(Success)          │
│ └─ Toast.show("AI response completed...")      │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│ User sees toast + feels haptic                  │
│ Toast auto-dismisses after 3.5s                 │
└─────────────────────────────────────────────────┘
```

---

## 🎭 Interaction States

### State 1: Focused Completion
```
┌──────────────────────┐
│   User in Chat A    │
│   ↓                 │
│   Streaming...      │
│   ↓                 │
│   Complete!         │
│   ↓                 │
│   No toast (👀)     │ ← User already watching
└──────────────────────┘
```

### State 2: Background Completion
```
┌──────────────────────┐
│   User in Chat A    │
│   ↓                 │
│   Streaming...      │
│   ↓                 │
│   Switch to Chat B  │ ← Navigation
│   ↓                 │
│   Complete!         │
│   ↓                 │
│   Toast + Haptic ✅ │ ← User notified
└──────────────────────┘
```

### State 3: Return Before Completion
```
┌──────────────────────┐
│   User in Chat A    │
│   ↓                 │
│   Streaming...      │
│   ↓                 │
│   Switch to Chat B  │
│   ↓                 │
│   Switch to Chat A  │ ← Return before complete
│   ↓                 │
│   Complete!         │
│   ↓                 │
│   No toast (👀)     │ ← User already back
└──────────────────────┘
```

---

## 🎨 Animation Flow

```
Toast appears:
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│        │  │   ▁    │  │   ▂    │  │   ▃    │
│        │  │        │  │   ▁    │  │   ▂    │
│        │  │        │  │        │  │   ▁    │
└────────┘  └────────┘  └────────┘  └────────┘
  Frame 1     Frame 2     Frame 3     Frame 4

┌────────┐  ┌────────┐  ┌────────┐
│   ▄    │  │   ▅    │  │ ▆▆▆▆▆▆ │
│   ▃    │  │   ▄    │  │   ▅    │
│   ▂    │  │   ▃    │  │   ▄    │
└────────┘  └────────┘  └────────┘
  Frame 5     Frame 6     Frame 7

Slide up animation with fade in
Duration: ~300ms
Easing: ease-out
```

---

## 📱 Platform Differences

### iOS
- ✅ Haptic feedback: Full support
- ✅ Toast: Smooth animations
- ✅ Shadow: Native shadow rendering

### Android
- ✅ Haptic feedback: Full support
- ✅ Toast: Smooth animations
- ✅ Shadow: Elevation-based shadows

**No platform-specific code needed** - react-native-root-toast handles both!

---

## 🎯 Success Metrics

### User Experience
- ✅ No lost responses
- ✅ Clear feedback
- ✅ Non-intrusive (bottom position)
- ✅ Quick dismissal (tap or wait)
- ✅ Haptic reinforcement

### Technical
- ✅ Zero new dependencies
- ✅ Minimal performance impact
- ✅ No linter errors
- ✅ Proper state management
- ✅ Clean code architecture

---

## 🔮 Visual Preview Comparison

### Before
```
Chat A: Streaming... → Switch to Chat B → ??? (silence)
User thinks: "Did it finish? Should I check?"
```

### After
```
Chat A: Streaming... → Switch to Chat B → Toast! ✨
User knows: "Oh! The response is ready in Chat A"
```

---

## 📚 Quick Links

- **Full Docs:** `BACKGROUND_STREAM_NOTIFICATIONS.md`
- **Quick Ref:** `BACKGROUND_NOTIFICATIONS_QUICK_REF.md`
- **Code:** `contexts/StreamingStateContext.tsx`, `hooks/useChat.tsx`

---

**Visual Guide Version:** 1.0  
**Created:** October 29, 2025  
**Status:** ✅ Complete

