# IAP Quick Start Guide

## 🚀 Quick Start in 5 Minutes

### Step 1: Use Credit Purchase Modal (Easiest)

```typescript
import CreditPurchaseModalIAP from '@/components/CreditPurchaseModalIAP';

function MyComponent() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <Button onPress={() => setShowModal(true)}>
        Buy Credits
      </Button>

      <CreditPurchaseModalIAP
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => console.log('Purchase successful!')}
        source="my_component"
      />
    </>
  );
}
```

That's it! The modal handles everything:
- Shows available packages
- Handles purchase flow
- Verifies with backend
- Shows success/error alerts
- Refreshes credit balance

### Step 2: Use Subscription Page

Navigate to the IAP version:

```typescript
import { useRouter } from 'expo-router';

function MyComponent() {
  const router = useRouter();

  return (
    <Button onPress={() => router.push('/(modal)/plans-pricing-iap')}>
      View Plans
    </Button>
  );
}
```

The page handles everything for subscriptions!

---

## 📱 Available Components

### 1. CreditPurchaseModalIAP

**Purpose:** Native in-app purchase modal for credits

**Props:**
```typescript
interface CreditPurchaseModalIAPProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  source?: string;  // For analytics
}
```

**Features:**
- ✅ Shows current credit balance
- ✅ Displays all credit packages
- ✅ Handles purchase flow
- ✅ Backend verification
- ✅ Success/error alerts
- ✅ Loading states

### 2. plans-pricing-iap.tsx

**Purpose:** Full plans and pricing page with subscriptions

**Features:**
- ✅ Monthly/Yearly toggle
- ✅ Shows all plans (Free, Pro, Business)
- ✅ Current plan indicator
- ✅ Native subscription purchase
- ✅ Restore purchases button

### 3. SubscriptionModalIAP

**Purpose:** Integration subscription modal

**Props:**
```typescript
interface SubscriptionModalIAPProps {
  visible: boolean;
  integrations: Integration[];
  onClose: () => void;
  onSuccess?: () => void;
}
```

---

## 🔧 Available Hooks

### useIAP()

**Purpose:** Access IAP context directly

```typescript
const { 
  isInitialized,      // Is IAP ready?
  isLoading,          // Is operation in progress?
  products,           // All products
  creditProducts,     // Credit products only
  subscriptionProducts, // Subscription products only
  purchaseProduct,    // Purchase any product
  restorePurchases,   // Restore previous purchases
  refreshProducts,    // Refresh product list
} = useIAP();
```

### useIAPCredits()

**Purpose:** High-level credit purchase hook

```typescript
const {
  creditPackages,         // Formatted credit packages
  isPurchasing,           // Is purchase in progress?
  purchaseCredits,        // Purchase credits
  getPackagesForTier,     // Get packages for PRO/BUSINESS
  getPackageByCredits,    // Find package by credit amount
} = useIAPCredits();

// Example
await purchaseCredits('ai.odysseytech.credits.500', 'my_source');
```

### useIAPSubscription()

**Purpose:** High-level subscription hook

```typescript
const {
  subscriptionPackages,   // Formatted subscription packages
  isPurchasing,           // Is purchase in progress?
  isRestoring,            // Is restore in progress?
  purchaseSubscription,   // Purchase subscription
  restoreSubscriptions,   // Restore subscriptions
  getSubscriptionsForTier, // Get plans for PRO/BUSINESS
} = useIAPSubscription();

// Example
await purchaseSubscription('ai.odysseytech.pro.monthly', 'plans_page');
```

---

## 📦 Product IDs Reference

### Credit Products (Consumables)

```typescript
// Pro Tier
'ai.odysseytech.credits.500'    // $9.99
'ai.odysseytech.credits.1500'   // $24.99
'ai.odysseytech.credits.2500'   // $49.99
'ai.odysseytech.credits.5000'   // $99.99

// Business Tier
'ai.odysseytech.credits.10000'  // $199.99
'ai.odysseytech.credits.15000'  // $299.99
```

### Subscription Products (Auto-Renewable)

```typescript
// Pro Plans
'ai.odysseytech.pro.monthly'    // $19.99/month
'ai.odysseytech.pro.yearly'     // $199.99/year (save 20%)

// Business Plans
'ai.odysseytech.business.monthly'  // $39.99/month
'ai.odysseytech.business.yearly'   // $399.99/year (save 20%)
```

---

## 🧪 Testing Checklist

### iOS Testing

```bash
# 1. Sign out of App Store
Settings → [Your Name] → Media & Purchases → Sign Out

# 2. Run app
cd jaime-mobile-app
pnpm run ios

# 3. Make test purchase
# - App will prompt for Apple ID
# - Use sandbox tester email
# - Purchase is FREE in sandbox

# 4. Verify
# - Check credits added
# - Check no real charge
```

### Android Testing

```bash
# 1. Add yourself as license tester in Google Play Console

# 2. Build and install
cd jaime-mobile-app
pnpm run android

# 3. Make test purchase
# - Will charge $0 for testers
# - Check credits added
```

---

## ⚠️ Common Issues

### Products Not Loading

**Check:**
- [ ] Product IDs match exactly in `IAPProducts.ts`
- [ ] Products created in App Store Connect / Google Play Console
- [ ] Products are "Ready to Submit"
- [ ] Waited 24 hours after creating products

### Purchase Fails

**Check:**
- [ ] Using sandbox tester (iOS) or license tester (Android)
- [ ] Testing on real device (not simulator for iOS)
- [ ] Internet connection
- [ ] Backend endpoint is accessible

### Credits Not Granted

**Check:**
- [ ] Backend `/iap/verify-purchase` endpoint working
- [ ] Backend can reach Apple/Google verification APIs
- [ ] Transaction not already processed (idempotency)
- [ ] Check backend logs

---

## 🎯 Next Steps

1. **Test Locally**
   ```bash
   # Run the app
   cd jaime-mobile-app
   pnpm run ios  # or pnpm run android
   
   # Open credit purchase modal
   # Try purchasing credits
   # Check backend receives verification
   ```

2. **Configure Products**
   - Create products in App Store Connect
   - Create products in Google Play Console
   - Match the product IDs exactly

3. **Implement Backend**
   - Add `/iap/verify-purchase` endpoint
   - Verify receipts with Apple/Google
   - Grant credits or update subscriptions

4. **Deploy**
   - Deploy backend changes
   - Submit app for review
   - Monitor purchases

---

## 📚 Full Documentation

For complete details, see:
- **[IAP_IMPLEMENTATION_GUIDE.md](./IAP_IMPLEMENTATION_GUIDE.md)** - Complete guide

---

## 🆘 Need Help?

**IAP not initializing?**
```typescript
// Check provider is wrapping your app
// In app/_layout.tsx:
<IAPProvider>
  <YourApp />
</IAPProvider>
```

**Want to check IAP status?**
```typescript
const { isInitialized, error, products } = useIAP();
console.log('IAP Ready:', isInitialized);
console.log('Error:', error);
console.log('Products:', products.length);
```

**Custom purchase flow?**
```typescript
const { purchaseProduct } = useIAP();

const myPurchase = async () => {
  const result = await purchaseProduct('ai.odysseytech.credits.500');
  
  if (result.success) {
    // Purchase successful!
    // Credits already added by backend
  } else if (result.cancelled) {
    // User cancelled - no problem
  } else {
    // Error occurred
    console.error(result.error);
  }
};
```

---

**Last Updated:** October 31, 2025

