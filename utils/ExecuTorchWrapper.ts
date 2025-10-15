/**
 * ExecuTorch Wrapper
 * 
 * Provides a safe wrapper around react-native-executorch to handle:
 * - Streaming responses (undefined return from generate())
 * - Type safety
 * - Error handling
 * - State validation
 */

export interface ExecuTorchLLM {
  isReady: boolean;
  downloadProgress: number;
  response?: string;
  error?: Error | string;
  generate: (messages: any[]) => Promise<string | undefined>;
  unload?: () => void;
}

export interface GenerationResult {
  success: boolean;
  response?: string;
  error?: string;
  isStreaming: boolean;
}

/**
 * Safely get the current response from ExecuTorch LLM
 * Handles both streaming and non-streaming modes
 */
export function getExecuTorchResponse(llm: any): string | undefined {
  if (!llm) return undefined;
  
  try {
    // Check streaming response property
    const streamedResponse = llm.response;
    if (streamedResponse && typeof streamedResponse === 'string') {
      return streamedResponse;
    }
    
    return undefined;
  } catch (error) {
    console.error('[ExecuTorch] Error getting response:', error);
    return undefined;
  }
}

/**
 * Check if ExecuTorch LLM is ready for generation
 */
export function isExecuTorchReady(llm: any): boolean {
  if (!llm) return false;
  
  try {
    return !!(llm.isReady && llm.downloadProgress >= 1 && !llm.error);
  } catch (error) {
    console.error('[ExecuTorch] Error checking ready state:', error);
    return false;
  }
}

/**
 * Get ExecuTorch LLM state for diagnostics
 */
export function getExecuTorchState(llm: any): {
  isReady: boolean;
  downloadProgress: number;
  hasError: boolean;
  errorMessage?: string;
  hasResponse: boolean;
  responseLength: number;
} {
  if (!llm) {
    return {
      isReady: false,
      downloadProgress: 0,
      hasError: false,
      hasResponse: false,
      responseLength: 0,
    };
  }
  
  try {
    const response = getExecuTorchResponse(llm);
    const error = llm.error;
    
    return {
      isReady: !!llm.isReady,
      downloadProgress: llm.downloadProgress || 0,
      hasError: !!error,
      errorMessage: error ? (error.message || String(error)) : undefined,
      hasResponse: !!response,
      responseLength: response?.length || 0,
    };
  } catch (error) {
    console.error('[ExecuTorch] Error getting state:', error);
    return {
      isReady: false,
      downloadProgress: 0,
      hasError: true,
      errorMessage: String(error),
      hasResponse: false,
      responseLength: 0,
    };
  }
}

/**
 * Safely call ExecuTorch generate with proper error handling
 * 
 * ExecuTorch behavior:
 * - generate() may return undefined even on success (streaming mode)
 * - Actual response comes through llm.response property
 * - Need to check both return value and streaming response
 */
export async function safeExecuTorchGenerate(
  llm: any,
  messages: any[],
  options?: {
    timeout?: number;
    checkInterval?: number;
  }
): Promise<GenerationResult> {
  const { timeout = 120000, checkInterval = 100 } = options || {};
  
  if (!llm) {
    return {
      success: false,
      error: 'LLM not initialized',
      isStreaming: false,
    };
  }
  
  // Pre-flight checks
  if (!isExecuTorchReady(llm)) {
    const state = getExecuTorchState(llm);
    return {
      success: false,
      error: `Model not ready: isReady=${state.isReady}, progress=${state.downloadProgress}, error=${state.hasError}`,
      isStreaming: false,
    };
  }
  
  try {
    console.log('[ExecuTorch] Starting generation...');
    const startTime = Date.now();
    
    // Call generate - may return undefined for streaming models
    const directResult = await llm.generate(messages);
    console.log('[ExecuTorch] generate() returned, type:', typeof directResult);
    
    // Check if we got a direct result (non-streaming)
    if (directResult && typeof directResult === 'string' && directResult.trim().length > 0) {
      console.log('[ExecuTorch] Got direct result (non-streaming)');
      return {
        success: true,
        response: directResult,
        isStreaming: false,
      };
    }
    
    // For streaming models, check llm.response
    const streamedResponse = getExecuTorchResponse(llm);
    
    if (streamedResponse && streamedResponse.trim().length > 0) {
      console.log('[ExecuTorch] Got streamed response, length:', streamedResponse.length);
      return {
        success: true,
        response: streamedResponse,
        isStreaming: true,
      };
    }
    
    // No response yet - this might be normal for streaming, response comes later
    console.log('[ExecuTorch] No immediate response - streaming will update llm.response');
    return {
      success: true,
      response: '', // Empty initially, will be populated via streaming
      isStreaming: true,
    };
    
  } catch (error: any) {
    console.error('[ExecuTorch] Generation error:', error);
    
    // Check if we have a partial streamed response despite the error
    const streamedResponse = getExecuTorchResponse(llm);
    if (streamedResponse && streamedResponse.trim().length > 0) {
      console.warn('[ExecuTorch] Got partial response despite error');
      return {
        success: true,
        response: streamedResponse,
        isStreaming: true,
      };
    }
    
    return {
      success: false,
      error: error.message || String(error),
      isStreaming: false,
    };
  }
}

/**
 * Validate ExecuTorch response
 */
export function validateExecuTorchResponse(response: any): {
  valid: boolean;
  error?: string;
} {
  if (response === undefined || response === null) {
    return {
      valid: false,
      error: 'Response is undefined or null',
    };
  }
  
  if (typeof response !== 'string') {
    return {
      valid: false,
      error: `Response is not a string (got ${typeof response})`,
    };
  }
  
  if (response.trim().length === 0) {
    return {
      valid: false,
      error: 'Response is empty string',
    };
  }
  
  return { valid: true };
}

/**
 * Check if an error is recoverable
 */
export function isRecoverableError(error: any): boolean {
  const errorMsg = String(error).toLowerCase();
  
  // Unload errors during cleanup are not critical
  if (errorMsg.includes('unload')) {
    return true;
  }
  
  // "Still loading" errors are temporary
  if (errorMsg.includes('still loading') || errorMsg.includes('not loaded')) {
    return true;
  }
  
  // Content-Length errors from downloads
  if (errorMsg.includes('content-length')) {
    return true;
  }
  
  return false;
}

/**
 * Check if an error is fatal and requires switching to cloud
 */
export function isFatalError(error: any): boolean {
  const errorMsg = String(error).toLowerCase();
  
  return (
    errorMsg.includes('crash') ||
    errorMsg.includes('fatal') ||
    errorMsg.includes('abort') ||
    errorMsg.includes('segmentation') ||
    errorMsg.includes('out of memory') ||
    errorMsg.includes('oom')
  );
}

/**
 * Format ExecuTorch state for logging
 */
export function formatExecuTorchState(llm: any): string {
  const state = getExecuTorchState(llm);
  
  return `ExecuTorch State:
  - Ready: ${state.isReady}
  - Download: ${(state.downloadProgress * 100).toFixed(0)}%
  - Error: ${state.hasError ? state.errorMessage : 'None'}
  - Response: ${state.hasResponse ? `${state.responseLength} chars` : 'None'}`;
}

/**
 * Safely unload ExecuTorch model
 */
export async function safeUnloadExecuTorch(llm: any): Promise<void> {
  if (!llm || typeof llm.unload !== 'function') {
    return;
  }
  
  try {
    console.log('[ExecuTorch] Unloading model...');
    await llm.unload();
    console.log('[ExecuTorch] Model unloaded successfully');
  } catch (error) {
    // Unload errors are typically not critical
    if (!isRecoverableError(error)) {
      console.error('[ExecuTorch] Error unloading model:', error);
    } else {
      console.warn('[ExecuTorch] Ignorable unload error:', error);
    }
  }
}

