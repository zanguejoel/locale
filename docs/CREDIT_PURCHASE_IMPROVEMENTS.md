# Credit Purchase Modal Improvements

## Overview
This document describes the improvements made to the mobile credit purchase modal to match the web implementation.

## Changes Made

### 1. Custom Amount Input

**Before:** Users could only select from 4 fixed packages

**After:** Users can now:
- Enter any custom amount (minimum 500 credits)
- See real-time cost calculation in a badge
- Validation for minimum amounts
- Clear error messages

**Implementation:**
```tsx
<TextInput
  placeholder="Enter amount (min. 500)"
  keyboardType="number-pad"
  value={customAmount}
  onChangeText={handleCustomAmountChange}
/>
```

### 2. Account Type-Based Packages

**Before:** Same packages for all users

**After:** 
- **PRO Users**: 4 packages from $10 to $100
- **BUSINESS Users**: 4 packages from $50 to $300 (higher tiers)

**PRO Packages:**
- 500 credits = $10
- 1,500 credits = $25 ⭐ (Popular)
- 2,500 credits = $50
- 5,000 credits = $100

**BUSINESS Packages:**
- 2,500 credits = $50
- 5,000 credits = $100 ⭐ (Popular)
- 10,000 credits = $200
- 15,000 credits = $300

**Logic:**
```tsx
const accountType: AccountType = user?.user_teams && user.user_teams.length > 0 
  ? 'BUSINESS' 
  : 'PRO';
const creditPackages = CREDIT_PACKAGES[accountType];
```

### 3. Information Panel

**Before:** No detailed information about pricing or policies

**After:** Collapsible info panel showing:
- Rate: 50 credits = $1
- Minimum: 500 credits ($10)
- Expiration policy (different for PRO vs BUSINESS)

**Toggle with info button in header:**
```tsx
<TouchableOpacity onPress={() => setShowInfo(!showInfo)}>
  <Ionicons name="information-circle-outline" />
</TouchableOpacity>
```

### 4. Enhanced Balance Display

**Before:** Basic balance display

**After:**
- Prominent highlighted balance card
- Shows total balance
- Breaks down subscription vs purchased credits
- Color-coded with theme colors

**Example:**
```
Current Balance: 1,234 credits
1,000 from subscription + 234 purchased
```

### 5. Improved Package Cards

**Before:** Grid layout with basic info

**After:**
- List layout for better mobile UX
- Shows full label with amount and cost
- Displays rate per credit
- Popular badge with star icon
- Selected state with checkmark

**Features:**
- `$25 = 1,500 Credits`
- `$0.017/credit`
- ⭐ POPULAR badge

### 6. Cost Summary

**Before:** Cost shown in button text only

**After:**
- Dedicated cost summary section above button
- Shows selected credits count
- Displays total cost prominently
- Updates in real-time

```tsx
<View style={styles.costSummary}>
  <Text>1,500 credits</Text>
  <Text>$25.00</Text>
</View>
```

### 7. Better Validation

**Minimum Amount:**
- 500 credits minimum
- $10 minimum cost
- Clear error messages

**Real-time Validation:**
- Input shows red error text for invalid amounts
- Button disabled until valid amount selected
- Alerts for specific validation failures

### 8. Improved UX Elements

**Divider:**
- Visual separator between custom input and packages
- "OR SELECT A PACKAGE" text for clarity

**Features List:**
- Updated to match web version
- More accurate descriptions
- Includes expiration policy

**Keyboard Handling:**
- KeyboardAvoidingView for better input experience
- keyboardShouldPersistTaps for scroll interaction

## Technical Implementation

### Constants (hooks/useCredits.ts)

```typescript
export const CREDITS_PER_DOLLAR = 50;

export const CREDIT_PACKAGES = {
  PRO: [
    { amount: 500, cost: 10, label: '$10 = 500 Credits' },
    { amount: 1500, cost: 25, label: '$25 = 1,500 Credits', popular: true },
    { amount: 2500, cost: 50, label: '$50 = 2,500 Credits' },
    { amount: 5000, cost: 100, label: '$100 = 5,000 Credits' },
  ],
  BUSINESS: [
    { amount: 2500, cost: 50, label: '$50 = 2,500 Credits' },
    { amount: 5000, cost: 100, label: '$100 = 5,000 Credits', popular: true },
    { amount: 10000, cost: 200, label: '$200 = 10,000 Credits' },
    { amount: 15000, cost: 300, label: '$300 = 15,000 Credits' },
  ]
} as const;

export type AccountType = 'PRO' | 'BUSINESS';
```

### State Management

```typescript
const [customAmount, setCustomAmount] = useState('');
const [useCustomAmount, setUseCustomAmount] = useState(false);
const [selectedPackageIndex, setSelectedPackageIndex] = useState<number | null>(null);
const [showInfo, setShowInfo] = useState(false);
```

### Amount Calculation

```typescript
const getSelectedAmount = (): number | null => {
  if (useCustomAmount && customAmount) {
    return parseInt(customAmount);
  }
  if (selectedPackageIndex !== null) {
    return creditPackages[selectedPackageIndex].amount;
  }
  return null;
};

const getSelectedCost = (): number | null => {
  const amount = getSelectedAmount();
  if (!amount) return null;
  
  if (useCustomAmount) {
    return amount / CREDITS_PER_DOLLAR;
  }
  if (selectedPackageIndex !== null) {
    return creditPackages[selectedPackageIndex].cost;
  }
  return null;
};
```

### Validation

```typescript
// Validate minimum amount
if (amount < 500) {
  Alert.alert('Minimum Amount', 'The minimum credit purchase amount is 500 credits ($10)');
  return;
}

// Validate minimum cost
if (cost < 10) {
  Alert.alert('Minimum Cost', 'The minimum credit cost is $10.00');
  return;
}
```

## User Flows

### Flow 1: Select Package

1. Open modal
2. View current balance
3. Review PRO/BUSINESS packages
4. Tap desired package
5. See cost summary update
6. Tap "Purchase for $X"
7. Complete payment

### Flow 2: Custom Amount

1. Open modal
2. Tap custom amount input
3. Enter desired amount (e.g., 3000)
4. See real-time cost calculation ($60.00)
5. See cost summary update
6. Tap "Purchase for $60.00"
7. Complete payment

### Flow 3: View Information

1. Open modal
2. Tap info icon in header
3. View rate, minimum, and expiration details
4. Tap icon again to collapse
5. Select package or enter custom amount
6. Purchase

## Design System

### Colors

- **Primary:** Theme primary color for selected states
- **Background Light:** Cards and input backgrounds
- **Grey Light:** Borders and secondary text
- **Destructive:** Error messages

### Typography

- **Header Title:** 24px, Bold
- **Section Titles:** 14-16px, Semi-bold
- **Body Text:** 13-14px, Regular
- **Small Text:** 11-12px, Regular
- **Balance Amount:** 18px, Bold
- **Cost Summary:** 20px, Bold

### Spacing

- **Modal Padding:** 20px
- **Card Padding:** 16px
- **Gap Between Elements:** 12px
- **Section Margins:** 20-24px

### Animations

- Slide-in modal animation
- Haptic feedback on interactions:
  - Light impact on package selection
  - Success notification on purchase attempt
- Smooth state transitions

## Comparison with Web

| Feature | Web | Mobile (Before) | Mobile (After) |
|---------|-----|-----------------|----------------|
| Custom Amount | ✅ | ❌ | ✅ |
| Account Type Packages | ✅ | ❌ | ✅ |
| Info Panel | ✅ | ❌ | ✅ |
| Rate Display | ✅ | ❌ | ✅ |
| Expiration Info | ✅ | ❌ | ✅ |
| Cost Summary | ✅ | ❌ | ✅ |
| Minimum Validation | ✅ | ❌ | ✅ |
| Balance Breakdown | ✅ | ✅ | ✅ (Enhanced) |
| Package Selection | ✅ | ✅ | ✅ (Improved) |

## Benefits

### For Users

1. **More Flexibility:** Custom amounts allow precise purchases
2. **Better Information:** Clear pricing and policies
3. **Appropriate Packages:** Different tiers for different needs
4. **Clearer Costs:** Real-time calculation and summary
5. **Better Validation:** Clear error messages and guidance

### For Business

1. **Higher Conversions:** More purchase options
2. **Better Targeting:** Appropriate packages per tier
3. **Reduced Support:** Clear information reduces questions
4. **Consistent Experience:** Matches web implementation

## Testing Checklist

- [ ] Custom amount input accepts numbers only
- [ ] Minimum 500 credits validation works
- [ ] Minimum $10 cost validation works
- [ ] PRO users see PRO packages
- [ ] BUSINESS users see BUSINESS packages
- [ ] Info panel toggles correctly
- [ ] Balance breakdown displays correctly
- [ ] Package selection updates cost summary
- [ ] Custom amount updates cost summary
- [ ] Purchase button disabled for invalid amounts
- [ ] Rate calculation is accurate ($1 = 50 credits)
- [ ] Popular badge shows on correct packages
- [ ] Keyboard handling works smoothly
- [ ] Error messages are clear and helpful
- [ ] Haptic feedback works on interactions

## Future Enhancements

1. **Saved Payment Methods:**
   - Show saved cards
   - Quick purchase without redirect

2. **Promotional Packages:**
   - Limited-time offers
   - Bonus credits on certain amounts
   - First-time purchase discounts

3. **Gift Options:**
   - Purchase for other users
   - Team credit pools

4. **Credit History:**
   - View past purchases
   - Download receipts
   - Track usage

5. **Auto-Recharge:**
   - Set minimum balance
   - Auto-purchase when low
   - Email notifications

## Maintenance

### Updating Packages

Edit `CREDIT_PACKAGES` in `hooks/useCredits.ts`:

```typescript
export const CREDIT_PACKAGES = {
  PRO: [
    // Add or modify packages here
    { amount: 500, cost: 10, label: '$10 = 500 Credits' },
  ],
  BUSINESS: [
    // Different packages for business tier
    { amount: 2500, cost: 50, label: '$50 = 2,500 Credits' },
  ]
};
```

### Updating Rate

Change `CREDITS_PER_DOLLAR` constant:

```typescript
export const CREDITS_PER_DOLLAR = 50; // Change this value
```

### Updating Minimum

Change validation in `CreditPurchaseModal.tsx`:

```typescript
if (amount < 500) { // Change minimum here
  Alert.alert('Minimum Amount', 'The minimum credit purchase amount is 500 credits ($10)');
  return;
}
```

## Files Modified

1. `hooks/useCredits.ts` - Added constants and account types
2. `components/CreditPurchaseModal.tsx` - Complete rewrite with improvements
3. `docs/CREDIT_PURCHASE_IMPROVEMENTS.md` - This documentation

## Conclusion

The improved credit purchase modal now matches the web implementation while providing an optimized mobile experience. Users can:

- Choose from account-appropriate packages
- Enter custom amounts for flexibility
- View detailed pricing information
- Understand expiration policies
- See real-time cost calculations
- Get clear validation feedback

The implementation follows React Native best practices, maintains consistency with the web version, and provides an excellent user experience with smooth animations and helpful feedback.

