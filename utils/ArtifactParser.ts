/**
 * Artifact Parser Utility
 * 
 * Parses <jmeArtifact> tags from streaming content and extracts
 * artifact metadata and content.
 */

import { Artifact, ArtifactType, ArtifactMetadata } from './ArtifactTypes';
import { DocumentBlock } from './DocumentTypes';

/**
 * Extract artifact from streaming content
 * Looks for <jmeArtifact> tags and extracts type, title, language, and content
 */
export const extractArtifactFromStream = (stream: string): Artifact | null => {
  if (!stream) return null;

  // Match complete or partial jmeArtifact tags
  const artifactMatch = stream.match(
    /<jmeArtifact\s+([^>]+)>([\s\S]*?)(<\/jmeArtifact>|$)/
  );

  if (!artifactMatch) return null;

  const attributeString = artifactMatch[1];
  const content = artifactMatch[2];
  const isComplete = !!artifactMatch[3]; // Has closing tag

  // Extract attributes using regex
  const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
  const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
  const languageMatch = attributeString.match(/language=["']([^"']+)["']/);
  const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

  if (!typeMatch || !titleMatch) {
    return null; // Need at least type and title
  }

  // Use identifier if provided, otherwise generate based on completion state
  const artifactId = identifierMatch
    ? (isComplete ? `artifact-${identifierMatch[1]}` : `streaming-${identifierMatch[1]}`)
    : (isComplete ? `artifact-${Date.now()}` : 'streaming-artifact');

  const artifact: Artifact = {
    id: artifactId,
    type: typeMatch[1] as ArtifactType,
    title: titleMatch[1],
    content: content,
    language: languageMatch?.[1],
    timestamp: Date.now(),
    messageId: 'streaming',
    isStreaming: !isComplete,
  };

  return artifact;
};

/**
 * Extract metadata from partial artifact (for indicators during streaming)
 */
export const extractArtifactMetadata = (content: string): ArtifactMetadata | null => {
  if (!content) return null;

  // Look for complete jmeArtifact tag
  const completeMatch = content.match(
    /<jmeArtifact\s+([^>]+)>([\s\S]*?)<\/jmeArtifact>/
  );
  
  if (completeMatch) {
    const attributeString = completeMatch[1];
    const artifactContent = completeMatch[2];

    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
    const languageMatch = attributeString.match(/language=["']([^"']+)["']/);

    if (typeMatch && titleMatch) {
      return {
        type: typeMatch[1],
        title: titleMatch[1],
        language: languageMatch?.[1],
        content: artifactContent,
        isComplete: true,
      };
    }
  }

  // Look for partial jmeArtifact tag (still streaming)
  const partialMatch = content.match(/<jmeArtifact\s+([^>]+)>/);
  
  if (partialMatch) {
    const attributeString = partialMatch[1];

    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
    const languageMatch = attributeString.match(/language=["']([^"']+)["']/);

    if (typeMatch && titleMatch) {
      return {
        type: typeMatch[1],
        title: titleMatch[1],
        language: languageMatch?.[1],
        content: '',
        isComplete: false,
      };
    }
  }

  return null;
};

/**
 * Extract all artifacts from a completed message
 */
export const extractArtifactsFromMessage = (
  content: string,
  messageId: string
): Artifact[] => {
  if (!content) {
    console.log('[ArtifactParser] No content provided');
    return [];
  }

  console.log('[ArtifactParser] Searching for artifacts in content (length:', content.length, ')');
  console.log('[ArtifactParser] Content preview:', content.substring(0, 200));

  const artifacts: Artifact[] = [];
  const artifactRegex = /<jmeArtifact\s+([^>]+)>([\s\S]*?)<\/jmeArtifact>/g;
  let match;

  while ((match = artifactRegex.exec(content)) !== null) {
    const attributeString = match[1];
    const artifactContent = match[2];

    console.log('[ArtifactParser] Found artifact tag with attributes:', attributeString);

    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
    const languageMatch = attributeString.match(/language=["']([^"']+)["']/);
    const identifierMatch = attributeString.match(/identifier=["']([^"']+)["']/);

    console.log('[ArtifactParser] Parsed - type:', typeMatch?.[1], 'title:', titleMatch?.[1], 'language:', languageMatch?.[1], 'identifier:', identifierMatch?.[1]);

    if (typeMatch && titleMatch) {
      // Use identifier if provided, otherwise generate one
      const artifactId = identifierMatch 
        ? `${messageId}-${identifierMatch[1]}`
        : `${messageId}-artifact-${artifacts.length}`;

      const artifact = {
        id: artifactId,
        type: typeMatch[1] as ArtifactType,
        title: titleMatch[1],
        content: artifactContent,
        language: languageMatch?.[1],
        timestamp: Date.now(),
        messageId,
        isStreaming: false,
      };
      artifacts.push(artifact);
      console.log('[ArtifactParser] ✅ Created artifact:', artifact.id, artifact.title);
    } else {
      console.log('[ArtifactParser] ⚠️ Skipping artifact - missing type or title');
    }
  }

  console.log('[ArtifactParser] Total artifacts extracted:', artifacts.length);
  return artifacts;
};

/**
 * Content segment type - text, artifact, or document
 */
export type ContentSegment = 
  | { type: 'text'; content: string }
  | { type: 'artifact'; artifact: Artifact; originalTag: string }
  | { type: 'document'; document: DocumentBlock; originalTag: string };

/**
 * Parse content into segments (text and artifacts in order)
 * This preserves the original position of artifacts in the content
 * Supports both complete and streaming (partial) artifacts
 */
export const parseContentSegments = (
  content: string,
  messageId: string
): ContentSegment[] => {
  if (!content) {
    console.log('[ArtifactParser] No content to parse into segments');
    return [];
  }

  const segments: ContentSegment[] = [];
  
  // First, try to find complete artifacts
  const completeArtifactRegex = /<jmeArtifact\s+([^>]+)>([\s\S]*?)<\/jmeArtifact>/g;
  
  // Also check for streaming (incomplete) artifacts
  const streamingArtifactMatch = content.match(/<jmeArtifact\s+([^>]+)>([\s\S]*)$/);
  
  let lastIndex = 0;
  let artifactIndex = 0;
  let match;
  let hasStreamingArtifact = false;

  console.log('[ArtifactParser] Parsing content into segments');

  while ((match = completeArtifactRegex.exec(content)) !== null) {
    const fullMatch = match[0]; // Full <jmeArtifact>...</jmeArtifact> tag
    const attributeString = match[1];
    const artifactContent = match[2];
    const matchStart = match.index;

    // Add text segment before this artifact (if any)
    if (matchStart > lastIndex) {
      const textContent = content.substring(lastIndex, matchStart).trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent,
        });
        console.log('[ArtifactParser] Added text segment (length:', textContent.length, ')');
      }
    }

    // Parse artifact attributes
    const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
    const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
    const languageMatch = attributeString.match(/language=["']([^"']+)["']/);

    if (typeMatch && titleMatch) {
      const artifact: Artifact = {
        id: `${messageId}-artifact-${artifactIndex}`,
        type: typeMatch[1] as ArtifactType,
        title: titleMatch[1],
        content: artifactContent,
        language: languageMatch?.[1],
        timestamp: Date.now(),
        messageId,
        isStreaming: false,
      };

      segments.push({
        type: 'artifact',
        artifact,
        originalTag: fullMatch,
      });
      
      console.log('[ArtifactParser] Added artifact segment:', artifact.title);
      artifactIndex++;
    }

    lastIndex = match.index + fullMatch.length;
  }

  // Check for streaming (incomplete) artifact at the end
  if (lastIndex < content.length && streamingArtifactMatch && !hasStreamingArtifact) {
    const remainingContent = content.substring(lastIndex);
    
    // Check if remaining content is a streaming artifact
    const streamingMatch = remainingContent.match(/<jmeArtifact\s+([^>]+)>([\s\S]*)$/);
    
    if (streamingMatch) {
      // Add any text before the streaming artifact
      const textBeforeArtifact = remainingContent.substring(0, streamingMatch.index).trim();
      if (textBeforeArtifact) {
        segments.push({
          type: 'text',
          content: textBeforeArtifact,
        });
        console.log('[ArtifactParser] Added text before streaming artifact (length:', textBeforeArtifact.length, ')');
      }
      
      // Parse streaming artifact
      const attributeString = streamingMatch[1];
      const artifactContent = streamingMatch[2];
      
      const typeMatch = attributeString.match(/type=["']([^"']+)["']/);
      const titleMatch = attributeString.match(/title=["']([^"']+)["']/);
      const languageMatch = attributeString.match(/language=["']([^"']+)["']/);
      
      if (typeMatch && titleMatch) {
        const streamingArtifact: Artifact = {
          id: `${messageId}-artifact-${artifactIndex}-streaming`,
          type: typeMatch[1] as ArtifactType,
          title: titleMatch[1],
          content: artifactContent,
          language: languageMatch?.[1],
          timestamp: Date.now(),
          messageId,
          isStreaming: true, // Mark as streaming
        };
        
        segments.push({
          type: 'artifact',
          artifact: streamingArtifact,
          originalTag: streamingMatch[0],
        });
        
        console.log('[ArtifactParser] ⚡ Added STREAMING artifact segment:', streamingArtifact.title);
        hasStreamingArtifact = true;
      }
    } else {
      // Just regular text
      const textContent = remainingContent.trim();
      if (textContent) {
        segments.push({
          type: 'text',
          content: textContent,
        });
        console.log('[ArtifactParser] Added final text segment (length:', textContent.length, ')');
      }
    }
  } else if (lastIndex < content.length) {
    // Add remaining text after last artifact
    const textContent = content.substring(lastIndex).trim();
    if (textContent) {
      segments.push({
        type: 'text',
        content: textContent,
      });
      console.log('[ArtifactParser] Added final text segment (length:', textContent.length, ')');
    }
  }

  console.log('[ArtifactParser] Total segments:', segments.length);
  return segments;
};

/**
 * Remove artifact tags from content for display (legacy)
 * Used to show the text content without artifact markup
 * NOTE: This is kept for backward compatibility but parseContentSegments is preferred
 */
export const stripArtifactTags = (content: string): string => {
  if (!content) return '';
  
  // Remove all artifact tags and their content
  const stripped = content.replace(/<jmeArtifact\s+[^>]+>[\s\S]*?<\/jmeArtifact>/g, '').trim();
  
  if (stripped !== content) {
    console.log('[ArtifactParser] Stripped artifacts from content');
    console.log('[ArtifactParser] Original length:', content.length, '→ Stripped length:', stripped.length);
  }
  
  return stripped;
};

/**
 * Extract code content from markdown code blocks
 */
export const extractCodeContent = (content: string): string => {
  const match = content.match(/```(\w*)\n([\s\S]*?)```/);
  if (match) {
    return match[2];
  }
  // Remove leading/trailing backticks if present
  return content.replace(/```(\w*)\n/, '').replace(/```$/, '');
};
