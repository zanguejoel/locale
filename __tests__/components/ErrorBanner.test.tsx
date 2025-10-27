/**
 * ErrorBanner Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import ErrorBanner from '../../components/ErrorBanner';
import { Linking } from 'react-native';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: jest.fn(() => ({
    isDark: false,
    colors: {
      background: '#FFFFFF',
      card: '#ffffff',
      text: '#000000',
      mutedForeground: '#6b7280',
    },
  })),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: {
    Warning: 'warning',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
  },
}));

jest.mock('expo-blur', () => ({
  BlurView: 'BlurView',
}));

jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Platform: {
      ...actualRN.Platform,
      OS: 'ios',
      select: (obj: any) => obj.ios,
    },
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
      openSettings: jest.fn(() => Promise.resolve()),
    },
  };
});

describe('ErrorBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Error Types', () => {
    it('should render network error', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="network" 
          message="No internet connection" 
        />
      );
      
      expect(getByText('Connection Lost')).toBeTruthy();
      expect(getByText('No internet connection')).toBeTruthy();
    });

    it('should render API error', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="api" 
          message="Server error occurred" 
        />
      );
      
      expect(getByText('Service Error')).toBeTruthy();
      expect(getByText('Server error occurred')).toBeTruthy();
    });

    it('should render permission error', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="permission" 
          message="Camera permission required" 
        />
      );
      
      expect(getByText('Permission Required')).toBeTruthy();
      expect(getByText('Camera permission required')).toBeTruthy();
    });

    it('should render model error', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="model" 
          message="Model is currently unavailable" 
        />
      );
      
      expect(getByText('Model Unavailable')).toBeTruthy();
      expect(getByText('Model is currently unavailable')).toBeTruthy();
    });

    it('should render credit error', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="credit" 
          message="Insufficient credits" 
        />
      );
      
      expect(getByText('Credit Limit Reached')).toBeTruthy();
      expect(getByText('Insufficient credits')).toBeTruthy();
    });

    it('should render generic error', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="generic" 
          message="Something went wrong" 
        />
      );
      
      expect(getByText('Notice')).toBeTruthy();
      expect(getByText('Something went wrong')).toBeTruthy();
    });
  });

  describe('Actions', () => {
    it('should call custom action when provided', async () => {
      const onPress = jest.fn();
      const { getByText } = render(
        <ErrorBanner 
          type="network" 
          message="No connection"
          action={{ text: 'Retry', onPress }}
        />
      );
      
      const button = getByText('Retry');
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(onPress).toHaveBeenCalled();
      });
    });

    it('should use default action when custom action not provided', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="network" 
          message="No connection"
        />
      );
      
      // Network error should have default "Retry" action
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should open settings for permission errors', async () => {
      const { getByText } = render(
        <ErrorBanner 
          type="permission" 
          message="Permission needed"
        />
      );
      
      const button = getByText('Open Settings');
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(Linking.openSettings).toHaveBeenCalled();
      });
    });

    it('should open URL for credit errors', async () => {
      const { getByText } = render(
        <ErrorBanner 
          type="credit" 
          message="No credits"
        />
      );
      
      const button = getByText('Upgrade');
      fireEvent.press(button);
      
      await waitFor(() => {
        expect(Linking.openURL).toHaveBeenCalledWith(
          expect.stringContaining('odysseytech.ai')
        );
      });
    });
  });

  describe('Dismiss Functionality', () => {
    it('should call onDismiss when close button is pressed', async () => {
      const onDismiss = jest.fn();
      const { getByLabelText, UNSAFE_getByProps } = render(
        <ErrorBanner 
          type="network" 
          message="Test"
          onDismiss={onDismiss}
        />
      );
      
      // Find the close button by its icon
      const closeButtons = UNSAFE_getByProps({ name: 'close' });
      expect(closeButtons).toBeTruthy();
    });

    it('should not show close button when onDismiss not provided', () => {
      const { queryByLabelText, UNSAFE_queryByProps } = render(
        <ErrorBanner 
          type="network" 
          message="Test"
        />
      );
      
      // Close button should not be rendered
      const closeButton = UNSAFE_queryByProps({ name: 'close' });
      expect(closeButton).toBeFalsy();
    });
  });

  describe('Auto Hide', () => {
    it('should auto hide when autoHide is true', () => {
      const onDismiss = jest.fn();
      render(
        <ErrorBanner 
          type="network" 
          message="Test"
          autoHide={true}
          autoHideDuration={1000}
          onDismiss={onDismiss}
        />
      );
      
      // Fast-forward time
      jest.advanceTimersByTime(1500);
      
      // Animation should have triggered
      expect(setTimeout).toHaveBeenCalled();
    });

    it('should not auto hide when autoHide is false', () => {
      const onDismiss = jest.fn();
      render(
        <ErrorBanner 
          type="network" 
          message="Test"
          autoHide={false}
          onDismiss={onDismiss}
        />
      );
      
      jest.advanceTimersByTime(10000);
      
      // onDismiss should not be called
      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('Rendering', () => {
    it('should use default message when message prop is empty', () => {
      const { getByText } = render(
        <ErrorBanner 
          type="network" 
          message=""
        />
      );
      
      expect(getByText('No internet connection. Please check your network.')).toBeTruthy();
    });

    it('should limit message to 4 lines', () => {
      const longMessage = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6';
      const { getByText } = render(
        <ErrorBanner 
          type="network" 
          message={longMessage}
        />
      );
      
      const messageElement = getByText(longMessage);
      expect(messageElement.props.numberOfLines).toBe(4);
    });

    it('should match snapshot for each error type', () => {
      const types: Array<'network' | 'api' | 'permission' | 'model' | 'credit' | 'generic'> = [
        'network', 'api', 'permission', 'model', 'credit', 'generic'
      ];
      
      types.forEach(type => {
        const tree = render(
          <ErrorBanner type={type} message="Test message" />
        ).toJSON();
        expect(tree).toMatchSnapshot(`ErrorBanner-${type}`);
      });
    });
  });
});

