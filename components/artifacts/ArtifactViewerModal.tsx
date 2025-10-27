/**
 * Artifact Viewer Modal
 * 
 * Full-screen modal for viewing and interacting with artifacts.
 * Supports navigation between multiple artifacts, view/code toggle,
 * streaming artifact display, and actions like copy, share, download.
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Clipboard,
  Alert,
  Share,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Artifact, supportsCodeView } from '@/utils/ArtifactTypes';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CodeRenderer from './renderers/CodeRenderer';
import MarkdownRenderer from './renderers/MarkdownRenderer';
import MermaidRenderer from './renderers/MermaidRenderer';

interface ArtifactViewerModalProps {
  visible: boolean;
  artifacts: Artifact[];
  initialIndex?: number;
  onClose: () => void;
  streamingArtifact?: Artifact | null; // NEW: For real-time streaming display
}

type ViewMode = 'view' | 'code';

const ArtifactViewerModal: React.FC<ArtifactViewerModalProps> = ({
  visible,
  artifacts,
  initialIndex = 0,
  onClose,
  streamingArtifact, // NEW
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [viewMode, setViewMode] = useState<ViewMode>('view');
  const [copied, setCopied] = useState(false);

  // Combine artifacts with streaming artifact if applicable
  // Include content length as dependency to force updates during streaming
  const allArtifacts = useMemo(() => {
    if (streamingArtifact && streamingArtifact.isStreaming) {
      // Replace streaming artifact if it's in the list, or add it
      const index = artifacts.findIndex(a => a.id === streamingArtifact.id);
      if (index >= 0) {
        const updated = [...artifacts];
        updated[index] = streamingArtifact;
        return updated;
      }
      return [...artifacts, streamingArtifact];
    }
    return artifacts;
  }, [artifacts, streamingArtifact, streamingArtifact?.content, streamingArtifact?.isStreaming]);

  const currentArtifact = allArtifacts[currentIndex];
  const hasMultiple = allArtifacts.length > 1;
  const canToggleView = currentArtifact && supportsCodeView(currentArtifact.type);

  // Force component to re-render when streaming artifact content updates
  // Use content length as key to ensure React detects changes
  const [renderKey, setRenderKey] = useState(0);
  const [lastContentLength, setLastContentLength] = useState(0);
  
  useEffect(() => {
    if (streamingArtifact && streamingArtifact.isStreaming) {
      const newLength = streamingArtifact.content?.length || 0;
      
      // Only update if content actually changed
      if (newLength !== lastContentLength) {
        setRenderKey(prev => prev + 1);
        setLastContentLength(newLength);
        console.log('[ArtifactViewerModal] 🔄 Streaming artifact updated, content length:', newLength);
      }
    }
  }, [streamingArtifact?.content, streamingArtifact?.isStreaming, lastContentLength]);

  const handleCopy = async () => {
    if (!currentArtifact) return;

    try {
      Clipboard.setString(currentArtifact.content);
      setCopied(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy artifact:', error);
      Alert.alert('Error', 'Failed to copy content');
    }
  };

  const handleShare = async () => {
    if (!currentArtifact) return;

    try {
      await Share.share({
        message: currentArtifact.content,
        title: currentArtifact.title,
      });
    } catch (error) {
      console.error('Failed to share artifact:', error);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setViewMode('view'); // Reset to view mode
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleNext = () => {
    if (currentIndex < artifacts.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setViewMode('view'); // Reset to view mode
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'view' ? 'code' : 'view');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const renderArtifactContent = () => {
    if (!currentArtifact) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={styles.emptyText}>No artifact selected</Text>
        </View>
      );
    }

    // Show code view mode for supported types
    if (viewMode === 'code' && canToggleView) {
      return (
        <CodeRenderer
          key={`code-${renderKey}`}
          content={currentArtifact.content}
          language={currentArtifact.language || currentArtifact.type}
          isStreaming={currentArtifact.isStreaming}
        />
      );
    }

    // Render based on artifact type (with key to force re-render during streaming)
    switch (currentArtifact.type) {
      case 'code':
        return (
          <CodeRenderer
            key={`code-${renderKey}`}
            content={currentArtifact.content}
            language={currentArtifact.language || 'text'}
            isStreaming={currentArtifact.isStreaming}
          />
        );

      case 'markdown':
        return (
          <MarkdownRenderer
            key={`markdown-${renderKey}`}
            content={currentArtifact.content}
            isStreaming={currentArtifact.isStreaming}
          />
        );

      case 'mermaid':
        return (
          <MermaidRenderer
            key={`mermaid-${renderKey}`}
            content={currentArtifact.content}
            isStreaming={currentArtifact.isStreaming}
          />
        );

      // For now, other types fallback to code view
      // We'll add specialized renderers in the next phase
      default:
        return (
          <CodeRenderer
            key={`code-${renderKey}`}
            content={currentArtifact.content}
            language={currentArtifact.language || 'text'}
            isStreaming={currentArtifact.isStreaming}
          />
        );
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          {/* Left: Navigation or Close */}
          <View style={styles.headerLeft}>
            {hasMultiple ? (
              <View style={styles.navigationButtons}>
                <TouchableOpacity
                  onPress={handlePrevious}
                  disabled={currentIndex === 0}
                  style={[
                    styles.navButton,
                    currentIndex === 0 && styles.navButtonDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={
                      currentIndex === 0
                        ? theme.colors.textSecondary
                        : theme.colors.primary
                    }
                  />
                </TouchableOpacity>
                
                <Text style={styles.counter}>
                  {currentIndex + 1} / {artifacts.length}
                </Text>
                
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={currentIndex === artifacts.length - 1}
                  style={[
                    styles.navButton,
                    currentIndex === artifacts.length - 1 && styles.navButtonDisabled,
                  ]}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={
                      currentIndex === artifacts.length - 1
                        ? theme.colors.textSecondary
                        : theme.colors.primary
                    }
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>

          {/* Center: Title */}
          <View style={styles.headerCenter}>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {currentArtifact?.title || 'Artifact'}
              </Text>
              {currentArtifact?.isStreaming && (
                <View style={styles.streamingIndicator}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={styles.streamingText}>Streaming...</Text>
                </View>
              )}
            </View>
            {currentArtifact?.language && (
              <Text style={styles.headerSubtitle}>
                {currentArtifact.language}
              </Text>
            )}
          </View>

          {/* Right: Actions */}
          <View style={styles.headerRight}>
            {canToggleView && (
              <TouchableOpacity
                onPress={toggleViewMode}
                style={styles.iconButton}
              >
                <Ionicons
                  name={viewMode === 'view' ? 'code-slash' : 'eye'}
                  size={22}
                  color={theme.colors.primary}
                />
              </TouchableOpacity>
            )}
            
            {hasMultiple && (
              <TouchableOpacity onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled={true}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            bounces={false}
            nestedScrollEnabled={true}
            contentContainerStyle={{ minWidth: '100%' }}
          >
            {renderArtifactContent()}
          </ScrollView>
        </ScrollView>

        {/* Footer Actions - disabled during streaming */}
        {!currentArtifact?.isStreaming && (
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleCopy}
              style={[styles.actionButton, copied && styles.actionButtonSuccess]}
            >
              <Ionicons
                name={copied ? 'checkmark-circle' : 'copy'}
                size={20}
                color={copied ? '#10b981' : theme.colors.primary}
              />
              <Text
              style={[
                styles.actionButtonText,
                copied && styles.actionButtonTextSuccess,
              ]}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleShare} style={styles.actionButton}>
            <Ionicons
              name="share-social"
              size={20}
              color={theme.colors.primary}
            />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? '#2a2a2a' : '#e5e5e5',
    },
    headerLeft: {
      flex: 1,
      alignItems: 'flex-start',
    },
    headerCenter: {
      flex: 2,
      alignItems: 'center',
      paddingHorizontal: 8,
      minWidth: 0, // Allow flex shrinking
    },
    headerRight: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 8,
    },
    navigationButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    navButton: {
      padding: 4,
    },
    navButtonDisabled: {
      opacity: 0.3,
    },
    counter: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      minWidth: 50,
      textAlign: 'center',
    },
    closeButton: {
      padding: 4,
    },
    iconButton: {
      padding: 4,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      width: '100%', // Take full width of parent
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: 'center',
      flexShrink: 1, // Allow text to shrink
      maxWidth: '60%', // Prevent taking full width, leave room for streaming indicator
    },
    headerSubtitle: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 16,
    },
    emptyState: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderTopWidth: 1,
      borderTopColor: theme.isDark ? '#2a2a2a' : '#e5e5e5',
      backgroundColor: theme.isDark
        ? 'rgba(255, 255, 255, 0.02)'
        : 'rgba(0, 0, 0, 0.02)',
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: theme.isDark
        ? 'rgba(59, 130, 246, 0.15)'
        : 'rgba(59, 130, 246, 0.1)',
    },
    actionButtonSuccess: {
      backgroundColor: 'rgba(16, 185, 129, 0.15)',
    },
    actionButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: theme.colors.primary,
    },
    actionButtonTextSuccess: {
      color: '#10b981',
    },
    // NEW: Streaming indicator styles
    streamingIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.isDark
        ? 'rgba(59, 130, 246, 0.2)'
        : 'rgba(59, 130, 246, 0.15)',
      flexShrink: 0, // Don't shrink the streaming indicator
    },
    streamingText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.primary,
      whiteSpace: 'nowrap', // Prevent text wrapping in indicator
    },
  });

export default ArtifactViewerModal;

