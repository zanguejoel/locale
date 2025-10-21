# 🧪 Test Horizontal Scrollable Tables

**Quick test guide for the new horizontal scrolling table feature**

---

## 📱 How to Test

### Step 1: Send a Test Message

Copy and paste this markdown into your chat:

```markdown
## Wide Financial Report

Here's a quarterly sales report:

| Product | Jan | Feb | Mar | Apr | May | Jun | Jul | Aug | Sep | Oct | Nov | Dec | Total |
|---------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-------|
| Widget A | $1.2M | $1.5M | $1.8M | $2.1M | $1.9M | $2.3M | $2.5M | $2.7M | $2.4M | $2.8M | $3.1M | $3.4M | $28.7M |
| Widget B | $900K | $1.1M | $1.3M | $1.6M | $1.4M | $1.7M | $1.9M | $2.1M | $1.8M | $2.2M | $2.5M | $2.8M | $21.3M |
| Widget C | $750K | $820K | $950K | $1.1M | $980K | $1.2M | $1.4M | $1.5M | $1.3M | $1.6M | $1.8M | $2.0M | $15.8M |

Total Revenue: $65.8M | Average Monthly: $5.5M | Growth Rate: 18%
```

### Step 2: Verify Scrolling

**Expected Behavior:**
1. ✅ Table appears with horizontal scroll indicator
2. ✅ Swipe horizontally on table → table scrolls left/right
3. ✅ Swipe vertically near table → chat scrolls up/down
4. ✅ All columns visible when scrolling
5. ✅ Smooth 60fps performance

---

## 🧪 More Test Cases

### Test 2: Simple Table (Should NOT Scroll)
```markdown
| Name | Age | City |
|------|-----|------|
| John | 30  | NYC  |
| Jane | 25  | LA   |
```
**Expected:** Normal display, no horizontal scroll (fits on screen)

---

### Test 3: Employee Directory (Wide)
```markdown
| ID | Name | Email | Phone | Department | Role | Start Date | Location | Manager | Status |
|----|------|-------|-------|------------|------|-----------|----------|---------|--------|
| 001 | John Doe | john@company.com | 555-0100 | Engineering | Senior Dev | 2020-01-15 | NYC | Jane Smith | Active |
| 002 | Jane Smith | jane@company.com | 555-0200 | Engineering | Team Lead | 2018-06-01 | NYC | Bob Johnson | Active |
| 003 | Bob Johnson | bob@company.com | 555-0300 | Product | Director | 2017-03-12 | SF | CEO | Active |
```
**Expected:** Horizontal scroll, all fields readable

---

### Test 4: Technical Specifications
```markdown
| Component | CPU | GPU | RAM | Storage | Display | Battery | Weight | Price | Rating |
|-----------|-----|-----|-----|---------|---------|---------|--------|-------|--------|
| Laptop Pro | M3 Max | 40-core | 128GB | 4TB SSD | 16" Retina | 100Wh | 4.7lbs | $3,999 | ⭐⭐⭐⭐⭐ |
| Laptop Air | M3 | 10-core | 24GB | 1TB SSD | 13" Retina | 52Wh | 2.7lbs | $1,599 | ⭐⭐⭐⭐ |
| Desktop Pro | M3 Ultra | 76-core | 192GB | 8TB SSD | N/A | N/A | 21.5lbs | $6,999 | ⭐⭐⭐⭐⭐ |
```
**Expected:** Smooth horizontal scrolling through all specs

---

### Test 5: Multiple Tables in One Message
```markdown
## Q1 Report

### Revenue by Region
| Region | Sales | Growth |
|--------|-------|--------|
| North | $12M | +15% |
| South | $8M | +22% |
| East | $10M | +18% |
| West | $15M | +12% |

### Top Products
| Product | Units | Revenue | Margin | Stock | Trend |
|---------|-------|---------|--------|-------|-------|
| Product A | 10,000 | $5M | 45% | 2,500 | ↗️ |
| Product B | 8,500 | $3.8M | 38% | 1,200 | ↗️ |
| Product C | 12,000 | $4.2M | 42% | 3,800 | → |
```
**Expected:** Both tables work independently

---

## ✅ What to Verify

### Visual Checks
- [ ] Horizontal scroll indicator visible on wide tables
- [ ] Table borders display correctly
- [ ] Text is readable (not cramped)
- [ ] Light/dark theme looks good
- [ ] Header row visually distinct

### Interaction Checks
- [ ] Horizontal swipe scrolls table
- [ ] Vertical swipe scrolls chat
- [ ] Diagonal swipe handles correctly
- [ ] No gesture conflicts
- [ ] Scroll momentum feels natural

### Performance Checks
- [ ] Scrolling is smooth (no lag)
- [ ] No frame drops
- [ ] No stuttering during scroll
- [ ] Tables render quickly

### Edge Cases
- [ ] Very long cell content wraps properly
- [ ] Empty cells display correctly
- [ ] Single column table doesn't scroll
- [ ] Table with emoji/symbols works
- [ ] Streaming tables update smoothly

---

## 🐛 Known Good Behavior

### This is CORRECT:
- ✅ Wide tables scroll horizontally
- ✅ Narrow tables don't scroll
- ✅ Scroll indicator appears and fades
- ✅ Horizontal swipe → table scroll
- ✅ Vertical swipe → chat scroll

### This Would Be WRONG:
- ❌ Table not scrolling when it should
- ❌ Vertical scroll when swiping table horizontally
- ❌ Text cut off or unreadable
- ❌ Laggy scrolling
- ❌ Gesture conflicts

---

## 🎯 Success Criteria

**Test passed if:**
1. All wide tables scroll horizontally
2. Touch gestures work correctly
3. Performance is smooth (60fps)
4. No visual glitches
5. Works in both light/dark mode

---

## 📊 Benchmark Test

Use this complex table to test performance:

```markdown
| ID | Name | Q1 Sales | Q1 Units | Q2 Sales | Q2 Units | Q3 Sales | Q3 Units | Q4 Sales | Q4 Units | Total Sales | Total Units | Growth % | Target | Achievement % | Status |
|----|------|----------|----------|----------|----------|----------|----------|----------|----------|-------------|-------------|----------|--------|---------------|--------|
| 001 | Product A | $1.2M | 10K | $1.5M | 12K | $1.8M | 14K | $2.1M | 16K | $6.6M | 52K | 15% | $6.0M | 110% | ✅ On Track |
| 002 | Product B | $900K | 8K | $1.1M | 9K | $1.3M | 10K | $1.6M | 12K | $4.9M | 39K | 18% | $4.5M | 109% | ✅ On Track |
| 003 | Product C | $750K | 6K | $820K | 7K | $950K | 8K | $1.1M | 9K | $3.6M | 30K | 12% | $3.8M | 95% | ⚠️ Monitor |
```

**This should:**
- Scroll smoothly through all 15 columns
- Maintain 60fps
- Show all data clearly
- Handle multiple swipes without lag

---

## 🔧 Troubleshooting

### Problem: Table not scrolling
**Check:**
- Does table have 5+ columns?
- Is it actually wider than screen?
- Try horizontal swipe directly on table

### Problem: Vertical scroll not working
**Check:**
- Swipe outside table area
- Use more vertical motion

### Problem: Choppy scrolling
**Check:**
- Close other apps
- Restart app
- Try on different device

---

## 📝 Report Results

After testing, note:
- ✅ What works well
- ⚠️ Any issues found
- 💡 Suggestions for improvement

---

**Happy Testing!** 🎉

If everything works as expected, those horizontal scrolling tables are production-ready! 🚀

