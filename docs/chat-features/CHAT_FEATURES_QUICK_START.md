# Chat Features - Quick Start Guide

A practical guide to using and customizing the new chat features.

---

## 🚀 Quick Feature Overview

### For Users

**Swipe Actions:**
- **User Messages:** Swipe left → Reply, Edit, Copy, Delete
- **Bot Messages:** Swipe right → Reply, Copy, Pin

**Header Actions:**
- **Search Icon:** Find messages instantly
- **Export Icon:** Save conversation in TXT, Markdown, or JSON

**Message Interactions:**
- **Long Press:** Context menu (copy, share)
- **Tap Reaction Button:** Add emoji reactions
- **Tap Pinned Card:** Jump to message

---

## 💻 Developer Guide

### Adding Backend Support

#### 1. Message Reactions

```typescript
// Add reaction endpoint
export const addReaction = async (messageId: string, emoji: string) => {
  const response = await api.post(`/messages/${messageId}/reactions`, {
    emoji,
  });
  return response.data;
};

// Remove reaction endpoint
export const removeReaction = async (messageId: string, emoji: string) => {
  const response = await api.delete(`/messages/${messageId}/reactions/${emoji}`);
  return response.data;
};

// Update handleAddReaction in ChatPage.tsx
const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
  try {
    await addReaction(messageId, emoji);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Refresh messages to get updated reactions
    await fetchMessages(currentConversationId);
  } catch (error) {
    Alert.alert('Error', 'Failed to add reaction');
  }
}, [currentConversationId, fetchMessages]);
```

#### 2. Message Editing

```typescript
// Edit message endpoint
export const editMessage = async (messageId: string, newContent: string) => {
  const response = await api.patch(`/messages/${messageId}`, {
    content: newContent,
  });
  return response.data;
};

// Update handleSaveEdit in ChatPage.tsx
const handleSaveEdit = useCallback(async (newContent: string) => {
  if (!editingMessage) return;
  
  try {
    await editMessage(editingMessage.id, newContent);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingMessage(null);
    await fetchMessages(currentConversationId);
  } catch (error) {
    Alert.alert('Error', 'Failed to save edit');
  }
}, [editingMessage, currentConversationId, fetchMessages]);
```

#### 3. Message Pinning

```typescript
// Pin/unpin endpoint
export const togglePin = async (messageId: string) => {
  const response = await api.post(`/messages/${messageId}/toggle-pin`);
  return response.data;
};

// Update handleMessagePin in ChatPage.tsx
const handleMessagePin = useCallback(async (messageId: string) => {
  try {
    await togglePin(messageId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await fetchMessages(currentConversationId);
  } catch (error) {
    Alert.alert('Error', 'Failed to pin message');
  }
}, [currentConversationId, fetchMessages]);
```

#### 4. Link Preview Metadata

```typescript
// Fetch link metadata
export const getLinkMetadata = async (url: string) => {
  const response = await api.get('/links/metadata', {
    params: { url },
  });
  return response.data;
};

// Update LinkPreview.tsx
const fetchLinkMetadata = async (url: string): Promise<LinkMetadata | null> => {
  try {
    const data = await getLinkMetadata(url);
    return data;
  } catch (error) {
    console.error('Failed to fetch link metadata:', error);
    return null;
  }
};
```

---

### Customizing Features

#### Change Reaction Emojis

```typescript
// In MessageReactions.tsx
const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

// Change to your preferred quick reactions
const QUICK_REACTIONS = ['🔥', '💯', '👏', '🎉', '✨', '🚀'];
```

#### Customize Swipe Actions

```typescript
// In SwipeableMessage.tsx

// Add a new action for user messages
{onShare && (
  <TouchableOpacity
    style={[styles.actionButton, styles.shareButton]}
    onPress={() => handleAction(onShare)}
  >
    <Ionicons name="share-outline" size={20} color="#fff" />
    <Text style={styles.actionText}>Share</Text>
  </TouchableOpacity>
)}

// Add corresponding style
shareButton: {
  backgroundColor: '#0ea5e9', // Cyan
},
```

#### Modify Export Formats

```typescript
// In ConversationExporter.ts

// Add a new export format
export const exportAsHTML = (
  messages: Message[],
  options: ExportOptions
): string => {
  let html = '<html><head><title>Chat Export</title></head><body>';
  
  messages.forEach((message) => {
    const speaker = message.role === Role.User ? 'You' : 'Assistant';
    html += `<div class="message ${message.role}">`;
    html += `<strong>${speaker}:</strong><br>`;
    html += `<p>${message.content}</p>`;
    html += `</div>`;
  });
  
  html += '</body></html>';
  return html;
};

// Update ExportConversationModal to include HTML option
const FORMAT_OPTIONS: FormatOption[] = [
  // ... existing formats
  {
    format: 'html',
    icon: 'code-outline',
    label: 'HTML',
    description: 'Web page format',
  },
];
```

#### Adjust Search Behavior

```typescript
// In ChatPage.tsx

// Change debounce delay
useEffect(() => {
  const timer = setTimeout(() => {
    onSearch(query);
  }, 500); // Increase from 300ms to 500ms
  
  return () => clearTimeout(timer);
}, [query, onSearch]);

// Add fuzzy search
import Fuse from 'fuse.js';

const handleSearch = useCallback((query: string) => {
  setSearchQuery(query);
  if (!query.trim()) {
    setFilteredMessages([]);
    return;
  }
  
  const fuse = new Fuse(messages, {
    keys: ['content'],
    threshold: 0.3, // Fuzzy matching threshold
  });
  
  const results = fuse.search(query);
  setFilteredMessages(results.map(r => r.item));
}, [messages]);
```

---

### Styling Customization

#### Theme Colors

```typescript
// All components use the theme system
// Update your theme in constants/Types.ts

export interface ThemeColors {
  primary: string;        // Main action color (reactions, pins)
  secondary: string;      // Secondary actions
  success: string;        // Success states
  destructive: string;    // Delete, errors
  // ... other colors
}
```

#### Component Styles

Each component has a `getStyles` function:

```typescript
// Example: Customize MessageReactions
const getStyles = (theme: Theme) => StyleSheet.create({
  reactionBubble: {
    borderRadius: 16, // Change from 12
    paddingHorizontal: 10, // Change from 8
    // Add your custom styles
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});
```

---

### Performance Tips

#### 1. Optimize Message List

```typescript
// Increase estimated item size for better performance
<FlashList
  estimatedItemSize={250} // Increase if messages are typically larger
  // ... other props
/>
```

#### 2. Lazy Load Reactions

```typescript
// Only fetch reactions when needed
const [reactionsLoaded, setReactionsLoaded] = useState(false);

const loadReactions = useCallback(async () => {
  if (!reactionsLoaded) {
    const reactions = await fetchReactions(messageId);
    setReactions(reactions);
    setReactionsLoaded(true);
  }
}, [messageId, reactionsLoaded]);
```

#### 3. Optimize Search

```typescript
// Use worker thread for large datasets
import { useWorker } from '@/hooks/useWorker';

const searchWorker = useWorker(
  (messages, query) => {
    return messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
  }
);

const handleSearch = useCallback(async (query: string) => {
  const results = await searchWorker.run(messages, query);
  setFilteredMessages(results);
}, [messages]);
```

---

### Testing New Features

#### Unit Tests Example

```typescript
// MessageReactions.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import MessageReactions from '@/components/MessageReactions';

describe('MessageReactions', () => {
  it('should add reaction on emoji press', () => {
    const onAddReaction = jest.fn();
    const { getByText } = render(
      <MessageReactions
        messageId="123"
        reactions={[]}
        onAddReaction={onAddReaction}
        onRemoveReaction={jest.fn()}
      />
    );
    
    fireEvent.press(getByText('👍'));
    expect(onAddReaction).toHaveBeenCalledWith('123', '👍');
  });
});
```

#### Integration Testing

```typescript
// Test the full chat flow
describe('ChatPage with reactions', () => {
  it('should allow adding and removing reactions', async () => {
    const { getByTestId } = render(<ChatPage />);
    
    // Swipe message to reveal actions
    const message = getByTestId('message-1');
    fireEvent.swipe(message, 'left');
    
    // Tap reaction button
    const reactionBtn = getByTestId('add-reaction-btn');
    fireEvent.press(reactionBtn);
    
    // Select emoji
    const emoji = getByText('👍');
    fireEvent.press(emoji);
    
    // Verify reaction added
    await waitFor(() => {
      expect(getByTestId('reaction-👍')).toBeTruthy();
    });
  });
});
```

---

### Common Issues & Solutions

#### Issue: Reactions not updating

**Solution:** Ensure you're refetching messages after reaction changes:

```typescript
const handleAddReaction = useCallback(async (messageId: string, emoji: string) => {
  await addReaction(messageId, emoji);
  await fetchMessages(currentConversationId); // Important!
}, [currentConversationId, fetchMessages]);
```

#### Issue: Export failing on large conversations

**Solution:** Add pagination or limit:

```typescript
const handleExport = async () => {
  const messagesToExport = messages.slice(-500); // Last 500 messages
  await exportConversation(messagesToExport, format, options);
};
```

#### Issue: Search laggy on large chats

**Solution:** Implement virtual scrolling for search results:

```typescript
const SearchResults = () => (
  <FlashList
    data={filteredMessages}
    renderItem={renderSearchResult}
    estimatedItemSize={100}
  />
);
```

---

### Feature Flags

Control feature availability:

```typescript
// constants/FeatureFlags.ts
export const FEATURE_FLAGS = {
  REACTIONS_ENABLED: true,
  MESSAGE_EDITING_ENABLED: true,
  MESSAGE_PINNING_ENABLED: true,
  EXPORT_ENABLED: true,
  LINK_PREVIEWS_ENABLED: true,
  THREADS_ENABLED: true,
};

// Use in components
import { FEATURE_FLAGS } from '@/constants/FeatureFlags';

{FEATURE_FLAGS.REACTIONS_ENABLED && (
  <MessageReactions {...props} />
)}
```

---

### Analytics Integration

Track feature usage:

```typescript
// In each handler
const handleAddReaction = useCallback((messageId: string, emoji: string) => {
  // Track event
  analytics.track('message_reaction_added', {
    messageId,
    emoji,
    conversationId: currentConversationId,
  });
  
  // Add reaction logic
  // ...
}, [currentConversationId]);
```

---

## 📚 Additional Resources

- **Component Documentation:** See inline JSDoc comments
- **Type Definitions:** `utils/Interfaces.ts`
- **Constants:** `constants/ChatConstants.ts`
- **Theming Guide:** `constants/Types.ts`

---

## 🤝 Contributing

When adding new features:

1. Create component in `components/`
2. Add types to `utils/Interfaces.ts`
3. Update `ChatPage.tsx` integration
4. Add to this guide
5. Write tests
6. Update type definitions

---

## 📞 Support

For questions about these features:
- Check the summary document
- Review component source code
- Look at type definitions
- Test in the app

---

**Happy coding! 🚀**

