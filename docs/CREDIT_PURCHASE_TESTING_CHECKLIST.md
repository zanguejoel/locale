# Credit Purchase Testing Checklist

## 📱 Device Testing Checklist

Use this checklist when testing the credit purchase system on a physical device or emulator.

---

## Pre-Testing Setup

- [ ] Ensure you have access to Mixpanel dashboard
- [ ] Have test accounts ready (PRO and BUSINESS)
- [ ] Note your current credit balance before testing
- [ ] Enable debug mode to see console logs
- [ ] Have a test payment method ready (or plan to test without one)

---

## Test 1: Modal Opening from Header Badge ⭐

**Entry Point:** Credit badge in chat header

### Steps:
1. [ ] Open the app and navigate to chat
2. [ ] Tap the credit badge in the header
3. [ ] Modal should open

### Verify:
- [ ] Modal opens smoothly
- [ ] Current balance is displayed correctly
- [ ] Packages tab is selected by default
- [ ] Popular package has a badge
- [ ] Check Mixpanel for `CREDIT_PURCHASE_MODAL_OPENED` event
  - [ ] `source: 'header_badge'`
  - [ ] `credits_remaining` is correct

---

## Test 2: Modal Opening from Settings ⭐

**Entry Point:** Settings > Purchase Credits

### Steps:
1. [ ] Open settings
2. [ ] Tap "Purchase Credits" menu item
3. [ ] Modal should open

### Verify:
- [ ] Modal opens smoothly
- [ ] Check Mixpanel for `CREDIT_PURCHASE_MODAL_OPENED` event
  - [ ] `source: 'settings'`

---

## Test 3: Modal Opening from Error Banner ⭐

**Entry Point:** Credit depletion error

### Steps:
1. [ ] Trigger a credit limit error (use up all credits or test account with 0 credits)
2. [ ] Error banner should appear
3. [ ] Tap "Purchase Credits" button
4. [ ] Modal should open

### Verify:
- [ ] Error banner displays correctly
- [ ] Modal opens when button tapped
- [ ] Check Mixpanel for `CREDIT_PURCHASE_MODAL_OPENED` event
  - [ ] `source: 'error_banner'`

---

## Test 4: Package Selection (Packages Tab) ⭐⭐

### Steps:
1. [ ] Open credit purchase modal
2. [ ] Ensure you're on "Quick Select" tab
3. [ ] Tap each package one by one
4. [ ] Observe selected state

### Verify:
- [ ] Checkmark appears on selected package
- [ ] Haptic feedback on selection
- [ ] Cost summary updates at bottom
- [ ] Purchase button shows correct amount
- [ ] Check Mixpanel for `CREDIT_PACKAGE_SELECTED` events
  - [ ] `package_name` is correct (e.g., "$25 = 1,500 Credits")
  - [ ] `credit_amount` matches
  - [ ] `purchase_cost` matches
  - [ ] `package_type: 'preset'`

---

## Test 5: Custom Amount Entry ⭐⭐

### Steps:
1. [ ] Open credit purchase modal
2. [ ] Switch to "Custom Amount" tab
3. [ ] Enter "400" (below minimum)
4. [ ] Enter "1000" (valid amount)
5. [ ] Observe real-time cost calculation

### Verify:
- [ ] Tab switches smoothly
- [ ] Input accepts only numbers
- [ ] Error shown for amounts < 500
- [ ] Cost preview shows for valid amounts
- [ ] Quick suggestions (500, 1000, 2500, 5000) work
- [ ] Check Mixpanel for `CREDIT_CUSTOM_AMOUNT_ENTERED` event
  - [ ] Only fires for valid amounts (>= 500)
  - [ ] `credit_amount` is correct
  - [ ] `purchase_cost` is calculated correctly (amount / 50)
  - [ ] `package_type: 'custom'`
  - [ ] `tab_used: 'custom'`

---

## Test 6: Purchase with Saved Payment Method ⭐⭐⭐

**Prerequisite:** User has a saved payment method in Stripe

### Steps:
1. [ ] Select a package or enter custom amount
2. [ ] Note your current credit balance
3. [ ] Tap "Purchase" button
4. [ ] Observe the purchase flow

### Verify:
- [ ] Haptic feedback when tapping purchase
- [ ] Loading spinner appears briefly
- [ ] Success animation shows
- [ ] Success alert appears with checkmark emoji
- [ ] Alert says "credits have been added to your account"
- [ ] Modal closes after tapping "Continue"
- [ ] Credit balance updates (may take a moment)
- [ ] Check Mixpanel events in order:
  1. [ ] `CREDIT_PURCHASE_INITIATED`
     - [ ] All purchase details correct
     - [ ] `credits_before` recorded
  2. [ ] `CREDIT_PURCHASE_COMPLETED`
     - [ ] `payment_method: 'saved'`
     - [ ] `transaction_completed: true`
     - [ ] `credits_before` and `credits_after` correct

---

## Test 7: Purchase without Saved Payment (Checkout Redirect) ⭐⭐⭐

**Prerequisite:** User does NOT have a saved payment method

### Steps:
1. [ ] Select a package or enter custom amount
2. [ ] Tap "Purchase" button
3. [ ] Alert appears asking to complete payment
4. [ ] Tap "Continue" to open Stripe checkout

### Verify:
- [ ] Alert explains redirect to Stripe
- [ ] "Cancel" and "Continue" buttons present
- [ ] Stripe checkout opens in browser/webview
- [ ] Can complete payment on Stripe
- [ ] After payment, return to app
- [ ] Credits are updated
- [ ] Check Mixpanel events:
  1. [ ] `CREDIT_PURCHASE_INITIATED` (first event)
  2. [ ] `CREDIT_PURCHASE_INITIATED` (second event with checkout details)
     - [ ] `payment_method: 'checkout'`
     - [ ] `transaction_completed: false`
     - [ ] `checkout_url` present

---

## Test 8: Purchase Validation ⭐

### Steps:
1. [ ] Try purchasing without selecting package/amount
2. [ ] Enter custom amount < 500 and try to purchase
3. [ ] Enter "100" and try to purchase

### Verify:
- [ ] Alert: "Please select a package or enter a custom amount"
- [ ] Alert: "Minimum credit purchase amount is 500 credits ($10)"
- [ ] Alert: "Minimum credit cost is $10.00"
- [ ] Check Mixpanel for any `CREDIT_PURCHASE_FAILED` events with error messages

---

## Test 9: PRO Account Packages ⭐⭐

**Prerequisite:** Test with PRO account (user without teams)

### Steps:
1. [ ] Log in as PRO user
2. [ ] Open credit purchase modal
3. [ ] View available packages

### Verify:
- [ ] 4 packages shown:
  - [ ] 500 credits = $10
  - [ ] 1,500 credits = $25 (POPULAR badge)
  - [ ] 2,500 credits = $50
  - [ ] 5,000 credits = $100
- [ ] Check Mixpanel events have `account_type: 'PRO'`

---

## Test 10: BUSINESS Account Packages ⭐⭐

**Prerequisite:** Test with BUSINESS account (user with teams)

### Steps:
1. [ ] Log in as BUSINESS user (user with teams)
2. [ ] Open credit purchase modal
3. [ ] View available packages

### Verify:
- [ ] 4 packages shown:
  - [ ] 2,500 credits = $50
  - [ ] 5,000 credits = $100 (POPULAR badge)
  - [ ] 10,000 credits = $200
  - [ ] 15,000 credits = $300
- [ ] Check Mixpanel events have `account_type: 'BUSINESS'`

---

## Test 11: UI/UX Elements ⭐

### Steps:
1. [ ] Open modal and examine all UI elements
2. [ ] Test all interactive elements

### Verify:
- [ ] Tab switcher works smoothly
- [ ] Haptic feedback on interactions
- [ ] Balance card shows current credits
- [ ] Info section shows rate and policies
- [ ] Package cards have proper styling
- [ ] Selected state is visually clear
- [ ] Purchase button disabled when nothing selected
- [ ] "Secure payment via Stripe" text at bottom
- [ ] Close button works
- [ ] Modal dismisses on tap outside (if applicable)

---

## Test 12: Balance Updates ⭐⭐

### Steps:
1. [ ] Note current balance: __________
2. [ ] Purchase credits (e.g., 500 credits)
3. [ ] Wait for success message
4. [ ] Close modal
5. [ ] Check header credit badge

### Verify:
- [ ] Balance updates after purchase
- [ ] New balance = old balance + purchased amount
- [ ] Balance reflected in chat header
- [ ] Balance reflected when reopening modal
- [ ] Check Mixpanel `credits_after` calculation is correct

---

## Test 13: Error Handling ⭐⭐

### Steps:
1. [ ] Simulate network error (airplane mode)
2. [ ] Try to purchase
3. [ ] Turn network back on
4. [ ] Try again

### Verify:
- [ ] Network error handled gracefully
- [ ] User gets clear error message
- [ ] Can retry after error
- [ ] Check Mixpanel for `CREDIT_PURCHASE_FAILED` event
  - [ ] `error_message` is descriptive

---

## Test 14: Cross-Platform (iOS & Android) ⭐⭐

### Steps:
1. [ ] Test on iOS device
2. [ ] Test on Android device
3. [ ] Compare experiences

### Verify:
- [ ] Both platforms work correctly
- [ ] UI renders properly on both
- [ ] Haptics work (if supported)
- [ ] Stripe redirect works on both
- [ ] No platform-specific crashes

---

## Test 15: Keyboard Handling ⭐

### Steps:
1. [ ] Open modal
2. [ ] Switch to custom amount tab
3. [ ] Tap input to open keyboard
4. [ ] Enter amount
5. [ ] Scroll content

### Verify:
- [ ] Keyboard appears properly
- [ ] `KeyboardAvoidingView` works
- [ ] Can scroll to see all content
- [ ] Input remains visible
- [ ] No content hidden behind keyboard

---

## Mixpanel Verification Checklist 📊

After testing, verify in Mixpanel dashboard:

### Event Counts:
- [ ] `CREDIT_PURCHASE_MODAL_OPENED` events recorded
- [ ] `CREDIT_PACKAGE_SELECTED` events recorded
- [ ] `CREDIT_CUSTOM_AMOUNT_ENTERED` events recorded
- [ ] `CREDIT_PURCHASE_INITIATED` events recorded
- [ ] `CREDIT_PURCHASE_COMPLETED` or checkout events recorded

### Event Properties:
- [ ] All events have `source` property
- [ ] All events have `account_type` property
- [ ] Purchase events have amount and cost
- [ ] Completed events have `credits_before` and `credits_after`
- [ ] Failed events have `error_message`

### Funnels:
- [ ] Can create funnel: Modal Opened → Initiated → Completed
- [ ] Can segment by `source`
- [ ] Can segment by `account_type`
- [ ] Can segment by `package_type` (preset vs custom)

---

## Issues Found 🐛

**Template for reporting issues:**

### Issue #1
- **Description:** 
- **Steps to reproduce:** 
- **Expected behavior:** 
- **Actual behavior:** 
- **Platform:** iOS / Android
- **Account type:** PRO / BUSINESS
- **Screenshots:** 

---

## Sign-Off

### Tester Information:
- **Name:** ___________________
- **Date:** ___________________
- **Device:** ___________________
- **OS Version:** ___________________
- **App Version:** ___________________

### Overall Status:
- [ ] All tests passed
- [ ] Minor issues found (documented above)
- [ ] Major issues found (requires fixes)
- [ ] Ready for production
- [ ] Needs additional work

### Notes:
```
[Add any additional notes or observations here]
```

---

## Legend
- ⭐ = Basic functionality test
- ⭐⭐ = Important feature test
- ⭐⭐⭐ = Critical path test



