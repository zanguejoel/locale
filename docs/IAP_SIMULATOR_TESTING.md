# IAP Simulator Testing Guide

## ❌ Important: Real IAP Cannot Work on Simulator

**Apple's Policy:** In-App Purchases require a physical iOS device for testing.

### What Doesn't Work on Simulator:
- ❌ Cannot connect to App Store
- ❌ Cannot load real products
- ❌ Cannot make purchases
- ❌ Cannot verify receipts
- ❌ Cannot test payment flow

---

## ✅ What CAN Be Tested on Simulator

Even though purchases don't work, you can still test:

### 1. UI and UX
- ✅ Modal opens and displays correctly
- ✅ Product list renders
- ✅ Selection highlighting works
- ✅ Animations and transitions
- ✅ Layout on different screen sizes
- ✅ Dark/light theme support

### 2. Navigation
- ✅ Modal opens from all locations
- ✅ Modal closes properly
- ✅ Routes to correct pages
- ✅ Back navigation works

### 3. Error Handling
- ✅ Loading states display
- ✅ Empty state shows when no products
- ✅ Error messages display properly

### 4. Logic (Without Real Purchase)
- ✅ Package selection
- ✅ Price calculations
- ✅ Button enable/disable states

---

## 🧪 Using Mock IAP for Simulator Testing

I've created a mock IAP service for simulator testing. Here's how to use it:

### Option 1: Conditional Mock (Recommended)

Update `utils/IAPService.ts`:

```typescript
import { Platform } from 'react-native';
import iapServiceMock from './IAPServiceMock';
import iapServiceReal from './IAPServiceReal'; // Rename current IAPService.ts

// Use mock on simulator, real on device
export const iapService = Platform.OS === 'ios' && !__DEV__
  ? iapServiceReal
  : iapServiceMock;
```

### Option 2: Manual Mock During Development

In `providers/IAPProvider.tsx`, temporarily use mock:

```typescript
import { iapService } from '@/utils/IAPService';
import { iapServiceMock } from '@/utils/IAPServiceMock';

// Use mock for simulator testing
const activeService = __DEV__ ? iapServiceMock : iapService;
```

### What the Mock Does

✅ **Fake Products:** Creates mock product list with prices  
✅ **Simulated Purchase:** Returns success after 1 second delay  
✅ **Mock Receipts:** Generates fake receipt for backend testing  
✅ **UI Testing:** Allows testing all UI flows  

**Note:** Backend will reject mock receipts (which is correct behavior)

---

## 🔧 Partial Testing Strategy

### Phase 1: Simulator Testing (UI/UX)

```bash
cd jaime-mobile-app
pnpm run ios  # Opens simulator
```

**Test on simulator:**
1. ✅ Modal opens and looks good
2. ✅ Products display (if using mock)
3. ✅ Selection works
4. ✅ Layouts correct
5. ✅ Navigation works
6. ✅ Animations smooth

### Phase 2: Device Testing (Full Flow)

```bash
# Connect iOS device
pnpm run ios --device
```

**Test on device:**
1. ✅ IAP initializes
2. ✅ Real products load from App Store
3. ✅ Can make purchases
4. ✅ Payment sheet appears
5. ✅ Sandbox purchases work
6. ✅ Credits/subscriptions granted
7. ✅ Receipt verification works

---

## 📱 Device Testing Requirements

### You Need:
1. **Physical iOS device** (iPhone or iPad)
2. **USB cable** or **wireless debugging enabled**
3. **Apple Developer account** (to run on device)
4. **Sandbox tester account** (for test purchases)

### Setup Steps:

#### 1. Configure Xcode
```bash
cd jaime-mobile-app
open ios/Odyssey.xcworkspace
```

In Xcode:
- Select your team in Signing & Capabilities
- Select your device from device dropdown
- Click Run (▶️)

#### 2. Sign Out of App Store on Device
- Settings → [Your Name] → Media & Purchases → Sign Out

#### 3. Run App on Device
- App installs on device
- You can now test real IAP

#### 4. Make Test Purchase
- Open app
- Trigger purchase
- Sign in with sandbox tester when prompted
- Complete purchase (free in sandbox)

---

## 🎨 What You CAN Test on Simulator

Even without purchases working, test these:

### UI Components
```typescript
// Test the modal UI
import CreditPurchaseModalIAP from '@/components/CreditPurchaseModalIAP';

// Open in simulator
<CreditPurchaseModalIAP
  visible={true}
  onClose={() => {}}
  source="test"
/>
```

**Check:**
- [ ] Modal animates in smoothly
- [ ] Header displays correctly
- [ ] Balance card shows (if credits loaded)
- [ ] Package cards render nicely
- [ ] Selected state highlights properly
- [ ] Purchase button enables when package selected
- [ ] Close button works
- [ ] Scrolling works smoothly
- [ ] Dark/light theme looks good

### Navigation Flows
```typescript
// Test navigation
router.push('/(modal)/plans-pricing-iap');

// Test modal open/close
setShowModal(true);
setShowModal(false);
```

**Check:**
- [ ] Routes work correctly
- [ ] Modals open/close smoothly
- [ ] Back navigation works
- [ ] Deep linking works (if applicable)

### Error States
```typescript
// Test error display
const { error } = useIAP();

// Simulate no products
// Check how UI looks
```

**Check:**
- [ ] Error messages display correctly
- [ ] Empty states show properly
- [ ] Loading indicators work
- [ ] Graceful degradation

---

## 🔄 Workaround: Hybrid Testing Approach

### On Simulator: Test Everything Except Purchase

```typescript
// In your component
const { creditPackages } = useIAPCredits();

// Products might be empty on simulator, but UI still works
// You can hardcode mock data for UI testing:

const MOCK_PACKAGES = [
  { productId: 'credits_500', credits: 500, price: '$9.99', priceAmount: 9.99 },
  { productId: 'credits_1500', credits: 1500, price: '$24.99', priceAmount: 24.99 },
  // ... etc
];

const displayPackages = creditPackages.length > 0 ? creditPackages : MOCK_PACKAGES;
```

### On Device: Test Full Purchase Flow

- Connect device
- Build and run on device
- Test actual purchases with sandbox account

---

## 🚀 Quick Device Testing Setup

### 1. Connect Your iPhone/iPad

Via USB:
```bash
# Make sure device is connected
# Trust computer on device
cd jaime-mobile-app
pnpm run ios --device
```

Via Wireless (if enabled):
```bash
# In Xcode: Window → Devices and Simulators
# Enable "Connect via network" for your device
cd jaime-mobile-app
pnpm run ios --device
```

### 2. First Build on Device

You might need to:
```bash
# Open in Xcode for signing
cd jaime-mobile-app
open ios/Odyssey.xcworkspace

# In Xcode:
# 1. Select your device
# 2. Signing & Capabilities → Select your team
# 3. Click Run (▶️)
```

### 3. Sign Out of App Store (On Device)

Settings → [Your Name] → Media & Purchases → Sign Out

### 4. Test Purchase

In app:
- Trigger purchase
- Sign in with sandbox tester
- Complete purchase
- Verify credits added

---

## 💡 Recommended Testing Strategy

### Day 1: Simulator (UI/UX)
```bash
pnpm run ios  # Simulator
```

**Test:**
- [ ] All modals open/close
- [ ] Layouts look good
- [ ] Navigation works
- [ ] Animations smooth
- [ ] Theme switching works
- [ ] Empty states display
- [ ] Loading states work

**Time:** ~30 minutes

### Day 2: Device (Full IAP)
```bash
pnpm run ios --device
```

**Test:**
- [ ] IAP initializes
- [ ] Products load from App Store
- [ ] Can make purchases
- [ ] Receipts verify
- [ ] Credits/subscriptions granted
- [ ] All flows work end-to-end

**Time:** ~1-2 hours

---

## 🎯 Summary

### Simulator Testing (Limited)
- ✅ UI and layouts
- ✅ Navigation
- ✅ Animations
- ✅ Theme support
- ❌ Real purchases
- ❌ Product loading
- ❌ Receipt verification

### Device Testing (Full)
- ✅ Everything from simulator
- ✅ Real IAP connection
- ✅ Real product loading
- ✅ Real purchases (sandbox)
- ✅ Receipt verification
- ✅ End-to-end flow

---

## 🔧 Quick Answer

**Question:** Can I test IAP on simulator?  
**Answer:** **No** - You need a real iOS device.

**Question:** What can I test on simulator?  
**Answer:** UI, layouts, navigation, animations - everything except actual purchases.

**Question:** How do I test on device?  
**Answer:** Connect device via USB, run `pnpm run ios --device`, use sandbox tester account.

**Question:** Do I need to pay for testing?  
**Answer:** No! Sandbox purchases are always free.

---

## 📱 Minimum Device Requirements

Any of these will work:
- iPhone 6s or newer
- iPad Air 2 or newer
- iPod touch (7th generation)
- Running iOS 12 or later

You can even use an old device you have lying around!

---

**Bottom Line:** For full IAP testing, you **must use a real iOS device**. The simulator can only test UI and logic, not actual purchases.

**Recommended:** Get an old iPhone (even iPhone 6s works!) for testing. Sandbox purchases are free, so no cost to test!

