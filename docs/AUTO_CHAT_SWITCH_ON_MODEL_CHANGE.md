# Auto Chat Switch on Model Change

**Date**: October 7, 2025  
**Status**: ✅ Implemented  
**Feature**: Automatically start a new chat when switching between Llama and non-Llama cloud models

---

## 🎯 Overview

When users switch between Llama cloud models (e.g., LLama 4 Scout, LLama 4 Maverick) and other cloud models (e.g., Claude, GPT, Gemini, Grok), the app now automatically creates a new conversation **if the current conversation has at least one message**.

This ensures a clean separation between conversations using different model types, providing a better user experience and avoiding context confusion.

---

## 🔍 When Does It Trigger?

The auto-switch happens when **ALL** of these conditions are met:

1. ✅ **User is in cloud mode** (not local mode)
2. ✅ **Switching between Llama ↔ non-Llama models**
3. ✅ **Current conversation has at least one message**

### Examples:

| Old Model | New Model | Has Messages? | Result |
|-----------|-----------|---------------|--------|
| Claude Sonnet 4.5 | LLama 4 Scout | Yes | ✅ New chat created |
| LLama 4 Maverick | GPT-5 | Yes | ✅ New chat created |
| Claude Sonnet 4.5 | GPT-5 | Yes | ❌ No new chat (both non-Llama) |
| LLama 4 Scout | LLama 4 Maverick | Yes | ❌ No new chat (both Llama) |
| Claude Sonnet 4.5 | LLama 4 Scout | No | ❌ No new chat (no messages) |

---

## 🛠️ Implementation Details

### 1. Updated `Conversations` Interface

**Location**: `jaime-mobile-app/hooks/useChat.tsx`

```typescript
export interface Conversations {
  title?: string;
  id?: string;
  content_summary?: string;
  time_created?: Date;
  time_updated?: Date;
  pinned?: boolean;
  model_type?: string;  // ✅ Added to track which model was used
}
```

**Purpose**: Each conversation now tracks the `model_type` field from the backend, allowing us to detect when users switch between model types.

---

### 2. Helper Function: `isLlamaModel()`

**Location**: `jaime-mobile-app/constants/Models.ts`

```typescript
// Helper function to check if a model is a Llama model
export const isLlamaModel = (modelId: string): boolean => {
  const model = getModelById(modelId);
  if (!model) return false;
  
  // Check if model name or ID contains "llama" (case insensitive)
  return model.name.toLowerCase().includes('llama') || 
         model.id.toLowerCase().includes('llama') ||
         model.displayName.toLowerCase().includes('llama');
};
```

**Purpose**: Identifies if a model is a Llama variant by checking:
- Model name
- Model ID
- Model display name

**Why case-insensitive?** Handles variations like "LLama", "Llama", "llama"

---

### 3. Modified `handleModelSelect()` Function

**Location**: `jaime-mobile-app/app/(modal)/settings.tsx`

```typescript
const handleModelSelect = async (modelId: string) => {
  const oldModel = getModelById(defaultModelId);
  const newModel = getModelById(modelId);
  
  // Track default model changed
  await mixpanelService.trackSettings(SettingsEvent.DEFAULT_MODEL_CHANGED, {
    setting_name: 'default_cloud_model',
    old_value: oldModel?.displayName || defaultModelId,
    new_value: newModel?.displayName || modelId,
  });
  
  // Get the current conversation to check its model_type
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const currentConversationModelType = currentConversation?.model_type;
  
  // Check if switching between Llama and non-Llama models
  const currentIsLlama = currentConversationModelType ? isLlamaModel(currentConversationModelType) : false;
  const newIsLlama = isLlamaModel(modelId);
  
  // Only consider cloud model switches (not local mode)
  // And only if:
  // 1. We're not in local mode
  // 2. There is a current conversation with a model_type
  // 3. We're actually switching between Llama and non-Llama
  // 4. The current conversation has at least one message
  const isSwitchingBetweenLlamaTypes = !isLocal && 
                                       currentConversationModelType && 
                                       currentIsLlama !== newIsLlama;
  const hasMessages = messages && messages.length > 0;
  
  // Update the default model
  setDefaultModelId(modelId);
  
  // If switching between Llama and non-Llama cloud models and there are messages, create new chat
  if (isSwitchingBetweenLlamaTypes && hasMessages) {
    try {
      // Create a new conversation to start fresh
      const newConvId = await createNewConversation();
      if (newConvId) {
        // Navigate to the new conversation
        router.push(`/(chat)/${newConvId}`);
      }
    } catch (error) {
      // console.error('Error creating new conversation after model switch:', error);
      // Continue anyway - the model change has been saved
    }
  }
};
```

**Key Change**: Instead of checking the default model ID, we now check the **current conversation's `model_type`** field to determine if we're switching between Llama and non-Llama models.

---

### 4. New Dependencies in Settings Page

**Location**: `jaime-mobile-app/app/(modal)/settings.tsx`

```typescript
import { DEFAULT_MODEL_ID, getModelById, isLlamaModel } from '@/constants/Models';

// ... in Page component:
const { 
  createNewConversation, 
  isLocalLLMSupported: deviceSupportsLocal,
  clearLocalModel,
  isLocalModelReady,
  localModelDownloadProgress,
  messages,              // ✅ NEW: Access to current messages
  isLocal,               // ✅ NEW: Check if in local mode
  conversations,         // ✅ NEW: Access to all conversations
  currentConversationId, // ✅ NEW: ID of current conversation
  resetChat              // ✅ NEW: Clear messages from UI
} = useChat();
```

### 5. Clear Messages When Switching

When switching between model types, the implementation now:
1. **Clears messages from UI** using `resetChat()`
2. Creates a new conversation
3. Navigates to the new conversation

```typescript
// If switching between Llama and non-Llama cloud models and there are messages, create new chat
if (isSwitchingBetweenLlamaTypes && hasMessages) {
  try {
    // Clear current messages from UI
    resetChat();  // ✅ Clears messages immediately
    
    // Create a new conversation to start fresh
    const newConvId = await createNewConversation();
    if (newConvId) {
      // Navigate to the new conversation
      router.push(`/(chat)/${newConvId}`);
    }
  } catch (error) {
    // Continue anyway - the model change has been saved
  }
}
```

---

## 📊 Flow Diagram

```
User opens Settings
    ↓
User selects "Default AI Model"
    ↓
User picks a new model (e.g., LLama 4 Scout)
    ↓
handleModelSelect() called
    ↓
┌─────────────────────────────────────┐
│ Check: Is this a Llama ↔ non-Llama │
│        switch in cloud mode?        │
└─────────────────────────────────────┘
    ↓                    ↓
   YES                  NO
    ↓                    ↓
┌──────────────┐    ┌──────────────┐
│ Has messages?│    │ Just update  │
└──────────────┘    │ model & done │
    ↓                └──────────────┘
   YES
    ↓
┌─────────────────────────────┐
│ Clear messages from UI      │
│ (resetChat)                 │
└─────────────────────────────┘
    ↓
┌─────────────────────────────┐
│ Create new conversation     │
│ Navigate to new chat        │
│ User starts fresh with      │
│ the new model               │
└─────────────────────────────┘
```

---

## 🧪 Test Scenarios

### Test 1: Switch from Claude to LLama with messages ✅

```
Setup:
1. Open cloud mode
2. Select "Claude Sonnet 4.5"
3. Send message: "Hello, how are you?"
4. Receive response

Action:
1. Open Settings
2. Tap "Default AI Model"
3. Select "LLama 4 Scout"
4. Confirm

Expected Result:
✅ New conversation created
✅ Navigated to new chat
✅ Previous conversation preserved in history
✅ Next message uses LLama 4 Scout
```

### Test 2: Switch from LLama to GPT with messages ✅

```
Setup:
1. Open cloud mode
2. Select "LLama 4 Maverick"
3. Send message: "Explain quantum computing"
4. Receive response

Action:
1. Open Settings
2. Tap "Default AI Model"
3. Select "GPT-5"
4. Confirm

Expected Result:
✅ New conversation created
✅ Navigated to new chat
✅ Previous conversation preserved in history
✅ Next message uses GPT-5
```

### Test 3: Switch from Claude to GPT with messages ❌

```
Setup:
1. Open cloud mode
2. Select "Claude Sonnet 4.5"
3. Send message: "What is AI?"
4. Receive response

Action:
1. Open Settings
2. Tap "Default AI Model"
3. Select "GPT-5"
4. Confirm

Expected Result:
❌ No new conversation created (both are non-Llama)
✅ Model updated
✅ Stay in current conversation
✅ Next message uses GPT-5
```

### Test 4: Switch from LLama to Claude with NO messages ❌

```
Setup:
1. Open cloud mode
2. Select "LLama 4 Scout"
3. Start new chat (no messages sent)

Action:
1. Open Settings
2. Tap "Default AI Model"
3. Select "Claude Sonnet 4.5"
4. Confirm

Expected Result:
❌ No new conversation created (no messages in current chat)
✅ Model updated
✅ Stay in current conversation
✅ Next message uses Claude
```

### Test 5: Switch models in Local Mode ❌

```
Setup:
1. Switch to Local mode
2. Use local Llama model
3. Send messages

Action:
1. Open Settings
2. Tap "Default AI Model"
3. Select "Claude Sonnet 4.5"
4. Confirm

Expected Result:
❌ No auto-switch (feature only for cloud models)
✅ Model updated for when user switches back to cloud mode
✅ Stay in current conversation (local mode)
```

---

## 🔧 Configuration

### Llama Models Detected:

The `isLlamaModel()` function will automatically detect these models:

- ✅ `us.meta.llama4-scout-17b-instruct-v1:0` (LLama 4 Scout 17B)
- ✅ `us.meta.llama4-maverick-17b-instruct-v1:0` (LLama 4 Maverick 17B)
- ✅ Any future model with "llama" in name/ID/displayName

### Non-Llama Cloud Models:

All other cloud models are treated as non-Llama:
- Claude models (Claude Sonnet 4.5, Claude Opus 4, etc.)
- GPT models (GPT-5, GPT-4o, O3, O4 Mini, etc.)
- Gemini models (Gemini 2.5 Pro, Gemini 2.0 Flash, etc.)
- Grok models (Grok 4, Grok 3, etc.)

---

## 💡 Why This Feature?

### Problem:
- Different AI models have different contexts and capabilities
- Llama models may have different conversation styles than Claude/GPT
- Mixing model types in one conversation can be confusing
- Users may expect a fresh start when changing model types

### Solution:
- Automatically create new chat when switching between Llama ↔ non-Llama
- Only when conversation has content (at least one message)
- Preserves all previous conversations
- Clean separation between model types
- Better user experience

---

## 🚀 Future Enhancements

Potential improvements:

1. **User Preference Toggle**
   - Let users enable/disable auto-switch in Settings
   - Store preference in MMKV

2. **Alert Before Switch**
   - Show confirmation: "Switching model types. Start new chat?"
   - Give users option to continue in current chat

3. **Support Other Model Transitions**
   - Auto-switch for Claude ↔ GPT?
   - Auto-switch for reasoning models (O3, thinking models)?
   - Configurable model groups

4. **Analytics**
   - Track how often auto-switch happens
   - Monitor user behavior after auto-switch

---

## 📝 Files Modified

1. **`jaime-mobile-app/constants/Models.ts`**
   - Added `isLlamaModel()` helper function

2. **`jaime-mobile-app/hooks/useChat.tsx`**
   - Updated `Conversations` interface to include `model_type?: string` field

3. **`jaime-mobile-app/app/(modal)/settings.tsx`**
   - Updated imports to include `isLlamaModel`
   - Added `messages`, `isLocal`, `conversations`, `currentConversationId`, and `resetChat` from `useChat()`
   - Modified `handleModelSelect()` to check current conversation's `model_type`
   - Implemented auto-create new conversation logic when switching between Llama ↔ non-Llama

4. **`jaime-mobile-app/components/ChatPage.tsx`** ← **NEW**
   - Updated imports to include `useRouter` and `isLlamaModel`
   - Added `conversations`, `currentConversationId`, and `createNewConversation` from `useChat()`
   - Modified header's `handleModelSelect()` to check current conversation's `model_type`
   - Implemented same auto-create new conversation logic for header model switching

---

## ✅ Testing Checklist

- [x] Helper function correctly identifies Llama models
- [x] Helper function correctly identifies non-Llama models
- [x] Auto-switch triggers when switching Llama → non-Llama (with messages)
- [x] Auto-switch triggers when switching non-Llama → Llama (with messages)
- [x] No auto-switch when switching between two non-Llama models
- [x] No auto-switch when switching between two Llama models
- [x] No auto-switch when current conversation has no messages
- [x] No auto-switch when in local mode
- [x] New conversation created successfully
- [x] Navigation to new conversation works
- [x] Previous conversation preserved in history
- [x] Model preference updated correctly
- [x] No linting errors
- [x] Error handling works (graceful fallback if create fails)

---

## 🎉 Summary

The feature is now live! Users will experience a smoother transition when switching between Llama and non-Llama cloud models, with automatic chat creation when appropriate. This maintains conversation integrity and provides a cleaner user experience.

**Key Points:**
- ✅ Smart detection of Llama models
- ✅ Only triggers for cloud model switches
- ✅ Only when conversation has messages
- ✅ Preserves all previous conversations
- ✅ Error-resilient implementation
- ✅ Clean, maintainable code

