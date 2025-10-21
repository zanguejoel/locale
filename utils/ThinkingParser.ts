/**
 * Thinking Parser Utility
 * 
 * Parses <|thinking|> tags from streaming content and extracts
 * the model's reasoning process.
 */

export interface ThinkingBlock {
  id: string;
  content: string;
  timestamp: number;
  isComplete: boolean;
}

/**
 * Extract thinking block from streaming content
 * Supports both formats:
 * - <|thinking|>content</|thinking|> (with slash)
 * - <|thinking|>content<|thinking|> (same tag)
 * Returns the thinking content and the remaining text without thinking tags
 */
export const extractThinkingFromStream = (stream: string): {
  thinking: ThinkingBlock | null;
  contentWithoutThinking: string;
} => {
  if (!stream) {
    return { thinking: null, contentWithoutThinking: '' };
  }

  // Try format with slash first: <|thinking|>content</|thinking|>
  let thinkingMatch = stream.match(
    /<\|thinking\|>([\s\S]*?)(<\/\|thinking\|>|$)/
  );
  
  let hasSlash = true;

  // If no match, try same-tag format: <|thinking|>content<|thinking|>
  if (!thinkingMatch) {
    thinkingMatch = stream.match(
      /<\|thinking\|>([\s\S]*?)(<\|thinking\|>|$)/
    );
    hasSlash = false;
  }

  if (!thinkingMatch) {
    return { thinking: null, contentWithoutThinking: stream };
  }

  const thinkingContent = thinkingMatch[1];
  // Complete if we have the closing tag
  const isComplete = hasSlash 
    ? thinkingMatch[2] === '</|thinking|>'
    : thinkingMatch[2] === '<|thinking|>';

  // Remove thinking tags and content from the stream
  // Try both formats
  let contentWithoutThinking = stream.replace(
    /<\|thinking\|>[\s\S]*?<\/\|thinking\|>/g, // With slash
    ''
  );
  contentWithoutThinking = contentWithoutThinking.replace(
    /<\|thinking\|>[\s\S]*?<\|thinking\|>/g, // Same tag
    ''
  ).trim();

  const thinking: ThinkingBlock = {
    id: isComplete ? `thinking-${Date.now()}` : 'streaming-thinking',
    content: thinkingContent,
    timestamp: Date.now(),
    isComplete,
  };

  return { thinking, contentWithoutThinking };
};

/**
 * Extract all thinking blocks from completed message
 * Supports both formats:
 * - <|thinking|>content</|thinking|> (with slash)
 * - <|thinking|>content<|thinking|> (same tag)
 */
export const extractAllThinkingBlocks = (content: string): ThinkingBlock[] => {
  if (!content) return [];

  const blocks: ThinkingBlock[] = [];
  let index = 0;

  // Try format with slash first
  const withSlashRegex = /<\|thinking\|>([\s\S]*?)<\/\|thinking\|>/g;
  let match;

  while ((match = withSlashRegex.exec(content)) !== null) {
    const thinkingContent = match[1];

    blocks.push({
      id: `thinking-${Date.now()}-${index}`,
      content: thinkingContent,
      timestamp: Date.now(),
      isComplete: true,
    });
    
    index++;
  }

  // If no matches, try same-tag format
  if (blocks.length === 0) {
    const sameTagRegex = /<\|thinking\|>([\s\S]*?)<\|thinking\|>/g;
    while ((match = sameTagRegex.exec(content)) !== null) {
      const thinkingContent = match[1];

      blocks.push({
        id: `thinking-${Date.now()}-${index}`,
        content: thinkingContent,
        timestamp: Date.now(),
        isComplete: true,
      });
      
      index++;
    }
  }

  return blocks;
};

/**
 * Remove thinking tags from content for display
 * Supports both formats:
 * - <|thinking|>content</|thinking|> (with slash)
 * - <|thinking|>content<|thinking|> (same tag)
 */
export const stripThinkingTags = (content: string): string => {
  if (!content) return '';
  
  // Remove both formats
  let cleaned = content.replace(/<\|thinking\|>[\s\S]*?<\/\|thinking\|>/g, ''); // With slash
  cleaned = cleaned.replace(/<\|thinking\|>[\s\S]*?<\|thinking\|>/g, ''); // Same tag
  
  return cleaned.trim();
};

/**
 * Check if content has thinking tags
 */
export const hasThinkingTags = (content: string): boolean => {
  return /<\|thinking\|>/.test(content);
};

