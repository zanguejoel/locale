# Artifact Integration Guide - File Modifications

## File 7: hooks/useChat.tsx - Add Artifact Tracking

### Changes Needed:

1. **Add imports at the top:**

```typescript
import { Artifact } from '@/utils/ArtifactTypes';
import { extractArtifactFromStream, extractArtifactsFromMessage } from '@/utils/ArtifactParser';
```

2. **Add to ChatContextType interface (around line 77):**

```typescript
interface ChatContextType {
  // ... existing properties
  
  // Add these new properties:
  artifacts: Artifact[];
  currentStreamingArtifact: Artifact | null;
  getArtifactsForMessage: (messageId: string) => Artifact[];
}
```

3. **Add artifact state in ChatProvider (after line 122):**

```typescript
// ============ Artifact State ============
const [artifacts, setArtifacts] = useState<Artifact[]>([]);
const [currentStreamingArtifact, setCurrentStreamingArtifact] = useState<Artifact | null>(null);
```

4. **Add artifact extraction from stream (in useEffect that processes stream, around line 257):**

```typescript
// ============ Artifact Stream Processing ============
useEffect(() => {
  if (stream) {
    // Extract streaming artifact from current stream
    const streamingArtifact = extractArtifactFromStream(stream);
    setCurrentStreamingArtifact(streamingArtifact);
  } else {
    setCurrentStreamingArtifact(null);
  }
}, [stream]);
```

5. **Add function to finalize artifacts when streaming completes (after sendMessage function):**

```typescript
// ============ Finalize Artifacts ============
// Called when stream completes to save artifacts
const finalizeArtifacts = useCallback((messageContent: string, messageId: string) => {
  const extractedArtifacts = extractArtifactsFromMessage(messageContent, messageId);
  
  if (extractedArtifacts.length > 0) {
    setArtifacts(prev => [...prev, ...extractedArtifacts]);
    console.log(`[Chat] Finalized ${extractedArtifacts.length} artifacts for message ${messageId}`);
  }
}, []);
```

6. **Add function to get artifacts for a specific message:**

```typescript
// ============ Get Artifacts for Message ============
const getArtifactsForMessage = useCallback((messageId: string): Artifact[] => {
  return artifacts.filter(artifact => artifact.messageId === messageId);
}, [artifacts]);
```

7. **Call finalizeArtifacts when streaming completes (in sendMessage's finally block, around line 812):**

```typescript
} finally {
  // Always clean up streaming state
  streamControllerRef.current = null;
  isSendingRef.current = false;
  setIsSending(false);
  setChatLoading(false);
  setStreamWorking(false);
  setIntermediate('');
  
  // NEW: Finalize artifacts after streaming completes
  if (stream && currentConversationId) {
    const messageId = `${currentConversationId}-${Date.now()}`;
    finalizeArtifacts(stream, messageId);
  }
  
  // Don't reset additionalData here - it needs to persist in the message
  // Don't reset stream here - it's used for display and doesn't affect input state
}
```

8. **Clear artifacts when conversation changes (in resetChat function, around line 1008):**

```typescript
const resetChat = useCallback(async () => {
  // Abort any ongoing streams with proper synchronization
  await abortCurrentStream();
  
  if (fetchControllerRef.current) {
    fetchControllerRef.current.abort();
    fetchControllerRef.current = null;
  }
  
  // Reset all chat and streaming states
  setMessages([]);
  setStream('');
  setIntermediate('');
  setStreamWorking(false);
  isSendingRef.current = false;
  setIsSending(false);
  setAdditionalData([]);
  setChatError(null);
  setCurrentConversationId(null);
  
  // NEW: Clear artifacts
  setArtifacts([]);
  setCurrentStreamingArtifact(null);
}, [abortCurrentStream]);
```

9. **Add to contextValue (around line 1134):**

```typescript
return {
  // ... existing properties
  
  // NEW: Add artifact properties
  artifacts,
  currentStreamingArtifact,
  getArtifactsForMessage,
};
```

10. **Add to useMemo dependencies (around line 1174):**

```typescript
}, [
  // ... existing dependencies
  
  // NEW: Add artifact dependencies
  artifacts,
  currentStreamingArtifact,
  getArtifactsForMessage,
]);
```

---

## File 8: components/ChatMessage.tsx - Display Artifacts

### Changes Needed:

1. **Add imports at the top:**

```typescript
import { extractArtifactsFromMessage, stripArtifactTags } from '@/utils/ArtifactParser';
import ArtifactIndicator from './artifacts/ArtifactIndicator';
import { Artifact } from '@/utils/ArtifactTypes';
```

2. **Add to ChatMessageProps interface (around line 43):**

```typescript
interface ChatMessageProps extends Message {
  // ... existing properties
  
  // NEW: Add artifact props
  onArtifactPress?: (artifact: Artifact) => void;
  artifacts?: Artifact[];
}
```

3. **Update component to extract and display artifacts (in ChatMessage component, around line 197):**

```typescript
const ChatMessage = memo(({
  content,
  role,
  // ... other existing props
  onArtifactPress,
  artifacts: providedArtifacts,
  // ... rest of props
}: ChatMessageProps) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // ... existing state and hooks

  // NEW: Extract artifacts from content if not provided
  const messageArtifacts = useMemo(() => {
    if (providedArtifacts) return providedArtifacts;
    if (role === Role.Bot && content) {
      return extractArtifactsFromMessage(content, 'message-' + timestamp);
    }
    return [];
  }, [content, role, providedArtifacts, timestamp]);

  // NEW: Strip artifact tags from content for display
  const displayContent = useMemo(() => {
    if (role === Role.Bot && messageArtifacts.length > 0) {
      return stripArtifactTags(content);
    }
    return content;
  }, [content, role, messageArtifacts]);

  // ... rest of existing code
```

4. **Update renderContent to use displayContent instead of content:**

Change all instances of `content` in markdown rendering to `displayContent`:

```typescript
// Around line 839 and 1038:
<MarkdownDisplay>{displayContent}</MarkdownDisplay>
```

5. **Add artifact indicators after message content (around line 907, after the ContextMenu.Content closing tag):**

```typescript
          </ContextMenu.Content>
        </ContextMenu.Root>
      )}
      
      {/* NEW: Render artifact indicators */}
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
      
      {/* Render AI-generated content (additional_data) - shown outside message bubble */}
```

6. **Add styles for artifacts container (in getStyles function, around line 1683):**

```typescript
artifactsContainer: {
  marginTop: 12,
  gap: 8,
},
```

---

## File 9: components/ChatPage.tsx - Wire Up Artifact Modal

### Changes Needed:

1. **Add imports at the top:**

```typescript
import { useState, useCallback } from 'react';
import ArtifactViewerModal from './artifacts/ArtifactViewerModal';
import { Artifact } from '@/utils/ArtifactTypes';
```

2. **Add state for artifact modal (in ChatPage component):**

```typescript
// NEW: Artifact modal state
const [artifactModalVisible, setArtifactModalVisible] = useState(false);
const [selectedArtifacts, setSelectedArtifacts] = useState<Artifact[]>([]);
const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);
```

3. **Get artifacts from context:**

```typescript
const {
  messages,
  // ... other context values
  artifacts,
  currentStreamingArtifact,
  getArtifactsForMessage,
} = useChat();
```

4. **Add handler for artifact press:**

```typescript
// NEW: Handle artifact press
const handleArtifactPress = useCallback((artifact: Artifact) => {
  // Get all artifacts for this message
  const messageArtifacts = artifact.messageId 
    ? getArtifactsForMessage(artifact.messageId)
    : [artifact];
  
  // Find index of pressed artifact
  const index = messageArtifacts.findIndex(a => a.id === artifact.id);
  
  setSelectedArtifacts(messageArtifacts);
  setSelectedArtifactIndex(index !== -1 ? index : 0);
  setArtifactModalVisible(true);
}, [getArtifactsForMessage]);

const handleCloseArtifactModal = useCallback(() => {
  setArtifactModalVisible(false);
}, []);
```

5. **Pass artifact props to ChatMessage components:**

When rendering messages, add the artifact props:

```typescript
<ChatMessage
  {...message}
  // ... existing props
  onArtifactPress={handleArtifactPress}
  artifacts={getArtifactsForMessage(message.id || '')}
/>
```

6. **Add ArtifactViewerModal at the end of the component:**

```typescript
{/* NEW: Artifact Viewer Modal */}
<ArtifactViewerModal
  visible={artifactModalVisible}
  artifacts={selectedArtifacts}
  initialIndex={selectedArtifactIndex}
  onClose={handleCloseArtifactModal}
/>
```

---

## Summary of Files Modified

### New Files Created:
1. ✅ `utils/ArtifactTypes.ts` - Type definitions
2. ✅ `utils/ArtifactParser.ts` - Parsing utilities
3. ✅ `components/artifacts/ArtifactIndicator.tsx` - Inline indicator
4. ✅ `components/artifacts/ArtifactViewerModal.tsx` - Full-screen viewer
5. ✅ `components/artifacts/renderers/CodeRenderer.tsx` - Code renderer
6. ✅ `components/artifacts/renderers/MarkdownRenderer.tsx` - Markdown renderer

### Files to Modify:
7. ⏳ `hooks/useChat.tsx` - Add artifact tracking and parsing
8. ⏳ `components/ChatMessage.tsx` - Display artifact indicators
9. ⏳ `components/ChatPage.tsx` - Wire up artifact modal

---

## Testing Checklist

After implementing all changes:

1. **Test artifact detection:**
   - [ ] Send a message that should generate an artifact
   - [ ] Verify artifact indicator appears in the message
   - [ ] Check that artifact icon and title are correct

2. **Test artifact viewing:**
   - [ ] Tap on artifact indicator
   - [ ] Verify modal opens with artifact content
   - [ ] Test copy and share functionality
   - [ ] Test view/code toggle (for supported types)

3. **Test multiple artifacts:**
   - [ ] Send a message with multiple artifacts
   - [ ] Verify all indicators appear
   - [ ] Test navigation between artifacts in modal

4. **Test streaming:**
   - [ ] Watch artifact appear during streaming
   - [ ] Verify indicator updates in real-time
   - [ ] Check that finalized artifacts persist

5. **Test edge cases:**
   - [ ] Switch conversations while artifact is streaming
   - [ ] Clear chat and verify artifacts are cleared
   - [ ] Test with various artifact types (code, markdown, etc.)

---

## Next Steps (Future Enhancements)

Once MVP is working, you can add:

1. **Additional Renderers:**
   - `ChartRenderer.tsx` - Using Victory Native
   - `HtmlRenderer.tsx` - Using WebView
   - `MermaidRenderer.tsx` - Using react-native-svg
   - `PdfRenderer.tsx` - Using react-native-pdf

2. **Features:**
   - Download artifacts as files
   - Search artifacts across conversations
   - Pin favorite artifacts
   - Share artifacts to other apps

3. **Performance:**
   - Lazy load large artifacts
   - Cache rendered content
   - Optimize re-renders

---

## Installation Commands

If you need additional dependencies for future renderers:

```bash
# For charts
npm install victory-native react-native-svg

# For HTML rendering
npm install react-native-webview

# For PDF viewing (optional)
npm install react-native-pdf react-native-blob-util
```

---

## File Structure

```
jaime-mobile-app/
├── utils/
│   ├── ArtifactTypes.ts          ✅ NEW
│   └── ArtifactParser.ts         ✅ NEW
├── components/
│   ├── artifacts/
│   │   ├── ArtifactIndicator.tsx        ✅ NEW
│   │   ├── ArtifactViewerModal.tsx      ✅ NEW
│   │   └── renderers/
│   │       ├── CodeRenderer.tsx         ✅ NEW
│   │       ├── MarkdownRenderer.tsx     ✅ NEW
│   │       ├── ChartRenderer.tsx        🔜 FUTURE
│   │       ├── HtmlRenderer.tsx         🔜 FUTURE
│   │       ├── MermaidRenderer.tsx      🔜 FUTURE
│   │       └── PdfRenderer.tsx          🔜 FUTURE
│   ├── ChatMessage.tsx           ⏳ MODIFY
│   └── ChatPage.tsx              ⏳ MODIFY
└── hooks/
    └── useChat.tsx               ⏳ MODIFY
```

---

**This guide provides all the code and instructions needed to implement artifact support in the mobile app!** 🚀

