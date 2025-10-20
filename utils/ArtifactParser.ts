/**
 * Artifact Parser Utility
 * 
 * Parses <jmeArtifact> tags from streaming content and extracts
 * artifact metadata and content.
 */

import { Artifact, ArtifactType, ArtifactMetadata } from './ArtifactTypes';

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

  if (!typeMatch || !titleMatch) {
    return null; // Need at least type and title
  }

  const artifact: Artifact = {
    id: isComplete ? `artifact-${Date.now()}` : 'streaming-artifact',
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

    console.log('[ArtifactParser] Parsed - type:', typeMatch?.[1], 'title:', titleMatch?.[1], 'language:', languageMatch?.[1]);

    if (typeMatch && titleMatch) {
      const artifact = {
        id: `${messageId}-artifact-${artifacts.length}`,
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
 * Remove artifact tags from content for display
 * Used to show the text content without artifact markup
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

