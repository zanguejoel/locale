# Quick Guide: Re-enabling Local Models

When you're ready to release local models in the next version, follow this simple guide.

---

## Single Change Required

**File:** `constants/Config.ts`  
**Line:** ~104

Change:
```typescript
LOCAL_LLM_ENABLED: false, // Disabled for this release
```

To:
```typescript
LOCAL_LLM_ENABLED: true, // Re-enabled for next version
```

---

## That's It!

Everything else will automatically work because:
- ✅ All local model code is preserved
- ✅ UI components check the flag before showing
- ✅ Hooks check the flag before initializing
- ✅ No code was deleted, only disabled

---

## What Will Happen When Re-enabled:

1. **Local/Cloud toggle** appears in drawer menu
2. **Model manager** becomes accessible (if implemented)
3. **Download prompts** show when switching to local mode
4. **Local model initialization** starts when user enables it
5. **All local model features** work as before

---

## Optional: Test Before Release

After re-enabling, test:
1. Toggle between Local and Cloud modes
2. Download a local model
3. Send messages with local model
4. Verify model switching works
5. Check that local conversations are not saved to cloud

---

## Location of This Change

```
jaime-mobile-app/
  └── constants/
      └── Config.ts  <-- Change this file (line ~104)
```

---

**That's all!** One line change re-enables the entire feature.

