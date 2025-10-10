# Delete Account Feature - Mobile Implementation

## Overview
This document describes the implementation of the delete account feature in the mobile app, mirroring the web implementation's two-step verification flow.

## Implementation Date
October 10, 2025

## Features Implemented

### 1. User Interface Components

#### Danger Zone Section (Profile Screen)
- Added a new "Danger Zone" section to the profile screen
- Styled with red/error colors to indicate destructive action
- Includes warning icon and clear messaging about permanent deletion
- Lists exactly what will be deleted:
  - Chat history and conversations
  - Account data and preferences
  - Billing history and subscriptions

#### DeleteAccountConfirmModal
**Location:** `components/modals/DeleteAccountConfirmModal/DeleteAccountConfirmModal.tsx`

Features:
- First confirmation modal in the two-step flow
- Warning icon header (⚠️)
- Clear explanation of consequences
- "Cannot be undone" warning in bold red text
- Bullet list of items to be deleted
- Cancel and "Yes, Delete My Account" buttons
- Loading state during API call

#### DeleteAccountOTPModal
**Location:** `components/modals/DeleteAccountOTPModal/DeleteAccountOTPModal.tsx`

Features:
- 6-digit OTP input with individual fields
- Auto-focus between fields
- Numeric keyboard
- Visual feedback when digits are entered
- Resend code functionality with 60-second cooldown
- Cancel and "Delete My Account" buttons
- Button disabled until all 6 digits are entered
- Loading states during API calls

### 2. API Integration

#### API Client Methods
**Location:** `utils/ApiClient.ts`

Added two new methods:
```typescript
requestAccountDeletion(): Promise<ApiResponse<{ detail: string }>>
// Calls: POST /auth/close-account-request

deleteAccount(code: string, email: string): Promise<ApiResponse<{ detail: string }>>
// Calls: POST /auth/close-account
```

### 3. State Management

#### Profile Screen State
**Location:** `app/profile.tsx`

New state variables:
- `showDeleteConfirmModal` - Controls first confirmation modal
- `showDeleteOTPModal` - Controls OTP verification modal
- `isDeleting` - Loading state for API calls
- `otpCode` - Array of 6 digits for OTP
- `resendCooldown` - Countdown timer (60 seconds)

### 4. Handler Functions

#### handleRequestDeletion()
- Closes confirmation modal
- Calls `/auth/close-account-request` API
- Opens OTP modal on success
- Starts 60-second resend cooldown
- Shows success/error alerts
- Tracks Mixpanel event: 'delete_account_requested'

#### handleDeleteAccount()
- Validates all 6 OTP digits are entered
- Calls `/auth/close-account` API with code and email
- On success:
  - Shows success alert
  - Clears authentication token
  - Navigates to login screen
- Shows error alert on failure
- Tracks Mixpanel event: 'delete_account_confirmed'

#### handleResendCode()
- Disabled during cooldown period
- Calls `/auth/close-account-request` API again
- Resets 60-second cooldown
- Shows success/error alerts

#### handleDeleteAccountCancel()
- Closes confirmation modal
- Tracks Mixpanel event: 'delete_account_cancelled'

### 5. Error Handling

All API calls include:
- Try-catch blocks
- Proper error message extraction from API responses
- User-friendly Alert dialogs
- Console error logging for debugging
- Loading state management

### 6. Analytics Tracking

Mixpanel events tracked:
- `delete_account_requested` - When user confirms initial deletion
- `delete_account_confirmed` - When user successfully deletes account
- `delete_account_cancelled` - When user cancels the process

## User Flow

1. User navigates to Profile screen
2. Scrolls to "Danger Zone" section
3. Taps "Delete Account" button
4. First confirmation modal appears
5. User reads warning and taps "Yes, Delete My Account"
6. API sends verification code to user's email
7. OTP modal appears
8. User enters 6-digit code from email
9. User taps "Delete My Account"
10. Account is deleted
11. User is logged out and redirected to login screen

## Security Features

- Two-step verification process
- Email verification required
- 6-digit OTP code
- 60-second cooldown on resend
- Cannot proceed without entering all 6 digits
- Modal cannot be dismissed during deletion

## UI/UX Considerations

- Red color scheme throughout to indicate danger
- Clear warning messages
- Loading indicators during API calls
- Disabled buttons during processing
- Auto-focus on OTP input fields
- Numeric keyboard for OTP entry
- Visual feedback on filled OTP digits
- Responsive layout for different screen sizes

## Testing Recommendations

1. **Happy Path:**
   - Complete deletion flow with valid OTP
   - Verify account is deleted
   - Verify user is logged out
   - Verify redirect to login

2. **Error Cases:**
   - Invalid OTP code
   - Expired OTP code
   - Network errors
   - Cancel at each step

3. **Edge Cases:**
   - Resend code functionality
   - Cooldown timer accuracy
   - Modal dismissal handling
   - Loading states

4. **Analytics:**
   - Verify Mixpanel events fire correctly
   - Check event properties

## Dependencies

- `@expo/vector-icons` - Icons
- `expo-router` - Navigation
- Mixpanel - Analytics
- ApiClient - API calls
- SecureStorage - Token management

## Backend Endpoints Used

- `POST /auth/close-account-request` - Send verification code
- `POST /auth/close-account` - Delete account with verification

## Files Modified

1. `app/profile.tsx` - Main implementation
2. `utils/ApiClient.ts` - API methods
3. `components/modals/DeleteAccountConfirmModal/DeleteAccountConfirmModal.tsx` - New file
4. `components/modals/DeleteAccountOTPModal/DeleteAccountOTPModal.tsx` - New file

## Notes

- Implementation mirrors web version exactly
- Uses same backend APIs as web
- Follows mobile app design patterns
- Includes proper error handling and loading states
- Fully typed with TypeScript
- No linting errors

