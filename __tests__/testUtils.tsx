/**
 * Test Utilities
 * 
 * Shared utilities and helpers for testing components and hooks.
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Create a fresh QueryClient for testing
 */
export const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
};

/**
 * Wrapper component for tests that need QueryClient
 */
interface AllTheProvidersProps {
  children: React.ReactNode;
}

export const AllTheProviders: React.FC<AllTheProvidersProps> = ({ children }) => {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

/**
 * Custom render function that includes all providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  return render(ui, { wrapper: AllTheProviders, ...options });
};

/**
 * Mock user data for testing
 */
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  created_at: '2024-01-01T00:00:00Z',
};

/**
 * Mock auth tokens for testing
 */
export const mockTokens = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'Bearer',
};

/**
 * Mock conversation data
 */
export const mockConversation = {
  id: 'conv-123',
  title: 'Test Conversation',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  user_id: 'test-user-id',
};

/**
 * Mock message data
 */
export const mockMessage = {
  id: 'msg-123',
  conversation_id: 'conv-123',
  content: 'Hello, this is a test message',
  role: 'user' as const,
  created_at: '2024-01-01T00:00:00Z',
  metadata: {},
};

/**
 * Mock assistant message
 */
export const mockAssistantMessage = {
  id: 'msg-456',
  conversation_id: 'conv-123',
  content: 'Hello! How can I help you today?',
  role: 'assistant' as const,
  created_at: '2024-01-01T00:00:00Z',
  metadata: {},
};

/**
 * Mock credits data
 */
export const mockCredits = {
  remaining_credits: 1000,
  subscription_credits: 500,
  custom_credits: 500,
  total_used: 250,
};

/**
 * Mock model data
 */
export const mockModel = {
  id: 'gpt-4',
  name: 'GPT-4',
  provider: 'openai',
  is_available: true,
  cost_per_token: 0.03,
};

/**
 * Mock integration data
 */
export const mockIntegration = {
  id: 'slack',
  name: 'Slack',
  provider: 'slack',
  is_connected: false,
  icon: '💬',
  description: 'Connect to Slack',
};

/**
 * Wait for async operations to complete
 */
export const waitFor = (callback: () => void, timeout = 1000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const check = () => {
      try {
        callback();
        resolve();
      } catch (error) {
        if (Date.now() - startTime >= timeout) {
          reject(error);
        } else {
          setTimeout(check, 50);
        }
      }
    };
    
    check();
  });
};

/**
 * Flush all pending promises
 */
export const flushPromises = () => new Promise(setImmediate);

/**
 * Mock file for testing
 */
export const mockFile = {
  uri: 'file:///mock/document.pdf',
  name: 'document.pdf',
  type: 'application/pdf',
  size: 1024,
};

/**
 * Mock image for testing
 */
export const mockImage = {
  uri: 'file:///mock/image.jpg',
  name: 'image.jpg',
  type: 'image/jpeg',
  width: 1920,
  height: 1080,
  size: 2048,
};

// Re-export testing library utilities
export * from '@testing-library/react-native';

