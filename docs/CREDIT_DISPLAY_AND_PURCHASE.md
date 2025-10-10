# Credit Display and Purchase Implementation

## Overview
This document describes the complete implementation of credit display and purchase functionality in the mobile app.

## Components Created

### 1. useCredits Hook (`hooks/useCredits.ts`)

A comprehensive hook for managing credit balance and purchases.

**Features:**
- Fetches current credit balance from `/remaining-chat-limit`
- Handles credit purchases via `/purchase-custom-credit-init`
- Auto-refreshes on mount
- Manages loading and error states
- Supports both instant purchase (with saved payment method) and Stripe checkout

**API Response:**
```typescript
interface CreditBalance {
  remaining_credits: number;
  subscription_credits: number;
  custom_credits: number;
  total_allowed: number;
  interval_days: number;
  limit_reset_time: string;
  credits_limit: number;
}
```

**Usage:**
```typescript
const { credits, isLoading, error, isPurchasing, fetchCredits, purchaseCredits } = useCredits();

// Purchase credits
const result = await purchaseCredits(500, 10); // 500 credits for $10
if (result.completed) {
  // Purchase completed instantly
} else if (result.checkoutUrl) {
  // Redirect to Stripe checkout
}
```

### 2. CreditPurchaseModal Component (`components/CreditPurchaseModal.tsx`)

A beautiful modal for purchasing credits.

**Features:**
- Displays current balance (subscription + custom credits)
- Shows 4 credit packages ($10, $25, $50, $100)
- Visual indicators for popular packages
- Real-time cost calculation
- Secure payment via Stripe
- Handles both instant purchase and checkout redirect
- Success/error handling with alerts

**Package Options:**
- 500 credits for $10
- 1,500 credits for $25 (Popular)
- 2,500 credits for $50
- 5,000 credits for $100

### 3. CreditBadge Component (`components/CreditBadge.tsx`)

A compact badge showing credit balance with color indicators.

**Features:**
- Two variants: `compact` (small) and `full` (detailed)
- Color indicators:
  - Normal: Blue/Primary color (≥100 credits)
  - Low: Orange (50-99 credits)
  - Critical: Red (<50 credits)
- Clickable to open purchase modal
- Loading state indicator
- Auto-refreshes credit balance

**Usage:**
```tsx
<CreditBadge variant="compact" />
<CreditBadge variant="full" />
```

## Integration Points

### 1. Chat Header (ChatPage.tsx)

**Location:** Header right section
**Component:** Compact CreditBadge next to HeaderModelSelector

```tsx
headerRight: () => (
  <View style={{ marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <CreditBadge variant="compact" />
    <HeaderModelSelector ... />
  </View>
)
```

**Behavior:**
- Shows current credit balance in real-time
- Changes color based on balance level
- Tapping opens CreditPurchaseModal

### 2. Settings Page (app/(modal)/settings.tsx)

**Location:** New menu item "Purchase Credits"
**Icon:** Diamond outline icon

**Features:**
- Menu item shows current credit balance badge
- Tapping opens CreditPurchaseModal
- Placed second in menu (after Profile, before Plans & Pricing)

### 3. Error Handling (ChatPage.tsx)

**Integration with Credit Errors:**

When a credit limit error occurs:
1. ErrorBanner displays with credit-specific styling
2. "Purchase Credits" button shown instead of "Upgrade"
3. Clicking button opens CreditPurchaseModal directly
4. Auto-hides after 10 seconds (vs 5 seconds for other errors)
5. After purchase, error clears and chat continues

```typescript
action={chatError?.type === 'credit' ? {
  text: 'Purchase Credits',
  onPress: () => {
    clearChatError();
    setShowCreditPurchaseModal(true);
  }
} : { ... }}
```

## User Flow

### Purchase Flow

1. **Trigger Purchase:**
   - Click credit badge in header
   - Click "Purchase Credits" in settings
   - Click "Purchase Credits" in error banner

2. **Select Package:**
   - View current balance
   - See 4 package options with pricing
   - Select desired package
   - See cost per credit calculation

3. **Complete Payment:**
   - **With Saved Payment Method:**
     - Purchase completes instantly
     - Success alert shown
     - Credits added to balance immediately
     - Modal closes
   
   - **Without Saved Payment Method:**
     - Redirected to Stripe Checkout
     - Complete payment on web
     - Return to app
     - Credits added after payment confirmation

4. **Post-Purchase:**
   - Credit balance auto-refreshes
   - Error banner clears (if present)
   - Chat continues normally

### Credit Display Flow

1. **On App Open:**
   - `useCredits` hook auto-fetches balance
   - Badge displays in header

2. **During Usage:**
   - Balance updates after each message
   - Color changes based on remaining credits
   - Low/critical warnings via color

3. **When Low on Credits:**
   - Badge turns orange (<100) or red (<50)
   - User can easily see balance
   - One tap to purchase more

## API Integration

### Get Credit Balance

**Endpoint:** `GET /remaining-chat-limit`

**Response:**
```json
{
  "remaining_credits": 150,
  "subscription_credits": 100,
  "custom_credits": 50,
  "total_allowed": 1000,
  "interval_days": 30,
  "limit_reset_time": "2024-02-01T00:00:00Z",
  "credits_limit": 1000
}
```

### Purchase Credits

**Endpoint:** `POST /purchase-custom-credit-init`

**Request:**
```json
{
  "credits": 500,
  "credit_cost": 10
}
```

**Response (Instant Purchase):**
```json
{
  "status": 200,
  "detail": "Credit purchase successful",
  "completed": true,
  "credits": 500,
  "price": 10
}
```

**Response (Checkout Required):**
```json
{
  "status": 200,
  "checkout_url": "https://checkout.stripe.com/...",
  "completed": false
}
```

## Styling & Design

### Color Scheme

- **Normal State:** Primary blue (#3b82f6)
- **Low Credits:** Orange (#FFA500)
- **Critical State:** Red/Destructive (#FF3B30)
- **Success:** Green (purchase confirmation)

### Animations

- Slide-in modal animation
- Haptic feedback on interactions
- Smooth state transitions
- Loading indicators during purchase

### Accessibility

- Minimum 44px touch targets
- Clear visual indicators
- Descriptive button text
- Screen reader support

## Error Handling

### Network Errors

- Displayed in modal
- Retry functionality
- Graceful fallback

### Payment Errors

- Alert with error message
- Modal remains open
- User can try again

### Balance Fetch Errors

- Badge shows loading state
- Error logged to console
- Doesn't break UI

## Testing Checklist

- [ ] Credit balance displays correctly in header
- [ ] Balance updates after sending messages
- [ ] Color changes based on credit level
- [ ] Purchase modal opens from all trigger points
- [ ] Package selection works
- [ ] Instant purchase flow (with saved payment)
- [ ] Checkout redirect flow (without saved payment)
- [ ] Success handling and balance refresh
- [ ] Error handling for failed purchases
- [ ] Settings integration works
- [ ] Credit error banner triggers purchase modal
- [ ] Balance persists across app restarts
- [ ] Multiple purchases in succession
- [ ] Modal dismiss functionality
- [ ] Haptic feedback on interactions

## Future Enhancements

1. **Credit Usage History:**
   - Show credit usage over time
   - Breakdown by feature (chat, images, etc.)
   - Export usage reports

2. **Auto Top-Up:**
   - Set minimum balance threshold
   - Auto-purchase when balance drops below

3. **Credit Packages:**
   - Custom credit amounts
   - Bulk discounts
   - Promotional offers

4. **Notifications:**
   - Push notification when balance is low
   - Email reminders
   - Usage alerts

5. **Gift Credits:**
   - Send credits to other users
   - Promotional credits
   - Referral bonuses

## Maintenance Notes

### Updating Credit Packages

Edit `CREDIT_PACKAGES` array in `hooks/useCredits.ts`:

```typescript
export const CREDIT_PACKAGES: CreditPurchasePackage[] = [
  { amount: 500, cost: 10, label: '$10' },
  { amount: 1500, cost: 25, label: '$25', popular: true },
  // Add more packages here
];
```

### Changing Color Thresholds

Edit thresholds in `CreditBadge.tsx`:

```typescript
const isLow = remaining_credits < 100; // Change threshold
const isCritical = remaining_credits < 50; // Change threshold
```

### Modifying Purchase Flow

The purchase logic is in `useCredits.ts` → `purchaseCredits()` function.

## Files Modified/Created

**New Files:**
- `hooks/useCredits.ts` - Credit management hook
- `components/CreditPurchaseModal.tsx` - Purchase modal
- `components/CreditBadge.tsx` - Credit balance badge
- `docs/CREDIT_DISPLAY_AND_PURCHASE.md` - This documentation

**Modified Files:**
- `components/ChatPage.tsx` - Added credit badge and purchase modal
- `app/(modal)/settings.tsx` - Added purchase credits menu item
- `components/ErrorBanner.tsx` - Already had credit type (from previous PR)
- `hooks/useChat.tsx` - Already had credit error handling (from previous PR)

## Dependencies

- React Native
- Expo
- Ionicons (for icons)
- expo-haptics (for feedback)
- expo-linking (for Stripe redirect)
- Existing API client (`utils/ApiClient`)
- Existing auth (`utils/SecureTokenManager`)

## Performance Considerations

- Credit balance cached in component state
- Auto-fetch on mount, no polling
- Minimal re-renders with proper memoization
- Efficient API calls (no redundant requests)
- Optimistic UI updates where possible

## Security Considerations

- Secure token authentication for all API calls
- Payment processing via Stripe (PCI compliant)
- No credit card data stored in app
- Server-side validation of credit purchases
- Rate limiting on purchase endpoint (backend)

## Support & Troubleshooting

### Common Issues

**Balance not updating:**
- Check network connection
- Verify auth token is valid
- Check API endpoint status

**Purchase not completing:**
- Check Stripe configuration (backend)
- Verify payment method is valid
- Check server logs for errors

**Badge not showing:**
- Verify user is authenticated
- Check if API returns valid data
- Clear app cache and restart

### Debug Mode

Enable console logs in `useCredits.ts` by uncommenting:
```typescript
console.log('[useCredits] Fetching credits...');
console.log('[useCredits] Credits fetched:', data);
```

## Conclusion

The credit display and purchase system provides a seamless, user-friendly way for users to:
- Monitor their credit balance in real-time
- Purchase more credits when needed
- Handle credit limit errors gracefully
- Complete transactions securely via Stripe

The implementation follows React Native best practices, provides excellent UX with haptic feedback and animations, and integrates smoothly with the existing codebase.

