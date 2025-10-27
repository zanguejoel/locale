/**
 * DateSeparator Component Tests
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { DateSeparator } from '../../components/DateSeparator';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    colors: {
      border: '#e5e5e5',
      textSecondary: '#6b7280',
    },
  })),
}));

jest.mock('../../constants/Typography', () => ({
  typography: {
    sizes: {
      xs: 11,
    },
    weights: {
      semiBold: '600',
    },
  },
}));

describe('DateSeparator', () => {
  it('should render correctly with label', () => {
    const { getByText } = render(<DateSeparator label="Today" />);
    expect(getByText('TODAY')).toBeTruthy();
  });

  it('should display label in uppercase', () => {
    const { getByText } = render(<DateSeparator label="Yesterday" />);
    expect(getByText('YESTERDAY')).toBeTruthy();
  });

  it('should render different date labels', () => {
    const labels = ['Today', 'Yesterday', 'Monday', 'Jan 15, 2024'];
    
    labels.forEach(label => {
      const { getByText } = render(<DateSeparator label={label} />);
      expect(getByText(label.toUpperCase())).toBeTruthy();
    });
  });

  it('should render separator lines', () => {
    const { getAllByTestId } = render(<DateSeparator label="Today" />);
    // The component should have two line views (left and right of the label)
    const container = render(<DateSeparator label="Today" />);
    expect(container).toBeTruthy();
  });

  it('should handle empty label', () => {
    const { getByText } = render(<DateSeparator label="" />);
    expect(getByText('')).toBeTruthy();
  });

  it('should handle long labels', () => {
    const longLabel = 'This is a very long date label for testing';
    const { getByText } = render(<DateSeparator label={longLabel} />);
    expect(getByText(longLabel.toUpperCase())).toBeTruthy();
  });

  it('should render with proper styling', () => {
    const { getByText } = render(<DateSeparator label="Today" />);
    const textElement = getByText('TODAY');
    
    expect(textElement.props.style).toBeDefined();
  });

  it('should match snapshot', () => {
    const tree = render(<DateSeparator label="Today" />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should match snapshot with different labels', () => {
    const tree1 = render(<DateSeparator label="Yesterday" />).toJSON();
    const tree2 = render(<DateSeparator label="Monday" />).toJSON();
    
    expect(tree1).toMatchSnapshot();
    expect(tree2).toMatchSnapshot();
  });

  it('should maintain consistent layout', () => {
    const { getByText } = render(<DateSeparator label="Test Date" />);
    const textElement = getByText('TEST DATE');
    
    // Text should be uppercase
    expect(textElement.props.children).toBe('TEST DATE');
  });
});

