/**
 * Markdown Artifact Renderer
 * 
 * Renders markdown artifacts with proper formatting.
 * Wraps the existing markdown display hook.
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import useMarkdownDisplay from '@/hooks/useMarkdownDisplay';

interface MarkdownRendererProps {
  content: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const MarkdownDisplay = useMarkdownDisplay();

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

