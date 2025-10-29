# Notification Queue System - Visual Guide

**Quick visual reference for notification queueing behavior**

---

## 📊 Basic Flow

### Single Notification (Normal)

```
User switches to Chat B
Chat A completes in background
      ↓
┌─────────────────────────────┐
│ ✓ Chat A completed        × │
│   Tap to view response      │
└─────────────────────────────┘
      ↓ (6 seconds)
Notification fades away
```

---

## 🔄 Sequential Display (2 Notifications)

```
┌────────────────────────────────────────────────────────┐
│              Timeline View                              │
└────────────────────────────────────────────────────────┘

t=0s: Chat A & B complete simultaneously
      ↓
┌─────────────────────────────┐
│ ✓ Chat A completed        × │ ◄─ Shows first
│   Tap to view response      │
└─────────────────────────────┘
[Chat B queued]

      ↓ 6 seconds
      
Notification fades away
      
      ↓ 1 second spacing
      
┌─────────────────────────────┐
│ ✓ Chat B completed        × │ ◄─ Shows second
│   Tap to view response      │
└─────────────────────────────┘
      
      ↓ 6 seconds
      
Notification fades away ✅
```

**Total Time:** 14 seconds  
**User sees:** Clean, sequential notifications

---

## 🔗 Combined Display (3+ Notifications)

```
┌────────────────────────────────────────────────────────┐
│         Smart Combining Flow                            │
└────────────────────────────────────────────────────────┘

t=0s: Chat A, B, C complete within 2 seconds
      ↓
Queue: [Chat A, Chat B, Chat C]
      ↓
Check: 3+ notifications? YES
      ↓
Combine into single notification
      ↓
┌─────────────────────────────┐
│ 🔔 3 Conversations        × │ ◄─ Combined!
│   3 responses completed.    │
│   Tap to view.              │
└─────────────────────────────┘
      ↓ 6 seconds
Notification fades away ✅

Result: ONE notification instead of THREE!
```

---

## 📱 Visual Comparison

### Before (Without Queue)

```
Chat A completes:
┌─────────────────────────────┐
│ ✓ Chat A completed          │
└─────────────────────────────┘

Chat B completes (overlap!):
┌─────────────────────────────┐
│ ✓ Chat B completed          │ ◄─ Overlaps!
│ ✓ Chat A completed          │
└─────────────────────────────┘

Chat C completes (more overlap!):
┌─────────────────────────────┐
│ ✓ Chat C completed          │ ◄─ Messy!
│ ✓ Chat B completed          │
│ ✓ Chat A completed          │
└─────────────────────────────┘

User sees: 😵 Confusing mess!
```

---

### After (With Queue)

```
Option 1: Sequential (if < 3)
┌─────────────────────────────┐
│ ✓ Chat A completed        × │
└─────────────────────────────┘
      ↓ Wait
┌─────────────────────────────┐
│ ✓ Chat B completed        × │
└─────────────────────────────┘

User sees: ✅ Clean, organized!


Option 2: Combined (if 3+)
┌─────────────────────────────┐
│ 🔔 3 Conversations        × │
│   3 responses completed.    │
│   Tap to view.              │
└─────────────────────────────┘

User sees: ✅ Single, clear notification!
```

---

## ⏱️ Timing Diagram

```
┌────────────────────────────────────────────────────────┐
│        Sequential Notifications Timeline                │
└────────────────────────────────────────────────────────┘

0s    |─────────┐
      │ Chat A  │ Show notification
6s    └─────────┘ Hide notification
7s               ─ Spacing delay (1s)
      |─────────┐
      │ Chat B  │ Show notification
13s   └─────────┘ Hide notification
14s              ✅ Queue empty


Legend:
|──────| = Notification visible
───      = Spacing/waiting
```

---

## 🎯 Priority System

```
┌────────────────────────────────────────────────────────┐
│           Priority Handling                             │
└────────────────────────────────────────────────────────┘

Scenario: Normal notification showing, high priority arrives

Normal notification showing:
┌─────────────────────────────┐
│ ✓ Chat A completed          │
└─────────────────────────────┘

High priority notification arrives:
      ↓
┌─────────────────────────────┐
│ ⚠️  Save Failed           × │ ◄─ Shows immediately!
│   Retry automatically       │
└─────────────────────────────┘

Chat A resumes after:
      ↓
┌─────────────────────────────┐
│ ✓ Chat A completed          │
└─────────────────────────────┘
```

---

## 🔍 Queue State Visualization

### Empty Queue

```
Queue: []
Currently Showing: None

No notifications pending ✅
```

---

### Small Queue (< 3)

```
Queue: [Chat A, Chat B]
Currently Showing: None

Processing:
  → Show Chat A
  → Wait 6s
  → Hide
  → Wait 1s
  → Show Chat B
  → Wait 6s
  → Done
```

---

### Large Queue (3+)

```
Queue: [Chat A, Chat B, Chat C, Chat D, Chat E]
Currently Showing: None

Processing:
  → Combine first 3
  → Show "3 Conversations"
  → Wait 6s
  → Hide
  → Wait 1s
  → Show Chat D
  → Wait 6s
  → Hide
  → Wait 1s  
  → Show Chat E
  → Done
```

---

## 📋 Combining Logic

```
┌────────────────────────────────────────────────────────┐
│        When to Combine?                                 │
└────────────────────────────────────────────────────────┘

Check 1: Queue size ≥ 3?
   ├─ NO  → Show individually
   └─ YES → Check window

Check 2: All within 2-second window?
   ├─ NO  → Show individually
   └─ YES → Combine! ✅


Example 1: Should Combine
t=0s:  Chat A arrives
t=0.5s: Chat B arrives
t=1s:   Chat C arrives
Window: All within 1s ✅
Result: Combine into "3 Conversations"


Example 2: Should NOT Combine
t=0s:  Chat A arrives
t=5s:  Chat B arrives
t=10s: Chat C arrives
Window: Spread over 10s ❌
Result: Show individually (sequential)
```

---

## 🎨 UI States

### Individual Notification

```
┌─────────────────────────────────────────┐
│  ✓  │ Mexico Trip completed          × │
│     │ Tap to view response             │
│     │                                  │
└─────────────────────────────────────────┘
  Icon    Title & Message            Close
```

---

### Combined Notification

```
┌─────────────────────────────────────────┐
│  🔔 │ 3 Conversations                × │
│     │ 3 responses completed.           │
│     │ Tap to view.                     │
│     │ +2 more                          │
└─────────────────────────────────────────┘
  Icon    Title, Message & Count     Close
```

**Differences:**
- Icon: 🔔 (bell) instead of ✓ (checkmark)
- Title: "X Conversations" instead of chat name
- Extra: "+N more" for counts > 3

---

## 🔄 State Machine

```
┌────────────────────────────────────────────────────────┐
│          Notification State Machine                     │
└────────────────────────────────────────────────────────┘

IDLE
  │
  ├─ showNotification() called
  │  └─► QUEUED
  │
  └─ high priority
     └─► SHOWING


QUEUED
  │
  ├─ previous notification hides
  │  └─► PROCESSING
  │
  └─ clearQueue() called
     └─► IDLE


PROCESSING
  │
  ├─ queue size < 3
  │  └─► SHOWING (individual)
  │
  └─ queue size ≥ 3
     └─► SHOWING (combined)


SHOWING
  │
  ├─ timeout (6s)
  │  └─► HIDING
  │
  ├─ user dismisses
  │  └─► HIDING
  │
  └─ high priority arrives
     └─► INTERRUPTING


HIDING
  │
  └─ animation completes
     │
     ├─ queue empty
     │  └─► IDLE
     │
     └─ queue not empty
        └─► Wait 1s → PROCESSING
```

---

## 📊 Scenario Matrix

| Scenario | Queue Size | Within Window | Result |
|----------|------------|---------------|--------|
| 1 notification | 1 | N/A | Show immediately |
| 2 notifications | 2 | N/A | Sequential (1s spacing) |
| 3 quick | 3 | Yes | Combined notification |
| 3 slow | 3 | No | Sequential (1s spacing) |
| 5 quick | 5 | Yes | Combined notification |
| 5 mixed | 5 | Some | Combine first 3, sequential rest |
| High priority | Any | Any | Show immediately |

---

## 🎯 User Experience Paths

### Path 1: Power User (Multiple Chats)

```
User workflow:
1. Ask question in Chat A
2. Switch to Chat B
3. Ask question in Chat B  
4. Switch to Chat C
5. Ask question in Chat C
6. Switch to Chat D (doing other work)

AI completes all 3 in background
      ↓
User sees:
┌─────────────────────────────┐
│ 🔔 3 Conversations        × │
│   3 responses completed.    │
└─────────────────────────────┘

User reaction: "Nice! They're all done" ✅
```

---

### Path 2: Casual User (2 Chats)

```
User workflow:
1. Ask question in Chat A
2. Switch to Chat B
3. Ask question in Chat B
4. Switch to settings

AI completes both
      ↓
User sees:
┌─────────────────────────────┐
│ ✓ Chat A completed        × │
└─────────────────────────────┘
(6 seconds)
┌─────────────────────────────┐
│ ✓ Chat B completed        × │
└─────────────────────────────┘

User reaction: "Got both responses" ✅
```

---

### Path 3: Urgent Error During Chat

```
User workflow:
1. Chat A completing (notification showing)
2. Network error occurs

System shows:
┌─────────────────────────────┐
│ ⚠️  Save Failed           × │ ◄─ Interrupts!
│   Will retry automatically  │
└─────────────────────────────┘

Then resumes:
┌─────────────────────────────┐
│ ✓ Chat A completed        × │
└─────────────────────────────┘

User reaction: "Glad I saw that error" ✅
```

---

## 🔧 Debug Visualization

### Console Output Example

```
[NotificationQueue] 📬 Adding notification to queue: Chat A (currentQueue: 0)
[NotificationQueue] 🔄 Processing queue, size: 1
[NotificationQueue] 📤 Showing next notification: Chat A

     ▼ 6 seconds pass ▼

[NotificationQueue] 🔕 Hiding notification

     ▼ 1 second spacing ▼

[NotificationQueue] 📬 Adding notification to queue: Chat B (currentQueue: 0)
[NotificationQueue] 🔄 Processing queue, size: 1
[NotificationQueue] 📤 Showing next notification: Chat B
```

For combining:
```
[NotificationQueue] 📬 Adding notification to queue: Chat A (currentQueue: 0)
[NotificationQueue] 📬 Adding notification to queue: Chat B (currentQueue: 1)
[NotificationQueue] 📬 Adding notification to queue: Chat C (currentQueue: 2)
[NotificationQueue] 🔄 Processing queue, size: 3
[NotificationQueue] 🔗 Combining 3 notifications
[NotificationQueue] 📤 Showing combined notification: 3 Conversations
```

---

## 📈 Performance Profile

```
Queue Processing Time:
│
│  5ms ┤  ║  (combine 3+)
│  3ms ┤  ║
│  1ms ┤  █  (single)
│  0ms ┴──┴──────────────────────►
      Single  Combine


Memory Usage:
│
│  2KB ┤         ╭──── (5 queued)
│  1KB ┤    ╭────╯
│ .5KB ┤ ╭──╯
│  0KB ┴─┴──────────────────────►
      0   2   4   6   8   10
      Queue Size


Impact: Minimal ✅
```

---

## ✨ Key Concepts

### Sequential = Clean

```
Bad (Overlap):
┌───────┐
│ Chat A│
└───────┘
┌───────┐  ← Overlaps!
│ Chat B│
└───────┘

Good (Sequential):
┌───────┐
│ Chat A│
└───────┘
   ↓ spacing
┌───────┐  ← Clean!
│ Chat B│
└───────┘
```

---

### Combining = Efficient

```
Bad (3 individual):
Show Chat A (6s)
Wait (1s)
Show Chat B (6s)
Wait (1s)
Show Chat C (6s)
Total: 20 seconds!

Good (1 combined):
Show "3 Conversations" (6s)
Total: 6 seconds! ✅
```

---

### Priority = Important

```
Normal priority:
Chat A → Queue → Wait → Show

High priority:
Error → Skip Queue → Show NOW! ⚡
```

---

**Last Updated:** October 29, 2025  
**Status:** Complete  
**Usage:** Visual reference for notification behavior

🎨 **Beautiful, organized notifications at a glance!**

