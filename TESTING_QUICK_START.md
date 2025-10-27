# Testing Quick Start Guide

Quick reference for writing and running tests in the Odyssey mobile app.

## 🚀 Running Tests

```bash
# Run all tests once
pnpm test

# Run in watch mode (recommended during development)
pnpm test:watch

# Run with coverage report
pnpm test:coverage

# Run in CI mode
pnpm test:ci
```

## 📝 Writing Your First Test

### 1. Utility Function Test

```typescript
// __tests__/utils/MyUtil.test.ts
import { myFunction } from '../../utils/MyUtil';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
  
  it('should handle edge cases', () => {
    expect(myFunction('')).toBe('');
    expect(myFunction(null)).toBeUndefined();
  });
});
```

### 2. Component Test

```typescript
// __tests__/components/MyComponent.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MyComponent } from '../../components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    const { getByText } = render(<MyComponent title="Test" />);
    expect(getByText('Test')).toBeTruthy();
  });
  
  it('should handle button press', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <MyComponent title="Test" onPress={onPress} />
    );
    
    fireEvent.press(getByText('Test'));
    expect(onPress).toHaveBeenCalled();
  });
});
```

### 3. Hook Test

```typescript
// __tests__/hooks/useMyHook.test.ts
import { renderHook, act } from '@testing-library/react-hooks';
import { useMyHook } from '../../hooks/useMyHook';

describe('useMyHook', () => {
  it('should return expected values', () => {
    const { result } = renderHook(() => useMyHook());
    
    expect(result.current.value).toBeDefined();
    expect(result.current.setValue).toBeDefined();
  });
  
  it('should update value when setValue is called', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

## 🎯 Common Testing Patterns

### Mocking Dependencies

```typescript
// Mock a module
jest.mock('../../utils/ApiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

// Mock React Native component
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

// Mock Expo module
jest.mock('expo-file-system', () => ({
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
}));
```

### Testing Async Code

```typescript
import { waitFor } from '@testing-library/react-native';

it('should load data asynchronously', async () => {
  const { getByText } = render(<AsyncComponent />);
  
  await waitFor(() => {
    expect(getByText('Loaded')).toBeTruthy();
  });
});
```

### Testing User Interactions

```typescript
import { fireEvent } from '@testing-library/react-native';

it('should handle user input', () => {
  const { getByPlaceholderText } = render(<InputComponent />);
  const input = getByPlaceholderText('Enter text');
  
  fireEvent.changeText(input, 'Hello');
  expect(input.props.value).toBe('Hello');
});
```

### Using Test Utilities

```typescript
import { renderWithProviders, mockUser } from '../testUtils';

it('should work with providers', () => {
  const { getByText } = renderWithProviders(
    <MyComponent user={mockUser} />
  );
  expect(getByText(mockUser.name)).toBeTruthy();
});
```

## 🔧 Setup & Cleanup

```typescript
describe('MyComponent', () => {
  // Runs before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Runs after each test
  afterEach(() => {
    jest.useRealTimers();
  });
  
  // Runs once before all tests
  beforeAll(() => {
    // Setup
  });
  
  // Runs once after all tests
  afterAll(() => {
    // Cleanup
  });
});
```

## 📊 Coverage Goals

Aim for:
- ✅ **80%+** for utilities
- ✅ **70%+** for hooks
- ✅ **60%+** for components

View coverage:
```bash
pnpm test:coverage
open coverage/lcov-report/index.html
```

## 🐛 Debugging Tests

### Run specific test file
```bash
pnpm test MyComponent.test
```

### Run tests matching pattern
```bash
pnpm test --testNamePattern="should render"
```

### Run with verbose output
```bash
pnpm test -- --verbose
```

### Debug in VS Code
Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal"
}
```

## ✅ Test Checklist

When writing tests:

- [ ] Test happy path
- [ ] Test edge cases (empty, null, undefined)
- [ ] Test error handling
- [ ] Mock external dependencies
- [ ] Clean up after tests
- [ ] Use descriptive test names
- [ ] Follow AAA pattern (Arrange, Act, Assert)

## 📚 Resources

- [Full Testing Documentation](./__tests__/README.md)
- [Jest Documentation](https://jestjs.io/)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Test Utilities](./testUtils.tsx)

## 💡 Tips

1. **Start simple** - Test pure functions first
2. **Mock early** - Mock external dependencies at the top of files
3. **Test behavior** - Not implementation details
4. **Keep it fast** - Fast tests get run more often
5. **Descriptive names** - Test names should describe what's being tested

## 🚨 Common Issues

### Tests timing out?
Increase timeout: `jest.setTimeout(10000)`

### Async not working?
Use `await waitFor(() => ...)` or `await act(async () => ...)`

### Mocks not working?
Ensure mocks are defined before imports

### Coverage too low?
Run `pnpm test:coverage` to see what's missing

---

Happy Testing! 🎉

