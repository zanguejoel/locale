# 🎯 E2E Testing with Detox - Complete Guide

**Date**: October 29, 2025  
**Status**: ✅ Configuration Complete, Ready to Add testIDs

---

## 🚀 Quick Start

### Prerequisites
✅ Detox already installed (v20.45.0)  
✅ iOS Simulator or Android Emulator
✅ Xcode (for iOS) or Android Studio (for Android)

### Run Your First E2E Test

```bash
# iOS
npm run build:e2e:ios    # Build the app (first time)
npm run test:e2e:ios     # Run E2E tests

# Android
npm run build:e2e:android  # Build the app (first time)
npm run test:e2e:android   # Run E2E tests

# One command (build + test)
npm run e2e:ios
npm run e2e:android
```

---

## 📁 What Was Created

### Configuration Files
1. **`.detoxrc.js`** - Main Detox configuration
   - iOS and Android app configurations
   - Simulator/Emulator setup
   - Build commands

2. **`e2e/jest.config.js`** - Jest config for E2E tests
   - 120 second timeout
   - Detox test environment
   - Single worker (required for E2E)

### Test Files Created
3. **`e2e/init.ts`** - Global E2E test setup
4. **`e2e/chat.e2e.ts`** - Chat functionality tests (P0)
5. **`e2e/auth.e2e.ts`** - Authentication flow tests (P0)
6. **`e2e/performance.e2e.ts`** - Performance tests (P2)

### Scripts Added to package.json
```json
{
  "test:e2e:ios": "Run iOS E2E tests",
  "test:e2e:android": "Run Android E2E tests",
  "build:e2e:ios": "Build iOS for testing",
  "build:e2e:android": "Build Android for testing",
  "e2e:ios": "Build + test iOS",
  "e2e:android": "Build + test Android"
}
```

---

## ⚠️ Important: Add testIDs to Your Components

**E2E tests require `testID` props on components.**

### Example: Adding testIDs

#### Before (No testID)
```tsx
<TextInput
  placeholder="Type a message..."
  value={message}
  onChangeText={setMessage}
/>
```

#### After (With testID)
```tsx
<TextInput
  testID="chat-input"
  placeholder="Type a message..."
  value={message}
  onChangeText={setMessage}
/>
```

### Required testIDs for Chat E2E Tests

Add these testIDs to your components:

```tsx
// Chat Screen
<View testID="chat-screen">
  
  // Message Input
  <TextInput testID="chat-input" />
  <TouchableOpacity testID="send-button">
  <TouchableOpacity testID="stop-button">
  
  // Message List
  <FlatList testID="message-list">
    // Individual messages
    <View testID={`message-${message.id}`}>
    <View testID="bot-message">
    <View testID="user-message">
  </FlatList>
  
  // Streaming Indicators
  <View testID="streaming-indicator" />
  <View testID="loading-dots" />
  
  // Navigation
  <TouchableOpacity testID="new-conversation-button" />
  <TouchableOpacity testID="conversations-button" />
  
  // Empty State
  <View testID="empty-chat-state" />
  
  // App Root
  <View testID="app-loaded" />
  <View testID="root-view" />
</View>
```

### Quick testID Checklist

Use this checklist to add testIDs to your app:

- [ ] Chat input field (`chat-input`)
- [ ] Send button (`send-button`)
- [ ] Stop streaming button (`stop-button`)
- [ ] Message list (`message-list`)
- [ ] Individual messages (`message-${id}`)
- [ ] Bot messages (`bot-message`)
- [ ] Streaming indicator (`streaming-indicator`)
- [ ] New conversation button (`new-conversation-button`)
- [ ] Conversations list button (`conversations-button`)
- [ ] Empty state view (`empty-chat-state`)
- [ ] App root view (`root-view` or `app-loaded`)
- [ ] Auth screen (`auth-screen`)
- [ ] Login button (`login-button`)
- [ ] Signup button (`signup-button`)
- [ ] Email input (`email-input`)
- [ ] Password input (`password-input`)

---

## 📋 E2E Test Files Overview

### 1. chat.e2e.ts (P0 - Critical)

**Tests**: 15+ chat flow tests

```typescript
✅ App Launch
✅ Message Flow (send, receive, display)
✅ Stream Cancellation
✅ Conversation Management (create, switch)
✅ Error Handling
✅ UI Interactions (scroll, input)
✅ Performance (responsiveness during streaming)
```

### 2. auth.e2e.ts (P0 - Critical)

**Tests**: 8+ authentication tests

```typescript
✅ First Launch Experience
✅ Login Flow (validation, errors)
✅ Registration Flow (password confirmation)
✅ Authenticated State (persistence)
```

### 3. performance.e2e.ts (P2 - Medium)

**Tests**: 6+ performance tests

```typescript
✅ App Launch Performance (< 5s)
✅ Long Conversation Handling
✅ Smooth Scrolling
✅ Streaming Performance (60 FPS)
✅ Memory Management (50+ messages)
```

---

## 🔧 Configuration Details

### iOS Configuration
```javascript
device: 'iPhone 15 Pro'
binaryPath: ios/build/Build/Products/Debug-iphonesimulator/Odyssey.app
workspace: ios/Odyssey.xcworkspace
scheme: Odyssey
```

### Android Configuration
```javascript
device: 'Pixel_5_API_34'
binaryPath: android/app/build/outputs/apk/debug/app-debug.apk
avdName: Pixel_5_API_34
```

---

## 🚀 How to Run E2E Tests

### First Time Setup

#### iOS
```bash
# 1. Build the app for testing
npm run build:e2e:ios

# 2. Run tests
npm run test:e2e:ios

# Or do both at once
npm run e2e:ios
```

#### Android
```bash
# 1. Start emulator first
# Open Android Studio > AVD Manager > Start Pixel_5_API_34

# 2. Build the app for testing
npm run build:e2e:android

# 3. Run tests
npm run test:e2e:android

# Or do both at once
npm run e2e:android
```

### Daily Usage

```bash
# After first build, you can just run tests
npm run test:e2e:ios

# Only rebuild when code changes
npm run build:e2e:ios
npm run test:e2e:ios

# Run specific test file
npm run test:e2e:ios -- e2e/chat.e2e.ts

# Run specific test
npm run test:e2e:ios -- e2e/chat.e2e.ts -t "should send a text message"
```

---

## 🎯 Test Priorities

### P0 (Critical) - Implement First
- ✅ **chat.e2e.ts** - Message send/receive
- ✅ **auth.e2e.ts** - Login/signup flows

### P1 (High) - Implement Soon
- ⏸️ **navigation.e2e.ts** - App navigation
- ⏸️ **settings.e2e.ts** - Settings changes

### P2 (Medium) - Nice to Have
- ✅ **performance.e2e.ts** - Performance benchmarks
- ⏸️ **offline.e2e.ts** - Offline behavior

---

## 🐛 Debugging E2E Tests

### View Test Artifacts

```bash
# Run with artifacts enabled
npm run test:e2e:ios -- --record-logs all --take-screenshots all

# Artifacts saved to: artifacts/
```

### Debug Specific Test

```bash
# Run specific test with verbose output
npm run test:e2e:ios -- e2e/chat.e2e.ts -t "should send" --verbose
```

### Common Issues

#### Issue: Simulator not found
```bash
# List available simulators
xcrun simctl list devices

# Update device in .detoxrc.js to match available device
```

#### Issue: Build fails
```bash
# Clean build
cd ios && xcodebuild clean && cd ..
npm run build:e2e:ios
```

#### Issue: Tests timeout
```bash
# Increase timeout in e2e/jest.config.js
testTimeout: 180000  // 3 minutes
```

#### Issue: Element not found
```bash
# Make sure testID is added to component
# Use Detox inspector to find elements
detox test --inspect
```

---

## 📊 E2E Test Coverage

### Planned Coverage

| Feature | Tests | Priority | Status |
|---------|-------|----------|--------|
| Chat Messaging | 7 | P0 | ✅ Created |
| Stream Control | 2 | P0 | ✅ Created |
| Conversation Management | 3 | P0 | ✅ Created |
| Authentication | 8 | P0 | ✅ Created |
| Error Handling | 1 | P1 | ✅ Created |
| Performance | 6 | P2 | ✅ Created |
| **TOTAL** | **27** | **Mixed** | **✅ Ready** |

---

## 🎓 Writing E2E Tests - Best Practices

### 1. Use Descriptive testIDs
```tsx
// Good
testID="send-message-button"
testID="user-message-123"
testID="chat-input-field"

// Bad
testID="btn1"
testID="msg"
testID="input"
```

### 2. Wait for Elements
```typescript
// Always use waitFor for elements that may load async
await waitFor(element(by.id('bot-message')))
  .toBeVisible()
  .withTimeout(5000);
```

### 3. Test Real User Flows
```typescript
// Test complete workflows, not just individual actions
it('should complete message send-receive cycle', async () => {
  await element(by.id('chat-input')).typeText('Hello');
  await element(by.id('send-button')).tap();
  await waitFor(element(by.text('Hello'))).toBeVisible();
  await waitFor(element(by.id('bot-message'))).toBeVisible();
});
```

### 4. Clean State Between Tests
```typescript
beforeEach(async () => {
  await device.reloadReactNative(); // Fresh state
});
```

### 5. Handle Async Operations
```typescript
// Give enough timeout for network operations
await waitFor(element(by.id('response')))
  .toBeVisible()
  .withTimeout(10000); // 10 seconds for API call
```

---

## 🔍 Detox Matchers Reference

### Visibility
```typescript
await expect(element(by.id('chat-input'))).toBeVisible();
await expect(element(by.id('chat-input'))).toExist();
await expect(element(by.id('chat-input'))).not.toBeVisible();
```

### Text
```typescript
await expect(element(by.id('message'))).toHaveText('Hello');
await expect(element(by.text('Hello'))).toExist();
```

### Actions
```typescript
await element(by.id('button')).tap();
await element(by.id('input')).typeText('text');
await element(by.id('input')).clearText();
await element(by.id('list')).scroll(500, 'down');
await element(by.id('list')).swipe('up', 'fast');
```

### Waiting
```typescript
await waitFor(element(by.id('element')))
  .toBeVisible()
  .withTimeout(5000);

await waitFor(element(by.id('element')))
  .not.toExist()
  .withTimeout(2000);
```

---

## 🎬 Example: Complete E2E Test

```typescript
describe('Complete Message Flow', () => {
  it('should send message and receive response', async () => {
    // 1. Navigate to chat
    await element(by.id('chat-tab')).tap();
    await expect(element(by.id('chat-screen'))).toBeVisible();
    
    // 2. Type message
    await element(by.id('chat-input')).typeText('Hello AI');
    
    // 3. Send message
    await element(by.id('send-button')).tap();
    
    // 4. Verify user message appears
    await waitFor(element(by.text('Hello AI')))
      .toBeVisible()
      .withTimeout(2000);
    
    // 5. Wait for streaming indicator
    await waitFor(element(by.id('streaming-indicator')))
      .toBeVisible()
      .withTimeout(2000);
    
    // 6. Wait for bot response
    await waitFor(element(by.id('bot-message')))
      .toBeVisible()
      .withTimeout(10000);
    
    // 7. Verify streaming stopped
    await waitFor(element(by.id('streaming-indicator')))
      .not.toBeVisible()
      .withTimeout(2000);
    
    // 8. Verify input is empty
    await expect(element(by.id('chat-input'))).toHaveText('');
  });
});
```

---

## 📝 Adding testIDs - Step by Step

### Step 1: Identify Components

List all interactive components in your chat screen:
- Text inputs
- Buttons
- Lists
- Messages
- Indicators

### Step 2: Add testID Props

#### React Native Components
```tsx
import { View, Text, TextInput, TouchableOpacity } from 'react-native';

// View
<View testID="chat-screen">

// TextInput
<TextInput testID="chat-input" />

// Button/TouchableOpacity
<TouchableOpacity testID="send-button">

// Text
<Text testID="message-text">

// FlatList
<FlatList testID="message-list" />
```

#### Dynamic testIDs
```tsx
// For lists with dynamic items
{messages.map(message => (
  <View key={message.id} testID={`message-${message.id}`}>
    <Text testID={`message-text-${message.id}`}>
      {message.content}
    </Text>
  </View>
))}
```

### Step 3: Verify testIDs

Run Detox in debug mode to inspect elements:
```bash
# iOS
detox test --configuration ios.sim.debug --inspect

# Android
detox test --configuration android.emu.debug --inspect
```

---

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-ios:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Setup iOS
        run: cd ios && pod install && cd ..
      
      - name: Build app
        run: npm run build:e2e:ios
      
      - name: Run E2E tests
        run: npm run test:e2e:ios
      
      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: detox-artifacts
          path: artifacts/
  
  e2e-android:
    runs-on: macos-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Android SDK
        uses: android-actions/setup-android@v2
      
      - name: Create AVD
        run: |
          echo "y" | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager "system-images;android-34;google_apis;x86_64"
          echo "no" | $ANDROID_HOME/cmdline-tools/latest/bin/avdmanager create avd -n test -k "system-images;android-34;google_apis;x86_64"
      
      - name: Start Emulator
        run: |
          $ANDROID_HOME/emulator/emulator -avd test -no-audio -no-boot-anim -no-window &
          adb wait-for-device shell 'while [[ -z $(getprop sys.boot_completed) ]]; do sleep 1; done;'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Build app
        run: npm run build:e2e:android
      
      - name: Run E2E tests
        run: npm run test:e2e:android
```

---

## 📚 E2E Test Structure

### Current E2E Tests (27 total)

```
e2e/
├── init.ts                   # Global setup
├── chat.e2e.ts              # 15 tests ✅
│   ├── App Launch (2)
│   ├── Message Flow (4)
│   ├── Stream Cancellation (2)
│   ├── Conversation Management (3)
│   ├── Error Handling (1)
│   ├── UI Interactions (2)
│   └── Performance (2)
├── auth.e2e.ts              # 8 tests ✅
│   ├── First Launch (2)
│   ├── Login Flow (3)
│   ├── Registration Flow (2)
│   └── Authenticated State (1)
└── performance.e2e.ts       # 6 tests ✅
    ├── Launch Performance (1)
    ├── Chat Performance (2)
    ├── Streaming Performance (2)
    └── Memory Management (1)
```

---

## ⚡ Quick Commands Reference

```bash
# === BUILD ===
npm run build:e2e:ios              # Build iOS debug
npm run build:e2e:android          # Build Android debug

# === TEST ===
npm run test:e2e:ios               # Test iOS
npm run test:e2e:android           # Test Android

# === BUILD + TEST ===
npm run e2e:ios                    # iOS (all in one)
npm run e2e:android                # Android (all in one)

# === SPECIFIC TESTS ===
npm run test:e2e:ios -- e2e/chat.e2e.ts
npm run test:e2e:ios -- -t "should send a text message"

# === DEBUG ===
npm run test:e2e:ios -- --inspect              # Debug mode
npm run test:e2e:ios -- --record-logs all      # Record logs
npm run test:e2e:ios -- --take-screenshots all # Screenshots
```

---

## 🎯 Next Steps to Make E2E Tests Work

### Step 1: Add testIDs to Components (Required)

Go through your chat components and add testIDs:

**Priority Components**:
1. `components/ChatInput.tsx` (or equivalent) - Add `testID="chat-input"` and `testID="send-button"`
2. `components/MessageList.tsx` - Add `testID="message-list"`
3. `components/ChatMessage.tsx` - Add `testID` for messages
4. `app/(tabs)/chat.tsx` or main chat screen - Add `testID="chat-screen"`

### Step 2: Build the App

```bash
# iOS
npm run build:e2e:ios

# Android  
npm run build:e2e:android
```

### Step 3: Run a Simple Test

```bash
# Run just the app launch test first
npm run test:e2e:ios -- e2e/chat.e2e.ts -t "should launch app"
```

### Step 4: Iterate and Fix

- Run tests
- Fix any missing testIDs
- Update tests to match your actual UI
- Repeat

---

## 💡 Tips for Success

### 1. Start Small
```bash
# Test one thing at a time
npm run test:e2e:ios -- -t "should launch app"
```

### 2. Use Detox Inspector
```bash
# Find elements interactively
detox test --configuration ios.sim.debug --inspect
```

### 3. Add testIDs Incrementally
- Start with critical path (send message)
- Add testIDs as you write each test
- Don't try to add all at once

### 4. Keep Tests Independent
- Each test should work standalone
- Use `beforeEach` to reset state
- Don't rely on test order

### 5. Handle Timing
- Always use `waitFor` for async elements
- Set appropriate timeouts
- Account for network delays

---

## 📈 Expected Timeline

### Week 1: Setup & First Tests
- [ ] Add testIDs to chat components
- [ ] Build app for testing
- [ ] Run first E2E test
- [ ] Fix any configuration issues

### Week 2: Core Tests
- [ ] Complete chat flow tests
- [ ] Add auth flow tests
- [ ] Fix flaky tests
- [ ] Document test patterns

### Week 3: Coverage & Polish
- [ ] Add remaining tests
- [ ] Performance tests
- [ ] CI/CD integration
- [ ] Team training

---

## 🎊 What You Have Now

### ✅ Complete E2E Infrastructure
- `.detoxrc.js` configuration for iOS & Android
- E2E test directory structure
- 27 E2E test cases ready to run
- Package.json scripts configured
- Complete documentation

### ⚠️ What's Needed
- Add `testID` props to your React Native components
- Build the app (`npm run build:e2e:ios`)
- Run the tests and iterate

---

## 📚 Additional Resources

### Detox Documentation
- [Getting Started](https://wix.github.io/Detox/docs/introduction/getting-started)
- [API Reference](https://wix.github.io/Detox/docs/api/matchers)
- [Troubleshooting](https://wix.github.io/Detox/docs/introduction/troubleshooting)

### Test Examples
- [Detox Examples](https://github.com/wix/Detox/tree/master/examples)
- [React Native Testing](https://reactnative.dev/docs/testing-overview)

---

## 🎯 Success Criteria

E2E tests are successful when:

- ✅ Tests run without manual intervention
- ✅ Tests complete in < 5 minutes
- ✅ Flakiness < 10%
- ✅ Cover all critical user flows
- ✅ Run in CI/CD pipeline
- ✅ Catch real bugs before production

---

## 📞 Quick Help

| Need | Command |
|------|---------|
| Build iOS | `npm run build:e2e:ios` |
| Test iOS | `npm run test:e2e:ios` |
| Build Android | `npm run build:e2e:android` |
| Test Android | `npm run test:e2e:android` |
| Debug | `npm run test:e2e:ios -- --inspect` |
| Specific test | `npm run test:e2e:ios -- -t "test name"` |

---

**Status**: ✅ **Configuration Complete!**  
**Next**: Add testIDs to components and run first test

🚀 **You're ready for E2E testing!**

