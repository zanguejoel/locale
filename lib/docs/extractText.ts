/**
 * Dispatches text extraction by document type. Image text comes from the
 * on-device OCR model (caller passes its `forward` function in since OCR is
 * lazily mounted per-screen, not globally registered like embeddings/LLM).
 */
import { CaseDocType } from '@/lib/cases/types';
import { extractDocxText } from './docx';
import { extractPdfText } from './pdf';
import { ocrDetectionsToText } from '@/hooks/useOcrGlobal';

export interface ExtractTextInput {
  uri: string;
  type: CaseDocType;
  ocrForward?: (uri: string) => Promise<{ text?: string }[]>;
}

export async function extractDocumentText(input: ExtractTextInput): Promise<string | null> {
  switch (input.type) {
    case 'image': {
      if (!input.ocrForward) return null;
      const detections = await input.ocrForward(input.uri);
      const text = ocrDetectionsToText(detections);
      return text.length > 0 ? text : null;
    }
    case 'pdf':
      return extractPdfText(input.uri);
    case 'docx':
      return extractDocxText(input.uri);
    case 'text':
      return null; // caller already has the raw text in this case
    default:
      return null;
  }
}
