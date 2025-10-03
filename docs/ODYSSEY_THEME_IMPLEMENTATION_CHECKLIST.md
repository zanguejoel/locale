# Odyssey Theme Implementation Checklist

**Goal**: Match mobile app design with web app's Odyssey theme  
**Status**: Ready to implement

---

## 📋 Phase 1: Core Color System (4-6 hours)

### Task 1.1: Create Odyssey Color Constants
- [ ] Create `constants/OdysseyColors.ts`
- [ ] Define light mode colors (matching web app)
- [ ] Define dark mode colors (matching web app)
- [ ] Add background shade system (50-950)
- [ ] Convert HSL to RGB/Hex for React Native

### Task 1.2: HSL to RGB Conversion Utility
- [ ] Create `utils/colorConversion.ts`
- [ ] Implement `hslToRgb()` function
- [ ] Implement `hslToHex()` function
- [ ] Test color conversions

### Task 1.3: Update Color Constants
- [ ] Update `constants/Colors.ts` primary from `#51b0cb` → `#60a5fa`
- [ ] Add new Odyssey colors
- [ ] Add background gradient colors
- [ ] Update accent colors
- [ ] Keep backward compatibility

### Task 1.4: Update Theme Types
- [ ] Update `constants/Types.ts` Theme interface
- [ ] Add new color properties
- [ ] Add gradient properties
- [ ] Update ColorTheme interface

---

## 📋 Phase 2: Chat UI Update (6-8 hours)

### Task 2.1: Chat Background
- [ ] Update `ChatPage` background color
- [ ] Add gradient background option
- [ ] Test light mode gradient
- [ ] Test dark mode gradient
- [ ] Verify readability

### Task 2.2: Message Bubbles
- [ ] Update user message color to `#60a5fa`
- [ ] Update bot message to card color
- [ ] Add subtle borders
- [ ] Update message shadows
- [ ] Test contrast ratios

### Task 2.3: Chat Input
- [ ] Update input background
- [ ] Update border colors
- [ ] Update icon colors
- [ ] Add focus states
- [ ] Test keyboard appearance

### Task 2.4: Header/Navigation
- [ ] Update header background
- [ ] Update title colors
- [ ] Update icon colors
- [ ] Add subtle gradient
- [ ] Test status bar

---

## 📋 Phase 3: Settings & Modals (4-6 hours)

### Task 3.1: Settings Screen
- [ ] Update settings background
- [ ] Update menu item colors
- [ ] Update selection states
- [ ] Update button colors
- [ ] Add card styling

### Task 3.2: Model Selector Modal
- [ ] Update modal overlay color
- [ ] Update modal background
- [ ] Update selection colors
- [ ] Update confirm button to `#60a5fa`
- [ ] Test search styling

### Task 3.3: Local Model Selector
- [ ] Match cloud selector styling
- [ ] Update progress colors
- [ ] Update status indicators
- [ ] Update recommended badge
- [ ] Test download states

### Task 3.4: Other Modals
- [ ] Image preview modal
- [ ] Purchase modal
- [ ] Profile edit modal
- [ ] Settings modal

---

## 📋 Phase 4: Gradients & Backgrounds (3-4 hours)

### Task 4.1: Gradient Component
- [ ] Create `components/GradientBackground.tsx`
- [ ] Define light mode gradient colors
- [ ] Define dark mode gradient colors
- [ ] Add props for customization
- [ ] Test performance

### Task 4.2: Apply Gradients
- [ ] ChatPage background
- [ ] Settings background
- [ ] Auth screens background
- [ ] Modal backgrounds (subtle)
- [ ] Test on both platforms

### Task 4.3: Gradient Optimization
- [ ] Test on older devices
- [ ] Optimize if needed
- [ ] Add option to disable gradients
- [ ] Document performance impact

---

## 📋 Phase 5: Typography (4-6 hours)

### Task 5.1: Download & Add Fonts
- [ ] Download Inter font family
- [ ] Add Inter-Regular.ttf to assets/fonts
- [ ] Add Inter-Medium.ttf
- [ ] Add Inter-SemiBold.ttf
- [ ] Add Inter-Bold.ttf

### Task 5.2: Font Loading
- [ ] Update font loading in `app/_layout.tsx`
- [ ] Test font loading
- [ ] Add fallback fonts
- [ ] Test on iOS
- [ ] Test on Android

### Task 5.3: Typography System
- [ ] Create `constants/Typography.ts`
- [ ] Define font families
- [ ] Define size scale
- [ ] Define line heights
- [ ] Define letter spacing

### Task 5.4: Apply Typography
- [ ] Update all Text components
- [ ] Update heading styles
- [ ] Update body text styles
- [ ] Update button text styles
- [ ] Test readability

---

## 📋 Phase 6: Details & Polish (6-8 hours)

### Task 6.1: Border Radius
- [ ] Create `constants/Layout.ts`
- [ ] Define radius scale (sm, md, lg, xl)
- [ ] Update all border radius values
- [ ] Ensure consistency
- [ ] Test visual harmony

### Task 6.2: Shadows & Elevation
- [ ] Create `constants/Shadows.ts`
- [ ] Define shadow levels (sm, md, lg)
- [ ] Apply to cards
- [ ] Apply to modals
- [ ] Apply to floating elements
- [ ] Test on both platforms

### Task 6.3: Spacing System
- [ ] Define spacing scale
- [ ] Update padding values
- [ ] Update margin values
- [ ] Update gap values
- [ ] Ensure consistency

### Task 6.4: Accessibility
- [ ] Test color contrast (WCAG AA)
- [ ] Test with screen reader
- [ ] Test touch targets (44x44 minimum)
- [ ] Test with reduced motion
- [ ] Fix any issues

---

## 📋 Testing Checklist

### Visual Testing:
- [ ] Light mode matches web app
- [ ] Dark mode matches web app
- [ ] Theme switching smooth
- [ ] Gradients render correctly
- [ ] Colors accessible
- [ ] Typography readable

### Functional Testing:
- [ ] All interactions work
- [ ] No performance degradation
- [ ] Animations smooth
- [ ] No visual bugs
- [ ] Consistent across screens

### Platform Testing:
- [ ] iOS light mode
- [ ] iOS dark mode
- [ ] Android light mode
- [ ] Android dark mode
- [ ] Different screen sizes

---

## 🎨 Color Reference Card

**Save this for quick reference during implementation:**

```
Odyssey Mobile Theme

Light Mode:
  Primary:     #60a5fa  rgb(96, 165, 250)   HSL(213, 94%, 68%)
  Accent:      #0891b2  rgb(8, 145, 178)    HSL(199, 89%, 48%)
  Background:  #e0f2fe  rgb(224, 242, 254)  HSL(199, 89%, 95%)
  Card:        #ffffff  rgb(255, 255, 255)  HSL(0, 0%, 100%)
  Text:        #0f172a  rgb(15, 23, 42)     HSL(222, 47%, 11%)
  Border:      #e2e8f0  rgb(226, 232, 240)  HSL(213, 27%, 84%)

Dark Mode:
  Primary:     #60a5fa  rgb(96, 165, 250)   HSL(213, 94%, 68%)
  Accent:      #06b6d4  rgb(6, 182, 212)    HSL(199, 89%, 48%)
  Background:  #1e293b  rgb(30, 41, 59)     HSL(217, 33%, 17%)
  Card:        #293548  rgb(41, 53, 72)     HSL(217, 33%, 20%)
  Text:        #f1f5f9  rgb(241, 245, 249)  HSL(210, 40%, 98%)
  Border:      #334155  rgb(51, 65, 85)     HSL(217, 25%, 27%)
```

---

## 📞 Support

If you need help during implementation:
1. Check `DESIGN_SYSTEM_ALIGNMENT_PLAN.md` for details
2. Reference web app `/utils/theme/palettes.ts` for exact values
3. Test incrementally - one component at a time
4. Document any issues or deviations

---

**Total Tasks:** 60+  
**Estimated Time:** 30-40 hours  
**Complexity:** Medium  
**Impact:** High - Complete visual transformation

Ready to start? Begin with Phase 1, Task 1.1! 🎨


