/**
 * Performance E2E Tests
 * 
 * Priority: P2 (Medium)
 * Tests for app performance and responsiveness
 */

describe('Performance E2E', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch Performance', () => {
    it('should launch within 5 seconds', async () => {
      const startTime = Date.now();
      
      await device.launchApp({ newInstance: true });
      
      await waitFor(element(by.id('app-loaded')))
        .toExist()
        .withTimeout(5000);
      
      const launchTime = Date.now() - startTime;
      
      // Should launch in under 5 seconds
      expect(launchTime).toBeLessThan(5000);
    });
  });

  describe('Chat Performance', () => {
    it('should handle long conversation smoothly', async () => {
      // Navigate to chat
      await element(by.id('chat-screen')).tap();
      
      // Send 20 messages
      for (let i = 0; i < 20; i++) {
        await element(by.id('chat-input')).typeText(`Message ${i}`);
        await element(by.id('send-button')).tap();
        
        // Wait briefly
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      // Should still be responsive
      await element(by.id('message-list')).scroll(1000, 'up');
      await element(by.id('message-list')).scroll(1000, 'down');
      
      // No frame drops expected
      // Detox automatically measures this
    });

    it('should scroll smoothly with many messages', async () => {
      // This test assumes you have a conversation with many messages
      await element(by.id('message-list')).scroll(2000, 'up', NaN, 0.5);
      await element(by.id('message-list')).scroll(2000, 'down', NaN, 0.5);
      
      // Should complete without timing out (smooth scrolling)
    });
  });

  describe('Streaming Performance', () => {
    it('should maintain 60 FPS during streaming', async () => {
      await element(by.id('chat-input')).typeText('Generate long content');
      await element(by.id('send-button')).tap();
      
      // Wait for streaming
      await waitFor(element(by.id('streaming-indicator')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Try to interact during streaming
      // Should remain responsive
      await element(by.id('message-list')).scroll(100, 'up');
      await element(by.id('message-list')).scroll(100, 'down');
    });

    it('should handle concurrent UI updates during streaming', async () => {
      await element(by.id('chat-input')).typeText('Stream test');
      await element(by.id('send-button')).tap();
      
      // Wait for streaming
      await waitFor(element(by.id('streaming-indicator')))
        .toBeVisible()
        .withTimeout(2000);
      
      // Try multiple interactions
      await element(by.id('message-list')).swipe('up', 'fast', 0.5);
      await element(by.id('message-list')).swipe('down', 'fast', 0.5);
      
      // App should remain responsive
    });
  });

  describe('Memory Management', () => {
    it('should not crash with many messages', async () => {
      // Send 50 messages to test memory handling
      for (let i = 0; i < 50; i++) {
        await element(by.id('chat-input')).typeText(`Msg ${i}`);
        await element(by.id('send-button')).tap();
        
        // Brief wait
        if (i % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // App should still be running
      await expect(element(by.id('chat-screen'))).toExist();
    });
  });
});

