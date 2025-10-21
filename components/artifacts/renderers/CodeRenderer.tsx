/**
 * Code Artifact Renderer
 * 
 * Renders code artifacts with syntax highlighting.
 * Wraps the existing CodeBlockWithCopy component.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import CodeBlockWithCopy from '@/components/CodeBlockWithCopy';
import { extractCodeContent } from '@/utils/ArtifactParser';

export interface CodeRendererProps {
  content: string;
  language?: string;
  isStreaming?: boolean;
}

const CodeRenderer: React.FC<CodeRendererProps> = ({ content, language, isStreaming = false }) => {
  // Extract code from markdown code blocks if present
  const codeContent = extractCodeContent(content);
  
  // Log streaming updates for debugging
  React.useEffect(() => {
    if (isStreaming) {
      console.log('[CodeRenderer] Streaming update, content length:', content.length);
    }
  }, [content, isStreaming]);

  return (
    <View style={styles.container}>
      <CodeBlockWithCopy content={codeContent} language={language} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default CodeRenderer;

