# Mobile Chat Scroll - Quick Testing Guide

**Purpose:** Verify the new scroll implementation works correctly  
**Time Required:** 10-15 minutes  
**Date:** October 23, 2025

---

## 🎯 Quick Test (5 minutes)

### Test 1: Basic Send Message
1. Open a new conversation
2. Type and send a message
3. **✅ PASS:** User message appears at TOP of screen (not bottom)
4. **✅ PASS:** You can see the input field below the message
5. **✅ PASS:** There's extra space below the message (scroll room)

### Test 2: AI Response
1. Wait for AI to respond
2. **✅ PASS:** Response appears below user message
3. **✅ PASS:** No sudden jumping or scrolling
4. **✅ PASS:** Input stays visible

### Test 3: User Scroll Control
1. Start typing a message that will get a long response
2. Send it and immediately scroll up
3. **✅ PASS:** Chat STOPS auto-scrolling
4. **✅ PASS:** You can read older messages while AI responds
5. Stop scrolling and wait 2 seconds
6. **✅ PASS:** Auto-scroll resumes (if still streaming)

---

## 🔬 Detailed Test (15 minutes)

### Scenario 1: First Message in New Conversation

**Steps:**
1. Navigate to "New Chat"
2. Type: "Hello, what's your name?"
3. Send message

**Expected Behavior:**
- ✅ Message scrolls to top of viewport (~5% from top edge)
- ✅ Input field remains visible
- ✅ Extra white space appears below message
- ✅ No janky animations or jumps

### Scenario 2: Subsequent Messages

**Steps:**
1. Wait for AI response
2. Type: "Tell me a joke"
3. Send message

**Expected Behavior:**
- ✅ Previous conversation scrolls up (out of view)
- ✅ New user message at top
- ✅ Same positioning as first message (consistent!)
- ✅ Smooth scroll animation

### Scenario 3: Short AI Response

**Steps:**
1. Ask: "Say just 'hi'"
2. Observe the short response

**Expected Behavior:**
- ✅ Short response appears
- ✅ White space REMAINS below (padding kept)
- ✅ No scroll position jump
- ✅ Next message will have same positioning

### Scenario 4: Long AI Response

**Steps:**
1. Ask: "Write a 500-word essay about React Native"
2. Observe the long response

**Expected Behavior:**
- ✅ Long response fills the screen
- ✅ White space gradually disappears
- ✅ No jumping during the removal
- ✅ Smooth padding transition

### Scenario 5: User Scrolls Up During Streaming

**Steps:**
1. Ask: "Write 10 interesting facts about space"
2. As soon as you see response starting, scroll UP
3. Try to read older messages

**Expected Behavior:**
- ✅ Auto-scroll STOPS immediately
- ✅ You can scroll freely
- ✅ New content doesn't pull you down
- ✅ You remain in control

### Scenario 6: Resume Auto-Scroll

**Steps:**
1. Continue from Scenario 5
2. Stop touching the screen
3. Wait 2 seconds without scrolling

**Expected Behavior:**
- ✅ After 2 seconds, auto-scroll MAY resume
- ✅ If you scroll back to bottom, auto-scroll enables
- ✅ Smooth transition, no jarring movement

### Scenario 7: Rapid Fire Messages

**Steps:**
1. Send 3 messages quickly:
   - "One"
   - "Two"
   - "Three"

**Expected Behavior:**
- ✅ Each message positions at top
- ✅ No race conditions or crashes
- ✅ Timeouts don't stack up
- ✅ Smooth handling of rapid sends

### Scenario 8: Conversation Switch

**Steps:**
1. While in a conversation with padding
2. Navigate to different conversation
3. Come back to first conversation

**Expected Behavior:**
- ✅ No crashes or errors
- ✅ Padding resets properly
- ✅ Scroll position handled correctly
- ✅ No memory leaks

### Scenario 9: Different Screen Sizes

**Test on multiple devices if possible:**
- iPhone SE (small screen)
- iPhone 14 (medium screen)  
- iPhone 14 Pro Max (large screen)

**Expected Behavior:**
- ✅ Padding adapts to screen size
- ✅ 1.1x viewport calculation works
- ✅ Consistent UX across sizes
- ✅ No cutoff or overflow issues

### Scenario 10: Rotation

**Steps:**
1. Start in portrait mode
2. Send a message
3. Rotate to landscape
4. Send another message

**Expected Behavior:**
- ✅ Recalculates padding for new orientation
- ✅ Scroll behavior still works
- ✅ No layout breaks
- ✅ Smooth transition

---

## 🐛 Common Issues & Solutions

### Issue: Message scrolls to bottom (not top)
**Check:** `scrollToUserMessage()` is being called (not `scrollToBottom()`)  
**Fix:** Verify `onShouldSend` callback uses `setTimeout(() => scrollToUserMessage(), 200)`

### Issue: Auto-scroll doesn't stop when user scrolls
**Check:** `handleScroll` is attached to FlashList  
**Fix:** Verify `onScroll={handleScroll}` prop is set

### Issue: Timeout doesn't work (auto-scroll never resumes)
**Check:** `scrollTimeoutRef` is being set  
**Fix:** Check console logs for "[ChatPage] Setting timeout" messages

### Issue: Padding doesn't remove after response
**Check:** `removeScrollRoomPadding()` useEffect is running  
**Fix:** Verify `isSending` changes from true to false after streaming

### Issue: Jumpy scroll behavior
**Check:** Multiple padding updates happening  
**Fix:** Check console logs, should see smart padding calculations

---

## 📊 Performance Checks

### Smooth Performance Indicators

✅ **60fps scrolling:** No stuttering or lag when scrolling  
✅ **Fast message rendering:** Messages appear instantly  
✅ **No jank:** Smooth padding transitions  
✅ **Memory stable:** No growing memory usage over time  
✅ **No crashes:** App remains stable during heavy usage

### Red Flags (Contact developer if you see these)

❌ Choppy scrolling (< 60fps)  
❌ Delay in message rendering  
❌ Sudden jumps in scroll position  
❌ Memory warnings in console  
❌ App crashes or freezes

---

## 📱 Device-Specific Notes

### iOS
- Bounce scroll at top/bottom is normal
- Haptic feedback on scroll button is expected
- Safe area insets should be respected

### Android
- Different scroll behavior (no bounce)
- Haptic feedback may vary by device
- Test on various Android versions (10+)

---

## 🎥 Video Recording Recommendations

When reporting issues, record video showing:
1. The message being sent
2. Scroll position before/after
3. Any unexpected behavior
4. Device model and orientation
5. Console logs if possible

---

## ✅ Success Criteria

**All tests should pass for deployment:**

- [ ] Message scrolls to top ✓
- [ ] Dynamic padding works ✓
- [ ] User scroll stops auto-scroll ✓
- [ ] 2-second timeout works ✓
- [ ] Smart padding removal ✓
- [ ] No performance issues ✓
- [ ] Works across devices ✓
- [ ] No crashes or errors ✓

---

## 🚀 Sign-Off

**Tester Name:** _________________  
**Date Tested:** _________________  
**Devices Tested:** _________________  
**Result:** ☐ PASS ☐ FAIL ☐ NEEDS REVIEW  
**Notes:** _________________

---

**Questions?** Contact the mobile development team or reference `MOBILE_SCROLL_IMPLEMENTATION_COMPLETE.md`

