/**
 * File Type Detection and Icon Mapping Utilities
 */

import { Ionicons } from '@expo/vector-icons';

export interface FileTypeInfo {
  type: 'image' | 'video' | 'audio' | 'document' | 'pdf' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'file';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  category: string;
}

/**
 * Get file type information including icon and color
 */
export function getFileTypeInfo(fileName: string, mimeType?: string): FileTypeInfo {
  const extension = fileName?.split('.').pop()?.toLowerCase() || '';
  const mime = mimeType?.toLowerCase() || '';

  // Images
  if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif', 'ico'].includes(extension)) {
    return {
      type: 'image',
      icon: 'image',
      color: '#10b981', // green-500
      category: 'Image',
    };
  }

  // Videos
  if (mime.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv', 'm4v', '3gp'].includes(extension)) {
    return {
      type: 'video',
      icon: 'videocam',
      color: '#3b82f6', // blue-500
      category: 'Video',
    };
  }

  // Audio
  if (mime.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'wma', 'opus'].includes(extension)) {
    return {
      type: 'audio',
      icon: 'musical-notes',
      color: '#a855f7', // purple-500
      category: 'Audio',
    };
  }

  // PDF
  if (extension === 'pdf' || mime === 'application/pdf') {
    return {
      type: 'pdf',
      icon: 'document-text',
      color: '#dc2626', // red-600
      category: 'PDF',
    };
  }

  // Documents
  if (['doc', 'docx', 'odt', 'rtf', 'txt', 'md'].includes(extension)) {
    return {
      type: 'document',
      icon: 'document-text',
      color: '#2563eb', // blue-600
      category: 'Document',
    };
  }

  // Spreadsheets
  if (['xls', 'xlsx', 'csv', 'ods'].includes(extension)) {
    return {
      type: 'spreadsheet',
      icon: 'grid',
      color: '#059669', // green-600
      category: 'Spreadsheet',
    };
  }

  // Presentations
  if (['ppt', 'pptx', 'odp', 'key'].includes(extension)) {
    return {
      type: 'presentation',
      icon: 'easel',
      color: '#ea580c', // orange-600
      category: 'Presentation',
    };
  }

  // Archives
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(extension)) {
    return {
      type: 'archive',
      icon: 'archive',
      color: '#6b7280', // gray-500
      category: 'Archive',
    };
  }

  // Code files
  if (['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'swift', 'go', 'rs', 'php', 'rb', 'css', 'html', 'json', 'xml', 'yaml', 'yml'].includes(extension)) {
    return {
      type: 'code',
      icon: 'code-slash',
      color: '#8b5cf6', // violet-500
      category: 'Code',
    };
  }

  // Default
  return {
    type: 'file',
    icon: 'document',
    color: '#9ca3af', // gray-400
    category: 'File',
  };
}

/**
 * Check if a file or URI is an image
 */
export function isImage(fileOrUri: string): boolean {
  if (!fileOrUri) return false;
  
  const extension = fileOrUri.split('.').pop()?.toLowerCase() || '';
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'heic', 'heif'];
  
  return imageExtensions.includes(extension) || 
         fileOrUri.startsWith('data:image/') ||
         fileOrUri.includes('/image/');
}

/**
 * Check if a file or URI is audio
 */
export function isAudio(fileOrUri: string): boolean {
  if (!fileOrUri) return false;
  
  const extension = fileOrUri.split('.').pop()?.toLowerCase() || '';
  const audioExtensions = ['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'wma'];
  
  return audioExtensions.includes(extension) || 
         fileOrUri.includes('/audio/') ||
         fileOrUri.startsWith('data:audio/');
}

/**
 * Check if a file or URI is video
 */
export function isVideo(fileOrUri: string): boolean {
  if (!fileOrUri) return false;
  
  const extension = fileOrUri.split('.').pop()?.toLowerCase() || '';
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'wmv'];
  
  return videoExtensions.includes(extension) || 
         fileOrUri.includes('/video/');
}

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes: number | undefined): string {
  if (!bytes || bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const formattedSize = (bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1);
  
  return `${formattedSize} ${sizes[i]}`;
}

/**
 * Validate file size
 */
export function validateFileSize(size: number | undefined, maxSize: number): { valid: boolean; message?: string } {
  if (!size) return { valid: true };
  
  if (size > maxSize) {
    return {
      valid: false,
      message: `File size (${formatFileSize(size)}) exceeds maximum allowed size (${formatFileSize(maxSize)})`,
    };
  }
  
  return { valid: true };
}

/**
 * Validate total files size
 */
export function validateTotalSize(files: Array<{ size?: number }>, maxTotalSize: number): { valid: boolean; message?: string; totalSize: number } {
  const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
  
  if (totalSize > maxTotalSize) {
    return {
      valid: false,
      totalSize,
      message: `Total size (${formatFileSize(totalSize)}) exceeds maximum allowed (${formatFileSize(maxTotalSize)})`,
    };
  }
  
  return { valid: true, totalSize };
}

/**
 * Get file extension from filename or URI
 */
export function getFileExtension(fileNameOrUri: string): string {
  const parts = fileNameOrUri.split('.');
  if (parts.length > 1) {
    return parts.pop()?.toLowerCase() || '';
  }
  return '';
}

export default {
  getFileTypeInfo,
  isImage,
  isAudio,
  isVideo,
  formatFileSize,
  validateFileSize,
  validateTotalSize,
  getFileExtension,
};
