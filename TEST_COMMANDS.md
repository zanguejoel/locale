# Test Commands Quick Reference

## 🚀 Running Tests

### Individual Test Suites

```bash
# StreamManager tests (23 tests - ALL PASSING ✅)
npm test -- StreamManager.test

# PerformanceMonitor tests (30 tests - ALL PASSING ✅)  
npm test -- PerformanceMonitor.test

# useChat tests (needs mocking setup ⚠️)
npm test -- useChat.test
```

### Combined Tests

```bash
# Run all new P0/P1 tests
npm test -- --testNamePattern="StreamManager|PerformanceMonitor"

# Run all tests in utils directory
npm test -- utils/

# Run all tests
npm test
```

### With Options

```bash
# Run with coverage
npm run test:coverage -- StreamManager.test

# Run in watch mode
npm test -- --watch StreamManager.test

# Run with verbose output
npm test -- --verbose StreamManager.test

# Run with increased timeout (for slow tests)
npm test -- StreamManager.test --testTimeout=10000
```

### Coverage Reports

```bash
# Generate coverage for specific test
npm run test:coverage -- StreamManager.test

# Generate coverage for all tests
npm run test:coverage

# Open coverage report in browser
open coverage/lcov-report/index.html
```

## 📊 Current Test Status

| Test Suite | Tests | Status | Coverage |
|------------|-------|--------|----------|
| StreamManager | 23 | ✅ PASSING | 60.58% |
| PerformanceMonitor | 30 | ✅ PASSING | Not measured |
| useChat | Structure created | ⚠️ Needs mocks | N/A |
| StreamBatcher | Existing tests | ✅ PASSING | High |

**Total Passing**: **53 tests** 🎉

## 🎯 Quick Test Examples

### Run and Watch

For active development, use watch mode:

```bash
npm test -- --watch StreamManager.test
```

### Debug a Failing Test

```bash
# Run with verbose output
npm test -- --verbose --no-coverage StreamManager.test

# Run specific test by name
npm test -- StreamManager.test -t "should cancel active stream"
```

### Performance Testing

```bash
# Run without coverage for speed
npm test -- --no-coverage StreamManager.test

# Run with detectOpenHandles to find memory leaks
npm test -- --detectOpenHandles StreamManager.test
```

## 🔧 Troubleshooting

### Tests Timing Out

Increase the timeout:
```bash
npm test -- StreamManager.test --testTimeout=20000
```

### Mock Issues

Clear Jest cache:
```bash
npx jest --clearCache
npm test
```

### Module Not Found

Reinstall dependencies:
```bash
rm -rf node_modules
pnpm install
```

## 📝 Test File Locations

```
jaime-mobile-app/
├── __tests__/
│   ├── utils/
│   │   ├── StreamManager.test.ts      ✅ 23 tests
│   │   ├── PerformanceMonitor.test.ts ✅ 30 tests
│   │   └── StreamBatcher.test.ts      ✅ Existing
│   ├── hooks/
│   │   └── useChat.test.tsx           ⚠️ Needs setup
│   └── setup.ts                       🔧 Global test config
```

## 💡 Tips

1. **Always use `--testTimeout` for async tests** with timers
2. **Run coverage regularly** to track progress  
3. **Use watch mode** during development
4. **Clear cache** if seeing stale test results
5. **Check setup.ts** for global mocks

---

For detailed testing strategy, see:
- `TESTING_QUICK_START.md` - Quick start guide
- `MOBILE_CHAT_TESTING_PLAN.md` - Comprehensive plan
- `TESTING_IMPLEMENTATION_STATUS.md` - Current status

*Last Updated: October 29, 2025*

