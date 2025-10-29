/**
 * E2E Test Initialization
 * 
 * This file runs before all E2E tests to set up the test environment
 */

import { device } from 'detox';

beforeAll(async () => {
  // Launch app before all tests
  await device.launchApp({
    newInstance: true,
    permissions: {
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES',
      microphone: 'YES',
    },
  });
});

beforeEach(async () => {
  // Reload React Native before each test for clean state
  await device.reloadReactNative();
});

afterAll(async () => {
  // Cleanup after all tests
  await device.terminateApp();
});

