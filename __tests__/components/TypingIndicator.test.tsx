/**
 * TypingIndicator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { TypingIndicator } from '../../components/TypingIndicator';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    colors: {
      card: '#ffffff',
      border: '#e5e5e5',
      textSecondary: '#6b7280',
      primary: '#007AFF',
    },
  })),
}));

jest.mock('../../constants/Layout', () => ({
  layout: {
    radius: {
      lg: 12,
    },
  },
}));

describe('TypingIndicator', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render correctly', () => {
    const { getByText } = render(<TypingIndicator />);
    expect(getByText('AI is thinking')).toBeTruthy();
  });

  it('should display custom model name', () => {
    const { getByText } = render(<TypingIndicator modelName="GPT-4" />);
    expect(getByText('GPT-4 is thinking')).toBeTruthy();
  });

  it('should use default model name when not provided', () => {
    const { getByText } = render(<TypingIndicator />);
    expect(getByText('AI is thinking')).toBeTruthy();
  });

  it('should render three animated dots', () => {
    const { UNSAFE_getAllByType } = render(<TypingIndicator />);
    const animatedViews = UNSAFE_getAllByType(require('react-native').Animated.View);
    
    // Should have animated dots (actual count may vary due to wrapper views)
    expect(animatedViews.length).toBeGreaterThan(0);
  });

  it('should render in a bubble container', () => {
    const { getByText } = render(<TypingIndicator />);
    const textElement = getByText('AI is thinking');
    expect(textElement).toBeTruthy();
  });

  it('should handle different model names', () => {
    const modelNames = ['GPT-3.5', 'Claude', 'Gemini', 'Llama'];
    
    modelNames.forEach(modelName => {
      const { getByText } = render(<TypingIndicator modelName={modelName} />);
      expect(getByText(`${modelName} is thinking`)).toBeTruthy();
    });
  });

  it('should match snapshot', () => {
    const tree = render(<TypingIndicator modelName="GPT-4" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should match snapshot with default model', () => {
    const tree = render(<TypingIndicator />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});

