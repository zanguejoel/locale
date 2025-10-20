import { ApiResponse } from "apisauce";

interface StreamData {
  type: 'stream' | 'final' | 'error' | 'state' | 'meta';
  content?: string;
  data?: {
    response?: string;
    history?: [string, string][];
    additional_data?: any[];
    [key: string]: any;
  };
  error?: string;
}

type SetStreamFunction = (value: string | ((prev: string) => string)) => void;

// ============================================================
// WORD-BY-WORD STREAMING CONFIGURATION
// ============================================================
// Adjust this value to control streaming speed:
// - 10ms  = Very fast (almost instant)
// - 30ms  = Fast (smooth but quick) ← CURRENT
// - 50ms  = Medium (comfortable reading speed)
// - 80ms  = Slow (deliberate, easy to follow)
// - 100ms+ = Very slow (emphasizes each word)
// ============================================================
const WORD_DELAY_MS = 1; // Delay between words in milliseconds

export const processStream = async (
  response: ReadableStream<Uint8Array> | null,
  setStream: SetStreamFunction,
  handleError: (error: string) => void,
  setIntermediate: (value: string) => void,
  setStreamWorking: (v: boolean) => void,
  setAdditionalData?: (a: any[]) => void
): Promise<StreamData | null> => {
  console.log("[ChatStream] ═══════════════════════════════════════");
  console.log("[ChatStream] processStream called - WORD-BY-WORD MODE");
  console.log("[ChatStream] - Response exists:", !!response);
  console.log("[ChatStream] - Has additionalData callback:", !!setAdditionalData);
  console.log("[ChatStream] - Word delay:", WORD_DELAY_MS, "ms");
  console.log("[ChatStream] ═══════════════════════════════════════");
  
  setStreamWorking(true);
  let res: StreamData | null = null;
  let buffer = '';
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let chunkCount = 0;
  let hasReceivedContent = false;
  let hasReceivedIntermediate = false;
  
  // Word-by-word streaming buffers
  let wordBuffer = ''; // Accumulates characters until we have complete words
  let pendingWords: string[] = []; // Queue of complete words to display
  let isProcessingWords = false; // Flag to prevent concurrent word processing

  if (!response) {
    // console.error("[ChatStream] Error: No response stream");
    handleError("No response stream available");
    setStreamWorking(false);
    return null;
  }

  const decoder = new TextDecoder();
  
  // Function to extract complete words from the word buffer
  const extractWords = (text: string): { words: string[], remaining: string } => {
    // Split by whitespace but keep the whitespace
    const parts = text.split(/(\s+)/);
    const words: string[] = [];
    let remaining = '';
    
    // Process all but the last part (which might be incomplete)
    for (let i = 0; i < parts.length - 1; i++) {
      words.push(parts[i]);
    }
    
    // Keep the last part as remaining (might be incomplete word)
    remaining = parts[parts.length - 1] || '';
    
    return { words, remaining };
  };
  
  // Function to process and display words one by one
  const processWordQueue = async () => {
    if (isProcessingWords) return; // Already processing
    isProcessingWords = true;
    
    while (pendingWords.length > 0) {
      const word = pendingWords.shift();
      if (word !== undefined) {
        // console.log(`[ChatStream] 📝 Displaying word: "${word}"`);
        setStream((prev) => prev + word);
        
        // Add delay between words for smooth streaming effect
        if (pendingWords.length > 0) {
          await new Promise(resolve => setTimeout(resolve, WORD_DELAY_MS));
        }
      }
    }
    
    isProcessingWords = false;
  };

  try {
    // console.log("[ChatStream] Getting reader...");
    reader = response.getReader();
    // console.log("[ChatStream] Reader obtained successfully");

    if (!reader) {
      // console.error("[ChatStream] Error: Unable to get stream reader");
      handleError("Unable to get stream reader");
      setStreamWorking(false);
      return null;
    }

    while (true) {
      try {
        const { value, done } = await reader.read();
        chunkCount++;
        
        if (done) {
          // console.log("[ChatStream] Stream completed after", chunkCount, "chunks");
          break;
        }

        if (value) {
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          console.log(`[ChatStream] 📦 Chunk ${chunkCount} received (${chunk.length} chars)`);
          buffer += chunk;

          // Process accumulated buffer immediately
          const { results, remaining } = processJSONChunks(buffer);
          buffer = remaining;
          console.log(`[ChatStream] 🔍 Parsed ${results.length} results from chunk ${chunkCount}`);

          // Handle each parsed result - word-by-word streaming
          for (const data of results) {
            try {
              switch (data.type) {
                case 'stream':
                  if (data.content !== undefined) {
                    if (!hasReceivedContent) {
                      console.log('[ChatStream] ✅ First content received');
                      hasReceivedContent = true;
                    }
                    console.log(`[ChatStream] 💬 Received content chunk: "${data.content}" (${data.content.length} chars)`);
                    
                    // Add content to word buffer
                    wordBuffer += data.content;
                    
                    // Extract complete words from buffer
                    const { words, remaining } = extractWords(wordBuffer);
                    wordBuffer = remaining;
                    
                    if (words.length > 0) {
                      console.log(`[ChatStream] 📚 Extracted ${words.length} words, remaining: "${remaining}"`);
                      // Add words to pending queue
                      pendingWords.push(...words);
                      // Start processing words (non-blocking)
                      processWordQueue();
                    }
                  }
                  break;

                case 'state':
                  if (data.content) {
                    if (!hasReceivedIntermediate) {
                      console.log('[ChatStream] 🔄 First intermediate state received');
                      hasReceivedIntermediate = true;
                    }
                    console.log('[ChatStream] State update:', data.content);
                    setIntermediate(data.content);
                  }
                  break;

                case 'meta':
                  // Handle metadata during streaming (e.g., generated images)
                  if (data?.data?.additional_data) {
                    console.log('[ChatStream] 📦 Received meta with additional_data:', data.data.additional_data.length, 'items');
                    setAdditionalData?.(data.data.additional_data);
                  }
                  break;

                case 'final':
                  res = data;
                  console.log('[ChatStream] ✅ Received final response');
                  console.log('[ChatStream] - Has content:', !!data.content);
                  console.log('[ChatStream] - Has additional_data:', !!data?.data?.additional_data);
                  
                  // Clear intermediate state when final response is received
                  console.log('[ChatStream] Clearing intermediate state');
                  setIntermediate('');
                  
                  if (data?.data?.additional_data) {
                    console.log('[ChatStream] Final has additional_data:', data.data.additional_data.length, 'items');
                    setAdditionalData?.(data.data.additional_data);
                  } else {
                    console.log('[ChatStream] ⚠️ No additional_data in final response');
                  }
                  break;

                case 'error':
                  if (data.error) {
                    console.error(`[ChatStream] ❌ Stream error: ${data.error}`);
                    handleError(data.error);
                    // Clear intermediate state on error
                    setIntermediate('');
                  }
                  break;

                default:
                  console.warn('[ChatStream] ⚠️ Unknown stream data type:', data.type);
              }
            } catch (e) {
              // console.error(`[ChatStream] Error processing stream data: ${e instanceof Error ? e.message : String(e)}`);
              // console.error(`[ChatStream] Problematic data:`, data);
            }
          }
        }
      } catch (readError) {
        // console.error('[ChatStream] Error reading stream:', readError);
        // Continue trying to read unless it's a critical error
        if (readError instanceof TypeError || readError instanceof ReferenceError) {
          handleError(`Stream reading error: ${readError.message}`);
          break;
        }
      }
    }

    // Check if we received a proper final event
    if (!res) {
      console.warn('[ChatStream] ⚠️ Stream ended without receiving type:"final" event');
      // Treat as successful completion - clear intermediate state
      setIntermediate('');
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      console.log('[ChatStream] 🔚 Processing remaining buffer:', buffer);
      try {
        const { results } = processJSONChunks(buffer + '\n');
        for (const data of results) {
          if (data.type === 'stream' && data.content) {
            wordBuffer += data.content;
          }
        }
      } catch (e) {
        console.error('[ChatStream] Error processing final buffer:', e);
      }
    }
    
    // Flush any remaining word buffer and pending words
    if (wordBuffer) {
      console.log('[ChatStream] 🔚 Flushing remaining word buffer:', wordBuffer);
      pendingWords.push(wordBuffer);
      wordBuffer = '';
    } else if (pendingWords.length === 0 && buffer.trim()) {
      // Edge case: buffer has content but wasn't processed
      console.warn('[ChatStream] ⚠️ Unprocessed buffer content detected:', buffer);
      setStream((prev) => prev + buffer);
      buffer = '';
    }
    
    // Wait for all pending words to be displayed with timeout protection
    if (pendingWords.length > 0) {
      const wordCount = pendingWords.length;
      console.log('[ChatStream] ⏳ Waiting for', wordCount, 'remaining words to display');
      
      // Calculate max wait time: (words × delay) + 1 second buffer
      const maxWaitTime = wordCount * WORD_DELAY_MS + 1000;
      
      // Create timeout promise
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          if (pendingWords.length > 0) {
            console.warn('[ChatStream] ⚠️ Word queue timeout! Remaining:', pendingWords.length);
            // Force clear remaining words by adding them all at once
            const remaining = pendingWords.join('');
            if (remaining) {
              setStream((prev) => prev + remaining);
            }
            pendingWords.length = 0; // Clear the queue
          }
          resolve();
        }, maxWaitTime);
      });
      
      // Wait for either word queue to complete or timeout
      await Promise.race([
        processWordQueue(),
        timeoutPromise
      ]);
      
      console.log('[ChatStream] ✓ Word queue processed, remaining:', pendingWords.length);
    }
  } catch (error) {
    console.error('[ChatStream] Stream processing error:', error);
    handleError(error instanceof Error ? error.message : String(error));
    
    // Clear all streaming states on error to prevent UI from being stuck
    setStream('');
    setIntermediate('');
    if (setAdditionalData) {
      setAdditionalData([]);
    }
  } finally {
    setStreamWorking(false);
    
    // Clean up reader
    if (reader) {
      try {
        await reader.cancel();
        reader.releaseLock();
      } catch (e) {
        // console.warn('[ChatStream] Error releasing reader:', e);
      }
    }
    
    // Log streaming session summary
    console.log("[ChatStream] ═══════════════════════════════════════");
    console.log("[ChatStream] Stream processing complete (WORD-BY-WORD)");
    console.log("[ChatStream] - Total chunks received:", chunkCount);
    console.log("[ChatStream] - Had content:", hasReceivedContent);
    console.log("[ChatStream] - Had intermediate:", hasReceivedIntermediate);
    console.log("[ChatStream] - Has final result:", !!res);
    console.log("[ChatStream] - Remaining words in queue:", pendingWords.length);
    console.log("[ChatStream] - Remaining in word buffer:", wordBuffer);
    console.log("[ChatStream] ═══════════════════════════════════════");
  }

  return res;
};


export const processJSONChunks = (text: string): { results: StreamData[]; remaining: string } => {
  const results: StreamData[] = [];
  let remaining = '';
  
  try {
    // Split by double newline for SSE format or single newline
    const chunks = text.split(/\n\n|\n/);
    
    // Keep the last chunk if it doesn't end with newline (incomplete)
    if (!text.endsWith('\n')) {
      remaining = chunks.pop() || '';
    }
    
    for (const chunk of chunks) {
      const trimmedChunk = chunk.trim();
      if (!trimmedChunk) continue;
      
      // Handle SSE (Server-Sent Events) format
      if (trimmedChunk.startsWith('data: ')) {
        try {
          const jsonStr = trimmedChunk.slice(6).trim();
          
          // Skip SSE end marker
          if (jsonStr === '[DONE]') continue;
          
          // Try to parse the JSON
          const data = parseJSONSafely(jsonStr);
          if (!data) continue;
          
          // Handle different response formats
          if (data.type) {
            // Direct StreamData format
            results.push(data as StreamData);
          } else {
            // Transform to StreamData format
            if (data.reasoning) {
              results.push({
                type: 'state',
                content: data.reasoning,
              });
            } else if (data.content !== undefined) {
              results.push({
                type: 'stream',
                content: data.content,
              });
            } else if (data.error) {
              results.push({
                type: 'error',
                error: data.error,
              });
            } else if (data.done || data.final) {
              results.push({
                type: 'final',
                data: data,
              });
            }
          }
        } catch (e) {
          // console.warn('[ChatStream] Error parsing SSE data:', e, 'Raw:', trimmedChunk);
        }
      } else {
        // Try to parse as raw JSON (fallback for non-SSE format)
        const parsed = parseJSONSafely(trimmedChunk);
        if (parsed && parsed.type) {
          results.push(parsed as StreamData);
        } else if (!parsed) {
          // Not JSON, might be part of incomplete chunk
          if (remaining) {
            remaining = remaining + '\n' + trimmedChunk;
          } else {
            remaining = trimmedChunk;
          }
        }
      }
    }
  } catch (e) {
    // console.error('[ChatStream] Error processing chunks:', e);
  }
  
  return { results, remaining };
};

// Helper function to safely parse individual JSON objects
const parseJSONSafely = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
};

/**
 * Filters out special control tokens from LLM responses
 * These tokens are used internally by the model but should not be displayed to users
 */
export const filterSpecialTokens = (text: string): string => {
  if (!text) return text;
  
  // List of special tokens to filter out
  const specialTokens = [
    '<|python_tag|>',
    '<|end|>',
    '<|im_start|>',
    '<|im_end|>',
    '<|eot_id|>',
    '<|start_header_id|>',
    '<|end_header_id|>',
    '<|begin_of_text|>',
    '<|end_of_text|>',
    '<|pad|>',
    '<|reserved_special_token_',  // Catches numbered special tokens
  ];
  
  let filteredText = text;
  
  // Remove each special token
  for (const token of specialTokens) {
    // Use a more robust regex pattern
    const regex = new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    filteredText = filteredText.replace(regex, '');
  }
  
  // Also handle any remaining tokens that match the pattern <|...|>
  filteredText = filteredText.replace(/<\|[^|]*\|>/g, '');
  
  return filteredText;
};

const getHumanSize = (
  number: number,
  currencyCode?: string,
  maximumFractionDigits?: number,
) => {
  const currencyStyle = currencyCode
    ? {
      style: 'currency',
      currency: currencyCode,
    }
    : {};

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    currency: currencyStyle.currency,
    notation: 'compact',
    maximumFractionDigits: 3,
  });
  return currencyFormatter.format(number);
};