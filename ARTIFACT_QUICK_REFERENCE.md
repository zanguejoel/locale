# Artifact Implementation - Quick Reference

## 🚀 Quick Start

### 1. New Files (Copy These)
```
✅ utils/ArtifactTypes.ts
✅ utils/ArtifactParser.ts
✅ components/artifacts/ArtifactIndicator.tsx
✅ components/artifacts/ArtifactViewerModal.tsx
✅ components/artifacts/renderers/CodeRenderer.tsx
✅ components/artifacts/renderers/MarkdownRenderer.tsx
```

### 2. Files to Modify
```
⏳ hooks/useChat.tsx               (10 changes)
⏳ components/ChatMessage.tsx      (6 changes)
⏳ components/ChatPage.tsx         (6 changes)
```

---

## 📝 Modification Cheat Sheet

### useChat.tsx - 10 Changes

```typescript
// 1. IMPORTS
import { Artifact } from '@/utils/ArtifactTypes';
import { extractArtifactFromStream, extractArtifactsFromMessage } from '@/utils/ArtifactParser';

// 2. ADD TO INTERFACE (line ~77)
interface ChatContextType {
  artifacts: Artifact[];
  currentStreamingArtifact: Artifact | null;
  getArtifactsForMessage: (messageId: string) => Artifact[];
}

// 3. ADD STATE (after line 122)
const [artifacts, setArtifacts] = useState<Artifact[]>([]);
const [currentStreamingArtifact, setCurrentStreamingArtifact] = useState<Artifact | null>(null);

// 4. STREAM PROCESSING (after line 257)
useEffect(() => {
  if (stream) {
    const streamingArtifact = extractArtifactFromStream(stream);
    setCurrentStreamingArtifact(streamingArtifact);
  } else {
    setCurrentStreamingArtifact(null);
  }
}, [stream]);

// 5. FINALIZE FUNCTION (after sendMessage)
const finalizeArtifacts = useCallback((messageContent: string, messageId: string) => {
  const extractedArtifacts = extractArtifactsFromMessage(messageContent, messageId);
  if (extractedArtifacts.length > 0) {
    setArtifacts(prev => [...prev, ...extractedArtifacts]);
  }
}, []);

// 6. GET ARTIFACTS FUNCTION
const getArtifactsForMessage = useCallback((messageId: string): Artifact[] => {
  return artifacts.filter(artifact => artifact.messageId === messageId);
}, [artifacts]);

// 7. CALL FINALIZE (in sendMessage finally block, line ~812)
finally {
  // ... existing cleanup
  if (stream && currentConversationId) {
    const messageId = `${currentConversationId}-${Date.now()}`;
    finalizeArtifacts(stream, messageId);
  }
}

// 8. CLEAR ON RESET (in resetChat, line ~1008)
setArtifacts([]);
setCurrentStreamingArtifact(null);

// 9. ADD TO CONTEXT (line ~1134)
return {
  // ... existing
  artifacts,
  currentStreamingArtifact,
  getArtifactsForMessage,
};

// 10. ADD TO DEPENDENCIES (line ~1174)
[
  // ... existing
  artifacts,
  currentStreamingArtifact,
  getArtifactsForMessage,
]
```

---

### ChatMessage.tsx - 6 Changes

```typescript
// 1. IMPORTS
import { extractArtifactsFromMessage, stripArtifactTags } from '@/utils/ArtifactParser';
import ArtifactIndicator from './artifacts/ArtifactIndicator';
import { Artifact } from '@/utils/ArtifactTypes';

// 2. ADD TO PROPS (line ~43)
interface ChatMessageProps extends Message {
  onArtifactPress?: (artifact: Artifact) => void;
  artifacts?: Artifact[];
}

// 3. EXTRACT ARTIFACTS (in component, line ~197)
const messageArtifacts = useMemo(() => {
  if (providedArtifacts) return providedArtifacts;
  if (role === Role.Bot && content) {
    return extractArtifactsFromMessage(content, 'message-' + timestamp);
  }
  return [];
}, [content, role, providedArtifacts, timestamp]);

// 4. STRIP TAGS (in component)
const displayContent = useMemo(() => {
  if (role === Role.Bot && messageArtifacts.length > 0) {
    return stripArtifactTags(content);
  }
  return content;
}, [content, role, messageArtifacts]);

// 5. USE displayContent (line ~839, ~1038)
<MarkdownDisplay>{displayContent}</MarkdownDisplay>

// 6. RENDER INDICATORS (after line ~907)
{messageArtifacts.length > 0 && (
  <View style={styles.artifactsContainer}>
    {messageArtifacts.map((artifact) => (
      <ArtifactIndicator
        key={artifact.id}
        artifact={artifact}
        onPress={() => onArtifactPress?.(artifact)}
      />
    ))}
  </View>
)}

// BONUS: ADD STYLE (line ~1683)
artifactsContainer: {
  marginTop: 12,
  gap: 8,
},
```

---

### ChatPage.tsx - 6 Changes

```typescript
// 1. IMPORTS
import { useState, useCallback } from 'react';
import ArtifactViewerModal from './artifacts/ArtifactViewerModal';
import { Artifact } from '@/utils/ArtifactTypes';

// 2. ADD STATE (in component)
const [artifactModalVisible, setArtifactModalVisible] = useState(false);
const [selectedArtifacts, setSelectedArtifacts] = useState<Artifact[]>([]);
const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);

// 3. GET FROM CONTEXT
const {
  messages,
  artifacts,
  currentStreamingArtifact,
  getArtifactsForMessage,
} = useChat();

// 4. HANDLE PRESS
const handleArtifactPress = useCallback((artifact: Artifact) => {
  const messageArtifacts = artifact.messageId 
    ? getArtifactsForMessage(artifact.messageId)
    : [artifact];
  const index = messageArtifacts.findIndex(a => a.id === artifact.id);
  setSelectedArtifacts(messageArtifacts);
  setSelectedArtifactIndex(index !== -1 ? index : 0);
  setArtifactModalVisible(true);
}, [getArtifactsForMessage]);

// 5. PASS TO MESSAGES (when rendering ChatMessage)
<ChatMessage
  {...message}
  onArtifactPress={handleArtifactPress}
  artifacts={getArtifactsForMessage(message.id || '')}
/>

// 6. RENDER MODAL (at end of component)
<ArtifactViewerModal
  visible={artifactModalVisible}
  artifacts={selectedArtifacts}
  initialIndex={selectedArtifactIndex}
  onClose={() => setArtifactModalVisible(false)}
/>
```

---

## 🎯 Testing Commands

### Quick Test Prompts

```bash
# Test 1: Basic Code Artifact
"Write a Python function to reverse a string"

# Test 2: Multiple Artifacts
"Show me 3 different sorting algorithms in Python"

# Test 3: Markdown Document
"Create a markdown guide about React hooks"

# Test 4: Complex Code
"Build a REST API with Node.js and Express"
```

### Debug Console Logs

```typescript
// In useChat.tsx
console.log('Artifacts:', artifacts);
console.log('Streaming artifact:', currentStreamingArtifact);

// In ChatMessage.tsx
console.log('Message artifacts:', messageArtifacts);
console.log('Display content:', displayContent);

// In ChatPage.tsx
console.log('Selected artifacts:', selectedArtifacts);
console.log('Modal visible:', artifactModalVisible);
```

---

## 🐛 Common Issues & Fixes

### Issue: "Module not found: ArtifactIndicator"
```bash
# Check file path
ls components/artifacts/ArtifactIndicator.tsx

# Restart Metro bundler
npm start -- --reset-cache
```

### Issue: Artifacts not appearing
```typescript
// Add debug in ChatMessage.tsx
useEffect(() => {
  console.log('Content:', content);
  console.log('Artifacts found:', messageArtifacts);
}, [content, messageArtifacts]);
```

### Issue: Modal not opening
```typescript
// Add debug in handleArtifactPress
const handleArtifactPress = (artifact) => {
  console.log('Pressed artifact:', artifact.id);
  console.log('Setting modal visible to true');
  setArtifactModalVisible(true);
};
```

### Issue: TypeScript errors
```bash
# Check all files are saved
# Restart TypeScript server in VSCode
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## 📊 Implementation Status

### ✅ Complete (MVP)
- [x] Type definitions and utilities
- [x] Artifact parsing from stream
- [x] Inline indicators
- [x] Full-screen viewer modal
- [x] Code renderer
- [x] Markdown renderer
- [x] Copy/Share actions
- [x] Multi-artifact navigation

### 🔜 Coming Soon
- [ ] Chart renderer (Victory Native)
- [ ] HTML renderer (WebView)
- [ ] Mermaid renderer (SVG)
- [ ] PDF renderer
- [ ] Download functionality
- [ ] Artifact search

---

## 🎨 Color Reference

```typescript
// Primary Blue (Artifacts)
'#3b82f6' // rgb(59, 130, 246)

// Gradient
Dark Mode: ['rgba(59, 130, 246, 0.15)', 'rgba(37, 99, 235, 0.15)']
Light Mode: ['rgba(59, 130, 246, 0.1)', 'rgba(37, 99, 235, 0.1)']

// Success Green (Ready status)
'#10b981' // rgb(16, 185, 129)

// Purple (Language badge)
'#9333ea' // rgb(147, 51, 234)
```

---

## 📁 File Locations

```
jaime-mobile-app/
├── utils/
│   ├── ArtifactTypes.ts          ← Core types
│   └── ArtifactParser.ts         ← Parsing logic
├── components/
│   ├── artifacts/
│   │   ├── ArtifactIndicator.tsx        ← Inline display
│   │   ├── ArtifactViewerModal.tsx      ← Full viewer
│   │   └── renderers/
│   │       ├── CodeRenderer.tsx         ← Code display
│   │       └── MarkdownRenderer.tsx     ← Markdown display
│   ├── ChatMessage.tsx           ← Shows indicators
│   └── ChatPage.tsx              ← Manages modal
└── hooks/
    └── useChat.tsx               ← Tracks artifacts
```

---

## 🔗 Important Functions

### Artifact Parsing
```typescript
extractArtifactFromStream(stream: string): Artifact | null
extractArtifactsFromMessage(content: string, messageId: string): Artifact[]
stripArtifactTags(content: string): string
extractCodeContent(content: string): string
```

### Artifact Helpers
```typescript
getArtifactTypeName(type: ArtifactType): string
getArtifactIcon(type: ArtifactType): string
supportsCodeView(type: ArtifactType): boolean
```

### Context Functions
```typescript
getArtifactsForMessage(messageId: string): Artifact[]
finalizeArtifacts(messageContent: string, messageId: string): void
```

---

## 📚 Documentation Links

- **Full Guide**: `ARTIFACT_INTEGRATION_GUIDE.md`
- **Summary**: `ARTIFACT_IMPLEMENTATION_SUMMARY.md`
- **This File**: `ARTIFACT_QUICK_REFERENCE.md`

---

## ⚡ One-Command Setup

If all files are created, just need to modify 3 files:

```bash
# 1. Edit hooks/useChat.tsx (add artifact state & parsing)
# 2. Edit components/ChatMessage.tsx (show indicators)
# 3. Edit components/ChatPage.tsx (wire up modal)
```

**Then test with:** *"Write a Python function to sort a list"*

---

**That's it! You're ready to implement artifacts! 🎉**

