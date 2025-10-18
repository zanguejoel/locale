/**
 * Polyfills for Transformers.js in React Native
 * Based on: https://github.com/hans00/react-native-transformers-example
 */

// Canvas support via Skia
import 'react-native-skia-offscreencanvas/polyfill';

// Text encoding
import 'text-encoding-polyfill';

// Buffer
import { Buffer } from '@craftzdog/react-native-buffer';
global.Buffer = Buffer;

// File system polyfill (stub for Transformers.js)
// Transformers.js needs fs, but we don't actually use it in React Native
const fs = {
  promises: {
    readFile: () => Promise.reject(new Error('fs not available in React Native')),
    writeFile: () => Promise.reject(new Error('fs not available in React Native')),
    readdir: () => Promise.reject(new Error('fs not available in React Native')),
    mkdir: () => Promise.resolve(),
    stat: () => Promise.reject(new Error('fs not available in React Native')),
  },
  readFileSync: () => { throw new Error('fs not available in React Native'); },
  writeFileSync: () => { throw new Error('fs not available in React Native'); },
  existsSync: () => false,
  mkdirSync: () => {},
  statSync: () => { throw new Error('fs not available in React Native'); },
};

// Polyfill node:fs module
if (typeof global.process === 'undefined') {
  global.process = { env: {} };
}
global.process.versions = global.process.versions || {};
global.process.versions.node = '18.0.0'; // Fake Node version

// Add fs to global scope for node:fs imports
global.fs = fs;

// Base64 encoding/decoding for ArrayBuffer (required by Transformers.js)
// Support both naming conventions
const arrayBufferToBase64 = function(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return global.btoa(binary);
};

const base64ToArrayBuffer = function(base64) {
  const binary = global.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Add all naming variants
global.base64FromArrayBuffer = arrayBufferToBase64;
global.arrayBufferToBase64 = arrayBufferToBase64;
global.arrayBufferFromBase64 = base64ToArrayBuffer;
global.base64ToArrayBuffer = base64ToArrayBuffer;

// Ensure btoa/atob are available
if (!global.btoa) {
  global.btoa = function(str) {
    return Buffer.from(str, 'binary').toString('base64');
  };
}

if (!global.atob) {
  global.atob = function(base64) {
    return Buffer.from(base64, 'base64').toString('binary');
  };
}

// Unicode RegExp support (required for tokenizers)
import XRegExp from 'xregexp';
const nativeRegExp = global.RegExp;
const newRegExp = (...args) => {
  global.RegExp = nativeRegExp;
  const result = XRegExp(...args);
  global.RegExp = newRegExp;
  return result;
};
global.RegExp = newRegExp;

// ✅ CRITICAL: Initialize ONNX Runtime BEFORE Transformers.js loads
// The @fugood/transformers fork needs onnxruntime-react-native to be available
try {
  const ort = require('onnxruntime-react-native');
  
  console.log('✅ ONNX Runtime React Native loaded');
  console.log('  - InferenceSession:', !!ort.InferenceSession);
  console.log('  - Tensor:', !!ort.Tensor);
  
  // ✅ CRITICAL: @fugood/transformers looks for ONNX Runtime at:
  // globalThis[Symbol.for('onnxruntime')]
  // This is the ONLY way it will detect our ONNX Runtime in React Native!
  const ORT_SYMBOL = Symbol.for('onnxruntime');
  
  // Set up the ONNX Runtime on globalThis using the correct Symbol
  // The transformers fork will use this directly as its ONNX backend
  if (typeof globalThis !== 'undefined') {
    globalThis[ORT_SYMBOL] = ort;
    console.log('✅ ONNX Runtime registered at globalThis[Symbol.for("onnxruntime")]');
  }
  
  // Also set legacy global properties for backwards compatibility
  if (typeof global !== 'undefined') {
    global.onnxruntime = ort;
    global.ort = ort;
  }
  
  // Verify setup
  if (ort.InferenceSession) {
    console.log('✅ ONNX Runtime setup complete and ready for @fugood/transformers');
  } else {
    console.warn('⚠️ ONNX Runtime loaded but InferenceSession not found');
  }
} catch (error) {
  console.error('❌ Failed to load onnxruntime-react-native:', error);
  console.error('Transformers.js will not work without ONNX Runtime');
}

console.log('✅ Transformers.js polyfills loaded');
console.log('✅ Ready for @fugood/transformers fork');
