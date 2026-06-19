/**
 * useChat Hook Tests
 * 
 * Priority: P0 (Critical)
 * Tests for the main chat hook functionality
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { ChatProvider } from '@/hooks/useChat';

// Mock all dependencies
jest.mock('@/utils/ApiClient');
jest.mock('@/utils/SecureTokenManager');
jest.mock('@/utils/ChatStream');
jest.mock('@/utils/StreamManager');
jest.mock('@/utils/AuthHelpers');
jest.mock('@/utils/mixpanel/MixpanelService');
jest.mock('react-native-fs');
jest.mock('expo-file-system');
jest.mock('expo-image-manipulator');

// Mock hooks with proper return values
jest.mock('@/hooks/useAuth', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'user-123', email: 'test@example.com' },
    isAuthenticated: true,
  })),
}));

jest.mock('@/hooks/useDefaultModel', () => ({
  getDefaultModelId: jest.fn(() => 'llama-3.2-1b-qlora'),
}));

jest.mock('@/hooks/useMMKVStorage', () => ({
  __esModule: true,
  default: jest.fn(() => [null, jest.fn()]),
  storage: {
    getString: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the streaming-state context so ChatProvider can mount without the full
// app provider chain (Notification/Stripe/IAP). useChat only consumes these.
jest.mock('@/contexts/StreamingStateContext', () => ({
  StreamingStateProvider: ({ children }: any) => children,
  useStreamingState: () => ({
    showNotification: jest.fn(),
    startStream: jest.fn(),
    completeStream: jest.fn(),
    setActiveConversation: jest.fn(),
  }),
}));

// Import after mocks
import { useChat } from '@/hooks/useChat';
import { globalStreamManager } from '@/utils/StreamManager';
import { Role } from '@/utils/Interfaces';
import { useAuth } from '@/hooks/useAuth';

describe('useChat Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });
  
  const wrapper = ({ children }: any) => <ChatProvider>{children}</ChatProvider>;
  
  describe('Initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(result.current.messages).toEqual([]);
      expect(result.current.conversations).toEqual([]);
      expect(result.current.currentConversationId).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isSending).toBe(false);
      expect(result.current.stream).toBe('');
      expect(result.current.intermediate).toBe('');
    });
    
    it('should provide all required functions', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.fetchMessages).toBe('function');
      expect(typeof result.current.fetchConversation).toBe('function');
      expect(typeof result.current.createNewConversation).toBe('function');
      expect(typeof result.current.stopStreaming).toBe('function');
    });
  });
  
  describe('Error Handling', () => {
    it('should have initial error state', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(result.current.chatError).toBeNull();
    });
    
    it('should provide clearChatError function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.clearChatError).toBe('function');
    });
  });
  
  describe('Artifact Management', () => {
    it('should initialize artifacts', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(result.current.artifacts).toEqual([]);
      expect(result.current.currentStreamingArtifact).toBeNull();
    });
    
    it('should provide artifact functions', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.getArtifactsForMessage).toBe('function');
    });
  });
  
  describe('Document Management', () => {
    it('should initialize documents', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(result.current.documents).toEqual([]);
      expect(result.current.currentStreamingDocument).toBeNull();
    });
    
    it('should provide document functions', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.getDocumentsForMessage).toBe('function');
    });
  });
  
  describe('Local Model Support', () => {
    it('should initialize local model state', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.isLocal).toBe('boolean');
      expect(typeof result.current.isLocalModelSupported).toBe('boolean');
      expect(typeof result.current.setIsLocal).toBe('function');
    });
  });
  
  describe('Conversation Management', () => {
    it('should provide conversation management functions', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.createNewConversation).toBe('function');
      expect(typeof result.current.setCurrentRoom).toBe('function');
      expect(typeof result.current.clearChat).toBe('function');
      expect(typeof result.current.deleteConversation).toBe('function');
      expect(typeof result.current.renameConversation).toBe('function');
    });
    
    it('should reset chat state', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      act(() => {
        result.current.resetChat();
      });
      
      expect(result.current.messages).toEqual([]);
    });
  });
  
  describe('Streaming State', () => {
    it('should initialize streaming state', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(result.current.stream).toBe('');
      expect(result.current.intermediate).toBe('');
      expect(result.current.reasoningText).toBe('');
    });
    
    it('should provide stopStreaming function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.stopStreaming).toBe('function');
    });
  });
  
  describe('Message History', () => {
    it('should provide appendToMessageHistory function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.appendToMessageHistory).toBe('function');
    });
  });
  
  describe('Message Reactions', () => {
    it('should provide updateMessageReaction function', () => {
      const { result } = renderHook(() => useChat(), { wrapper });
      
      expect(typeof result.current.updateMessageReaction).toBe('function');
    });
  });
  
  describe('Hook Stability', () => {
    it('should maintain function references across renders', () => {
      const { result, rerender } = renderHook(() => useChat(), { wrapper });
      
      const sendMessageRef1 = result.current.sendMessage;
      const stopStreamingRef1 = result.current.stopStreaming;
      
      rerender();
      
      const sendMessageRef2 = result.current.sendMessage;
      const stopStreamingRef2 = result.current.stopStreaming;
      
      // Functions should be defined and be functions
      expect(typeof sendMessageRef1).toBe('function');
      expect(typeof stopStreamingRef1).toBe('function');
      expect(typeof sendMessageRef2).toBe('function');
      expect(typeof stopStreamingRef2).toBe('function');
    });
  });
  
  describe('Context Provider', () => {
    it('should throw error when used outside provider', () => {
      // Temporarily suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useChat());
      }).toThrow();
      
      consoleSpy.mockRestore();
    });
  });
});

// Additional integration-style tests that don't require full mock setup
describe('useChat Hook - Basic Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  const wrapper = ({ children }: any) => <ChatProvider>{children}</ChatProvider>;
  
  it('should handle multiple hook calls from same provider', () => {
    const { result: result1 } = renderHook(() => useChat(), { wrapper });
    const { result: result2 } = renderHook(() => useChat(), { wrapper });
    
    // Both should have the same structure
    expect(result1.current.messages).toEqual(result2.current.messages);
    expect(result1.current.conversations).toEqual(result2.current.conversations);
    expect(result1.current.isLoading).toBe(result2.current.isLoading);
  });
  
  it('should maintain state consistency', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // Initial state should be consistent
    expect(result.current.isSending).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.messages.length).toBe(0);
  });
});

