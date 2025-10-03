# Inter Font Installation Guide

**Purpose**: Add Inter font to match web app typography  
**Status**: Manual download required

---

## 📥 Download Inter Font

### Option 1: Google Fonts (Recommended)

1. Visit: https://fonts.google.com/specimen/Inter
2. Click "Download family"
3. Extract the ZIP file
4. Find these font files in the `static` folder:
   - `Inter-Regular.ttf` (400)
   - `Inter-Medium.ttf` (500)
   - `Inter-SemiBold.ttf` (600)
   - `Inter-Bold.ttf` (700)

### Option 2: GitHub

1. Visit: https://github.com/rsms/inter/releases
2. Download latest release
3. Extract and find the TTF files

---

## 📁 Add to Project

### Copy Font Files:

```bash
# Navigate to project
cd /Users/zanguejoel/Documents/work/jaime-mobile-app

# Copy font files to assets/fonts/
# (Download Inter fonts first, then copy them)
cp ~/Downloads/Inter/static/Inter-Regular.ttf assets/fonts/
cp ~/Downloads/Inter/static/Inter-Medium.ttf assets/fonts/
cp ~/Downloads/Inter/static/Inter-SemiBold.ttf assets/fonts/
cp ~/Downloads/Inter/static/Inter-Bold.ttf assets/fonts/
```

**Or manually:**
1. Download fonts from Google Fonts
2. Drag and drop into `assets/fonts/` folder in Finder/Explorer

---

## ✅ Verify Files

Your `assets/fonts/` folder should contain:

```
assets/fonts/
├── SpaceMono-Regular.ttf (existing)
├── Inter-Regular.ttf (new)
├── Inter-Medium.ttf (new)
├── Inter-SemiBold.ttf (new)
└── Inter-Bold.ttf (new)
```

---

## 🚀 After Adding Fonts

Once fonts are in `assets/fonts/`, let me know and I'll:

1. Update `app/_layout.tsx` to load Inter fonts
2. Apply Inter to all text components
3. Test on both platforms

---

## 📝 Alternative: Use System Fonts (Temporary)

If you want to continue without downloading fonts, I can:
- Use San Francisco (iOS) and Roboto (Android) 
- These are similar to Inter
- Good enough for testing
- Can add real Inter fonts later

---

**Which approach:**
1. I'll download and add Inter fonts manually (you do it)
2. Use system fonts for now (I'll configure)

Let me know! 📝


