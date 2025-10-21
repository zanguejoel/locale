/**
 * Reasoning Parser Utility
 * 
 * Purpose: Parse <jmeReasoning> tags from streaming content and extract
 * the model's reasoning process for display to users.
 * 
 * This utility handles the extraction and processing of reasoning blocks
 * from LLM responses, allowing the mobile app to display reasoning
 * separately from the main response content.
 */

/**
 * Interface for reasoning block data structure
 */
export interface ReasoningBlock {
  id: string;
  content: string;
  timestamp: number;
  isComplete: boolean;
}

/**
 * Extract reasoning block from content (streaming or historical).
 * 
 * Parses <jmeReasoning>content</jmeReasoning> tags from any message content
 * and returns both the reasoning content and the remaining text
 * without reasoning tags.
 * 
 * Works for:
 * - Active streaming: Partial content, may not have closing tag yet
 * - Completed messages: Full content with complete opening and closing tags
 * - Historical messages: Messages loaded from database/logs with complete tags
 * 
 * @param stream - The content to parse (streaming or complete)
 * @returns Object containing reasoning block and content without reasoning tags
 * 
 * @example
 * // Historical/completed message
 * const result = extractReasoningFromStream("Here is <jmeReasoning>my reasoning</jmeReasoning> the answer");
 * // result.reasoning.content === "my reasoning"
 * // result.reasoning.isComplete === true
 * // result.contentWithoutReasoning === "Here is  the answer"
 * 
 * @example
 * // Streaming (incomplete)
 * const result = extractReasoningFromStream("Here is <jmeReasoning>my reas");
 * // result.reasoning.content === "my reas"
 * // result.reasoning.isComplete === false
 * // result.contentWithoutReasoning === "Here is "
 */
export const extractReasoningFromStream = (stream: string): {
  reasoning: ReasoningBlock | null;
  contentWithoutReasoning: string;
} => {
  if (!stream) {
    return { reasoning: null, contentWithoutReasoning: '' };
  }

  // Match <jmeReasoning>content</jmeReasoning> pattern
  const reasoningMatch = stream.match(
    /<jmeReasoning>([\s\S]*?)(<\/jmeReasoning>|$)/
  );

  if (!reasoningMatch) {
    return { reasoning: null, contentWithoutReasoning: stream };
  }

  const reasoningContent = reasoningMatch[1];
  // Complete if we have the closing tag
  const isComplete = reasoningMatch[2] === '</jmeReasoning>';

  // Remove reasoning tags and content from the stream
  let contentWithoutReasoning = stream.replace(
    /<jmeReasoning>[\s\S]*?<\/jmeReasoning>/g,
    ''
  ).trim();

  const reasoning: ReasoningBlock = {
    id: isComplete ? `reasoning-${Date.now()}` : 'streaming-reasoning',
    content: reasoningContent,
    timestamp: Date.now(),
    isComplete,
  };

  return { reasoning, contentWithoutReasoning };
};

/**
 * Extract all reasoning blocks from completed message.
 * 
 * Useful for parsing historical messages that may contain
 * multiple reasoning blocks.
 * 
 * @param content - The complete message content to parse
 * @returns Array of all reasoning blocks found in the content
 * 
 * @example
 * const blocks = extractAllReasoningBlocks(message.content);
 * blocks.forEach(block => console.log(block.content));
 */
export const extractAllReasoningBlocks = (content: string): ReasoningBlock[] => {
  if (!content) return [];

  const blocks: ReasoningBlock[] = [];
  const reasoningRegex = /<jmeReasoning>([\s\S]*?)<\/jmeReasoning>/g;
  let match;
  let index = 0;

  while ((match = reasoningRegex.exec(content)) !== null) {
    const reasoningContent = match[1];

    blocks.push({
      id: `reasoning-${Date.now()}-${index}`,
      content: reasoningContent,
      timestamp: Date.now(),
      isComplete: true,
    });
    
    index++;
  }

  return blocks;
};

/**
 * Remove reasoning tags from content for display.
 * 
 * Strips all <jmeReasoning> tags and their content from the text,
 * leaving only the main response content.
 * 
 * @param content - The content to clean
 * @returns Content with reasoning tags removed
 * 
 * @example
 * const clean = stripReasoningTags("Answer: <jmeReasoning>thinking</jmeReasoning> 42");
 * // clean === "Answer:  42"
 */
export const stripReasoningTags = (content: string): string => {
  if (!content) return '';
  
  // Remove all reasoning tags and their content
  const cleaned = content.replace(/<jmeReasoning>[\s\S]*?<\/jmeReasoning>/g, '');
  
  return cleaned.trim();
};

/**
 * Check if content has reasoning tags.
 * 
 * Quick utility to determine if content contains any reasoning blocks
 * without parsing the entire content.
 * 
 * @param content - The content to check
 * @returns True if reasoning tags are present
 * 
 * @example
 * if (hasReasoningTags(message.content)) {
 *   // Handle message with reasoning
 * }
 */
export const hasReasoningTags = (content: string): boolean => {
  return /<jmeReasoning>/.test(content);
};

