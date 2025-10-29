/**
 * Authentication E2E Tests
 * 
 * Priority: P0 (Critical)
 * Tests for login, registration, and authentication flows
 */

describe('Authentication E2E', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('App Launch - First Time', () => {
    it('should show authentication screen on first launch', async () => {
      // Wait for auth screen to appear
      await waitFor(element(by.id('auth-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should display login and signup options', async () => {
      await expect(element(by.id('login-button'))).toBeVisible();
      await expect(element(by.id('signup-button'))).toBeVisible();
    });
  });

  describe('Login Flow', () => {
    it('should show login form', async () => {
      await element(by.id('login-button')).tap();
      
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('submit-button'))).toBeVisible();
    });

    it('should validate email format', async () => {
      await element(by.id('login-button')).tap();
      
      // Enter invalid email
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('submit-button')).tap();
      
      // Should show validation error
      await expect(element(by.text(/valid email/i))).toExist();
    });

    it('should require password', async () => {
      await element(by.id('login-button')).tap();
      
      // Enter email without password
      await element(by.id('email-input')).typeText('test@example.com');
      await element(by.id('submit-button')).tap();
      
      // Should show password required error
      await expect(element(by.text(/password/i))).toExist();
    });
  });

  describe('Registration Flow', () => {
    it('should show registration form', async () => {
      await element(by.id('signup-button')).tap();
      
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('confirm-password-input'))).toBeVisible();
    });

    it('should validate password confirmation', async () => {
      await element(by.id('signup-button')).tap();
      
      await element(by.id('email-input')).typeText('newuser@example.com');
      await element(by.id('password-input')).typeText('password123');
      await element(by.id('confirm-password-input')).typeText('different');
      await element(by.id('submit-button')).tap();
      
      // Should show password mismatch error
      await expect(element(by.text(/password.*match/i))).toExist();
    });
  });

  describe('Authenticated State', () => {
    // Note: This assumes you have test credentials set up
    // You may need to adjust based on your auth setup
    
    it('should persist authentication', async () => {
      // After successful login, close and relaunch app
      await device.terminateApp();
      await device.launchApp({ newInstance: false });
      
      // Should go directly to chat screen (if previously authenticated)
      // Adjust based on your app's behavior
      await waitFor(element(by.id('chat-screen')))
        .toExist()
        .withTimeout(5000);
    });
  });
});

