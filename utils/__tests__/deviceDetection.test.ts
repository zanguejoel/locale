/**
 * Device Detection Tests
 * 
 * Run in console to verify detection works
 */

import { isRunningOnSimulator, getEnvironmentDescription, shouldUseMockIAP } from '../deviceDetection';

export function testDeviceDetection() {
  console.log('═══════════════════════════════════════════');
  console.log('DEVICE DETECTION TEST');
  console.log('═══════════════════════════════════════════\n');
  
  console.log('[Test] Environment Description:');
  console.log(getEnvironmentDescription());
  console.log('');
  
  console.log('[Test] Is Running on Simulator?', isRunningOnSimulator());
  console.log('[Test] Should Use Mock IAP?', shouldUseMockIAP());
  console.log('');
  
  console.log('═══════════════════════════════════════════');
}

// Auto-run on import (for testing)
if (__DEV__) {
  testDeviceDetection();
}

