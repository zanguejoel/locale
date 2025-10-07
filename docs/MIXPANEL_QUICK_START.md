# 🚀 Mixpanel Quick Start Guide - Mobile App

**Get up and running with Mixpanel tracking in 30 minutes**

---

## ⚡ Quick Setup (30 minutes)

### Step 1: Install (5 min)

```bash
cd /Users/zanguejoel/Documents/work/jaime-mobile-app
pnpm add mixpanel-react-native
```

### Step 2: Environment Variable (2 min)

Create `.env.local`:

```bash
EXPO_PUBLIC_MIXPANEL_TOKEN=your_token_here
```

Get token from: https://mixpanel.com/settings/project

### Step 3: Copy Files (10 min)

Create these files from the plan:

```
utils/mixpanel/
  ├── MixpanelService.ts
  └── MixpanelProvider.tsx

hooks/
  └── useMixpanel.ts

types/
  └── mixpanel.ts
```

**Tip:** All code is in `MIXPANEL_INTEGRATION_PLAN.md` - copy & paste!

### Step 4: Add Provider (5 min)

**File:** `app/_layout.tsx`

```typescript
import { MixpanelProvider } from '@/utils/mixpanel/MixpanelProvider';

const Layout = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ChatProvider>
          <MixpanelProvider>  {/* 👈 Add this */}
            <Stack>
              {/* screens */}
            </Stack>
          </MixpanelProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};
```

### Step 5: Test (8 min)

**File:** `app/login.tsx` (test tracking)

```typescript
import { useMixpanel } from '@/hooks/useMixpanel';
import { AuthEvent } from '@/types/mixpanel';

export default function LoginScreen() {
  const { trackAuth } = useMixpanel();
  
  const handleLogin = async () => {
    // Track login started
    trackAuth(AuthEvent.LOGIN_STARTED, {
      method: 'email',
    });
    
    try {
      await signIn(email, password);
      // Success tracking happens in useAuth
    } catch (error) {
      trackAuth(AuthEvent.LOGIN_FAILED, {
        method: 'email',
        error_message: error.message,
      });
    }
  };
}
```

**Run app:**
```bash
pnpm start
```

**Check console:**
```
[Mixpanel] Successfully initialized
[Mixpanel] Event tracked: Login Started {...}
```

**✅ If you see these logs, it's working!**

---

## 📋 Implementation Checklist

Use this to track your progress:

### Phase 1: Infrastructure ✅
- [ ] Install `mixpanel-react-native`
- [ ] Create `MixpanelService.ts`
- [ ] Create `MixpanelProvider.tsx`
- [ ] Create `useMixpanel.ts` hook
- [ ] Create `types/mixpanel.ts`
- [ ] Add environment variable
- [ ] Integrate provider in `_layout.tsx`
- [ ] Test basic tracking

### Phase 2: Authentication 🔐
- [ ] Track sign up started
- [ ] Track sign up completed
- [ ] Track sign up failed
- [ ] Track email verified
- [ ] Track login started
- [ ] Track login completed
- [ ] Track login failed
- [ ] Track logout
- [ ] User identification on login
- [ ] User profile setup
- [ ] Track password reset

### Phase 3: Chat & AI 💬
- [ ] Track message sent (cloud)
- [ ] Track message sent (local)
- [ ] Track response received
- [ ] Track response failed
- [ ] Track image generation
- [ ] Track voice messages
- [ ] Track message actions (copy, delete)
- [ ] Track conversation created
- [ ] Track conversation deleted
- [ ] Response time tracking

### Phase 4: Model Management 🤖
- [ ] Track model selected (cloud)
- [ ] Track model selected (local)
- [ ] Track model download started
- [ ] Track model download completed
- [ ] Track model download failed
- [ ] Track model download cancelled
- [ ] Track model deleted
- [ ] Track model manager opened

### Phase 5: Settings ⚙️
- [ ] Track settings opened
- [ ] Track settings section viewed
- [ ] Track profile viewed
- [ ] Track profile updated
- [ ] Track default model changed

### Phase 6: Subscription 💳
- [ ] Track plans page opened
- [ ] Track plan viewed
- [ ] Track web dashboard opened

### Phase 7: Errors & Performance ⚡
- [ ] Global error tracking
- [ ] Performance tracking
- [ ] Screen transition timing

---

## 🎯 Priority Tracking

### HIGH Priority (Do First)
1. **Authentication** - Track sign up, login, logout
2. **Chat Messages** - Track messages sent & received
3. **User Identification** - Identify users on login

### MEDIUM Priority (Do Next)
4. **Model Selection** - Track model switches
5. **Settings** - Track settings access
6. **Screen Views** - Track navigation

### LOW Priority (Nice to Have)
7. **Message Actions** - Copy, delete, regenerate
8. **Performance** - Timing metrics
9. **Errors** - Error tracking

---

## 📊 Event Quick Reference

### Authentication Events
```typescript
AuthEvent.SIGN_UP_STARTED
AuthEvent.SIGN_UP_COMPLETED
AuthEvent.SIGN_UP_FAILED
AuthEvent.LOGIN_STARTED
AuthEvent.LOGIN_COMPLETED
AuthEvent.LOGIN_FAILED
AuthEvent.LOGOUT
```

### Chat Events
```typescript
AIEvent.CHAT_MESSAGE_SENT
AIEvent.CHAT_RESPONSE_RECEIVED
AIEvent.CHAT_RESPONSE_FAILED
AIEvent.IMAGE_GENERATION_REQUESTED
AIEvent.VOICE_MESSAGE_SENT
AIEvent.CONVERSATION_STARTED
```

### Model Events
```typescript
ModelEvent.MODEL_SELECTED
ModelEvent.LOCAL_MODEL_DOWNLOAD_STARTED
ModelEvent.LOCAL_MODEL_DOWNLOAD_COMPLETED
ModelEvent.LOCAL_MODEL_DELETED
```

---

## 💡 Usage Examples

### Track Button Click
```typescript
const { track } = useMixpanel();

<Button onPress={() => {
  track('Button Clicked', { button_name: 'Send Message' });
  handleSend();
}}>
  Send
</Button>
```

### Track Screen View (Automatic)
```typescript
// Screen views are tracked automatically by MixpanelProvider
// Just navigate normally:
router.push('/settings');
// Logs: Screen Viewed { screen_name: 'settings' }
```

### Track with Timing
```typescript
const { startTiming } = useMixpanel();

const handleAction = async () => {
  const stopTimer = startTiming('Model Download');
  
  await downloadModel();
  
  const duration = stopTimer(); // Automatically tracks event with duration
};
```

### User Identification
```typescript
const { identify, setUserProfile } = useMixpanel();

// On login
identify(user.id.toString());

setUserProfile({
  $email: user.email,
  $name: `${user.first_name} ${user.last_name}`,
  membership_tier: 'free',
});
```

---

## 🐛 Debugging

### Check if Mixpanel is initialized
```typescript
import { mixpanelService } from '@/utils/mixpanel/MixpanelService';

console.log('Initialized:', mixpanelService.isInitialized());
```

### Enable debug logs
All events log to console in development mode automatically.

Look for:
```
[Mixpanel] Successfully initialized
[Mixpanel] Event tracked: ...
[Mixpanel] User identified: ...
```

### Check Mixpanel Dashboard
1. Go to https://mixpanel.com
2. Select your project
3. Go to "Events" → "Live View"
4. Trigger events in app
5. See them appear in real-time

### Common Issues

**Events not showing up?**
- Check token is correct
- Check internet connection
- Check console for errors
- Try in production mode (events batched in dev)

**User not identified?**
- Check `identify()` is called after login
- Check user ID is a string
- Check console for "User identified" log

---

## 📈 Analytics Dashboard Tips

### Create Funnels
```
Sign Up Started
  ↓ (75%)
Sign Up Completed
  ↓ (90%)
Login Completed
  ↓ (60%)
First Message Sent
```

### Track Retention
```
Users who:
- Signed up Day 0
- Came back Day 1 (%)
- Came back Day 7 (%)
- Came back Day 30 (%)
```

### Popular Events to Track
1. **Login Completed** - DAU/MAU
2. **Chat Message Sent** - Engagement
3. **Model Download Completed** - Feature adoption
4. **Plan Viewed** - Conversion interest

---

## 🎓 Learn More

- **Full Plan:** `docs/MIXPANEL_INTEGRATION_PLAN.md`
- **Web Implementation:** `/Users/zanguejoel/Documents/work/jaiime-frontend/docs/mixpanel/`
- **Mixpanel Docs:** https://developer.mixpanel.com/

---

## 🚨 Important Notes

1. **Never track:**
   - Message content
   - Passwords
   - Tokens
   - Personal data

2. **Always track:**
   - Start AND completion/failure
   - Error messages
   - Duration for long operations

3. **Be consistent:**
   - Use same event names as web
   - Use same property names
   - Follow naming conventions

---

**Ready to implement? Start with Phase 1! 🚀**

