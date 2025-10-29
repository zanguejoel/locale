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
// STREAMING CONFIGURATION
// ============================================================
// Instant chunk streaming - content displays as it arrives
// Simple, fast, and responsive
// ============================================================

export const processStream = async (
  response: ReadableStream<Uint8Array> | null,
  setStream: SetStreamFunction,
  handleError: (error: string) => void,
  setIntermediate: (value: string) => void,
  setStreamWorking: (v: boolean) => void,
  setAdditionalData?: (a: any[]) => void,
  setReasoningText?: (value: string | ((prev: string) => string)) => void,
  setChatId?: (chatId: string) => void
): Promise<StreamData | null> => {
  console.log("[ChatStream] ═══════════════════════════════════════");
  console.log("[ChatStream] processStream called - CHUNK MODE (instant)");
  console.log("[ChatStream] - Response exists:", !!response);
  console.log("[ChatStream] - Has additionalData callback:", !!setAdditionalData);
  console.log("[ChatStream] - Has reasoning callback:", !!setReasoningText);
  console.log("[ChatStream] - Has chatId callback:", !!setChatId);
  console.log("[ChatStream] - Streaming mode: Instant chunk display");
  console.log("[ChatStream] ═══════════════════════════════════════");
  
  setStreamWorking(true);
  let res: StreamData | null = null;
  let buffer = '';
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let chunkCount = 0;
  let hasReceivedContent = false;
  let hasReceivedIntermediate = false;
  let reasoning = false; // Track if we're in reasoning mode
  let shouldStopStreaming = false; // Flag to stop streaming on error

  if (!response) {
    handleError("No response stream available");
    setStreamWorking(false);
    setIntermediate('');
    return null;
  }

  const decoder = new TextDecoder();

  try {
    // console.log("[ChatStream] Getting reader...");
    reader = response.getReader();
    // console.log("[ChatStream] Reader obtained successfully");

    if (!reader) {
      // console.error("[ChatStream] Error: Unable to get stream reader");
      handleError("Unable to get stream reader");
      setStreamWorking(false);
      setIntermediate('');
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

          // Handle each parsed result - instant chunk streaming
          for (const data of results) {
            try {
              switch (data.type) {
                case 'stream':
                  if (data.content !== undefined) {
                    if (!hasReceivedContent) {
                      console.log('[ChatStream] ✅ First content received - clearing intermediate state');
                      hasReceivedContent = true;
                      // Clear intermediate state when actual content starts arriving
                      setIntermediate('');
                    }
                    console.log(`[ChatStream] 💬 Received content chunk: "${data.content}" (${data.content.length} chars)`);
                    
                    // Handle reasoning tags if callback is provided
                    if (setReasoningText && data.content) {
                      // Check if content contains reasoning tags
                      if (data.content.includes('<jmeReasoning>') && !reasoning) {
                        const parts = data.content.split('<jmeReasoning>');
                        const beforeReasoning = parts[0];
                        const afterOpening = parts.slice(1).join('<jmeReasoning>');
                        
                        // Add content before tag to regular stream
                        if (beforeReasoning.trim()) {
                          setStream((prev) => prev + beforeReasoning);
                        }
                        
                        reasoning = true;
                        console.log('[ChatStream] 🧠 Entering reasoning mode');
                        console.log('[ChatStream] 🧠 Content before reasoning:', beforeReasoning);
                        
                        // Process the content after opening tag (might include closing tag too)
                        if (afterOpening) {
                          if (afterOpening.includes('</jmeReasoning>')) {
                            const closingParts = afterOpening.split('</jmeReasoning>');
                            const reasoningContent = closingParts[0];
                            const afterClosing = closingParts.slice(1).join('</jmeReasoning>');
                            
                            setReasoningText((prev) => {
                              const newReasoning = prev + reasoningContent;
                              console.log('[ChatStream] 🧠 Reasoning complete:', newReasoning);
                              return newReasoning;
                            });
                            reasoning = false;
                            console.log('[ChatStream] 🧠 Exiting reasoning mode (complete block)');
                            
                            if (afterClosing.trim()) {
                              setStream((prev) => prev + afterClosing);
                            }
                          } else {
                            setReasoningText((prev) => {
                              const newReasoning = prev + afterOpening;
                              console.log('[ChatStream] 🧠 Reasoning chunk (opening):', afterOpening);
                              return newReasoning;
                            });
                          }
                        }
                      }
                      // Handle closing tag when already in reasoning mode
                      else if (data.content.includes('</jmeReasoning>') && reasoning) {
                        const parts = data.content.split('</jmeReasoning>');
                        const reasoningPart = parts[0];
                        const regularPart = parts.slice(1).join('</jmeReasoning>');
                        
                        setReasoningText((prev) => {
                          const finalReasoning = prev + reasoningPart;
                          console.log('[ChatStream] 🧠 Reasoning complete (closing tag):', finalReasoning);
                          return finalReasoning;
                        });
                        reasoning = false;
                        console.log('[ChatStream] 🧠 Exiting reasoning mode (closing tag)');
                        
                        if (regularPart.trim()) {
                          setStream((prev) => prev + regularPart);
                        }
                      }
                      // Content in reasoning mode (no closing tag yet)
                      else if (reasoning) {
                        setReasoningText((prev) => {
                          const newReasoning = prev + data.content;
                          console.log('[ChatStream] 🧠 Reasoning chunk:', data.content, '| Total length:', newReasoning.length);
                          return newReasoning;
                        });
                      }
                      // Regular content (not in reasoning mode)
                      else {
                        setStream((prev) => prev + data.content);
                      }
                    } else {
                      // No reasoning callback, display content normally
                      setStream((prev) => prev + data.content);
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
                  // Handle metadata during streaming (e.g., generated images, chat_id)
                  if (data?.data?.additional_data) {
                    console.log('[ChatStream] 📦 Received meta with additional_data:', data.data.additional_data.length, 'items');
                    setAdditionalData?.(data.data.additional_data);
                  }
                  if (data?.data?.chat_id) {
                    console.log('[ChatStream] 🆔 Received chat_id from meta:', data.data.chat_id);
                    setChatId?.(data.data.chat_id);
                  }
                  break;

                case 'final':
                  res = data;
                  console.log('[ChatStream] ✅ Received final response');
                  console.log('[ChatStream] - Has content:', !!data.content);
                  console.log('[ChatStream] - Has additional_data:', !!data?.data?.additional_data);
                  
                  // Clear intermediate state and reasoning state when final response is received
                  console.log('[ChatStream] Clearing intermediate and reasoning state');
                  setIntermediate('');
                  reasoning = false;
                  
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
                    
                    // Display error as bot message content for inline display
                    // Format it nicely with proper markdown styling and helpful context
                    const errorMessage = `⚠️ **Unable to Complete Request**\n\n${data.error}\n\n*You can try again in a moment or adjust your request.*`;
                    setStream(errorMessage);
                    
                    // Also set chat error for banner display
                    // This helps users see persistent errors (like quota limits) even if they scroll
                    handleError(data.error);
                    
                    // Clear intermediate and stop streaming
                    setIntermediate('');
                    setStreamWorking(false);
                    
                    // Return error as final result to stop processing
                    res = data;
                    
                    // Signal to stop the streaming loop
                    shouldStopStreaming = true;
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
          
          // Check if we should stop streaming (e.g., due to error)
          if (shouldStopStreaming) {
            console.log('[ChatStream] Stopping stream due to error');
            break;
          }
        }
      } catch (readError: any) {
        // Handle AbortError silently - this is expected when user stops streaming
        if (readError?.name === 'AbortError') {
          console.log('[ChatStream] 🛑 Stream aborted by user');
          break;
        }
        
        console.error('[ChatStream] Error reading stream:', readError);
        // Critical errors should stop streaming immediately
        if (readError instanceof TypeError || readError instanceof ReferenceError) {
          handleError(`Stream reading error: ${readError.message}`);
          // Clear streaming states on critical read error
          setStreamWorking(false);
          setIntermediate('');
          break;
        }
        // For non-critical errors, continue trying to read
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
            setStream((prev) => prev + data.content);
          }
        }
      } catch (e) {
        console.error('[ChatStream] Error processing final buffer:', e);
      }
    }
  } catch (error: any) {
    // Handle AbortError silently - this is expected when user stops streaming
    if (error?.name === 'AbortError') {
      console.log('[ChatStream] 🛑 Stream aborted by user (outer catch)');
      // Don't clear stream content - preserve partial response
      // Don't call handleError - this is not an error condition
    } else {
      console.error('[ChatStream] Stream processing error:', error);
      handleError(error instanceof Error ? error.message : String(error));
      
      // CRITICAL: Clear all streaming states immediately on error to prevent UI from being stuck
      setStreamWorking(false);
      setStream('');
      setIntermediate('');
      if (setAdditionalData) {
        setAdditionalData([]);
      }
      if (setReasoningText) {
        setReasoningText('');
      }
    }
  } finally {
    setStreamWorking(false);
    
    // Defer intermediate state clearing to give React time to render any pending updates
    // This prevents the clear from racing with the UI update
    console.log('[ChatStream] Finally block - scheduling deferred intermediate state clear');
    setTimeout(() => {
      setIntermediate('');
      console.log('[ChatStream] Deferred intermediate state cleared');
    }, 150); // 150ms delay allows UI to render intermediate states
    
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
    console.log("[ChatStream] Stream processing complete (instant chunks)");
    console.log("[ChatStream] - Total chunks received:", chunkCount);
    console.log("[ChatStream] - Had content:", hasReceivedContent);
    console.log("[ChatStream] - Had intermediate:", hasReceivedIntermediate);
    console.log("[ChatStream] - Has final result:", !!res);
    console.log("[ChatStream] - Intermediate state cleared:", true);
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