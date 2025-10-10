# Testing Credit Error Handling

## Quick Test Guide

### 1. Test Credit Limit Error (Backend Simulation)

**Backend Setup:**
```python
# In jaiime-backend-aws/llm_chats/llama3_service.py
# The limit_user_credits function already raises the error:

async def limit_user_credits(db, user, team=None, generate_video="none"):
    # ... credit checking logic ...
    if remaining_credits <= 0:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum of {credits_limit} credits has been reached for {interval_days} days and custom credits exhausted. Please upgrade to PRO or purchase more credits to continue.",
        )
```

**To Simulate:**
1. Set user's credits to 0 in the database
2. Or modify `limit_user_credits` to always return 0 remaining credits
3. Send a chat message from the mobile app

**Expected Behavior:**
- ✅ Error banner appears at top of screen
- ✅ Banner shows red "card" icon
- ✅ Error message displays: "Maximum of X credits has been reached..."
- ✅ "Upgrade" button is visible
- ✅ Banner auto-hides after 10 seconds
- ✅ Can manually dismiss by clicking X

### 2. Test Error Parsing

**Test Different Error Formats:**

```javascript
// Test 1: JSON error with detail
fetch('/chat').then(response => {
  // Response: {"detail": "Credit limit reached"}
  // Expected: type='credit', message="Credit limit reached"
});

// Test 2: Plain text error
fetch('/chat').then(response => {
  // Response: "Server error"
  // Expected: type='generic', message="Server error"
});

// Test 3: 401 Auth error
fetch('/chat').then(response => {
  // Status: 401
  // Expected: type='permission', Alert shown
});
```

### 3. Test Error Dismissal

**Manual Dismissal:**
1. Trigger a credit error
2. Click the X button in the error banner
3. ✅ Error should disappear
4. ✅ `chatError` state should be null

**Auto Dismissal:**
1. Trigger a credit error
2. Wait 10 seconds
3. ✅ Error should automatically disappear

**New Message Clears Error:**
1. Trigger a credit error
2. Send a new message (even if it fails again)
3. ✅ Previous error should clear before new attempt

### 4. Test Upgrade Action

**Click Upgrade Button:**
1. Trigger a credit error
2. Click "Upgrade" button
3. ✅ Error should dismiss
4. ✅ App should navigate to settings page
5. ✅ (Future: Should navigate to pricing page)

### 5. Test Different Error Types

**Credit Error (400 with credit keyword):**
```bash
curl -X POST https://api.odysseytech.ai/chat \
  -H "Authorization: Bearer <token>" \
  -d "text=test message"
# If credits exhausted, should show credit error
```

**Network Error:**
```javascript
// Turn off WiFi/mobile data
// Send a message
// Expected: type='network', message about connection
```

**Server Error (500+):**
```javascript
// Backend returns 500
// Expected: type='api', "Contact Support" button
```

## Manual Testing Checklist

- [ ] Credit error displays correctly
- [ ] Error message is readable and informative
- [ ] Upgrade button works and navigates properly
- [ ] Error auto-dismisses after 10 seconds
- [ ] Can manually dismiss error
- [ ] New message clears previous error
- [ ] Different error types show correct icons/actions
- [ ] Network errors are caught and displayed
- [ ] Auth errors (401) still show alert
- [ ] Streaming errors are caught and displayed

## Automated Testing (Future)

```typescript
// Example unit test
describe('Credit Error Handling', () => {
  it('should parse credit limit error correctly', () => {
    const errorText = '{"detail": "Maximum of 20 credits has been reached..."}';
    const result = parseErrorResponse(errorText, 400);
    
    expect(result.type).toBe('credit');
    expect(result.message).toContain('Maximum of 20 credits');
    expect(result.statusCode).toBe(400);
  });

  it('should display credit error banner', () => {
    const { getByText } = render(<ChatPage />);
    // Simulate credit error
    fireEvent.press(getByText('Send'));
    // Assert banner is visible
    expect(getByText(/Maximum of.*credits/i)).toBeVisible();
    expect(getByText('Upgrade')).toBeVisible();
  });
});
```

## Troubleshooting

**Error not showing:**
- Check browser console for errors
- Verify `chatError` state is being set in useChat
- Check if ErrorBanner component is rendering
- Verify error response format from backend

**Wrong error type:**
- Check parseErrorResponse logic
- Verify status code from backend
- Check error message keywords

**Upgrade button not working:**
- Check router navigation
- Verify settings page exists
- Check for navigation errors in console

## Backend Error Format Reference

The backend should return errors in this format:

```python
# HTTP 400 for credit errors
raise HTTPException(
    status_code=400,
    detail="Maximum of X credits has been reached for Y days and custom credits exhausted. Please upgrade to PRO or purchase more credits to continue."
)

# HTTP 429 for rate limit errors (also treated as credit errors)
raise HTTPException(
    status_code=429,
    detail="Too many requests. Please try again later."
)

# HTTP 401 for auth errors
raise HTTPException(
    status_code=401,
    detail="Unauthorized. Please sign in again."
)
```

## Success Criteria

✅ **User Experience:**
- Users clearly understand they've hit a credit limit
- Path to upgrade is obvious and accessible
- Error doesn't block entire app
- Error provides helpful context

✅ **Technical:**
- All HTTP errors are caught and handled
- Errors are typed and categorized correctly
- State management is clean and predictable
- No memory leaks from error state
- Errors don't interfere with normal chat flow

✅ **Edge Cases:**
- Multiple errors in succession are handled
- Error during streaming is caught
- Error before streaming is caught
- Network errors are distinguished from API errors
- Auth errors still trigger alert (backward compatible)

