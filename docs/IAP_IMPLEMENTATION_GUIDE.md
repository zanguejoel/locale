# In-App Purchase (IAP) Implementation Guide

## Overview

This guide covers the complete implementation of native in-app purchases using `expo-iap` for both iOS and Android. The IAP system replaces Stripe web-based payments with native app store purchases.

## Table of Contents

1. [Architecture](#architecture)
2. [Setup Required](#setup-required)
3. [File Structure](#file-structure)
4. [How It Works](#how-it-works)
5. [Usage Examples](#usage-examples)
6. [Testing](#testing)
7. [Backend Integration](#backend-integration)
8. [Troubleshooting](#troubleshooting)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        App Layout (_layout.tsx)                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                      IAPProvider                          │  │
│  │  • Initializes expo-iap on mount                          │  │
│  │  • Fetches products from stores                           │  │
│  │  • Manages purchase flow                                  │  │
│  │  • Verifies with backend                                  │  │
│  │  • Provides IAP context to entire app                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ provides
                              ▼
         ┌────────────────────────────────────────────────┐
         │                                                 │
    ┌────┴────┐         ┌──────────────┐         ┌───────┴──────┐
    │         │         │              │         │              │
    │ Credits │         │ Subscriptions│         │ Integrations │
    │         │         │              │         │              │
    └─────────┘         └──────────────┘         └──────────────┘
        │                      │                        │
        │                      │                        │
        ▼                      ▼                        ▼
useIAPCredits          useIAPSubscription       useIAP (direct)
        │                      │                        │
        │                      │                        │
        ▼                      ▼                        ▼
CreditPurchaseModalIAP  plans-pricing-iap.tsx  SubscriptionModalIAP
```

---

## Setup Required

### 1. App Store Connect (iOS)

1. **Create App Store Connect Account**
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Sign in with your Apple Developer account

2. **Configure In-App Purchases**
   - Select your app
   - Go to "Features" → "In-App Purchases"
   - Click "+" to add new products

3. **Product Types**

   **Consumables (Credits):**
   ```
   Product ID: ai.odysseytech.credits.500
   Reference Name: 500 Credits
   Price: $9.99 (Tier 10)
   ```

   **Auto-Renewable Subscriptions (Plans):**
   ```
   Product ID: ai.odysseytech.pro.monthly
   Reference Name: Pro Monthly
   Price: $19.99
   Duration: 1 Month
   Subscription Group: Pro Plans
   ```

4. **Required Products to Create**

   **Credits (Consumables):**
   - `ai.odysseytech.credits.500` - $9.99
   - `ai.odysseytech.credits.1500` - $24.99
   - `ai.odysseytech.credits.2500` - $49.99
   - `ai.odysseytech.credits.5000` - $99.99
   - `ai.odysseytech.credits.10000` - $199.99
   - `ai.odysseytech.credits.15000` - $299.99

   **Subscriptions (Auto-Renewable):**
   - `ai.odysseytech.pro.monthly` - $19.99/month
   - `ai.odysseytech.pro.yearly` - $199.99/year
   - `ai.odysseytech.business.monthly` - $39.99/month
   - `ai.odysseytech.business.yearly` - $399.99/year

5. **Testing**
   - Add Sandbox Testers in "Users and Access" → "Sandbox Testers"
   - Use these accounts to test purchases

### 2. Google Play Console (Android)

1. **Create Developer Account**
   - Go to [Google Play Console](https://play.google.com/console)
   - Pay one-time $25 fee

2. **Configure In-App Products**
   - Select your app
   - Go to "Monetize" → "Products" → "In-app products"

3. **Product Types**

   **Consumables (Credits):**
   ```
   Product ID: ai.odysseytech.credits.500
   Name: 500 Credits
   Description: 500 AI credits for your account
   Price: $9.99
   ```

   **Subscriptions:**
   ```
   Product ID: ai.odysseytech.pro.monthly
   Name: Pro Monthly Subscription
   Description: 1000 credits per month + advanced features
   Base Plan: Monthly at $19.99
   ```

4. **Create All Products**
   - Match the same product IDs as iOS
   - Set same prices (Google handles currency conversion)

5. **Testing**
   - Add "License Testers" in "Settings" → "License Testing"
   - Add Gmail addresses that can test purchases

### 3. Backend Setup (Required)

The backend must handle purchase verification. Create these endpoints:

#### POST `/iap/verify-purchase`

Verifies a purchase with Apple/Google and grants credits/subscription.

**Request:**
```json
{
  "product_id": "ai.odysseytech.credits.500",
  "platform": "ios",
  "transaction_receipt": "base64_receipt_data",  // iOS
  "purchase_token": "purchase_token_string"      // Android
}
```

**Response:**
```json
{
  "success": true,
  "credits_added": 500,
  "subscription_updated": false
}
```

**Backend Implementation Notes:**

1. **iOS Receipt Verification:**
   ```python
   # Use Apple's verifyReceipt API
   # Production: https://buy.itunes.apple.com/verifyReceipt
   # Sandbox: https://sandbox.itunes.apple.com/verifyReceipt
   
   import requests
   
   def verify_ios_receipt(receipt_data, is_sandbox=False):
       url = "https://sandbox.itunes.apple.com/verifyReceipt" if is_sandbox else "https://buy.itunes.apple.com/verifyReceipt"
       payload = {
           "receipt-data": receipt_data,
           "password": "YOUR_SHARED_SECRET"  # From App Store Connect
       }
       response = requests.post(url, json=payload)
       return response.json()
   ```

2. **Android Purchase Verification:**
   ```python
   # Use Google Play Developer API
   from googleapiclient.discovery import build
   
   def verify_android_purchase(package_name, product_id, purchase_token):
       service = build('androidpublisher', 'v3', credentials=credentials)
       result = service.purchases().products().get(
           packageName=package_name,
           productId=product_id,
           token=purchase_token
       ).execute()
       return result
   ```

3. **Credit/Subscription Grant:**
   - Verify the purchase is valid
   - Check it hasn't been processed before (idempotency)
   - Add credits to user account OR
   - Update subscription status
   - Return success response

---

## File Structure

```
jaime-mobile-app/
├── constants/
│   └── IAPProducts.ts              # Product IDs and metadata
├── utils/
│   └── IAPService.ts               # Low-level IAP operations
├── providers/
│   └── IAPProvider.tsx             # IAP context provider
├── hooks/
│   ├── useIAPCredits.ts            # Credit purchase hook
│   └── useIAPSubscription.ts       # Subscription hook
├── components/
│   ├── CreditPurchaseModalIAP.tsx  # Credit purchase UI
│   └── integrations/
│       └── SubscriptionModalIAP.tsx # Integration subscription UI
├── app/
│   ├── _layout.tsx                 # Wire up IAPProvider
│   └── (modal)/
│       └── plans-pricing-iap.tsx   # Plans & pricing UI
└── docs/
    └── IAP_IMPLEMENTATION_GUIDE.md # This file
```

---

## How It Works

### 1. Initialization Flow

```typescript
// 1. App starts → IAPProvider initializes
useEffect(() => {
  initializeIAP();
}, []);

// 2. Connect to store
await IAP.connectAsync();

// 3. Fetch products
const products = await IAP.getProductsAsync(ALL_PRODUCT_IDS);

// 4. Cache products for quick access
setProducts(products);
```

### 2. Credit Purchase Flow

```typescript
// 1. User selects package
<TouchableOpacity onPress={() => handlePackageSelect(productId)}>
  <Text>500 Credits - $9.99</Text>
</TouchableOpacity>

// 2. Purchase initiated
const result = await purchaseCredits(productId, 'header_badge');

// 3. IAP purchase
const purchaseResult = await iapService.purchaseProduct(productId);

// 4. Get receipt/token
const receipt = Platform.OS === 'ios' 
  ? purchaseResult.transactionReceipt 
  : purchaseResult.purchaseToken;

// 5. Verify with backend
await api.post('/iap/verify-purchase', {
  product_id: productId,
  platform: Platform.OS,
  transaction_receipt: receipt,  // iOS
  purchase_token: token,         // Android
});

// 6. Refresh credits
await fetchCredits();

// 7. Show success
Alert.alert('Success', 'Credits added!');
```

### 3. Subscription Purchase Flow

```typescript
// Similar to credits but:
// 1. Product type is 'subscription' not 'consumable'
// 2. Backend updates subscription status instead of adding credits
// 3. Subscription auto-renews (handled by stores)
```

### 4. Restore Purchases Flow

```typescript
// 1. User taps "Restore Purchases"
const history = await IAP.getPurchaseHistoryAsync();

// 2. Verify each purchase with backend
for (const purchase of history) {
  await verifyPurchaseWithBackend(purchase);
}

// 3. Refresh subscription/credits
await refreshSubscription();
await fetchCredits();
```

---

## Usage Examples

### Example 1: Show Credit Purchase Modal

```typescript
import { useState } from 'react';
import CreditPurchaseModalIAP from '@/components/CreditPurchaseModalIAP';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onPress={() => setShowModal(true)}>
        Purchase Credits
      </Button>

      <CreditPurchaseModalIAP
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => {
          console.log('Credits purchased!');
          // Refresh your credit display
        }}
        source="header_badge"
      />
    </>
  );
}
```

### Example 2: Direct IAP Access

```typescript
import { useIAP } from '@/providers/IAPProvider';

function MyComponent() {
  const { creditProducts, purchaseProduct, isLoading } = useIAP();

  const handlePurchase = async () => {
    const productId = 'ai.odysseytech.credits.500';
    const result = await purchaseProduct(productId);
    
    if (result.success) {
      console.log('Purchase successful!');
    } else if (result.cancelled) {
      console.log('User cancelled');
    } else {
      console.error('Purchase failed:', result.error);
    }
  };

  return (
    <View>
      {creditProducts.map(product => (
        <Text key={product.productId}>
          {product.title} - {product.price}
        </Text>
      ))}
      <Button onPress={handlePurchase} disabled={isLoading}>
        Purchase
      </Button>
    </View>
  );
}
```

### Example 3: Subscribe to Plan

```typescript
import { useIAPSubscription } from '@/hooks/useIAPSubscription';

function PlansPage() {
  const { 
    subscriptionPackages, 
    isPurchasing, 
    purchaseSubscription 
  } = useIAPSubscription();

  const handleSubscribe = async (productId: string) => {
    const result = await purchaseSubscription(productId, 'plans_page');
    
    if (result.success) {
      // Subscription activated!
    }
  };

  return (
    <View>
      {subscriptionPackages.map(pkg => (
        <Button 
          key={pkg.productId}
          onPress={() => handleSubscribe(pkg.productId)}
          disabled={isPurchasing}
        >
          Subscribe to {pkg.title} - {pkg.price}
        </Button>
      ))}
    </View>
  );
}
```

---

## Testing

### iOS Testing

1. **Sign Out of App Store**
   - Settings → App Store → Sign Out

2. **Build & Run**
   ```bash
   cd jaime-mobile-app
   pnpm run ios
   ```

3. **Make Test Purchase**
   - Trigger purchase in app
   - Sign in with Sandbox Tester account when prompted
   - Complete purchase (free for sandbox)

4. **Verify**
   - Check purchase succeeds
   - Check backend receives verification request
   - Check credits/subscription granted

### Android Testing

1. **Add License Tester**
   - Google Play Console → Settings → License Testing
   - Add your Gmail address

2. **Build Internal Test Track**
   ```bash
   cd jaime-mobile-app
   eas build --platform android --profile preview
   ```

3. **Install & Test**
   - Install APK on device
   - Make purchase (will be charged $0)
   - Verify credits/subscription granted

### Common Test Cases

- ✅ Purchase credits package
- ✅ Purchase subscription
- ✅ Cancel purchase (user taps cancel)
- ✅ Restore purchases
- ✅ Handle no internet connection
- ✅ Handle backend verification failure
- ✅ Handle duplicate purchases
- ✅ Subscribe to yearly vs monthly
- ✅ Upgrade/downgrade subscription

---

## Backend Integration

### Endpoint Requirements

#### 1. Verify Purchase

**Endpoint:** `POST /iap/verify-purchase`

**Purpose:** Verify and process in-app purchase

**Request:**
```typescript
interface VerifyPurchaseRequest {
  product_id: string;
  platform: 'ios' | 'android';
  transaction_receipt?: string;  // iOS
  purchase_token?: string;       // Android
}
```

**Response:**
```typescript
interface VerifyPurchaseResponse {
  success: boolean;
  credits_added?: number;
  subscription_tier?: string;
  subscription_end_date?: string;
  error?: string;
}
```

**Implementation Checklist:**
- [ ] Verify receipt/token with Apple/Google
- [ ] Check purchase hasn't been processed (idempotency)
- [ ] Extract product ID from receipt
- [ ] Determine if credit or subscription
- [ ] Grant credits OR update subscription
- [ ] Store transaction ID to prevent duplicates
- [ ] Return success response

#### 2. Get Subscription Status

**Endpoint:** `GET /subscription/status`

**Purpose:** Get current subscription details

**Response:**
```typescript
interface SubscriptionStatus {
  tier: 'FREE' | 'PRO' | 'BUSINESS';
  is_active: boolean;
  end_date?: string;
  auto_renew: boolean;
  platform?: 'ios' | 'android' | 'web';
}
```

#### 3. Get Credits

**Endpoint:** `GET /remaining-chat-limit`

**Purpose:** Get current credit balance (already exists)

---

## Troubleshooting

### Issue: "Unable to connect to iTunes Store" (iOS)

**Solution:**
- Check you're signed in to a Sandbox Tester account
- Not your real Apple ID
- Sign out of real account in Settings

### Issue: Products not loading

**Solution:**
1. Check product IDs match exactly
2. Verify products are "Ready to Submit" in App Store Connect
3. Wait 24 hours after creating products
4. Check bundle ID matches

### Issue: Purchase fails immediately

**Solution:**
- Check sandbox tester account is valid
- Check you're testing on simulator (use real device for iOS)
- Check backend endpoint is reachable
- Check backend returns 200 OK

### Issue: Credits not granted after purchase

**Solution:**
1. Check backend verification logic
2. Check backend can reach Apple/Google APIs
3. Check transaction ID isn't already processed
4. Add detailed logging to backend

### Issue: "Cannot connect to App Store" on Android

**Solution:**
- Android doesn't use App Store (iOS term)
- Check Google Play Services installed
- Check device has internet
- Check app is signed properly

### Issue: Restore doesn't find purchases

**Solution:**
- Check using same Apple ID / Google account
- Check purchases were made in production or sandbox (not mixed)
- Wait a few minutes after purchase
- Check IAP connection is active

---

## Migration from Stripe

### What Changed

**Before (Stripe):**
- Web-based checkout
- Redirect to website
- No native payment UI
- No App Store integration
- Stripe fees (2.9% + $0.30)

**After (expo-iap):**
- Native payment UI
- In-app purchase flow
- App Store/Play Store billing
- Sandbox testing available
- Platform fees (15-30%)

### Migration Steps

1. ✅ Install expo-iap (already installed)
2. ✅ Create IAP products in stores
3. ✅ Implement IAP service and hooks
4. ✅ Create IAP-based UI components
5. ✅ Wire up IAPProvider
6. ✅ Update backend verification
7. ⚠️ Test thoroughly
8. ⚠️ Deploy backend changes
9. ⚠️ Release app update

### Backwards Compatibility

To support both systems during transition:

```typescript
// Check if IAP is available
const { isInitialized } = useIAP();

// Use IAP if available, fallback to Stripe
const purchaseCredits = async () => {
  if (isInitialized) {
    // Use IAP
    return await purchaseWithIAP();
  } else {
    // Fallback to Stripe
    return await purchaseWithStripe();
  }
};
```

---

## Next Steps

1. **Configure Products**
   - [ ] Create all credit products in App Store Connect
   - [ ] Create all subscription products in App Store Connect
   - [ ] Create matching products in Google Play Console
   - [ ] Test product loading in app

2. **Backend Setup**
   - [ ] Implement `/iap/verify-purchase` endpoint
   - [ ] Add receipt verification for iOS
   - [ ] Add token verification for Android
   - [ ] Add idempotency checking
   - [ ] Test verification flow

3. **Testing**
   - [ ] Create sandbox tester accounts
   - [ ] Test credit purchases
   - [ ] Test subscriptions
   - [ ] Test restore purchases
   - [ ] Test error cases

4. **Deployment**
   - [ ] Deploy backend changes
   - [ ] Submit app for review
   - [ ] Monitor for issues
   - [ ] Track purchase metrics

---

## Support

For issues or questions:
- IAP Documentation: https://docs.expo.dev/versions/latest/sdk/in-app-purchases/
- Apple IAP Guide: https://developer.apple.com/in-app-purchase/
- Google Billing Guide: https://developer.android.com/google/play/billing

---

**Last Updated:** October 31, 2025

