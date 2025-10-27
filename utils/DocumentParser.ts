/**
 * Document Parser Utility
 * 
 * Parses <document> tags from streaming content and extracts
 * document metadata and content.
 * 
 * Tag format: <document type='image|file|video|voice' name='filename' created='timestamp'>content</document>
 * 
 * Example:
 * <document type='image' name='flower.jpg' created='2025-10-27 21:15:23'>
 * https://s3.amazonaws.com/bucket/flower.jpg
 * </document>
 */

import { DocumentBlock, DocumentType, DocumentMetadata } from './DocumentTypes';

/**
 * Extract document from streaming content
 * Looks for <document> tags and extracts type, name, created, and content
 * 
 * Works for both:
 * - Streaming (incomplete): May not have closing tag yet
 * - Complete: Full document tag with opening and closing tags
 * 
 * @param stream - The content to parse (streaming or complete)
 * @param messageId - The message ID to associate with the document
 * @returns Document block or null if no document found
 * 
 * @example
 * const doc = extractDocumentFromStream(stream, 'msg-123');
 * if (doc && !doc.isStreaming) {
 *   // Document is complete, can display
 * }
 */
export const extractDocumentFromStream = (
  stream: string,
  messageId: string = 'streaming'
): DocumentBlock | null => {
  if (!stream) return null;

  // Match complete or partial document tags
  // Pattern: <document attr1='val1' attr2='val2'>content</document>
  const documentMatch = stream.match(
    /<document\s+([^>]+)>([\s\S]*?)(<\/document>|$)/
  );

  if (!documentMatch) return null;

  const attributeString = documentMatch[1];
  const content = documentMatch[2].trim();
  const isComplete = documentMatch[3] === '</document>'; // Has closing tag

  // Extract attributes using regex
  const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
  const nameMatch = attributeString.match(/name=["']([^"']+)["']/);
  const createdMatch = attributeString.match(/created=["']([^"']+)["']/);

  if (!typeMatch || !nameMatch) {
    console.log('[DocumentParser] Missing required attributes (type or name)');
    return null; // Need at least type and name
  }

  const documentType = typeMatch[1] as DocumentType;

  // Validate document type
  const validTypes: DocumentType[] = ['image', 'file', 'video', 'voice'];
  if (!validTypes.includes(documentType)) {
    console.log('[DocumentParser] Invalid document type:', documentType);
    return null;
  }

  const document: DocumentBlock = {
    id: isComplete ? `document-${Date.now()}` : 'streaming-document',
    type: documentType,
    name: nameMatch[1],
    created: createdMatch?.[1],
    content: content,
    timestamp: Date.now(),
    messageId,
    isStreaming: !isComplete,
  };

  console.log('[DocumentParser] Extracted document:', {
    type: document.type,
    name: document.name,
    isStreaming: document.isStreaming,
  });

  return document;
};

/**
 * Extract metadata from partial document (for indicators during streaming)
 * 
 * @param content - The content to parse
 * @returns Document metadata or null if no document found
 */
export const extractDocumentMetadata = (content: string): DocumentMetadata | null => {
  if (!content) return null;

  // Look for complete document tag
  const completeMatch = content.match(
    /<document\s+([^>]+)>([\s\S]*?)<\/document>/
  );
  
  if (completeMatch) {
    const attributeString = completeMatch[1];
    const documentContent = completeMatch[2].trim();

    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const nameMatch = attributeString.match(/name=["']([^"']+)["']/);
    const createdMatch = attributeString.match(/created=["']([^"']+)["']/);

    if (typeMatch && nameMatch) {
      return {
        type: typeMatch[1],
        name: nameMatch[1],
        created: createdMatch?.[1],
        content: documentContent,
        isComplete: true,
      };
    }
  }

  // Look for partial document tag (still streaming)
  const partialMatch = content.match(/<document\s+([^>]+)>/);
  
  if (partialMatch) {
    const attributeString = partialMatch[1];

    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const nameMatch = attributeString.match(/name=["']([^"']+)["']/);
    const createdMatch = attributeString.match(/created=["']([^"']+)["']/);

    if (typeMatch && nameMatch) {
      return {
        type: typeMatch[1],
        name: nameMatch[1],
        created: createdMatch?.[1],
        content: '',
        isComplete: false,
      };
    }
  }

  return null;
};

/**
 * Extract all documents from a completed message
 * 
 * @param content - The complete message content
 * @param messageId - The message ID to associate with documents
 * @returns Array of all documents found in the content
 * 
 * @example
 * const documents = extractDocumentsFromMessage(message.content, message.id);
 * documents.forEach(doc => console.log('Found:', doc.name));
 */
export const extractDocumentsFromMessage = (
  content: string,
  messageId: string
): DocumentBlock[] => {
  if (!content) {
    console.log('[DocumentParser] No content provided');
    return [];
  }

  console.log('[DocumentParser] Searching for documents in content (length:', content.length, ')');

  const documents: DocumentBlock[] = [];
  const documentRegex = /<document\s+([^>]+)>([\s\S]*?)<\/document>/g;
  let match;

  while ((match = documentRegex.exec(content)) !== null) {
    const attributeString = match[1];
    const documentContent = match[2].trim();

    console.log('[DocumentParser] Found document tag with attributes:', attributeString);

    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const nameMatch = attributeString.match(/name=["']([^"']+)["']/);
    const createdMatch = attributeString.match(/created=["']([^"']+)["']/);

    console.log('[DocumentParser] Parsed - type:', typeMatch?.[1], 'name:', nameMatch?.[1]);

    if (typeMatch && nameMatch) {
      const documentType = typeMatch[1] as DocumentType;
      
      // Validate document type
      const validTypes: DocumentType[] = ['image', 'file', 'video', 'voice'];
      if (!validTypes.includes(documentType)) {
        console.log('[DocumentParser] ⚠️ Skipping document - invalid type:', documentType);
        continue;
      }

      const document: DocumentBlock = {
        id: `${messageId}-document-${documents.length}`,
        type: documentType,
        name: nameMatch[1],
        created: createdMatch?.[1],
        content: documentContent,
        timestamp: Date.now(),
        messageId,
        isStreaming: false,
      };
      documents.push(document);
      console.log('[DocumentParser] ✅ Created document:', document.id, document.name);
    } else {
      console.log('[DocumentParser] ⚠️ Skipping document - missing type or name');
    }
  }

  console.log('[DocumentParser] Total documents extracted:', documents.length);
  return documents;
};

/**
 * Extract all documents from a completed message (alias for consistency)
 */
export const extractAllDocuments = extractDocumentsFromMessage;

/**
 * Remove document tags from content for display
 * Used to show the text content without document markup
 * 
 * @param content - The content to clean
 * @returns Content with document tags removed
 * 
 * @example
 * const cleanText = stripDocumentTags(content);
 * // All <document>...</document> tags are removed
 */
export const stripDocumentTags = (content: string): string => {
  if (!content) return '';
  
  // Remove all document tags and their content
  const stripped = content.replace(/<document\s+[^>]+>[\s\S]*?<\/document>/g, '').trim();
  
  if (stripped !== content) {
    console.log('[DocumentParser] Stripped documents from content');
    console.log('[DocumentParser] Original length:', content.length, '→ Stripped length:', stripped.length);
  }
  
  return stripped;
};

/**
 * Check if content has document tags
 * 
 * Quick utility to determine if content contains any document blocks
 * without parsing the entire content.
 * 
 * @param content - The content to check
 * @returns True if document tags are present
 * 
 * @example
 * if (hasDocumentTags(message.content)) {
 *   const documents = extractAllDocuments(message.content, message.id);
 * }
 */
export const hasDocumentTags = (content: string): boolean => {
  return /<document\s+/.test(content);
};

/**
 * Get icon emoji for document type
 * 
 * @param type - The document type
 * @returns Emoji representing the document type
 */
export const getDocumentIcon = (type: DocumentType): string => {
  switch (type) {
    case 'image':
      return '🖼️';
    case 'file':
      return '📄';
    case 'video':
      return '🎥';
    case 'voice':
      return '🎤';
    default:
      return '📎';
  }
};

/**
 * Get human-readable label for document type
 * 
 * @param type - The document type
 * @returns Human-readable label
 */
export const getDocumentTypeLabel = (type: DocumentType): string => {
  switch (type) {
    case 'image':
      return 'Image';
    case 'file':
      return 'File';
    case 'video':
      return 'Video';
    case 'voice':
      return 'Voice Recording';
    default:
      return 'Document';
  }
};

