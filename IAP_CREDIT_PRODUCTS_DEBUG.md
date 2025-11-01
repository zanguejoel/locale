# IAP Credit Products Not Showing - Debug Guide

## Issue

Credit products are not appearing in the Purchase Credits modal, even though the IAP Debug Status shows:
- Connection Status: ✅ Connected
- Products Loaded: 6
- Platform: iOS

## Root Cause Analysis

The modal displays products filtered by `type === 'consumable'`, but the 6 products loaded may not include any credit products, or they're not being categorized correctly.

## Debug Logging Added

I've added detailed logging to help diagnose the issue:

### In `IAPService.ts`:
- Logs which product IDs are being requested (subscriptions vs consumables)
- Logs each product fetched with its ID, type, and price
- Logs totals: X subscriptions, Y consumables

### In `IAPProvider.tsx`:
- Logs product breakdown showing how many are categorized as subscriptions vs credits
- Shows all product IDs and their types

## Expected Product Configuration

### Subscription Products (4):
- `basic_monthly`
- `basic_yearly`
- `professional_monthly`
- `professional_yearly`

### Credit Products / Consumables (6):
- `credits_500`
- `credits_1500`
- `credits_2500`
- `credits_5000`
- `credits_10000`
- `credits_15000`

### Integration Products (2):
- `integration_google_drive`
- `integration_slack`

**Total: 12 products**

## Likely Causes

Since only **6 products** are loaded instead of 12, the most likely causes are:

### 1. ⚠️ Credit Products Not Configured in App Store Connect

The credit/consumable products may not have been created or approved in App Store Connect yet. Only subscription products are configured.

**Solution:**
1. Go to App Store Connect
2. Navigate to your app > Features > In-App Purchases
3. Verify that all 6 credit products are created with matching product IDs:
   - `credits_500`
   - `credits_1500`
   - `credits_2500`
   - `credits_5000`
   - `credits_10000`
   - `credits_15000`
4. Ensure they are set as **Consumable** type
5. Set pricing and descriptions
6. Submit for review or make available for testing

### 2. Integration Products Causing Issues

The integration products are included in `ALL_PRODUCT_IDS` but probably shouldn't be fetched yet. They would be categorized as "consumable" (since they're not subscriptions) which might be confusing the filtering.

**Solution:**
Remove integration products from the fetch list temporarily:

```typescript
// In constants/IAPProducts.ts
export const ALL_PRODUCT_IDS = [
  ...ALL_SUBSCRIPTION_PRODUCT_IDS,
  ...ALL_CREDIT_PRODUCT_IDS,
  // ...ALL_INTEGRATION_PRODUCT_IDS, // Comment out for now
];
```

### 3. Sandbox Tester Configuration

The sandbox tester account might not have access to consumable products.

**Solution:**
- Verify you're signed in with a valid sandbox tester account
- Try signing out and back in on the device
- Settings > App Store > Sandbox Account

## Next Steps

### 1. Check Console Logs

After rebuilding and running the app, check the console logs for:

```
[IAPService] Requesting from store:
  - Subscriptions: [...]
  - Consumables: [...]

[IAPService] Product details:
  - product_id: subscription ($X.XX)
  - product_id: consumable ($X.XX)

[IAPService] Types: X subscriptions, Y consumables

[IAPProvider] Products breakdown:
  total: 6,
  subscriptions: X,
  credits: Y,
  productDetails: [...]
```

This will tell you exactly which products are being fetched and how they're categorized.

### 2. Verify App Store Connect

Check that consumable products are properly configured:

1. Open [App Store Connect](https://appstoreconnect.apple.com)
2. Go to: My Apps > [Your App] > Features > In-App Purchases
3. Verify all 6 credit products exist and are active
4. Check that they're set as "Consumable" type
5. Verify product IDs match exactly (case-sensitive)

### 3. Test Product Filtering

If products are being fetched but not showing, the issue might be in the filtering logic. The flow is:

```
IAPService.fetchProducts()
  ↓
IAPProvider.products (all products)
  ↓
IAPProvider.creditProducts (filtered: type === 'consumable')
  ↓
useIAPCredits().creditPackages (mapped to packages)
  ↓
CreditPurchaseModalIAP (displays packages)
```

### 4. Quick Test Fix

To quickly test if the modal works, you can temporarily modify the filter to show all products:

```typescript
// In hooks/useIAPCredits.ts
const creditPackages = useMemo((): CreditPackage[] => {
  // Temporarily use all products to test
  const productsToShow = creditProducts.length > 0 ? creditProducts : allProducts;
  
  return productsToShow.map((product) => {
    // ... rest of the code
  });
}, [creditProducts, allProducts]);
```

## Common Issues

### Issue: All 6 products are subscriptions
**Symptom:** Console shows "6 subscriptions, 0 consumables"  
**Fix:** Configure consumable products in App Store Connect

### Issue: Products have wrong type
**Symptom:** Credit products show as "subscription" type  
**Fix:** Check `isSubscriptionProduct()` logic in `constants/IAPProducts.ts`

### Issue: Products not fetching
**Symptom:** Console shows "Error fetching products"  
**Fix:** Check network, sandbox account, and App Store Connect configuration

## Files Modified

1. `utils/IAPService.ts` - Added detailed product fetching logs
2. `providers/IAPProvider.tsx` - Added product breakdown logs
3. `constants/IAPProducts.ts` - Product ID definitions

## After Fixing

Once the issue is resolved:
1. Remove or reduce debug logging
2. Verify all 6 credit packages show in the modal
3. Test purchasing a credit package
4. Verify credits are added to the account after purchase

## Date

November 1, 2025

