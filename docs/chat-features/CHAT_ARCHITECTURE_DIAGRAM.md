# Chat System Architecture - Enhanced

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatPage.tsx                             │
│                    (Main Orchestrator)                           │
│                                                                   │
│  State Management:                                               │
│  • messages, pinnedMessages, filteredMessages                   │
│  • showSearch, showExportModal, editingMessage                  │
│  • replyToMessage, searchQuery                                  │
│                                                                   │
│  Features:                                                       │
│  • Message rendering with FlashList                             │
│  • Real-time streaming                                          │
│  • Scroll management                                            │
│  • Keyboard handling                                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Coordinates
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Feature Components                           │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
    ┌────┴────┐    ┌────┴────┐   ┌────┴────┐   ┌────┴────┐
    │         │    │         │   │         │   │         │
    ▼         ▼    ▼         ▼   ▼         ▼   ▼         ▼

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ Message  │ │  Search  │ │  Export  │ │   Pin    │ │  Thread  │
│Reactions │ │   Bar    │ │  Modal   │ │   Bar    │ │ Indicator│
└──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘
    │             │             │             │             │
    │ 😀 Emojis   │ 🔍 Filter   │ 💾 Save    │ 📌 Quick   │ 💬 Context
    │ • Quick     │ • Debounced │ • TXT      │ • Scroll   │ • Reply To
    │ • Picker    │ • Real-time │ • Markdown │ • Unpin    │ • Visual
    │ • Categories│ • Highlight │ • JSON     │ • Preview  │ • Link
    └─────────────┴─────────────┴────────────┴────────────┴──────────


┌──────────┐ ┌──────────┐ ┌──────────┐
│   Edit   │ │   Link   │ │  Swipe   │
│  Modal   │ │ Preview  │ │ Actions  │
└──────────┘ └──────────┘ └──────────┘
    │             │             │
    │ ✏️ Edit     │ 🔗 Meta     │ ◀️▶️ Gestures
    │ • Textarea  │ • Favicon   │ • User: 4 actions
    │ • Counter   │ • Title     │ • Bot: 3 actions
    │ • Save/     │ • Image     │ • Haptic
    │   Cancel    │ • Desc      │ • Animated
    └─────────────┴─────────────┴──────────


┌─────────────────────────────────────────────────────────────────┐
│                     Core Components                              │
└─────────────────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐   ┌────┴────┐
    │         │    │         │   │         │
    ▼         ▼    ▼         ▼   ▼         ▼

┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│  Chat    │ │  Chat    │ │ Markdown │ │   Code   │
│ Message  │ │  Input   │ │ Display  │ │  Block   │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
    │             │             │             │
    │ 💬 Render   │ ⌨️ Input    │ 📝 Format   │ 📋 Copy
    │ • Text      │ • Voice     │ • Styles    │ • Language
    │ • Images    │ • Files     │ • Links     │ • Syntax
    │ • Audio     │ • Camera    │ • Tables    │ • Header
    │ • Video     │ • Options   │ • Lists     │ • Theme
    └─────────────┴─────────────┴─────────────┴──────────


┌─────────────────────────────────────────────────────────────────┐
│                     Data Layer                                   │
└─────────────────────────────────────────────────────────────────┘
         │              │              │
    ┌────┴────┐    ┌────┴────┐   ┌────┴────┐
    │         │    │         │   │         │
    ▼         ▼    ▼         ▼   ▼         ▼

┌──────────┐ ┌──────────┐ ┌──────────┐
│ useChat  │ │ Message  │ │ Exporter │
│  Hook    │ │Interface │ │  Utility │
└──────────┘ └──────────┘ └──────────┘
    │             │             │
    │ 🔄 State    │ 📊 Types    │ 💾 Export
    │ • Cloud     │ • Message   │ • Format
    │ • Local     │ • Reaction  │ • Share
    │ • Stream    │ • Status    │ • Size
    │ • History   │ • Thread    │ • Meta
    └─────────────┴─────────────┴──────────


┌─────────────────────────────────────────────────────────────────┐
│                     Message Flow                                 │
└─────────────────────────────────────────────────────────────────┘

User Action
    │
    ▼
┌────────────┐
│   Input    │ ──────► Voice Recording
│ Component  │ ──────► Image Selection
└────────────┘ ──────► Text Entry
    │
    │ onShouldSend
    ▼
┌────────────┐
│  useChat   │ ──────► Cloud: sendMessage()
│   Hook     │ ──────► Local: handleSendLocalMessage()
└────────────┘
    │
    │ Streaming
    ▼
┌────────────┐
│  Process   │ ──────► SSE Events
│   Stream   │ ──────► Update State
└────────────┘ ──────► Render
    │
    ▼
┌────────────┐
│  Message   │ ◄────── Reactions
│   Render   │ ◄────── Pinning
└────────────┘ ◄────── Thread
    │
    │ User Interaction
    ▼
┌────────────┐
│   Swipe    │ ──────► Edit
│  Actions   │ ──────► Reply
└────────────┘ ──────► Pin/Copy/Delete


┌─────────────────────────────────────────────────────────────────┐
│                     Feature Interactions                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────┐                                      ┌─────────┐
│ Search  │◄────────Filters──────────────────────│Messages │
└─────────┘                                      └─────────┘
     │                                                 │
     │                                                 │
     ▼                                                 ▼
┌─────────┐         ┌─────────┐                 ┌─────────┐
│ Export  │◄────────│  Pin    │─────────────────│ Thread  │
└─────────┘         └─────────┘                 └─────────┘
     │                   │                           │
     │                   │                           │
     ▼                   ▼                           ▼
┌─────────┐         ┌─────────┐                 ┌─────────┐
│  Share  │         │ Scroll  │                 │  Reply  │
└─────────┘         └─────────┘                 └─────────┘


┌─────────────────────────────────────────────────────────────────┐
│                     State Flow                                   │
└─────────────────────────────────────────────────────────────────┘

messages[] ──────► reversedMessages (useMemo)
                           │
                           ▼
                   filteredMessages (search)
                           │
                           ▼
                   pinnedMessages (filtered)
                           │
                           ▼
                   FlashList Render
                           │
                           ▼
                   SwipeableMessage
                           │
                           ▼
                   ChatMessage + Features


┌─────────────────────────────────────────────────────────────────┐
│                     Event Handlers Map                           │
└─────────────────────────────────────────────────────────────────┘

User Action              Handler                    Component
────────────────────────────────────────────────────────────────
Swipe Left/Right    →   SwipeableMessage      →    Action Buttons
Tap Reaction        →   handleAddReaction     →    MessageReactions
Long Press          →   Context Menu          →    ChatMessage
Edit Message        →   handleEditMessage     →    EditModal
Pin Message         →   handleMessagePin      →    PinnedMessagesBar
Reply to Message    →   handleReplyToMessage  →    ThreadIndicator
Search Messages     →   handleSearch          →    SearchBar
Export Chat         →   exportConversation    →    ExportModal
Copy Code           →   Clipboard.setString   →    CodeBlockWithCopy
Tap Pinned Card     →   handleScrollTo...     →    Navigate


┌─────────────────────────────────────────────────────────────────┐
│                     Performance Strategy                         │
└─────────────────────────────────────────────────────────────────┘

┌──────────────┐
│ Optimization │
└──────────────┘
      │
      ├─► useMemo (reversedMessages, calculations)
      │
      ├─► useCallback (all handlers)
      │
      ├─► FlashList (virtualized rendering)
      │
      ├─► Debouncing (search: 300ms)
      │
      ├─► Native Driver (all animations)
      │
      └─► Lazy Loading (modals, heavy components)


┌─────────────────────────────────────────────────────────────────┐
│                     Theme System                                 │
└─────────────────────────────────────────────────────────────────┘

useTheme Hook
      │
      ├─► Colors (primary, secondary, text, background)
      │
      ├─► Typography (sizes, weights, families)
      │
      ├─► Spacing (margins, padding, gaps)
      │
      ├─► Shadows (elevation, blur, offset)
      │
      └─► Dark/Light Mode (automatic switching)

All Components → getStyles(theme) → Dynamic Styles
```

## Component Dependencies

```
ChatPage
  ├── MessageSearchBar
  ├── PinnedMessagesBar
  ├── ExportConversationModal
  │     └── ConversationExporter (utility)
  ├── MessageEditModal
  ├── SwipeableMessage
  │     └── ChatMessage
  │           ├── MessageReactions
  │           ├── ThreadReplyIndicator
  │           ├── CodeBlockWithCopy
  │           ├── LinkPreview
  │           └── MarkdownDisplay
  ├── ChatInput
  └── useChat (hook)
```

## Data Flow

```
Backend API
    │
    ▼
useChat Hook (Context Provider)
    │
    ├─► Cloud Messages (SSE streaming)
    └─► Local Messages (ExecuTorch)
    │
    ▼
ChatPage (State Management)
    │
    ├─► Message Processing
    ├─► Feature State (pins, reactions, search)
    └─► UI Updates
    │
    ▼
Feature Components (Render)
    │
    └─► User Interactions ──┐
                            │
                            ▼
                    Event Handlers
                            │
                            └──► State Updates ──► Re-render
```

## Feature Toggle Flow

```
Feature Flags
    │
    ├─► REACTIONS_ENABLED ──► Show/Hide MessageReactions
    ├─► EDITING_ENABLED ──► Show/Hide Edit in Swipe
    ├─► PINNING_ENABLED ──► Show/Hide Pin Actions
    ├─► EXPORT_ENABLED ──► Show/Hide Export Button
    └─► THREADS_ENABLED ──► Show/Hide Reply Actions
```

---

This architecture ensures:
- ✅ **Modularity:** Each feature is self-contained
- ✅ **Scalability:** Easy to add new features
- ✅ **Maintainability:** Clear separation of concerns
- ✅ **Performance:** Optimized rendering and state management
- ✅ **Testability:** Components can be tested independently

