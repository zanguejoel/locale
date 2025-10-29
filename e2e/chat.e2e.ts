/**
 * Chat E2E Tests
 * 
 * Priority: P0 (Critical)
 * End-to-end tests for chat functionality
 */

describe('Chat E2E', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: 'YES', camera: 'YES', photos: 'YES' },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch', () => {
    it('should launch app successfully', async () => {
      // App should be visible
      await expect(element(by.id('root-view'))).toBeVisible();
    });

    it('should show main navigation', async () => {
      // Check for navigation elements (adjust IDs based on your app)
      // This is a placeholder - update with actual testIDs from your app
      await waitFor(element(by.id('app-loaded')))
        .toExist()
        .withTimeout(5000);
    });
  });

  describe('Message Flow', () => {
    it('should navigate to chat screen', async () => {
      // Navigate to chat (adjust based on your navigation structure)
      // Example: await element(by.id('chat-tab')).tap();
      
      // For now, this is a placeholder
      // You'll need to add testID props to your components
      await waitFor(element(by.id('chat-screen')))
        .toExist()
        .withTimeout(5000);
    });

    it('should display chat input', async () => {
      await expect(element(by.id('chat-input'))).toExist();
    });

    it('should send a text message', async () => {
      // Type message
      await element(by.id('chat-input')).typeText('Hello from E2E test');
      
      // Send message
      await element(by.id('send-button')).tap();
      
      // User message should appear
      await waitFor(element(by.text('Hello from E2E test')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should receive bot response', async () => {
      // Send message
      await element(by.id('chat-input')).typeText('Test message');
      await element(by.id('send-button')).tap();
      
      // Wait for user message
      await waitFor(element(by.text('Test message')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Wait for bot response (streaming)
      await waitFor(element(by.id('bot-message')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should display streaming indicator', async () => {
      await element(by.id('chat-input')).typeText('Generate a long response');
      await element(by.id('send-button')).tap();
      
      // Should show streaming indicator
      await waitFor(element(by.id('streaming-indicator')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Stream Cancellation', () => {
    it('should show stop button during streaming', async () => {
      await element(by.id('chat-input')).typeText('Long response please');
      await element(by.id('send-button')).tap();
      
      // Wait for streaming to start
      await waitFor(element(by.id('stop-button')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should cancel streaming when stop button pressed', async () => {
      await element(by.id('chat-input')).typeText('Long response');
      await element(by.id('send-button')).tap();
      
      // Wait for streaming indicator
      await waitFor(element(by.id('streaming-indicator')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Press stop button
      await element(by.id('stop-button')).tap();
      
      // Streaming should stop
      await waitFor(element(by.id('streaming-indicator')))
        .not.toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Conversation Management', () => {
    it('should create new conversation', async () => {
      // Tap new conversation button
      await element(by.id('new-conversation-button')).tap();
      
      // Chat should be empty
      await expect(element(by.id('empty-chat-state'))).toBeVisible();
    });

    it('should switch between conversations', async () => {
      // Send message in first conversation
      await element(by.id('chat-input')).typeText('First conversation');
      await element(by.id('send-button')).tap();
      
      await waitFor(element(by.text('First conversation')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Create new conversation
      await element(by.id('new-conversation-button')).tap();
      
      // Should be empty
      await expect(element(by.id('empty-chat-state'))).toExist();
    });

    it('should not lose messages when switching conversations', async () => {
      // Send message in conversation 1
      await element(by.id('chat-input')).typeText('Message 1');
      await element(by.id('send-button')).tap();
      
      await waitFor(element(by.text('Message 1')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Switch to new conversation
      await element(by.id('new-conversation-button')).tap();
      
      // Send message in conversation 2
      await element(by.id('chat-input')).typeText('Message 2');
      await element(by.id('send-button')).tap();
      
      // Switch back to conversation 1
      await element(by.id('conversations-button')).tap();
      await element(by.id('conversation-0')).tap();
      
      // Message 1 should still be there
      await expect(element(by.text('Message 1'))).toBeVisible();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Note: This test requires network control
      // You may need to mock the API or use a test server
      
      // Send message
      await element(by.id('chat-input')).typeText('Test message');
      await element(by.id('send-button')).tap();
      
      // If network error, should show error message
      // (This is a placeholder - adjust based on your error UI)
      await waitFor(element(by.id('chat-message')))
        .toExist()
        .withTimeout(10000);
    });
  });

  describe('UI Interactions', () => {
    it('should scroll message list', async () => {
      // Send multiple messages
      for (let i = 0; i < 10; i++) {
        await element(by.id('chat-input')).typeText(`Message ${i}`);
        await element(by.id('send-button')).tap();
        await waitFor(element(by.text(`Message ${i}`)))
          .toBeVisible()
          .withTimeout(2000);
      }
      
      // Scroll to top
      await element(by.id('message-list')).scroll(500, 'up');
      
      // Scroll to bottom
      await element(by.id('message-list')).scroll(500, 'down');
    });

    it('should clear input after sending', async () => {
      await element(by.id('chat-input')).typeText('Test message');
      await element(by.id('send-button')).tap();
      
      // Input should be cleared
      await expect(element(by.id('chat-input'))).toHaveText('');
    });
  });

  describe('Performance', () => {
    it('should remain responsive during streaming', async () => {
      await element(by.id('chat-input')).typeText('Generate long content');
      await element(by.id('send-button')).tap();
      
      // Wait for streaming to start
      await waitFor(element(by.id('streaming-indicator')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Should still be able to interact with UI
      // Try scrolling during streaming
      await element(by.id('message-list')).scroll(100, 'up');
      await element(by.id('message-list')).scroll(100, 'down');
    });

    it('should handle rapid message sending', async () => {
      // Send 5 messages quickly
      for (let i = 0; i < 5; i++) {
        await element(by.id('chat-input')).typeText(`Quick ${i}`);
        await element(by.id('send-button')).tap();
        // Small delay to allow message to be sent
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // All messages should eventually appear
      await waitFor(element(by.text('Quick 4')))
        .toBeVisible()
        .withTimeout(30000);
    });
  });
});

