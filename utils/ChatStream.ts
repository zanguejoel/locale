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

export const processStream = async (
  response: ReadableStream<Uint8Array> | null,
  setStream: SetStreamFunction,
  handleError: (error: string) => void,
  setIntermediate: (value: string) => void,
  setStreamWorking: (v: boolean) => void,
  setAdditionalData?: (a: any[]) => void
): Promise<StreamData | null> => {
  setStreamWorking(true);
  let res: StreamData | null = null;
  let buffer = '';
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

  if (!response) {
    console.error("[ChatStream] Error: No response stream");
    handleError("No response stream available");
    setStreamWorking(false);
    return null;
  }

  const decoder = new TextDecoder();

  try {
    reader = response.getReader();

    if (!reader) {
      console.error("[ChatStream] Error: Unable to get stream reader");
      handleError("Unable to get stream reader");
      setStreamWorking(false);
      return null;
    }

    while (true) {
      try {
        const { value, done } = await reader.read();
        
        if (done) {
          console.log("[ChatStream] Stream completed");
          break;
        }

        if (value) {
          // Decode the chunk
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process accumulated buffer
          const { results, remaining } = processJSONChunks(buffer);
          buffer = remaining;

          // Handle each parsed result
          for (const data of results) {
            try {
              switch (data.type) {
                case 'stream':
                  if (data.content !== undefined) {
                    setStream((prev) => prev + data.content);
                  }
                  break;

                case 'state':
                  if (data.content) {
                    setIntermediate(data.content);
                  }
                  break;

                case 'final':
                  res = data;
                  if (data?.data?.additional_data) {
                    setAdditionalData?.(data.data.additional_data);
                  }
                  break;

                case 'error':
                  if (data.error) {
                    console.error(`[ChatStream] Stream error: ${data.error}`);
                    handleError(data.error);
                  }
                  break;

                default:
                  console.warn('[ChatStream] Unknown stream data type:', data);
              }
            } catch (e) {
              console.error(`[ChatStream] Error processing stream data: ${e instanceof Error ? e.message : String(e)}`);
              console.error(`[ChatStream] Problematic data:`, data);
            }
          }
        }
      } catch (readError) {
        console.error('[ChatStream] Error reading stream:', readError);
        // Continue trying to read unless it's a critical error
        if (readError instanceof TypeError || readError instanceof ReferenceError) {
          handleError(`Stream reading error: ${readError.message}`);
          break;
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      console.warn('[ChatStream] Unprocessed buffer:', buffer);
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
  } catch (error) {
    console.error('[ChatStream] Stream processing error:', error);
    handleError(error instanceof Error ? error.message : String(error));
  } finally {
    setStreamWorking(false);
    
    // Clean up reader
    if (reader) {
      try {
        await reader.cancel();
        reader.releaseLock();
      } catch (e) {
        console.warn('[ChatStream] Error releasing reader:', e);
      }
    }
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
          console.warn('[ChatStream] Error parsing SSE data:', e, 'Raw:', trimmedChunk);
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
    console.error('[ChatStream] Error processing chunks:', e);
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