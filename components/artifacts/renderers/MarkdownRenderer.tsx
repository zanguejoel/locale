/**
 * Markdown Artifact Renderer
 * 
 * Renders markdown artifacts with proper formatting.
 * Wraps the existing markdown display hook.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import useMarkdownDisplay from '@/hooks/useMarkdownDisplay';

export interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isStreaming = false }) => {
  const MarkdownDisplay = useMarkdownDisplay();
  
  // Log streaming updates for debugging
  React.useEffect(() => {
    if (isStreaming) {
      console.log('[MarkdownRenderer] Streaming update, content length:', content.length);
    }
  }, [content, isStreaming]);

  return (
    <View style={styles.container}>
      <MarkdownDisplay>{content}</MarkdownDisplay>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default MarkdownRenderer;

