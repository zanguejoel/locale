/**
 * useOcrGlobal - lazy, single-instance on-device OCR for image documents.
 *
 * Mounted only inside the Documents tab (not the whole Legal Navigator
 * workspace) since it's a separate, fairly large model download that most
 * case sessions won't need every time. Mount in exactly one place at a time.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useOCR, OCR_ENGLISH } from 'react-native-executorch';

export function useOcrGlobal() {
  const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

  const ocr = useOCR({
    model: OCR_ENGLISH,
    preventLoad: !isSupported,
  });

  return ocr;
}

/** Join OCR detections (each with a recognized text fragment) into one block. */
export function ocrDetectionsToText(detections: { text?: string }[]): string {
  return detections
    .map((d) => d.text || '')
    .filter((t) => t.trim().length > 0)
    .join('\n')
    .trim();
}
