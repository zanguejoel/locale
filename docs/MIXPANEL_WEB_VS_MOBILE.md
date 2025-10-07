# 📊 Mixpanel: Web vs Mobile Implementation Comparison

**Purpose:** Ensure consistency between web and mobile analytics for unified reporting

---

## 🎯 Event Alignment

### ✅ Shared Events (Same on Web & Mobile)

These events use **identical names** across both platforms:

#### Authentication
```typescript
✅ "Sign Up Started"
✅ "Sign Up Completed"
✅ "Sign Up Failed"
✅ "Email Verified"
✅ "Login Started"
✅ "Login Completed"
✅ "Login Failed"
✅ "Logout"
✅ "Password Reset Requested"
✅ "Password Reset Completed"
```

#### AI/Chat
```typescript
✅ "AI Chat Message Sent"
✅ "AI Chat Response Received"
✅ "AI Chat Response Failed"
✅ "Image Generation Requested"
✅ "Image Generation Completed"
✅ "Image Generation Failed"
```

#### Subscription
```typescript
✅ "Subscription Plan Viewed"
✅ "Plans Page Opened"
```

---

## 🔀 Platform-Specific Events

### Mobile-Only Events

Events that don't exist on web:

```typescript
// Local Model Management
"Local Model Download Started"
"Local Model Download Completed"
"Local Model Download Failed"
"Local Model Download Cancelled"
"Local Model Deleted"
"Local Model Loaded"
"Local Model Inference Started"
"Local Model Inference Completed"

// Mobile-Specific Features
"Voice Message Sent"
"Voice Message Played"
"Model Manager Opened"
"Screen Viewed" (instead of "Page Viewed")

// Mobile Navigation
"Web Dashboard Opened for Subscription"
```

### Web-Only Events

Events that don't exist on mobile:

```typescript
// Web-Specific Features
"Voice Agent Created"
"Voice Agent Updated"
"Voice Call Initiated"
"Voice Call Completed"
"Flow Created"
"Flow Executed"
"IDP Job Started"
"IDP Job Completed"
"Integration Connected"
"Team Created"
"Team Member Invited"

// Web Navigation
"Page Viewed"
"Dashboard Tab Switched"
```

---

## 📦 Property Alignment

### Shared Properties

These properties should be **identical** across platforms:

```typescript
// User Identification
user_id: string
$email: string
$name: string
account_created_date: string
membership_tier: string

// Event Properties
message_type: 'text' | 'image' | 'audio'
message_length: number
model_used: string
response_time: number
error_message: string
timestamp: number
session_id: string
```

### Platform-Specific Properties

#### Mobile Properties
```typescript
// Device Info (mobile)
platform: 'mobile'
device_platform: 'ios' | 'android'
app_version: string

// Local Model (mobile only)
is_local_model: boolean
model_size_mb: number
download_duration_ms: number
inference_time_ms: number
tokens_per_second: number
```

#### Web Properties
```typescript
// Browser Info (web)
platform: 'web'
browser: string
browser_version: string
page_url: string
page_path: string
referrer: string

// Flow/Agent specific (web only)
agent_id: string
flow_id: string
integration_name: string
```

---

## 🔄 Event Name Mapping

### Screen vs Page Views

**Web:**
```typescript
"Page Viewed" {
  page_path: "/dashboard",
  page_section: "dashboard",
  page_url: "https://app.example.com/dashboard"
}
```

**Mobile:**
```typescript
"Screen Viewed" {
  screen_name: "settings",
  screen_path: "/settings"
}
```

**For unified reports:** Create calculated field in Mixpanel:
```
"View" = "Page Viewed" OR "Screen Viewed"
```

### Model Selection

**Web (Cloud Only):**
```typescript
"Model Selected" {
  model_id: "gpt-4",
  model_name: "GPT-4",
  model_type: "cloud"
}
```

**Mobile (Cloud + Local):**
```typescript
"Model Selected" {
  model_id: "gpt-4" | "llama-3.2-1b",
  model_name: "GPT-4" | "Llama 3.2 1B",
  model_type: "cloud" | "local"
}
```

**For unified reports:** Filter by `model_type: "cloud"` to compare equivalent features

---

## 👥 User Profile Consistency

### Shared Profile Properties

These must be **identical** across platforms:

```typescript
{
  // Mixpanel reserved
  $email: string,
  $name: string,
  $created: string,
  
  // Custom
  user_id: string,
  account_created_date: string,
  membership_tier: 'free' | 'pro' | 'business',
  subscription_status: 'trial' | 'active' | 'cancelled',
  
  // Engagement
  last_login_date: string,
  login_count: number,
  days_since_signup: number,
  
  // Usage (both platforms)
  total_messages_sent: number,  // Increment on both
  total_conversations: number,  // Increment on both
}
```

### Platform-Specific Profile Properties

**Mobile-Specific:**
```typescript
{
  local_models_downloaded: number,
  mobile_app_version: string,
  device_platform: 'ios' | 'android',
}
```

**Web-Specific:**
```typescript
{
  voice_agents_count: number,
  multi_agent_flows_count: number,
  idp_jobs_count: number,
  integrations_connected: string[],
}
```

---

## 📊 Unified Reporting Examples

### 1. Total Active Users (DAU)

**Query:**
```
Event: "Login Completed"
Platform: [Web, Mobile]
Unique users
```

**Result:** Combined DAU across both platforms

### 2. Message Activity

**Web Query:**
```
Event: "AI Chat Message Sent"
Platform: "web"
```

**Mobile Query:**
```
Event: "AI Chat Message Sent"
Platform: "mobile"
Filter: is_local_model = false
```

**Combined:** Total cloud messages across platforms

### 3. Feature Adoption: Image Generation

**Both Platforms:**
```
Event: "Image Generation Requested"
Platform: [Web, Mobile]
```

**Result:** Unified image generation metrics

### 4. Conversion Funnel

```
┌─────────────────────────────┐
│ Sign Up Started             │
│ (Web + Mobile combined)     │
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│ Sign Up Completed           │
│ (Web + Mobile combined)     │
└─────────────────────────────┘
              ↓
┌─────────────────────────────┐
│ Login Completed             │
│ (Web + Mobile combined)     │
└─────────────────────────────┘
              ↓ Web only        ↓ Mobile only
┌──────────────────┐  ┌──────────────────┐
│ Voice Agent      │  │ Local Model      │
│ Created          │  │ Downloaded       │
└──────────────────┘  └──────────────────┘
```

### 5. Retention by Platform

**Cohort Analysis:**
```sql
Users who signed up
├─ Via Web: X% Day 1, Y% Day 7, Z% Day 30
└─ Via Mobile: X% Day 1, Y% Day 7, Z% Day 30
```

---

## 🔍 Cross-Platform User Journeys

### Scenario 1: Web → Mobile
```
Day 1: User signs up on Web
  Event: "Sign Up Completed" (platform: web)
  
Day 2: User logs in on Mobile
  Event: "Login Completed" (platform: mobile)
  
Result: Same user_id, two platforms
```

**How to track:** User profile shows:
```typescript
{
  user_id: "123",
  platforms_used: ["web", "mobile"],
  first_platform: "web",
  last_platform: "mobile"
}
```

### Scenario 2: Mobile → Web
```
Day 1: User signs up on Mobile
  Event: "Sign Up Completed" (platform: mobile)
  
Day 3: User opens web for subscription
  Event: "Login Completed" (platform: web)
  
Result: Cross-platform user
```

---

## 🎨 Naming Conventions (Must Follow)

### Event Names
- **Format:** Title Case with spaces
- **Pattern:** `[Subject] [Action] [Context]`
- **Examples:**
  - ✅ "AI Chat Message Sent"
  - ✅ "Local Model Download Started"
  - ❌ "messagesSent"
  - ❌ "download_model"

### Property Names
- **Format:** snake_case
- **Include units:** `duration_ms`, `size_mb`
- **Be specific:** `model_used` not `model`
- **Examples:**
  - ✅ `message_length`
  - ✅ `response_time_ms`
  - ✅ `is_local_model`
  - ❌ `messageLength`
  - ❌ `time` (ambiguous)

### User Properties
- **Mixpanel reserved:** Prefix with `$`
  - `$email`, `$name`, `$created`
- **Custom properties:** snake_case
  - `user_id`, `membership_tier`
- **Counters:** Use clear names
  - `login_count`, `total_messages_sent`

---

## 🧪 Testing Cross-Platform Consistency

### Checklist

- [ ] **Same event names** for shared features
- [ ] **Same property names** for shared properties
- [ ] **Same user_id format** (string, not number)
- [ ] **User profiles merge** correctly across platforms
- [ ] **Timestamps consistent** (all Unix timestamps or ISO strings)
- [ ] **Enums consistent** (e.g., membership_tier values match)

### Validation Queries

**1. Check user appears on both platforms:**
```
User ID: 123
Events: Platform = web AND Platform = mobile
Expected: See events from both
```

**2. Check event names match:**
```
Event name contains "Login"
Platforms: [web, mobile]
Expected: "Login Completed" on both (not "Login Success" vs "Login Completed")
```

**3. Check property types:**
```
Event: "AI Chat Message Sent"
Property: message_length
Expected: Always number, never string
```

---

## 📋 Implementation Checklist

### For Each New Event

- [ ] Check if event exists on web
- [ ] Use exact same event name if shared
- [ ] Use exact same property names
- [ ] Use same property types
- [ ] Document platform-specific properties
- [ ] Test cross-platform reporting
- [ ] Update this comparison doc

### For Each Property

- [ ] Use consistent naming (snake_case)
- [ ] Use consistent types (string/number/boolean)
- [ ] Use consistent enums (same values)
- [ ] Include units in name if applicable
- [ ] Document platform differences

---

## 🚀 Quick Reference

### ✅ DO

```typescript
// Shared event - same name
trackAuth(AuthEvent.LOGIN_COMPLETED, {
  method: 'email',
  user_id: user.id.toString(), // Always string
  platform: 'mobile' // Add platform
});

// Platform-specific event - clear name
trackModel(ModelEvent.LOCAL_MODEL_DOWNLOAD_STARTED, {
  model_id: 'llama-3.2-1b',
  model_size_mb: 1500,
  platform: 'mobile'
});
```

### ❌ DON'T

```typescript
// Different event name (web uses "Login Completed")
trackAuth('User Logged In', { ... });

// Different property name (web uses user_id)
trackAuth(AuthEvent.LOGIN_COMPLETED, {
  userId: '123' // Wrong: should be user_id
});

// Different property type (web uses string)
identify(user.id); // Wrong: should be user.id.toString()
```

---

## 📞 Resources

- **Web Implementation:** `/Users/zanguejoel/Documents/work/jaiime-frontend/docs/mixpanel/`
- **Mobile Plan:** `docs/MIXPANEL_INTEGRATION_PLAN.md`
- **Event Definitions:** `types/mixpanel.ts` (both repos)

---

**Last Updated:** October 6, 2025  
**Maintained By:** Engineering Team  
**Review Frequency:** Every sprint

