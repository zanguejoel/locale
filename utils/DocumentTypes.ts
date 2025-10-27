/**
 * Document Types
 * 
 * TypeScript types and interfaces for document handling in the mobile app.
 * 
 * Documents are files, images, videos, or voice recordings that are
 * uploaded, generated, or referenced in chat messages. They are represented
 * using <document> tags in the backend response.
 */

/**
 * Document type enumeration
 */
export type DocumentType = 'image' | 'file' | 'video' | 'voice';

/**
 * Interface for document block data structure
 */
export interface DocumentBlock {
  id: string;
  type: DocumentType;
  name: string;
  created?: string;
  content: string; // URL, description, or data URI
  timestamp: number;
  messageId: string;
  isStreaming: boolean;
}

/**
 * Metadata extracted from document tag attributes
 */
export interface DocumentMetadata {
  type: string;
  name: string;
  created?: string;
  content: string;
  isComplete: boolean;
}

