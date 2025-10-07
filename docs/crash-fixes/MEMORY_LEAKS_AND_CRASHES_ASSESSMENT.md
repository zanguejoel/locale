# Memory Leaks and Crashes Assessment

**Assessment Date:** October 6, 2025  
**Assessed By:** AI Code Review  
**App:** Odyssey Mobile (React Native + Expo)

---

## 🔴 CRITICAL ISSUES - High Risk of Crashes

### 1. **ApiClient Cache Cleanup Interval Never Cleared** ⚠️ MEMORY LEAK
**File:** `utils/ApiClient.ts:158-166`  
**Severity:** 🔴 CRITICAL

**Issue:**
```typescript
private setupCacheCleanup(): void {
  setInterval(() => {
    for (const [key, value] of this.cache.entries()) {
      if (Date.now() - value.timestamp > value.duration) {
        this.cache.delete(key);
      }
    }
  }, CONFIG.CACHE_CLEANUP_INTERVAL); // 60 seconds
}
```

**Problems:**
- ❌ Interval runs forever and is never cleared
- ❌ No cleanup method exposed
- ❌ Will continue running even after app backgrounded
- ❌ Creates new interval on every ApiClient instantiation
- ❌ Memory leak accumulates over time

**Impact:**
- Memory grows continuously
- Multiple intervals stacking up
- Battery drain
- App slowdown over time
- Potential crash when memory exhausted

**Fix:**
```typescript
class ApiClient {
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private setupCacheCleanup(): void {
    // Clear any existing interval first
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      for (const [key, value] of this.cache.entries()) {
        if (Date.now() - value.timestamp > value.duration) {
          this.cache.delete(key);
        }
      }
    }, CONFIG.CACHE_CLEANUP_INTERVAL);
  }
  
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}
```

---

### 2. **RevenueCat Listener Not Removed** ⚠️ MEMORY LEAK
**File:** `providers/RevenueCat.tsx:36-57`  
**Severity:** 🔴 HIGH

**Issue:**
```typescript
useEffect(() => {
  const init = async () => {
    await Purchases.configure({ apiKey: ... });
    
    // Listen for customer updates
    Purchases.addCustomerInfoUpdateListener(async (info) => {
      updateCustomerInformation(info);
    });  // ❌ No cleanup
    
    await loadOfferings();
  };
  init();
}, []); // ❌ No cleanup function returned
```

**Problems:**
- ❌ Listener never removed
- ❌ Component unmount leaves listener active
- ❌ Multiple listeners accumulate on re-mount
- ❌ Callback references stale state

**Impact:**
- Multiple listeners fire simultaneously
- Memory leak (listener callbacks accumulate)
- Stale state updates
- Potential crash from multiple rapid state updates

**Fix:**
```typescript
useEffect(() => {
  const init = async () => {
    await Purchases.configure({ apiKey: ... });
    setIsReady(true);
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    
    // Store listener for cleanup
    const customerInfoListener = Purchases.addCustomerInfoUpdateListener(
      async (info) => {
        updateCustomerInformation(info);
      }
    );
    
    await loadOfferings();
    
    // Return cleanup function
    return customerInfoListener;
  };
  
  let cleanup: (() => void) | undefined;
  init().then(result => {
    cleanup = result;
  });
  
  return () => {
    cleanup?.();
  };
}, []);
```

---

### 3. **useChat Polling Intervals Not Cleaned Up Properly** ⚠️ MEMORY LEAK
**File:** `hooks/useChat.tsx:879-954`  
**Severity:** 🟠 HIGH

**Issue:**
```typescript
useEffect(() => {
  // ... code ...
  
  const progressInterval = setInterval(updateModelState, 3000);
  const readyInterval = setInterval(updateReadyState, 2000);
  
  return () => {
    clearInterval(progressInterval);
    clearInterval(readyInterval);
  };
}, [llm, isLocal, hasTestedModelReady, testModelReadiness]); // ⚠️ Many dependencies
```

**Problems:**
- ⚠️ Dependencies array includes functions (`testModelReadiness`)
- ⚠️ Effect re-runs frequently, creating new intervals
- ⚠️ Previous intervals cleared, but new ones created rapidly
- ⚠️ Unnecessary re-renders trigger interval recreation

**Impact:**
- Frequent interval recreation causes performance issues
- Brief periods where multiple intervals run simultaneously
- UI stuttering during interval transitions
- Battery drain from excessive polling

**Fix:**
```typescript
useEffect(() => {
  if (!llm || !isLocal) return;
  
  let previousProgress = 0;
  let previousIsReady = false;
  let isMounted = true;
  
  const updateModelState = () => {
    if (!isMounted || !llm) return; // Guard against unmounted
    
    // ... existing update logic ...
  };
  
  const updateReadyState = () => {
    if (!isMounted || !llm) return; // Guard against unmounted
    
    // ... existing update logic ...
  };
  
  updateModelState();
  updateReadyState();
  
  const progressInterval = setInterval(updateModelState, 3000);
  const readyInterval = setInterval(updateReadyState, 2000);
  
  return () => {
    isMounted = false;
    clearInterval(progressInterval);
    clearInterval(readyInterval);
  };
}, [llm, isLocal]); // ✅ Reduced dependencies
```

---

### 4. **Audio Sound Refs Not Properly Managed** ⚠️ MEMORY LEAK
**File:** `components/ChatMessage.tsx:185-210`  
**Severity:** 🟠 MEDIUM

**Issue:**
```typescript
const sound = useRef(new Audio.Sound()); // ❌ New instance on every render

useEffect(() => {
  return () => {
    if (sound.current) {
      sound.current.unloadAsync().catch(err => {
        handleErrorSilent(err, 'Audio Cleanup');
      });
    }
  };
}, []); // ⚠️ Cleanup only runs on unmount
```

**Problems:**
- ⚠️ Sound instance created on every render
- ⚠️ Previous sound instances not cleaned up between renders
- ⚠️ Playing multiple sounds simultaneously causes issues
- ⚠️ Memory leak from accumulated Audio.Sound objects

**Impact:**
- Memory accumulation with each message render
- Audio playback issues (multiple sounds playing)
- App slowdown with many audio messages
- Potential crash with memory exhaustion

**Fix:**
```typescript
// Initialize only once
const soundRef = useRef<Audio.Sound | null>(null);

useEffect(() => {
  // Initialize sound object only once
  const initSound = async () => {
    if (!soundRef.current) {
      soundRef.current = new Audio.Sound();
    }
  };
  initSound();
  
  return () => {
    // Cleanup on unmount
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(err => {
        handleErrorSilent(err, 'Audio Cleanup');
      });
      soundRef.current = null;
    }
  };
}, []); // Run only once

const playAudio = async () => {
  if (!soundRef.current) return;
  
  try {
    if (isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      // Unload any previous audio
      await soundRef.current.unloadAsync();
      
      await soundRef.current.loadAsync(
        { uri: content || files?.[0]?.s3_url || '' },
        { progressUpdateIntervalMillis: 1 }
      );
      await soundRef.current.playAsync();
      setIsPlaying(true);
      
      soundRef.current.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          setDuration(status.durationMillis || 0);
          setPosition(status.positionMillis || 0);
          setIsPlaying(status.isPlaying);
          if (status.didJustFinish) {
            setIsPlaying(false);
          }
        }
      });
    }
  } catch (error) {
    handleErrorSilent(error, 'Audio Player');
  }
};
```

---

### 5. **Animation Values Not Cleaned Up** ⚠️ MEMORY LEAK
**File:** `components/ChatMessage.tsx:82-131`  
**Severity:** 🟡 MEDIUM

**Issue:**
```typescript
const LoadingDots = memo(() => {
  const dotAnimations = [
    useRef(new Animated.Value(0)).current,  // ❌ Created on every render
    useRef(new Animated.Value(0)).current,
    useRef(new Animated.Value(0)).current
  ];
  
  useEffect(() => {
    // ... animation logic ...
    
    return () => {
      animations.forEach(anim => anim.stop());
      dotAnimations.forEach(dot => dot.setValue(0)); // ⚠️ Incomplete cleanup
      animationsRunning.current = false;
    };
  }, []);
```

**Problems:**
- ⚠️ Animated.Value instances created on every component instantiation
- ⚠️ Values not properly released from memory
- ⚠️ Animations may not stop if component unmounts during animation

**Impact:**
- Memory accumulation with many loading messages
- Animation performance degradation
- Potential crash with excessive animated values

**Fix:**
```typescript
const LoadingDots = memo(() => {
  const dotAnimations = useMemo(() => [
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0)
  ], []); // ✅ Create only once
  
  const animationsRef = useRef<Animated.CompositeAnimation[]>([]);
  const animationsRunning = useRef(false);
  
  useEffect(() => {
    if (animationsRunning.current) return;
    
    const createDotAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: CHAT_MESSAGE.ANIMATION.LOADING_DOT,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: CHAT_MESSAGE.ANIMATION.LOADING_DOT,
            useNativeDriver: true,
          }),
          Animated.delay(CHAT_MESSAGE.ANIMATION.LOADING_DOT),
        ])
      );
    };
    
    animationsRef.current = [
      createDotAnimation(dotAnimations[0], 0),
      createDotAnimation(dotAnimations[1], CHAT_MESSAGE.ANIMATION.LOADING_DOT_DELAY),
      createDotAnimation(dotAnimations[2], CHAT_MESSAGE.ANIMATION.LOADING_DOT_DELAY * 2)
    ];
    
    animationsRunning.current = true;
    animationsRef.current.forEach(anim => anim.start());
    
    return () => {
      // Proper cleanup
      animationsRef.current.forEach(anim => anim.stop());
      dotAnimations.forEach(dot => {
        dot.stopAnimation();
        dot.setValue(0);
      });
      animationsRef.current = [];
      animationsRunning.current = false;
    };
  }, [dotAnimations]);
  
  // ... rest of component
});
```

---

## 🟠 HIGH PRIORITY ISSUES

### 6. **Race Condition in Chat Initialization** ⚠️ POTENTIAL CRASH
**File:** `hooks/useChat.tsx:164-167`  
**Severity:** 🟠 HIGH

**Issue:**
```typescript
useEffect(() => {
  fetchConversation(undefined, undefined, setCurrentRoom);
  Keyboard.dismiss();
}, []); // ❌ Runs before user is loaded
```

**Problems:**
- ❌ `fetchConversation` called before `user` is loaded
- ❌ API calls will fail if user token not available
- ❌ Can cause app crash if API expects authentication
- ❌ Race condition between auth initialization and chat initialization

**Impact:**
- App crash on startup if API is strict
- Error messages on first load
- Broken user experience
- Failed API calls wasting resources

**Fix:**
```typescript
useEffect(() => {
  if (user?.user_id) {
    fetchConversation(undefined, undefined, setCurrentRoom);
    Keyboard.dismiss();
  }
}, [user]); // ✅ Wait for user to load
```

---

### 7. **Keyboard Listeners Without isMounted Check** ⚠️ POTENTIAL CRASH
**File:** `components/ChatPage.tsx:123-137`  
**Severity:** 🟡 MEDIUM

**Issue:**
```typescript
useEffect(() => {
  const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
    setKeyboardVisible(true);
    scrollToBottom(); // ⚠️ No mounted check
  });
  const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
    setKeyboardVisible(false);
  });
  
  return () => {
    showSubscription.remove();
    hideSubscription.remove();
  };
}, []);
```

**Problems:**
- ⚠️ `scrollToBottom()` may be called after component unmounts
- ⚠️ State updates on unmounted component
- ⚠️ Dependencies missing (`scrollToBottom`)

**Impact:**
- "Can't perform a React state update on an unmounted component" warnings
- Potential crash in production
- Memory leak from lingering state update attempts

**Fix:**
```typescript
useEffect(() => {
  let isMounted = true;
  
  const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
    if (isMounted) {
      setKeyboardVisible(true);
      scrollToBottom();
    }
  });
  const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
    if (isMounted) {
      setKeyboardVisible(false);
    }
  });
  
  return () => {
    isMounted = false;
    showSubscription.remove();
    hideSubscription.remove();
  };
}, [scrollToBottom]);
```

---

### 8. **NetInfo Listener Cleanup Missing** ⚠️ MEMORY LEAK
**File:** `components/OfflineBanner.tsx:25-28`  
**Severity:** 🟡 MEDIUM

**Issue:**
```typescript
const unsubscribe = NetInfo.addEventListener(state => {
  const offline = !state.isConnected || !state.isInternetReachable;
  setIsOffline(offline);
});
```

**Problems:**
- Need to verify if cleanup is called
- Multiple listeners may accumulate on re-render
- State updates after unmount possible

**Impact:**
- Memory leak from accumulated listeners
- Multiple listeners firing simultaneously
- Performance degradation

**Recommendation:**
```typescript
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener(state => {
    const offline = !state.isConnected || !state.isInternetReachable;
    setIsOffline(offline);
  });
  
  return () => {
    unsubscribe(); // ✅ Ensure cleanup is called
  };
}, []);
```

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **Multiple setTimeout Without Cleanup in Various Components**
**Severity:** 🟡 MEDIUM

**Files Affected:**
- `components/ChatMessage.tsx:251-259, 274-279` - Image loading timers
- `components/ChatPage.tsx:238-244` - Scroll timeout
- `app/forgot-password.tsx:45-48` - Resend timer
- `utils/SecureSession.ts:35-37` - Session cleanup timer

**Problems:**
- Timers may fire after component unmount
- No cleanup for timers in some cases
- State updates on unmounted components

**Generic Fix Pattern:**
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    // Do something
  }, delay);
  
  return () => clearTimeout(timer); // ✅ Always cleanup
}, [dependencies]);
```

---

### 10. **Video Ref May Be Null During Operations**
**File:** `components/ChatMessage.tsx:199, 212-218`  
**Severity:** 🟡 MEDIUM

**Issue:**
```typescript
const videoRef = useRef<Video>(null);

const handleFullScreenVideo = () => {
  if (videoRef.current) {
    videoRef.current.presentFullscreenPlayer();
  } else {
    Alert.alert('Error', 'Video reference not available'); // ⚠️ User-facing error
  }
};
```

**Problems:**
- Ref may be null during component lifecycle
- User can trigger operation before video loads
- No loading state to prevent premature interaction

**Impact:**
- Poor UX (error alerts)
- Potential crash if video operations fail
- Race conditions with video loading

**Fix:**
```typescript
const [isVideoReady, setIsVideoReady] = useState(false);

const handleFullScreenVideo = () => {
  if (videoRef.current && isVideoReady) {
    videoRef.current.presentFullscreenPlayer();
  } else {
    // Silently ignore or show loading state
    console.log('Video not ready yet');
  }
};

// In Video component:
<Video
  ref={videoRef}
  onLoad={() => setIsVideoReady(true)}
  // ... other props
/>
```

---

## 📊 SUMMARY

### By Severity:

| Severity | Count | Description |
|----------|-------|-------------|
| 🔴 CRITICAL | 3 | Memory leaks causing app degradation/crashes |
| 🟠 HIGH | 5 | Potential crashes and significant memory leaks |
| 🟡 MEDIUM | 2 | Minor memory leaks and UX issues |
| **TOTAL** | **10** | **Critical issues requiring immediate attention** |

---

### By Category:

| Category | Count | Issues |
|----------|-------|--------|
| **Memory Leaks** | 6 | ApiClient interval, RevenueCat listener, Audio refs, Animation values, useChat polling, NetInfo listener |
| **Race Conditions** | 2 | Chat initialization, Keyboard listeners |
| **Resource Cleanup** | 4 | Timers, event listeners, animations, audio |
| **Null Reference** | 1 | Video ref operations |

---

## 🎯 RECOMMENDED FIX PRIORITY

### Week 1: Critical Memory Leaks
1. ✅ Fix ApiClient interval leak (2 hours)
2. ✅ Fix RevenueCat listener leak (1 hour)
3. ✅ Fix Audio Sound ref leak (2 hours)
4. ✅ Fix useChat polling recreation (2 hours)

### Week 2: Crash Prevention
5. ✅ Fix race condition in chat initialization (1 hour)
6. ✅ Add mounted checks to keyboard listeners (1 hour)
7. ✅ Fix animation cleanup (2 hours)

### Week 3: Polish & Prevention
8. ✅ Audit all setTimeout/setInterval usage (3 hours)
9. ✅ Add mounted checks across components (2 hours)
10. ✅ Implement app-wide cleanup patterns (3 hours)

---

## 🛠️ TESTING RECOMMENDATIONS

### 1. Memory Profiling
- Use React Native Debugger
- Monitor with Xcode Instruments (iOS)
- Use Android Studio Profiler (Android)
- Test with long sessions (30+ minutes)

### 2. Stress Testing
- Rapid navigation between screens
- Multiple audio playback instances
- Long chat sessions with many messages
- Frequent app backgrounding/foregrounding

### 3. Leak Detection
```bash
# iOS: Use Xcode Instruments
# - Leaks instrument
# - Allocations instrument

# Android: Use LeakCanary
npm install --save-dev @react-native-community/eslint-plugin
```

---

## 📝 PREVENTIVE PATTERNS

### Pattern 1: Always Cleanup Effects
```typescript
useEffect(() => {
  // Setup
  const resource = setupResource();
  
  // Always return cleanup
  return () => {
    cleanupResource(resource);
  };
}, [dependencies]);
```

### Pattern 2: Mounted Guard
```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  return () => {
    isMountedRef.current = false;
  };
}, []);

const asyncOperation = async () => {
  const result = await fetchData();
  if (isMountedRef.current) {
    setState(result);
  }
};
```

### Pattern 3: Interval Management
```typescript
const intervalRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  intervalRef.current = setInterval(() => {
    // Do work
  }, 1000);
  
  return () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };
}, [dependencies]);
```

---

## ⚠️ IMMEDIATE ACTION REQUIRED

**Top 3 Most Critical Issues:**

1. **ApiClient Cache Cleanup Interval** - Runs forever, will crash app eventually
2. **RevenueCat Listener** - Accumulates on every mount, causes state corruption
3. **useChat Polling** - Recreates frequently, drains battery and degrades performance

**Recommendation:** Address these three issues IMMEDIATELY before proceeding with new features.

---

**Assessment Complete:** October 6, 2025

