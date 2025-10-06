# Image Optimization Implementation Checklist

Quick checklist for implementing image optimizations in your components.

---

## ✅ Basic Implementation

```typescript
// 1. Import LazyImage
import LazyImage from '@/components/LazyImage';

// 2. Replace Image with LazyImage
<LazyImage
  uri={imageUrl}
  style={styles.image}
  resizeMode="cover"
/>

// 3. Add priority (optional but recommended)
<LazyImage
  uri={imageUrl}
  style={styles.image}
  priority="high"  // or "normal" or "low"
/>

// 4. Configure caching (optional, defaults to memory-disk)
<LazyImage
  uri={imageUrl}
  style={styles.image}
  priority="high"
  cachePolicy="memory-disk"
/>

// 5. Add error handling (optional but recommended)
<LazyImage
  uri={imageUrl}
  style={styles.image}
  onError={(e) => console.error('Image failed:', e)}
  onLoad={() => console.log('Image loaded')}
/>
```

---

## 📋 Component Integration Checklist

### Adding Images to New Component:

- [ ] Import `LazyImage` instead of `Image`
- [ ] Set appropriate `priority` (high/normal/low)
- [ ] Configure `cachePolicy` if needed
- [ ] Set `threshold` based on position
- [ ] Add `onError` handler
- [ ] Add `onLoad` callback if needed
- [ ] Use `testID` for testing
- [ ] Use aspect ratios in styles
- [ ] Test on slow network
- [ ] Test with many images

---

## 🎯 Priority Decision Tree

```
Is the image immediately visible?
├─ YES → priority="high"
│  └─ Examples: User avatars, current message images
│
└─ NO → Is it near the viewport?
   ├─ YES → priority="normal"
   │  └─ Examples: Next few messages, generated images
   │
   └─ NO → priority="low"
      └─ Examples: Far off-screen images, background images
```

---

## 💾 Cache Policy Decision Tree

```
Is the image < 500KB?
├─ YES → Is it frequently accessed?
│  ├─ YES → cachePolicy="memory"
│  │  └─ Examples: Thumbnails, avatars
│  └─ NO → cachePolicy="memory-disk"
│     └─ Examples: Most images
│
└─ NO (large image > 500KB)
   ├─ Is it temporary?
   │  ├─ YES → cachePolicy="none"
   │  └─ NO → cachePolicy="disk"
   │     └─ Examples: Large generated images
   └─ cachePolicy="disk"
```

---

## 📐 Layout Checklist

### Styles Configuration:

- [ ] Use aspect ratios instead of fixed heights
- [ ] Set max height constraints
- [ ] Test on various screen sizes
- [ ] Ensure proper overflow handling
- [ ] Add border radius if needed
- [ ] Set background color for placeholders

### Example:

```typescript
const styles = StyleSheet.create({
  // ✅ GOOD - Aspect ratio
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 280,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
  },
  
  // ❌ BAD - Fixed height
  imageOld: {
    width: '100%',
    height: 200,  // Don't do this
  },
});
```

---

## 🛠️ Cache Management Checklist

### When to Clear Cache:

- [ ] Low storage warning received
- [ ] User explicitly requests it
- [ ] App version upgrade (optional)
- [ ] Testing fresh image loads

### How to Clear Cache:

```typescript
import { 
  smartCacheCleanup,
  clearMemoryCache,
  clearDiskCache,
  clearAllImageCache 
} from '@/utils/ImageCache';

// Option 1: Smart cleanup (recommended)
await smartCacheCleanup();

// Option 2: Clear memory only (fast)
await clearMemoryCache();

// Option 3: Clear disk only (frees storage)
await clearDiskCache();

// Option 4: Clear everything (use sparingly)
await clearAllImageCache();
```

---

## 🧪 Testing Checklist

### Before Committing:

- [ ] No linter errors
- [ ] No TypeScript errors
- [ ] Images load correctly
- [ ] Loading indicators show
- [ ] Error states work
- [ ] Smooth transitions
- [ ] Test on iOS
- [ ] Test on Android
- [ ] Test on slow network
- [ ] Test with many images (20+)
- [ ] Test rapid scrolling
- [ ] Test cache persistence
- [ ] No memory leaks

### Manual Test Scenarios:

```typescript
// 1. Normal loading
<LazyImage uri={validUrl} />

// 2. Error handling
<LazyImage uri={invalidUrl} />

// 3. Slow network
// → Enable network throttling in dev tools

// 4. Many images
<FlatList
  data={manyImages}
  renderItem={({ item }) => <LazyImage uri={item.url} />}
/>

// 5. Rapid scrolling
// → Scroll quickly through long list

// 6. Cache test
// → Load images, close app, reopen
// → Images should load instantly
```

---

## 📝 Code Review Checklist

### When Reviewing Image Code:

- [ ] Using `LazyImage` (not `Image`)
- [ ] Priority is appropriate
- [ ] Cache policy makes sense
- [ ] Error handling present
- [ ] Loading indicators configured
- [ ] Styles use aspect ratios
- [ ] TestID added for testing
- [ ] No hardcoded heights
- [ ] Proper cleanup on unmount
- [ ] Memory leaks prevented

---

## 🚀 Deployment Checklist

### Pre-Deployment:

- [ ] All files committed
- [ ] Dependencies installed
- [ ] Clean build completed
- [ ] All tests passing
- [ ] Linter clean
- [ ] TypeScript check clean
- [ ] Manual testing done
- [ ] Performance validated
- [ ] Documentation updated
- [ ] Peer review completed

### Deployment Commands:

```bash
# 1. Install dependencies
pnpm install

# 2. Clean build (iOS)
cd ios
rm -rf build
pod install
cd ..

# 3. Clean build (Android)
cd android
./gradlew clean
cd ..

# 4. Build and test
npm run ios      # iOS
npm run android  # Android

# 5. Verify cache works
# - Open app
# - View images
# - Close app
# - Reopen
# - Images should be instant
```

### Post-Deployment:

- [ ] Monitor crash reports
- [ ] Check error rates
- [ ] Validate performance
- [ ] Monitor memory usage
- [ ] Check cache effectiveness
- [ ] Gather user feedback
- [ ] Update metrics dashboard

---

## 🐛 Troubleshooting Checklist

### Images Not Loading:

- [ ] Check network connectivity
- [ ] Verify URL is valid
- [ ] Check console for errors
- [ ] Test URL in browser
- [ ] Check if blocked by CORS
- [ ] Try with different image

### Poor Performance:

- [ ] Too many high priority images?
- [ ] Cache full? Try `smartCacheCleanup()`
- [ ] Too many images loading at once?
- [ ] Large images? Use disk caching
- [ ] Memory pressure? Close other apps

### Cache Issues:

- [ ] Cache policy set correctly?
- [ ] Disk space available?
- [ ] Try clearing cache
- [ ] Check cache limits
- [ ] Verify app permissions

---

## 📚 Quick Reference

### Import Statement:
```typescript
import LazyImage from '@/components/LazyImage';
```

### Basic Usage:
```typescript
<LazyImage
  uri={imageUrl}
  style={styles.image}
  priority="high"
  cachePolicy="memory-disk"
/>
```

### Cache Utils:
```typescript
import { smartCacheCleanup } from '@/utils/ImageCache';
await smartCacheCleanup();
```

### Documentation:
- Full guide: `docs/IMAGE_OPTIMIZATION_COMPLETE.md`
- Quick ref: `docs/IMAGE_OPTIMIZATION_QUICK_GUIDE.md`
- Summary: `docs/CHAT_IMAGE_OPTIMIZATION_SUMMARY.md`

---

## ✅ Final Verification

Before marking complete, verify:

- [ ] All checklists above completed
- [ ] No errors or warnings
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Performance validated
- [ ] Ready for production

---

**Checklist Version**: 1.0  
**Last Updated**: October 6, 2025

