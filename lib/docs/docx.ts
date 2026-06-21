/**
 * DOCX text extraction.
 *
 * Imports mammoth's prebuilt browser bundle directly (`mammoth/mammoth.browser.js`)
 * rather than the package's default Node entry point — the default entry's
 * unzip step requires Node's `fs` module, which doesn't exist in React
 * Native. The browser bundle reads from an ArrayBuffer instead, which works
 * with Metro/Hermes.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const mammoth = require('mammoth/mammoth.browser.js');
import * as FileSystem from 'expo-file-system';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = global.atob ? global.atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function extractDocxText(uri: string): Promise<string | null> {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const arrayBuffer = base64ToArrayBuffer(base64);
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = (result?.value || '').trim();
    return text.length > 0 ? text : null;
  } catch (error) {
    console.error('[Docs] DOCX extraction failed:', error);
    return null;
  }
}
