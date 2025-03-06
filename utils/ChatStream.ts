import { ApiResponse } from "apisauce";

interface StreamData {
  type: 'stream' | 'final' | 'error' | 'state';
  content?: string;
  data?: {
    response: string;
    history: [string, string][];
  };
  error?: string;
}

type SetStreamFunction = (value: string | ((prev: string) => string)) => void;

export const processStream = async (
  response: ReadableStream<Uint8Array> | null,
  setStream: SetStreamFunction,
  handleError: (error: string) => void,
  setIntermediate: (value: string) => void,
  setStreamWorking: (v: boolean) => void
): Promise<StreamData | null> => {
  setStreamWorking(true)
  let res: StreamData | null = null;
  let buffer = '';

  if (!response) {
    console.log("Error ----");
    throw "error"
  }

  const decoder = new TextDecoder();

  const reader = response.getReader();

  if (!reader) return null;



  while (true) {
    const { value, done } = await reader.read();

    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;

    const { results, remaining } = processJSONChunks(buffer);
    buffer = remaining;

    for (const line of results) {
      if (line) {

        try {
          const data: StreamData = line;
          switch (data.type) {
            case 'stream':
              if (data.content) {
                console.log(`Raw line: ${data.content}`);
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
              // setStream('');
              break;
            case 'error':
              if (data.error) {
                console.log(`\nError occurred: ${data.error}`);
                handleError(data.error);
              }
              break;
          }
        } catch (e) {
          console.log(`\nError parsing JSON: ${e instanceof Error ? e.message : String(e)}`);
          console.log(`Raw line: ${line}`);
        }
      }
    }
  }
  setStreamWorking(false)
  return res;
};


export const processJSONChunks = (text: string) => {
  const results = [];
  let startIndex = 0;
  try {
    while (startIndex < text.length) {
      const objStart = text.indexOf('{', startIndex);
      if (objStart === -1) {
        break;
      }

      // Find the matching closing brace
      let bracketCount = 1;
      let objEnd = objStart + 1;

      while (bracketCount > 0 && objEnd < text.length) {
        if (text[objEnd] === '{') {
          bracketCount++;
        }
        if (text[objEnd] === '}') {
          bracketCount--;
        }
        objEnd++;
      }

      if (bracketCount === 0) {
        const jsonStr = text.slice(objStart, objEnd);
        const parsed = parseJSONSafely(jsonStr);
        if (parsed) {
          results.push(parsed);
        }
        startIndex = objEnd;
      } else {
        break; // Incomplete JSON object
      }
    }

    // Return any remaining text that might be incomplete
    const remaining = text.slice(startIndex);
    return { results, remaining };
  } catch (error) {
    throw error;
  }
};

// Helper function to safely parse individual JSON objects
const parseJSONSafely = (str: string) => {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
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