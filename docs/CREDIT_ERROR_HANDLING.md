# Credit Error Handling Implementation

## Overview
This document describes the implementation of credit limit error handling in the mobile app's chat streaming functionality.

## Problem Statement
When users reach their credit limit during chat streaming, the backend returns an HTTP error with status 400 and a JSON detail message:
```json
{
  "detail": "Maximum of 20 credits has been reached for 30 days and custom credits exhausted. Please upgrade to PRO or purchase more credits to continue."
}
```

Previously, this error was only shown as a generic alert and wasn't properly displayed in the UI.

## Solution

### 1. Enhanced Error Banner Component (`components/ErrorBanner.tsx`)
- Added a new `'credit'` error type to the existing error types
- Configured credit errors to display:
  - Red card icon (`card`)
  - "Upgrade" action button that links to pricing page
  - Custom styling with red color (`#FF3B30`)

### 2. Structured Error State in Chat Context (`hooks/useChat.tsx`)
- Created a new `ChatError` interface:
  ```typescript
  export interface ChatError {
    type: 'network' | 'api' | 'permission' | 'model' | 'credit' | 'generic';
    message: string;
    statusCode?: number;
  }
  ```
- Added `chatError` state to track chat-specific errors
- Added `clearChatError()` function to dismiss errors
- Exported both through the `ChatContext`

### 3. Error Parsing Logic (`hooks/useChat.tsx`)
Created `parseErrorResponse()` function that:
- Parses JSON error responses from the backend
- Extracts the `detail` or `message` field
- Determines error type based on:
  - Status code (401 → permission, 429 → credit, 400 with "credit" keyword → credit)
  - Error message content (keywords like "network", "model", "credit", "upgrade")
- Returns a structured `ChatError` object

### 4. Error Handling in sendMessage (`hooks/useChat.tsx`)
Updated the `sendMessage()` function to:
- Clear previous errors when starting a new message
- Catch HTTP errors before streaming starts
- Parse error responses and set `chatError` state
- Handle network errors in the catch block
- Set appropriate error types for different failure scenarios

### 5. Error Display in ChatPage (`components/ChatPage.tsx`)
Updated `ChatPage` component to:
- Access `chatError` and `clearChatError` from the chat context
- Display `ErrorBanner` when `chatError` is present
- Show credit errors for 10 seconds (longer than other errors)
- Provide contextual actions:
  - "Upgrade" button for credit errors (navigates to settings)
  - "Retry" button for other errors (retries fetching messages)

## Error Flow

1. **User sends a message** → `sendMessage()` is called
2. **Clear previous errors** → `setChatError(null)`
3. **Backend validation** → Server checks credit limits
4. **Credit limit exceeded** → Backend returns HTTP 400 with detail message
5. **Error parsing** → `parseErrorResponse()` extracts error details
6. **State update** → `setChatError()` sets the structured error
7. **UI display** → `ErrorBanner` shows credit error with upgrade action
8. **User dismissal** → User can dismiss or click "Upgrade"

## Error Types and Handling

| Error Type | Status Code | Triggers | Action |
|------------|-------------|----------|--------|
| `credit` | 400, 429 | Credit limit messages | Upgrade button |
| `permission` | 401 | Authentication errors | Alert + dismiss |
| `network` | N/A | Network failures | Retry button |
| `api` | 500+ | Server errors | Contact support |
| `model` | N/A | Model errors | Change model |
| `generic` | Other | Unknown errors | Retry button |

## Backend Integration

The implementation works with the existing backend error format from `limit_user_credits()` in `llm_chats/llama3_service.py`:

```python
raise HTTPException(
    status_code=400,
    detail=f"Maximum of {credits_limit} credits has been reached for {interval_days} days and custom credits exhausted. Please upgrade to PRO or purchase more credits to continue.",
)
```

## User Experience

1. **Clear feedback**: Users see a prominent banner explaining the credit limit
2. **Actionable**: "Upgrade" button provides clear path to resolution
3. **Non-intrusive**: Banner auto-hides after 10 seconds
4. **Dismissible**: Users can manually dismiss the error
5. **Persistent**: Error persists across re-renders until dismissed or new message sent

## Future Enhancements

1. Deep link to pricing page instead of settings
2. Show remaining credits in the error message
3. Add in-app purchase flow for credit top-up
4. Track credit error events in analytics
5. Show credit balance proactively before limit is reached
6. Handle different credit error types (e.g., video generation credits)

## Testing

To test the implementation:

1. **Simulate credit limit error** (backend):
   - Set user credits to 0 in database
   - Send a message
   - Verify error banner appears with credit type

2. **Test error parsing**:
   - Send various error responses
   - Verify correct error types are assigned

3. **Test error dismissal**:
   - Dismiss error manually
   - Send new message to auto-clear error

4. **Test upgrade action**:
   - Click "Upgrade" button
   - Verify navigation to settings page

## Files Modified

1. `jaime-mobile-app/components/ErrorBanner.tsx` - Added credit error type
2. `jaime-mobile-app/hooks/useChat.tsx` - Added error state and parsing
3. `jaime-mobile-app/components/ChatPage.tsx` - Integrated error display

## Dependencies

- Existing `ErrorBanner` component
- `useChat` hook for state management
- React Navigation for routing (upgrade button)
- Existing backend error format (no changes needed)

