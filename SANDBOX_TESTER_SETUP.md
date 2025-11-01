# Sandbox Tester Setup - Quick Guide

## Problem
Getting error: **"Cannot connect to App Store"** when testing IAP on device.

## Solution
You need to sign in with a **Sandbox Tester** account on your iPhone.

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Create Sandbox Tester Account

1. **Go to App Store Connect:**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with your Apple Developer account

2. **Navigate to Sandbox Testers:**
   - Click **"Users and Access"** (left sidebar)
   - Click **"Sandbox Testers"** tab (at top)

3. **Create Tester:**
   - Click **"+"** button
   - Fill in details:
     ```
     First Name: Test
     Last Name: User
     Email: sandbox.test@youremail.com
     Password: [Create strong password]
     Confirm Password: [Same password]
     Country/Region: [Your country]
     ```
   - Click **"Save"**

4. **Verify Email:**
   - Check the email inbox (sandbox.test@youremail.com)
   - Click verification link
   - Complete verification

---

### Step 2: Sign In on iPhone

**IMPORTANT:** You will sign in with Sandbox Tester **ONLY** in Settings → App Store → Sandbox Account section. Do NOT use it for iCloud or regular App Store!

#### On Your iPhone:

1. **Open Settings App**

2. **Sign OUT of Regular Apple ID (Optional but Recommended):**
   - Tap your name at top
   - Scroll down
   - Tap **"Sign Out"**
   - OR just sign out of App Store specifically:
     - Settings → App Store → Tap your email → Sign Out

3. **Sign IN with Sandbox Tester:**
   - Go to: **Settings → App Store**
   - Scroll to bottom
   - Look for **"SANDBOX ACCOUNT"** section
   - Tap **"SANDBOX ACCOUNT"**
   - Enter credentials:
     ```
     Email: sandbox.test@youremail.com
     Password: [your sandbox password]
     ```

4. **Verify:**
   - You should see your sandbox email under "SANDBOX ACCOUNT"
   - Status should say "Sandbox Account: [email]"

---

### Step 3: Test IAP Connection

1. **Rebuild App:**
   ```bash
   cd jaime-mobile-app
   pnpm run ios -- --device
   ```

2. **Open App on Device**

3. **Check Connection:**
   - Open app
   - Go to **Settings** tab
   - Scroll to **"IAP Debug Status"** card
   - Should show: **🟢 Connected**
   - Products Loaded: **10+**

---

## 🚨 Common Mistakes

### ❌ Mistake #1: Signed in with Sandbox Tester in iCloud
**Problem:** Used sandbox email to sign in at Settings → [Name] (iCloud)

**Fix:** 
- Sign out of iCloud with sandbox account
- Sign back in with your regular Apple ID
- Use sandbox account ONLY in Settings → App Store → Sandbox

### ❌ Mistake #2: Signed in to Regular App Store
**Problem:** Opened App Store app and signed in with sandbox account

**Fix:**
- Don't sign in to App Store app itself
- Only use Settings → App Store → Sandbox Account

### ❌ Mistake #3: Didn't Verify Email
**Problem:** Created sandbox tester but didn't verify email

**Fix:**
- Check email inbox for verification
- Click the link to verify
- Wait 5 minutes, then try again

### ❌ Mistake #4: Using Production Apple ID
**Problem:** Testing with regular Apple ID instead of Sandbox Tester

**Fix:**
- Must use Sandbox Tester for IAP testing
- Regular Apple ID won't work for test purchases

---

## 📱 How to Check If It's Working

### In Settings → App Store on iPhone:

**✅ Correct Setup:**
```
Apple ID: [Your regular email]  ← For App Store
Media & Purchases: [Your regular email]

─── Scroll Down ───

SANDBOX ACCOUNT
sandbox.test@youremail.com  ← For IAP testing
```

**❌ Wrong Setup:**
```
Apple ID: [Not signed in]
Media & Purchases: [Not signed in]

SANDBOX ACCOUNT
[Not signed in]  ← This will cause "Cannot connect" error
```

---

## 🔍 Troubleshooting

### Still Getting "Cannot Connect"?

1. **Check Internet Connection:**
   - Make sure iPhone has internet
   - Try Safari to verify connection works

2. **Wait 5 Minutes:**
   - Sometimes Apple's servers need time to sync
   - Create sandbox tester, wait, then try

3. **Sign Out and Back In:**
   - Settings → App Store → Sandbox Account
   - Sign out
   - Sign back in
   - Rebuild app

4. **Check Parental Controls:**
   - Settings → Screen Time → Content & Privacy Restrictions
   - iTunes & App Store Purchases → must be "Allow"

5. **Verify App Store Connect:**
   - Make sure your app exists in App Store Connect
   - Bundle ID must match: `com.neptunetech.odyssey`

---

## 🎯 Testing Workflow

### Correct Flow:

1. **Create Sandbox Tester** (one time)
2. **Sign in with Sandbox Tester** on device (Settings → App Store → Sandbox)
3. **Build app** on device
4. **Test purchases** (won't charge real money)
5. **Sign out** when done testing

### During Testing:

- ✅ Sandbox Tester signed in → Settings → App Store → Sandbox
- ✅ Regular Apple ID for everything else
- ✅ Can make unlimited test purchases
- ✅ Won't be charged real money
- ✅ Can test subscriptions, credits, etc.

---

## 📋 Quick Reference Card

**Save this for future testing:**

```
Sandbox Tester Email: _________________________
Sandbox Tester Password: _________________________

To Use:
1. Settings → App Store → Sandbox Account
2. Sign in with above credentials
3. Rebuild app: pnpm run ios -- --device
4. Test purchases (free!)
5. Sign out when done
```

---

## 🔗 Useful Links

- **App Store Connect:** https://appstoreconnect.apple.com
- **Sandbox Testers:** App Store Connect → Users and Access → Sandbox Testers
- **Apple Docs:** https://developer.apple.com/documentation/storekit/in-app_purchase/testing_in-app_purchases_with_sandbox

---

## ✅ Success Checklist

After following this guide, you should see:

- [ ] Sandbox Tester created in App Store Connect
- [ ] Email verified
- [ ] Signed in on device (Settings → App Store → Sandbox)
- [ ] App built and installed on device
- [ ] IAP Debug Status shows: 🟢 Connected
- [ ] Products Loaded: 10+

If all checked, you're ready to test IAP! 🎉

---

**Last Updated:** For Odyssey App IAP Testing  
**Bundle ID:** com.neptunetech.odyssey

