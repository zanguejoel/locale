/**
 * useMixpanel Hook Tests
 */

import { renderHook, act } from '@testing-library/react-native';
import { useMixpanel } from '../../hooks/useMixpanel';
import { mixpanelService } from '../../utils/mixpanel/MixpanelService';

// Mock the Mixpanel service
jest.mock('../../utils/mixpanel/MixpanelService', () => ({
  mixpanelService: {
    track: jest.fn(),
    trackAuth: jest.fn(),
    trackAI: jest.fn(),
    trackModel: jest.fn(),
    trackSettings: jest.fn(),
    trackSubscription: jest.fn(),
    trackScreenView: jest.fn(),
    trackError: jest.fn(),
    identify: jest.fn(),
    setUserProfile: jest.fn(),
    incrementUserProperty: jest.fn(),
    reset: jest.fn(),
    startTiming: jest.fn(() => jest.fn()),
  },
}));

describe('useMixpanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should provide track method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.track('Test Event', { key: 'value' });
    });

    expect(mixpanelService.track).toHaveBeenCalledWith('Test Event', { key: 'value' });
  });

  it('should provide trackAuth method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackAuth('Sign In', { method: 'email' });
    });

    expect(mixpanelService.trackAuth).toHaveBeenCalledWith('Sign In', { method: 'email' });
  });

  it('should provide trackAI method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackAI('Message Sent', { model: 'gpt-4' });
    });

    expect(mixpanelService.trackAI).toHaveBeenCalledWith('Message Sent', { model: 'gpt-4' });
  });

  it('should provide trackModel method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackModel('Model Changed', { from: 'gpt-3.5', to: 'gpt-4' });
    });

    expect(mixpanelService.trackModel).toHaveBeenCalledWith('Model Changed', { 
      from: 'gpt-3.5', 
      to: 'gpt-4' 
    });
  });

  it('should provide trackSettings method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackSettings('Theme Changed', { theme: 'dark' });
    });

    expect(mixpanelService.trackSettings).toHaveBeenCalledWith('Theme Changed', { theme: 'dark' });
  });

  it('should provide trackSubscription method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackSubscription('Subscription Started', { plan: 'pro' });
    });

    expect(mixpanelService.trackSubscription).toHaveBeenCalledWith('Subscription Started', { 
      plan: 'pro' 
    });
  });

  it('should provide trackScreenView method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackScreenView('Chat Screen', { from: 'home' });
    });

    expect(mixpanelService.trackScreenView).toHaveBeenCalledWith('Chat Screen', { from: 'home' });
  });

  it('should provide trackError method', () => {
    const { result } = renderHook(() => useMixpanel());
    const error = new Error('Test error');

    act(() => {
      result.current.trackError(error, { context: 'test' });
    });

    expect(mixpanelService.trackError).toHaveBeenCalledWith(error, { context: 'test' });
  });

  it('should handle string errors in trackError', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackError('Error message', { context: 'test' });
    });

    expect(mixpanelService.trackError).toHaveBeenCalledWith('Error message', { context: 'test' });
  });

  it('should provide identify method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.identify('user-123');
    });

    expect(mixpanelService.identify).toHaveBeenCalledWith('user-123');
  });

  it('should provide setUserProfile method', () => {
    const { result } = renderHook(() => useMixpanel());
    const profile = {
      $email: 'user@example.com',
      $name: 'Test User',
    };

    act(() => {
      result.current.setUserProfile(profile);
    });

    expect(mixpanelService.setUserProfile).toHaveBeenCalledWith(profile);
  });

  it('should provide incrementUserProperty method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.incrementUserProperty('messages_sent', 1);
    });

    expect(mixpanelService.incrementUserProperty).toHaveBeenCalledWith('messages_sent', 1);
  });

  it('should increment without value parameter', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.incrementUserProperty('login_count');
    });

    expect(mixpanelService.incrementUserProperty).toHaveBeenCalledWith('login_count', undefined);
  });

  it('should provide reset method', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.reset();
    });

    expect(mixpanelService.reset).toHaveBeenCalled();
  });

  it('should provide startTiming method', () => {
    const mockEndTiming = jest.fn();
    (mixpanelService.startTiming as jest.Mock).mockReturnValue(mockEndTiming);

    const { result } = renderHook(() => useMixpanel());

    let endTiming;
    act(() => {
      endTiming = result.current.startTiming('Test Timer');
    });

    expect(mixpanelService.startTiming).toHaveBeenCalledWith('Test Timer');
    expect(endTiming).toBe(mockEndTiming);
  });

  it('should maintain stable function references', () => {
    const { result, rerender } = renderHook(() => useMixpanel());

    const firstTrack = result.current.track;
    const firstIdentify = result.current.identify;

    rerender();

    // Functions should maintain the same reference across rerenders
    expect(result.current.track).toBe(firstTrack);
    expect(result.current.identify).toBe(firstIdentify);
  });

  it('should handle events without properties', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.track('Simple Event');
    });

    expect(mixpanelService.track).toHaveBeenCalledWith('Simple Event', undefined);
  });

  it('should handle screen views without properties', () => {
    const { result } = renderHook(() => useMixpanel());

    act(() => {
      result.current.trackScreenView('Home Screen');
    });

    expect(mixpanelService.trackScreenView).toHaveBeenCalledWith('Home Screen', undefined);
  });
});

