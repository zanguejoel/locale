/**
 * Content Parser Utility
 * 
 * Unified parser that handles ALL special tags in chat messages.
 * Preserves the original order of tags in the content.
 * 
 * Supported tags:
 * - <jmeArtifact> - Code, documents, visualizations
 * - <document> - Files, images, videos, voice recordings
 * - <jmeReasoning> - Model reasoning
 * - <|thinking|> - Internal thoughts
 * 
 * This parser ensures that mixed content with multiple tag types
 * is correctly parsed and rendered in the original order.
 */

import { ContentSegment } from './ArtifactParser';
import { Artifact, ArtifactType } from './ArtifactTypes';
import { DocumentBlock, DocumentType } from './DocumentTypes';

/**
 * Tag match interface for unified parsing
 */
interface TagMatch {
  type: 'artifact' | 'document';
  startIndex: number;
  endIndex: number;
  fullMatch: string;
  data: Artifact | DocumentBlock;
}

/**
 * Parse content into segments (text, artifacts, and documents in order)
 * This preserves the original position of all tags in the content
 * 
 * Handles both complete and streaming (incomplete) artifacts to ensure
 * smooth display without raw tag flash during streaming
 * 
 * @param content - The message content to parse
 * @param messageId - The message ID to associate with extracted items
 * @param isStreaming - Whether this content is actively streaming (optional)
 * @returns Array of content segments in original order
 * 
 * @example
 * const segments = parseContentSegments(
 *   "Here is an image: <document type='image' name='photo.jpg'>...</document> And code: <jmeArtifact type='code'>...</jmeArtifact>",
 *   'msg-123'
 * );
 * // Returns segments in order: [text, document, text, artifact]
 */
export const parseContentSegments = (
  content: string,
  messageId: string,
  isStreaming: boolean = false
): ContentSegment[] => {
  if (!content) {
    console.log('[ContentParser] No content to parse');
    return [];
  }

  console.log('[ContentParser] Parsing content (length:', content.length, ', streaming:', isStreaming, ')');

  const segments: ContentSegment[] = [];
  const tagMatches: TagMatch[] = [];

  // Find all complete artifact tags
  const artifactRegex = /<jmeArtifact\s+([^>]+)>([\s\S]*?)<\/jmeArtifact>/g;
  let artifactMatch;
  let artifactIndex = 0;

  while ((artifactMatch = artifactRegex.exec(content)) !== null) {
    const fullMatch = artifactMatch[0];
    const attributeString = artifactMatch[1];
    const artifactContent = artifactMatch[2];
    const startIndex = artifactMatch.index;
    const endIndex = startIndex + fullMatch.length;

    // Parse artifact attributes
    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
    const languageMatch = attributeString.match(/language=["']([^"']+)["']/);
    const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

    if (typeMatch && titleMatch) {
      // Use identifier if provided, otherwise generate one
      const artifactId = identifierMatch 
        ? `${messageId}-${identifierMatch[1]}`
        : `${messageId}-artifact-${artifactIndex}`;

      const artifact: Artifact = {
        id: artifactId,
        type: typeMatch[1] as ArtifactType,
        title: titleMatch[1],
        content: artifactContent,
        language: languageMatch?.[1],
        timestamp: Date.now(),
        messageId,
        isStreaming: false,
      };

      tagMatches.push({
        type: 'artifact',
        startIndex,
        endIndex,
        fullMatch,
        data: artifact,
      });

      console.log('[ContentParser] Found complete artifact at index', startIndex, ':', artifact.title);
      artifactIndex++;
    }
  }
  
  // If streaming, also look for incomplete artifacts at the end
  if (isStreaming) {
    // Check if there's an unclosed artifact tag
    const lastCompleteArtifactEnd = tagMatches.length > 0 
      ? tagMatches[tagMatches.length - 1].endIndex 
      : 0;
    
    const remainingContent = content.substring(lastCompleteArtifactEnd);
    const streamingArtifactMatch = remainingContent.match(/<jmeArtifact\s+([^>]+)>([\s\S]*)$/);
    
    if (streamingArtifactMatch) {
      const attributeString = streamingArtifactMatch[1];
      const artifactContent = streamingArtifactMatch[2];
      const matchIndex = streamingArtifactMatch.index || 0;
      const startIndex = lastCompleteArtifactEnd + matchIndex;
      const endIndex = content.length;
      
      const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
      const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
      const languageMatch = attributeString.match(/language=["']([^"']+)["']/);
      const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);
      
      if (typeMatch && titleMatch) {
        // Use identifier if provided, otherwise generate one
        const artifactId = identifierMatch 
          ? `${messageId}-${identifierMatch[1]}-streaming`
          : `${messageId}-artifact-${artifactIndex}-streaming`;

        const streamingArtifact: Artifact = {
          id: artifactId,
          type: typeMatch[1] as ArtifactType,
          title: titleMatch[1],
          content: artifactContent,
          language: languageMatch?.[1],
          timestamp: Date.now(),
          messageId,
          isStreaming: true,
        };
        
        tagMatches.push({
          type: 'artifact',
          startIndex,
          endIndex,
          fullMatch: streamingArtifactMatch[0],
          data: streamingArtifact,
        });
        
        console.log('[ContentParser] ⚡ Found streaming artifact at index', startIndex, ':', streamingArtifact.title);
        artifactIndex++;
      }
    }
  }

  // Find all document tags
  const documentRegex = /<document\s+([^>]+)>([\s\S]*?)<\/document>/g;
  let documentMatch;
  let documentIndex = 0;

  while ((documentMatch = documentRegex.exec(content)) !== null) {
    const fullMatch = documentMatch[0];
    const attributeString = documentMatch[1];
    const documentContent = documentMatch[2].trim();
    const startIndex = documentMatch.index;
    const endIndex = startIndex + fullMatch.length;

    // Parse document attributes
    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const nameMatch = attributeString.match(/name=["']([^"']+)["']/);
    const createdMatch = attributeString.match(/created=["']([^"']+)["']/);

    if (typeMatch && nameMatch) {
      const documentType = typeMatch[1] as DocumentType;
      
      // Validate document type
      const validTypes: DocumentType[] = ['image', 'file', 'video', 'voice'];
      if (validTypes.includes(documentType)) {
        const document: DocumentBlock = {
          id: `${messageId}-document-${documentIndex}`,
          type: documentType,
          name: nameMatch[1],
          created: createdMatch?.[1],
          content: documentContent,
          timestamp: Date.now(),
          messageId,
          isStreaming: false,
        };

        tagMatches.push({
          type: 'document',
          startIndex,
          endIndex,
          fullMatch,
          data: document,
        });

        console.log('[ContentParser] Found document at index', startIndex, ':', document.name);
        documentIndex++;
      }
    }
  }

  // Sort tag matches by position to preserve original order
  tagMatches.sort((a, b) => a.startIndex - b.startIndex);

  // Build segments in order
  let lastIndex = 0;

  for (const match of tagMatches) {
    // Add text segment before this tag (if any)
    if (match.startIndex > lastIndex) {
      const textContent = content.substring(lastIndex, match.startIndex).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent,
        });
        console.log('[ContentParser] Added text segment (length:', textContent.length, ')');
      }
    }

    // Add tag segment
    if (match.type === 'artifact') {
      segments.push({
        type: 'artifact',
        artifact: match.data as Artifact,
        originalTag: match.fullMatch,
      });
      console.log('[ContentParser] Added artifact segment:', (match.data as Artifact).title);
    } else if (match.type === 'document') {
      segments.push({
        type: 'document',
        document: match.data as DocumentBlock,
        originalTag: match.fullMatch,
      });
      console.log('[ContentParser] Added document segment:', (match.data as DocumentBlock).name);
    }

    lastIndex = match.endIndex;
  }

  // Add remaining text after last tag
  if (lastIndex < content.length) {
    const textContent = content.substring(lastIndex).trim();
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent,
      });
      console.log('[ContentParser] Added final text segment (length:', textContent.length, ')');
    }
  }

  console.log('[ContentParser] Total segments:', segments.length);
  return segments;
};

/**
 * Strip all special tags from content
 * Removes: artifacts, documents, reasoning, thinking
 * 
 * @param content - The content to clean
 * @returns Content with all special tags removed
 * 
 * @example
 * const clean = stripAllTags(content);
 * // All special tags are removed, only plain text remains
 */
export const stripAllTags = (content: string): string => {
  if (!content) return '';

  let cleaned = content;

  // Remove artifact tags
  cleaned = cleaned.replace(/<jmeArtifact\s+[^>]+>[\s\S]*?<\/jmeArtifact>/g, '');

  // Remove document tags
  cleaned = cleaned.replace(/<document\s+[^>]+>[\s\S]*?<\/document>/g, '');

  // Remove reasoning tags
  cleaned = cleaned.replace(/<jmeReasoning>[\s\S]*?<\/jmeReasoning>/g, '');

  // Remove thinking tags (both formats)
  cleaned = cleaned.replace(/<\|thinking\|>[\s\S]*?<\/\|thinking\|>/g, '');
  cleaned = cleaned.replace(/<\|thinking\|>[\s\S]*?<\|thinking\|>/g, '');

  return cleaned.trim();
};

/**
 * Strip streaming artifact tags from content during active streaming
 * This removes both complete artifacts AND partial/streaming artifacts
 * to prevent raw tag display during streaming
 * 
 * Use this for real-time content display to ensure smooth UX without tag flash
 * 
 * @param content - The streaming content to clean
 * @returns Content with artifact tags removed (both complete and partial)
 * 
 * @example
 * const clean = stripStreamingArtifactTags('Hello <jmeArtifact type="code">...');
 * // Returns: "Hello "
 */
export const stripStreamingArtifactTags = (content: string): string => {
  if (!content) return '';

  let cleaned = content;

  // Remove complete artifact tags
  cleaned = cleaned.replace(/<jmeArtifact\s+[^>]+>[\s\S]*?<\/jmeArtifact>/g, '');

  // Remove streaming (incomplete) artifact tags - opening tag to end of string
  // This handles the case where the artifact is still being streamed
  // Pattern: <jmeArtifact ...> followed by any content until end
  cleaned = cleaned.replace(/<jmeArtifact\s+[^>]+>[\s\S]*$/g, '');

  return cleaned.trim();
};

/**
 * Check if content has any artifact tags (complete or streaming)
 * 
 * @param content - The content to check
 * @returns True if artifact tags are present
 */
export const hasArtifactTags = (content: string): boolean => {
  if (!content) return false;
  return /<jmeArtifact\s+/.test(content);
};

/**
 * Check if content has any special tags
 * 
 * @param content - The content to check
 * @returns True if any special tags are present
 */
export const hasSpecialTags = (content: string): boolean => {
  if (!content) return false;

  return (
    /<jmeArtifact\s+/.test(content) ||
    /<document\s+/.test(content) ||
    /<jmeReasoning>/.test(content) ||
    /<\|thinking\|>/.test(content)
  );
};

/**
 * Get tag counts from content
 * 
 * @param content - The content to analyze
 * @returns Object with counts of each tag type
 */
export const getTagCounts = (content: string): {
  artifacts: number;
  documents: number;
  reasoning: number;
  thinking: number;
} => {
  if (!content) {
    return { artifacts: 0, documents: 0, reasoning: 0, thinking: 0 };
  }

  const artifactMatches = content.match(/<jmeArtifact\s+[^>]+>[\s\S]*?<\/jmeArtifact>/g);
  const documentMatches = content.match(/<document\s+[^>]+>[\s\S]*?<\/document>/g);
  const reasoningMatches = content.match(/<jmeReasoning>[\s\S]*?<\/jmeReasoning>/g);
  const thinkingMatches = content.match(/<\|thinking\|>[\s\S]*?(<\/\|thinking\|>|<\|thinking\|>)/g);

  return {
    artifacts: artifactMatches?.length || 0,
    documents: documentMatches?.length || 0,
    reasoning: reasoningMatches?.length || 0,
    thinking: thinkingMatches?.length || 0,
  };
};

