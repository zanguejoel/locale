# Testing Guide for Odyssey Mobile App

This guide provides comprehensive information about testing practices, patterns, and conventions used in the Odyssey mobile application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Testing Patterns](#testing-patterns)
- [Best Practices](#best-practices)
- [Common Issues](#common-issues)

## Overview

The Odyssey mobile app uses **Jest** with **@testing-library/react-native** for unit and integration testing. Our test suite covers:

- ✅ **Utility Functions** - Pure functions and helpers
- ✅ **Services** - API clients, auth helpers, etc.
- ✅ **Hooks** - Custom React hooks
- ✅ **Components** - React Native components
- ✅ **Contexts** - Context providers

### Testing Stack

- **Jest**: Test runner and assertion library
- **@testing-library/react-native**: Component testing utilities
- **@testing-library/react-hooks**: Hook testing utilities
- **jest-expo**: Expo-specific Jest preset

## Test Structure

```
__tests__/
├── setup.ts                 # Global test setup
├── testUtils.tsx            # Shared test utilities
├── README.md               # This file
├── utils/                  # Utility function tests
│   ├── Validation.test.ts
│   ├── dateHelpers.test.ts
│   ├── colorConversion.test.ts
│   ├── ErrorHandler.test.ts
│   └── FileTypeHelpers.test.ts
├── hooks/                  # Hook tests
│   ├── useTheme.test.ts
│   └── useMixpanel.test.ts
├── components/            # Component tests
│   ├── TypingIndicator.test.tsx
│   ├── DateSeparator.test.tsx
│   └── ErrorBanner.test.tsx
└── contexts/              # Context tests
    └── (to be added)
```

## Running Tests

### Basic Commands

```bash
# Run all tests (single run)
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests in CI mode
pnpm test:ci
```

### Running Specific Tests

```bash
# Run a specific test file
pnpm test Validation.test

# Run tests matching a pattern
pnpm test utils/

# Run tests with verbose output
pnpm test -- --verbose
```

### Coverage Reports

After running `pnpm test:coverage`, view the coverage report at:
```
coverage/lcov-report/index.html
```

Current coverage thresholds:
- Statements: 70%
- Branches: 60%
- Functions: 70%
- Lines: 70%

## Testing Patterns

### 1. Testing Utility Functions

Utility functions are pure functions that are easiest to test:

```typescript
// Example: Validation.test.ts
import { validateEmail } from '../../utils/Validation';

describe('validateEmail', () => {
  it('should validate correct email addresses', () => {
    const result = validateEmail('user@example.com');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid email addresses', () => {
    const result = validateEmail('invalid-email');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });
});
```

### 2. Testing React Hooks

Use `@testing-library/react-hooks` for testing custom hooks:

```typescript
// Example: useTheme.test.ts
import { renderHook } from '@testing-library/react-hooks';
import { useTheme } from '../../hooks/useTheme';

describe('useTheme', () => {
  it('should return theme based on mode', () => {
    const { result } = renderHook(() => useTheme());
    
    expect(result.current.isDark).toBeDefined();
    expect(result.current.colors).toBeDefined();
  });
});
```

### 3. Testing Components

Use `@testing-library/react-native` for component testing:

```typescript
// Example: TypingIndicator.test.tsx
import { render } from '@testing-library/react-native';
import { TypingIndicator } from '../../components/TypingIndicator';

describe('TypingIndicator', () => {
  it('should render correctly', () => {
    const { getByText } = render(<TypingIndicator />);
    expect(getByText('AI is thinking')).toBeTruthy();
  });
  
  it('should display custom model name', () => {
    const { getByText } = render(<TypingIndicator modelName="GPT-4" />);
    expect(getByText('GPT-4 is thinking')).toBeTruthy();
  });
});
```

### 4. Testing with Providers

For components that need providers (React Query, Theme, etc.), use test utilities:

```typescript
import { renderWithProviders } from '../testUtils';

describe('MyComponent', () => {
  it('should work with providers', () => {
    const { getByText } = renderWithProviders(<MyComponent />);
    expect(getByText('Content')).toBeTruthy();
  });
});
```

### 5. Testing Async Operations

```typescript
import { waitFor } from '@testing-library/react-native';

it('should handle async operations', async () => {
  const { getByText } = render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(getByText('Loaded')).toBeTruthy();
  });
});
```

### 6. Testing User Interactions

```typescript
import { fireEvent } from '@testing-library/react-native';

it('should handle button press', () => {
  const onPress = jest.fn();
  const { getByText } = render(<Button onPress={onPress} title="Click Me" />);
  
  fireEvent.press(getByText('Click Me'));
  expect(onPress).toHaveBeenCalled();
});
```

## Best Practices

### ✅ DO

1. **Write Descriptive Test Names**
   ```typescript
   // Good
   it('should validate email and return error for invalid format', () => {});
   
   // Bad
   it('test email', () => {});
   ```

2. **Follow AAA Pattern** (Arrange, Act, Assert)
   ```typescript
   it('should format file size correctly', () => {
     // Arrange
     const bytes = 1024;
     
     // Act
     const result = formatFileSize(bytes);
     
     // Assert
     expect(result).toBe('1.0 KB');
   });
   ```

3. **Test Edge Cases**
   ```typescript
   it('should handle empty input', () => {
     expect(validateEmail('')).toHaveProperty('isValid', false);
   });
   
   it('should handle null input', () => {
     expect(formatDate(null)).toBe('');
   });
   ```

4. **Mock External Dependencies**
   ```typescript
   jest.mock('../../utils/ApiClient', () => ({
     get: jest.fn(),
     post: jest.fn(),
   }));
   ```

5. **Clean Up After Tests**
   ```typescript
   afterEach(() => {
     jest.clearAllMocks();
     jest.useRealTimers();
   });
   ```

### ❌ DON'T

1. **Don't Test Implementation Details**
   ```typescript
   // Bad - testing internal state
   expect(component.state.isLoading).toBe(true);
   
   // Good - testing behavior
   expect(getByText('Loading...')).toBeTruthy();
   ```

2. **Don't Write Brittle Tests**
   ```typescript
   // Bad - too specific
   expect(element.props.style.marginTop).toBe(16);
   
   // Good - test behavior
   expect(element).toBeTruthy();
   ```

3. **Don't Skip Cleanup**
   ```typescript
   // Bad
   it('test 1', () => {
     jest.useFakeTimers();
     // ... test code
   });
   
   // Good
   afterEach(() => {
     jest.useRealTimers();
   });
   ```

## Common Issues

### Issue: Tests Timeout

**Solution**: Increase timeout for specific tests
```typescript
it('should load data', async () => {
  // Test code
}, 10000); // 10 second timeout
```

### Issue: Async Operations Not Completing

**Solution**: Use `waitFor` or `act`
```typescript
import { waitFor, act } from '@testing-library/react-native';

await waitFor(() => {
  expect(getByText('Loaded')).toBeTruthy();
});
```

### Issue: Module Not Found Errors

**Solution**: Check `moduleNameMapper` in jest config
```json
"moduleNameMapper": {
  "^@/(.*)$": "<rootDir>/$1"
}
```

### Issue: React Native Components Not Mocked

**Solution**: Add to `transformIgnorePatterns` in jest config
```json
"transformIgnorePatterns": [
  "node_modules/(?!@react-native|react-native|expo)"
]
```

## Mocking Strategies

### Mocking AsyncStorage

```typescript
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));
```

### Mocking Navigation

```typescript
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));
```

### Mocking Expo Modules

```typescript
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
```

## Writing New Tests

When adding new tests:

1. **Follow the existing structure** - Place tests in the appropriate directory
2. **Use shared utilities** - Import from `testUtils.tsx`
3. **Mock dependencies** - Use the patterns in `setup.ts`
4. **Write multiple test cases** - Cover happy path, edge cases, and errors
5. **Add descriptive names** - Make it clear what's being tested
6. **Keep tests focused** - One concept per test
7. **Run tests locally** - Ensure they pass before committing

## Coverage Goals

We aim for:
- ✅ **80%+ coverage** for utility functions
- ✅ **70%+ coverage** for hooks
- ✅ **60%+ coverage** for components
- ✅ **50%+ coverage** overall

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [React Hooks Testing Library](https://react-hooks-testing-library.com/)
- [Expo Jest Configuration](https://docs.expo.dev/guides/testing-with-jest/)

## Contributing

When contributing tests:

1. Follow the existing patterns and conventions
2. Ensure all tests pass locally
3. Maintain or improve coverage
4. Add tests for new features
5. Update this documentation if needed

---

For questions or issues with testing, please contact the development team or open an issue on GitHub.

