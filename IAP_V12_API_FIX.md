# IAP v12 API Fix - "skus" is Required Error

## Problem

The app was showing this error when trying to fetch IAP products:
```
Error fetching products: "skus" is required
```

## Root Cause

The code was using `react-native-iap` v12.10.5, but was calling the APIs with the old parameter format (passing arrays directly) instead of the v12 format (passing objects with named parameters).

## Changes Made

Fixed the following API calls in `utils/IAPService.ts` to use the correct v12 object format:

### 1. Product Fetching (Lines 207-216)

**Before:**
```typescript
RNIap.getSubscriptions(subscriptionIds)
RNIap.getProducts(consumableIds)
```

**After:**
```typescript
RNIap.getSubscriptions({ skus: subscriptionIds })
RNIap.getProducts({ skus: consumableIds })
```

### 2. Purchase Methods (Lines 294-300)

**Before:**
```typescript
// Subscriptions
purchase = await RNIap.requestSubscription(productId);

// Consumables
purchase = await RNIap.requestPurchase(productId);
```

**After:**
```typescript
// Subscriptions - uses singular "sku"
purchase = await RNIap.requestSubscription({ sku: productId });

// Consumables - iOS also uses singular "sku" (not "skus"!)
purchase = await RNIap.requestPurchase({ sku: productId });
```

### 3. Finish Transaction (Lines 332-335)

**Before:**
```typescript
await RNIap.finishTransaction(purchase, isCreditProduct(purchase.productId));
```

**After:**
```typescript
await RNIap.finishTransaction({ 
  purchase, 
  isConsumable: isCreditProduct(purchase.productId) 
});
```

## react-native-iap v12 API Reference

| Function | Old Format | v12 Format |
|----------|-----------|------------|
| Get Products | `getProducts(ids)` | `getProducts({ skus: ids })` |
| Get Subscriptions | `getSubscriptions(ids)` | `getSubscriptions({ skus: ids })` |
| Purchase Product | `requestPurchase(id)` | `requestPurchase({ sku: id })` |
| Purchase Subscription | `requestSubscription(id)` | `requestSubscription({ sku: id })` |
| Finish Transaction | `finishTransaction(p, bool)` | `finishTransaction({ purchase: p, isConsumable: bool })` |

## Testing

After this fix, the app should:
1. Successfully connect to the App Store
2. Fetch available products (both subscriptions and consumables)
3. Allow users to purchase credits and subscriptions
4. Properly finish transactions

## Notes

- **IMPORTANT:** Both `requestPurchase` and `requestSubscription` use **singular** `sku` on iOS
- Fetching products uses **plural** `skus` (as an array)
- All v12 APIs use object parameters instead of positional arguments
- This fix is compatible with both iOS and Android

## Related Files

- `utils/IAPService.ts` - Main IAP service implementation
- `docs/REACT_NATIVE_IAP_MIGRATION.md` - Full migration documentation
- `constants/IAPProducts.ts` - Product ID definitions

## Date Fixed

November 1, 2025

