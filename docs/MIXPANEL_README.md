# 📊 Mixpanel Analytics - Odyssey Mobile App

> **Complete analytics tracking documentation for the mobile app**

---

## 📚 Documentation Index

### 🚀 Getting Started
1. **[Quick Start Guide](MIXPANEL_QUICK_START.md)** - Get tracking in 30 minutes
   - Installation
   - Basic setup
   - First events
   - Testing

### 📋 Planning & Implementation
2. **[Integration Plan](MIXPANEL_INTEGRATION_PLAN.md)** - Comprehensive implementation guide
   - Architecture overview
   - Phase-by-phase implementation
   - Code examples
   - Timeline (2-3 weeks)
   - Privacy & compliance

### 🔄 Cross-Platform
3. **[Web vs Mobile Comparison](MIXPANEL_WEB_VS_MOBILE.md)** - Ensure consistency
   - Shared events
   - Platform-specific events
   - Naming conventions
   - Unified reporting
   - Testing checklist

---

## ⚡ Quick Navigation

### I want to...

**→ Get started quickly**  
Read: [MIXPANEL_QUICK_START.md](MIXPANEL_QUICK_START.md)

**→ See the full implementation plan**  
Read: [MIXPANEL_INTEGRATION_PLAN.md](MIXPANEL_INTEGRATION_PLAN.md)

**→ Understand event naming**  
Read: [MIXPANEL_WEB_VS_MOBILE.md](MIXPANEL_WEB_VS_MOBILE.md) → Naming Conventions

**→ Track a specific feature**  
Read: [MIXPANEL_INTEGRATION_PLAN.md](MIXPANEL_INTEGRATION_PLAN.md) → Find your feature phase

**→ Check what's already tracked on web**  
See: `/Users/zanguejoel/Documents/work/jaiime-frontend/docs/mixpanel/`

---

## 🎯 What is Mixpanel?

Mixpanel is a **product analytics platform** that helps us understand:

- 📊 **User behavior** - What features are used most?
- 🔄 **User journeys** - How do users navigate the app?
- 📈 **Engagement** - How often do users return?
- 💰 **Conversion** - Who upgrades to paid plans?
- ⚠️ **Pain points** - Where do users get stuck?

### Why We Need It

1. **Data-Driven Decisions** - Make product decisions based on real usage data
2. **Feature Adoption** - Understand which features are successful
3. **User Retention** - Identify what keeps users coming back
4. **Bug Detection** - Find errors and crashes quickly
5. **Cross-Platform Insights** - Unified view of web + mobile users

---

## 📦 What Gets Tracked?

### ✅ Core Events

#### Authentication
- Sign up flow (started, completed, failed)
- Login flow (started, completed, failed)
- Email verification
- Password reset
- Logout

#### Chat & AI
- Messages sent (cloud & local models)
- Responses received
- Image generation
- Voice messages
- Conversation management

#### Models
- Model selection (cloud & local)
- Local model downloads (started, completed, failed, cancelled)
- Model deletion
- Model manager access

#### Settings & Profile
- Settings access
- Profile views/updates
- Default model changes

#### Subscription
- Plans page views
- Web dashboard redirects

#### Errors & Performance
- Error tracking
- Response times
- App performance

### ❌ What We DON'T Track

**Privacy First:**
- ❌ Message content (only length)
- ❌ Passwords
- ❌ Authentication tokens
- ❌ Personal data (except with consent)
- ❌ Sensitive user information

---

## 🏗️ Architecture

### File Structure

```
mobile-app/
├── utils/
│   └── mixpanel/
│       ├── MixpanelService.ts       # Core service (singleton)
│       └── MixpanelProvider.tsx     # React Context Provider
├── hooks/
│   └── useMixpanel.ts               # React hooks
├── types/
│   └── mixpanel.ts                  # TypeScript definitions
└── docs/
    ├── MIXPANEL_README.md           # This file
    ├── MIXPANEL_INTEGRATION_PLAN.md # Full plan
    ├── MIXPANEL_QUICK_START.md      # Quick guide
    └── MIXPANEL_WEB_VS_MOBILE.md    # Comparison
```

### Technology

- **SDK:** `mixpanel-react-native` (official React Native SDK)
- **Pattern:** Singleton service + React Context + Custom hooks
- **Type Safety:** Full TypeScript support
- **Storage:** React Native AsyncStorage (built-in with SDK)

---

## 📅 Implementation Timeline

### Week 1: Infrastructure (3-4 days)
- Install SDK
- Create service, hooks, types
- Integrate provider
- Test basic tracking

### Week 2: Core Features (4-5 days)
- Authentication tracking
- Chat & AI tracking
- Model management tracking
- Settings tracking

### Week 3: Polish & Test (3-4 days)
- Subscription tracking
- Error tracking
- Cross-platform testing
- Documentation

**Total:** 10-13 days (2-3 weeks)

---

## 🚦 Current Status

**Status:** 📋 Planning Complete - Ready for Implementation

### Completion Checklist

- [x] Planning complete
- [x] Documentation written
- [x] Architecture designed
- [x] Web implementation reviewed
- [ ] SDK installed
- [ ] Core infrastructure built
- [ ] Authentication tracking
- [ ] Chat tracking
- [ ] Model tracking
- [ ] Settings tracking
- [ ] Testing complete
- [ ] Production ready

---

## 🎓 Key Concepts

### Events

**What:** Actions users take in the app  
**Examples:** "Login Completed", "Message Sent", "Model Downloaded"  
**Format:** Title Case with descriptive names

```typescript
trackAuth(AuthEvent.LOGIN_COMPLETED, {
  method: 'email',
  user_id: '123'
});
```

### Properties

**What:** Additional data about events  
**Examples:** `message_length`, `model_used`, `response_time_ms`  
**Format:** snake_case with units

```typescript
trackAI(AIEvent.CHAT_MESSAGE_SENT, {
  message_length: 42,
  model_used: 'gpt-4',
  is_local_model: false
});
```

### User Profiles

**What:** Information about users  
**Examples:** Email, name, signup date, plan tier  
**Updates:** On login, profile changes, feature usage

```typescript
setUserProfile({
  $email: 'user@example.com',
  membership_tier: 'pro',
  last_login_date: new Date().toISOString()
});
```

### Sessions

**What:** A period of app usage  
**Tracking:** Automatic - starts on app open, ends on close  
**Uses:** Calculate engagement, time spent

---

## 🔐 Privacy & Compliance

### GDPR Compliance

✅ **We follow these principles:**

1. **Consent** - Ask user permission before tracking
2. **Transparency** - Clear about what we track
3. **Control** - Users can opt-out anytime
4. **Data minimization** - Only track what's needed
5. **Security** - Secure data transmission and storage

### User Rights

Users can:
- ✅ Opt-out of tracking
- ✅ Request data export
- ✅ Request data deletion
- ✅ View what's tracked

### Implementation

```typescript
// Consent check
const hasConsent = await getAnalyticsConsent();
if (hasConsent) {
  mixpanel.track(...);
}

// Opt-out
await mixpanel.optOut();
```

---

## 📊 Example Insights

### What We Can Learn

**Engagement:**
- "80% of users who try local models become daily active users"
- "Users send average of 15 messages per session"

**Feature Adoption:**
- "30% of users have tried image generation"
- "Local models are downloaded by 50% of iOS users"

**Conversion:**
- "Users who generate 5+ images are 3x more likely to upgrade"
- "Main upgrade trigger: hitting message limit (60%)"

**Retention:**
- "Day 7 retention is 45% for users who set up local models"
- "Users who connect from both web and mobile have 2x retention"

**Pain Points:**
- "20% of model downloads fail due to storage issues"
- "Average response time increased 50% during peak hours"

---

## 🛠️ Tools & Resources

### Mixpanel Dashboard
- **URL:** https://mixpanel.com
- **Use for:** Viewing events, creating reports, analyzing users

### Development
- **Console Logs:** All events logged in dev mode
- **Debug Mode:** Enabled automatically in `__DEV__`

### Documentation
- **Mixpanel Docs:** https://developer.mixpanel.com/
- **React Native SDK:** https://github.com/mixpanel/mixpanel-react-native
- **Web Implementation:** `/Users/zanguejoel/Documents/work/jaiime-frontend/docs/mixpanel/`

---

## 💡 Best Practices

### DO ✅

- Track both success AND failure
- Include error messages
- Time long operations
- Use consistent naming
- Test before deploying
- Document new events

### DON'T ❌

- Track PII without consent
- Track sensitive data
- Create duplicate events
- Use inconsistent names
- Skip testing
- Ignore privacy

---

## 🚀 Getting Started

### For Developers

1. **Read:** [MIXPANEL_QUICK_START.md](MIXPANEL_QUICK_START.md)
2. **Install:** `pnpm add mixpanel-react-native`
3. **Setup:** Copy files from integration plan
4. **Test:** Track a login event
5. **Expand:** Add tracking to your features

### For Product Managers

1. **Learn:** What Mixpanel can do (this doc)
2. **Define:** What metrics matter for your feature
3. **Collaborate:** Work with engineering on event names
4. **Analyze:** Use Mixpanel dashboard for insights
5. **Iterate:** Refine based on data

### For QA

1. **Verify:** Events fire correctly
2. **Test:** Edge cases (offline, errors)
3. **Check:** Mixpanel dashboard shows events
4. **Validate:** Properties are correct
5. **Document:** Found issues

---

## 📞 Support

### Questions?

- **Implementation:** Check [MIXPANEL_INTEGRATION_PLAN.md](MIXPANEL_INTEGRATION_PLAN.md)
- **Naming:** Check [MIXPANEL_WEB_VS_MOBILE.md](MIXPANEL_WEB_VS_MOBILE.md)
- **Quick help:** Check [MIXPANEL_QUICK_START.md](MIXPANEL_QUICK_START.md)
- **Web comparison:** See `/Users/zanguejoel/Documents/work/jaiime-frontend/docs/mixpanel/`

### Issues?

- **Technical:** Engineering team
- **Analytics:** Product team
- **Mixpanel:** https://mixpanel.com/support

---

## 📈 Success Metrics

### Implementation Success

- ✅ All core events tracking
- ✅ User identification working
- ✅ Cross-platform consistency
- ✅ No PII leaks
- ✅ Dashboard shows data
- ✅ Team trained

### Usage Success

- ✅ Daily dashboard reviews
- ✅ Data-driven decisions made
- ✅ Features improved based on insights
- ✅ Conversion rate improved
- ✅ Retention increased

---

## 🎯 Next Steps

1. **Review** this documentation
2. **Get** Mixpanel token from project admin
3. **Start** with [MIXPANEL_QUICK_START.md](MIXPANEL_QUICK_START.md)
4. **Follow** [MIXPANEL_INTEGRATION_PLAN.md](MIXPANEL_INTEGRATION_PLAN.md)
5. **Test** thoroughly
6. **Launch** 🚀

---

**Version:** 1.0  
**Last Updated:** October 6, 2025  
**Status:** ✅ Documentation Complete - Ready for Implementation  
**Owner:** Engineering & Product Teams

---

## 📄 Document Map

```
📊 Mixpanel Analytics
│
├── 📘 MIXPANEL_README.md (this file)
│   └── Overview, concepts, navigation
│
├── 🚀 MIXPANEL_QUICK_START.md
│   └── 30-minute setup guide
│
├── 📋 MIXPANEL_INTEGRATION_PLAN.md
│   └── Complete implementation guide (main doc)
│       ├── Phase 1: Infrastructure
│       ├── Phase 2: Authentication
│       ├── Phase 3: Chat & AI
│       ├── Phase 4: Models
│       ├── Phase 5: Settings
│       ├── Phase 6: Subscription
│       └── Phase 7: Performance
│
└── 🔄 MIXPANEL_WEB_VS_MOBILE.md
    └── Cross-platform consistency guide
        ├── Shared events
        ├── Platform-specific events
        ├── Naming conventions
        └── Unified reporting
```

**Start here → Read this README → Follow Quick Start → Implement Full Plan** 🎯

