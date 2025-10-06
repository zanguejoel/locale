/**
 * File Type Detection Utilities
 * Centralized logic for detecting file types based on extensions
 */

export type FileType = 'audio' | 'image' | 'video' | 'document' | 'unknown';

const FILE_EXTENSIONS = {
  audio: ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.amr'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv'],
  document: ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.ppt', '.pptx'],
} as const;

/**
 * Check if a URI/file path is an audio file
 * @param uri - The file URI or path to check
 * @returns true if the file is an audio file
 */
export const isAudio = (uri?: string | null): boolean => {
  if (!uri) return false;
  const lowerUri = uri.toLowerCase();
  return FILE_EXTENSIONS.audio.some(ext => lowerUri.endsWith(ext));
};

/**
 * Check if a URI/file path is an image file
 * @param uri - The file URI or path to check
 * @returns true if the file is an image file
 */
export const isImage = (uri?: string | null): boolean => {
  if (!uri) return false;
  const lowerUri = uri.toLowerCase();
  return FILE_EXTENSIONS.image.some(ext => lowerUri.endsWith(ext));
};

/**
 * Check if a URI/file path is a video file
 * @param uri - The file URI or path to check
 * @returns true if the file is a video file
 */
export const isVideo = (uri?: string | null): boolean => {
  if (!uri) return false;
  const lowerUri = uri.toLowerCase();
  return FILE_EXTENSIONS.video.some(ext => lowerUri.endsWith(ext));
};

/**
 * Check if a URI/file path is a document file
 * @param uri - The file URI or path to check
 * @returns true if the file is a document file
 */
export const isDocument = (uri?: string | null): boolean => {
  if (!uri) return false;
  const lowerUri = uri.toLowerCase();
  return FILE_EXTENSIONS.document.some(ext => lowerUri.endsWith(ext));
};

/**
 * Get the file type from a URI/file path
 * @param uri - The file URI or path to check
 * @returns The file type (audio, image, video, document, or unknown)
 */
export const getFileType = (uri?: string | null): FileType => {
  if (!uri) return 'unknown';
  
  if (isAudio(uri)) return 'audio';
  if (isImage(uri)) return 'image';
  if (isVideo(uri)) return 'video';
  if (isDocument(uri)) return 'document';
  
  return 'unknown';
};

/**
 * Get a human-readable file type label
 * @param uri - The file URI or path to check
 * @returns A human-readable label for the file type
 */
export const getFileTypeLabel = (uri?: string | null): string => {
  const type = getFileType(uri);
  return type.charAt(0).toUpperCase() + type.slice(1);
};

/**
 * Get the file extension from a URI/file path
 * @param uri - The file URI or path
 * @returns The file extension (with dot) or empty string
 */
export const getFileExtension = (uri?: string | null): string => {
  if (!uri) return '';
  const match = uri.match(/\.[^.]*$/);
  return match ? match[0].toLowerCase() : '';
};

