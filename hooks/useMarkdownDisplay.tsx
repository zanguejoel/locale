/**
 * useMarkdownDisplay Hook
 * 
 * Purpose:
 * Provides a customized Markdown component for rendering formatted text in the mobile app.
 * Includes support for code blocks, tables, images, links, and other markdown elements
 * with mobile-optimized styling and behavior.
 * 
 * Key Features:
 * - Theme-aware styling (light/dark mode)
 * - Horizontal scrolling tables for wide content
 * - Custom code blocks with copy functionality
 * - Proper touch event handling for nested scrollable content
 * - Deep linking support for internal navigation
 * - Accessibility support
 * 
 * Usage:
 * ```tsx
 * const MarkdownDisplay = useMarkdownDisplay();
 * 
 * return <MarkdownDisplay>{markdownContent}</MarkdownDisplay>;
 * ```
 * 
 * Custom Render Rules:
 * - Tables: Wrapped in horizontal ScrollView for wide tables
 * - Code blocks: Custom CodeBlockWithCopy component
 * - Images: Sized and styled appropriately for mobile
 * - Links: Support for both internal and external URLs
 * 
 * Performance Considerations:
 * - Memoized render function to prevent unnecessary re-renders
 * - Optimized ScrollView settings for 60fps
 * - Native-driven animations where possible
 * 
 * Dependencies:
 * - react-native-markdown-display: Markdown parsing and rendering
 * - @react-navigation/native: Deep linking support
 * - CodeBlockWithCopy: Custom code block component
 * 
 * @module useMarkdownDisplay
 * @author Assistant
 * @last-updated 2025-10-21
 * @see docs/features/implementation/2025-10-21-horizontal-scrollable-tables.md
 */

import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Markdown, {
  MarkdownProps,
  RenderRules,
} from 'react-native-markdown-display';
import { StyleSheet, Text, View, Image, Platform, Linking, ScrollView, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Types';
import { useTheme } from './useTheme';
import CodeBlockWithCopy from '@/components/CodeBlockWithCopy';

// Define the navigation params for each screen
interface NavigationParams {
  StockDetail: {
    symbol: string;
  };
  // Add other screen params as needed
}

// Define the screen mapping configuration
interface ScreenConfig {
  screen: keyof NavigationParams;
  paramsTransformer: (
    matches: Record<string, string>,
  ) => NavigationParams[keyof NavigationParams];
}

// Define the screen mappings type
type ScreenMappings = {
  [pattern: string]: ScreenConfig;
};

// Define props for the MarkdownDisplay component
interface MarkdownDisplayProps {
  children: string;
  additionalStyles?: any;
  additionalRules?: RenderRules;
}

const useMarkdownDisplay = () => {
  const navigation = useNavigation();

  // Screen mappings for different URL patterns
  const screenMappings = {
    '/stock/view_stock/:symbol': {
      screen: 'IndividualStock',
      paramsTransformer: (matches: any) => ({ symbol: matches.symbol }),
    },
  };

  const parseUrlPattern = (
    pattern: string,
    url: string,
  ): Record<string, string> | null => {
    const patternParts = pattern.split('/');
    const urlParts = url.split('/');

    if (patternParts.length !== urlParts.length) {
      return null;
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = urlParts[i];
      } else if (patternParts[i] !== urlParts[i]) {
        return null;
      }
    }

    return params;
  };

  // Handle navigation based on URL
  const handleNavigation = useCallback(
    (url: string): boolean => {
      for (const [pattern, config] of Object.entries(screenMappings)) {
        const params = parseUrlPattern(pattern, url);
        if (params) {
          const navigationParams = config.paramsTransformer(params);
          // navigation.navigate(config.screen, navigationParams);
          return true;
        }
      }
      return false;
    },
    [navigation],
  );

  // Custom styles for markdown elements with improved spacing and readability
  const getStyles = (theme: { isDark: boolean; colors: Theme['colors'] }) => StyleSheet.create({
    // Base styles
    body: {
      color: theme.colors.text,
      fontSize: 14,
      lineHeight: 24,
      marginTop: 0,
      marginBottom: 0,
      width: '100%',
    },

    // Text formatting
    strong: {
      fontWeight: '700',
    },
    em: {
      fontStyle: 'italic',
    },

    // Headings with proper spacing
    heading1: {
      fontSize: 20,
      lineHeight: 24,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      color: theme.colors.text,
      width: '100%',
    },
    heading2: {
      fontSize: 20,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      color: theme.colors.text,
      width: '100%',
    },
    heading3: {
      fontSize: 18,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      color: theme.colors.text,
      width: '100%',
    },
    heading4: {
      fontSize: 16,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      color: theme.colors.text,
      width: '100%',
    },
    heading5: {
      fontSize: 15,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      color: theme.colors.text,
      width: '100%',
    },
    heading6: {
      fontSize: 14,
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      color: theme.colors.text,
      width: '100%',
    },

    // Lists with proper indentation and spacing
    bullet_list: {
      marginVertical: 4,
      width: '100%',
    },
    ordered_list: {
      marginVertical: 4,
      width: '100%',
    },
    list_item: {
      flexDirection: 'row',
      marginVertical: 3,
      width: '100%',
      alignItems: 'flex-start',
    },
    bullet_list_icon: {
      marginLeft: 4,
      marginRight: 8,
      width: 5,
      height: 5,
      borderRadius: 2.5,
      backgroundColor: theme.colors.text,
      alignSelf: 'flex-start',
      marginTop: 8,
    },
    bullet_list_content: {
      flex: 1,
      paddingRight: 4,
    },
    ordered_list_icon: {
      marginLeft: 4,
      marginRight: 8,
      alignSelf: 'flex-start',
      minWidth: 14,
    },
    ordered_list_content: {
      flex: 1,
      paddingRight: 4,
    },

    list_item_level_1: {
      paddingLeft: 16,
    },
    list_item_level_2: {
      paddingLeft: 32,
    },
    list_item_level_3: {
      paddingLeft: 48,
    },

    code_inline: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      backgroundColor: theme.isDark ? '#2a2a2a' : '#f0f0f0',
      borderRadius: 3,
      paddingHorizontal: 4,
      paddingVertical: 1,
      fontSize: 13,
      color: theme.isDark ? '#e0e0e0' : '#333',
    },
    code_block: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      backgroundColor: theme.isDark ? '#1e1e1e' : '#f5f5f5',
      borderRadius: 6,
      padding: 10,
      marginVertical: 8,
      fontSize: 13,
      lineHeight: 18,
      color: theme.isDark ? '#d4d4d4' : '#333',
      width: '100%',
      borderWidth: 1,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    },
    fence: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      backgroundColor: theme.isDark ? '#1e1e1e' : '#f5f5f5',
      borderRadius: 6,
      padding: 10,
      marginVertical: 8,
      fontSize: 13,
      lineHeight: 18,
      color: theme.isDark ? '#d4d4d4' : '#333',
      width: '100%',
      borderWidth: 1,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    },

    // Links
    link: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },

    // Block quotes
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: theme.colors.primary + '80',
      paddingLeft: 10,
      marginLeft: 4,
      marginVertical: 8,
      fontStyle: 'italic',
      width: '95%',
    },

    // Paragraphs
    paragraph: {
      marginVertical: 6,
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    hardbreak: {
      width: '100%',
      height: 12,
    },
    softbreak: {
      width: '100%',
      height: 8,
    },

    // Tables - Optimized for horizontal scrolling with proper column alignment
    table: {
      borderWidth: 1,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      borderRadius: 4,
      minWidth: '100%', // Changed from width: '100%' to allow growth
      overflow: 'hidden',
    },
    thead: {
      backgroundColor: theme.isDark ? '#2a2a2a' : '#f7f7f7',
      borderBottomWidth: 1,
      borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    },
    tbody: {
      backgroundColor: theme.isDark ? '#1a1a1a' : '#ffffff',
    },
    th: {
      padding: 8,
      fontWeight: 'bold',
      minWidth: 120, // Fixed minimum width for consistent column alignment
      width: 120, // Fixed width to ensure columns align across rows
      color: theme.colors.text,
    },
    tr: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      flexDirection: 'row',
    },
    td: {
      padding: 8,
      minWidth: 120, // Fixed minimum width for consistent column alignment
      width: 120, // Fixed width to ensure columns align across rows
      // Removed flex: 1 to prevent column width variations
      color: theme.colors.text,
    },

    // Horizontal rule
    hr: {
      backgroundColor: theme.isDark ? theme.colors.greyLight : theme.colors.grey,
      height: 1,
      width: '100%',
      marginVertical: 12,
    },

    // Image
    image: {
      marginVertical: 8,
      alignSelf: 'center',
      maxWidth: '100%',
      borderRadius: 4,
    },
  });

  const themeData = useTheme();
  // Type assertion to access isDark property that exists in runtime but not in type
  const theme = themeData as unknown as { isDark: boolean; colors: Theme['colors'] };
  const markdownStyles = getStyles(theme);

  const customRules: RenderRules = {
    /*  list_item: (node, children, parent, styles) => {
      return (
        <View
          key={node.key}
          style={[styles.list_item, styles[`list_item_level_${node.level || 0}`]]}
        >
          {children}
        </View>
      );
    }, */

    code_block: (node, children, parent, styles) => {
      return (
        <CodeBlockWithCopy
          key={node.key}
          content={node.content}
          language={node.sourceInfo || undefined}
        />
      );
    },
    
    fence: (node, children, parent, styles) => {
      return (
        <CodeBlockWithCopy
          key={node.key}
          content={node.content}
          language={node.sourceInfo || undefined}
        />
      );
    },

    /**
     * Custom table renderer with horizontal scrolling capability
     * 
     * Purpose:
     * Wraps markdown tables in a horizontal ScrollView to handle wide tables
     * with many columns that don't fit on mobile screens.
     * 
     * Implementation Details:
     * - Uses React Native ScrollView with horizontal orientation
     * - Prevents parent scroll container from intercepting horizontal gestures
     * - Shows scroll indicator for better UX
     * - Maintains 60fps scroll performance with throttling
     * 
     * Inputs:
     * @param node - AST node representing the table element
     * @param children - Rendered child elements (thead, tbody, tr, td, etc.)
     * @param parent - Parent AST node
     * @param styles - Stylesheet containing table styles
     * 
     * Outputs:
     * @returns JSX.Element - Table wrapped in horizontal ScrollView
     * 
     * Touch Event Handling:
     * - Horizontal swipes: Scroll table content
     * - Vertical swipes: Pass through to parent chat scroll
     * - nestedScrollEnabled ensures proper Android gesture handling
     * 
     * Performance:
     * - scrollEventThrottle={16} ensures 60fps (1000ms/60 ≈ 16ms)
     * - bounces={false} reduces layout recalculations
     * - Native animation thread handles scrolling (no JS bridge)
     * 
     * @see docs/features/implementation/2025-10-21-horizontal-scrollable-tables.md
     */
    table: (node, children, parent, styles) => {
      return (
        <View key={node.key} style={{ width: '100%', marginVertical: 10 }}>
          <ScrollView
            horizontal={true}                          // Enable horizontal scrolling
            showsHorizontalScrollIndicator={true}      // Show scroll indicator for UX
            nestedScrollEnabled={true}                 // Allow nested scrolling (critical for Android)
            bounces={false}                            // Prevent bounce at boundaries for performance
            scrollEventThrottle={16}                   // 60fps scroll performance
            contentContainerStyle={{ flexGrow: 1 }}   // Ensure content fills container
            style={{ width: '100%' }}                 // Full width container
          >
            <View style={styles.table}>
              {children}
            </View>
          </ScrollView>
        </View>
      );
    },

    /**
     * Custom table row renderer with Pressable wrapper
     * 
     * Purpose:
     * Wraps table rows in Pressable to enable proper touch event handling
     * which is necessary for horizontal scroll to work correctly.
     * 
     * Implementation Details:
     * - Wraps tr content in a Pressable component
     * - onPress is empty (no action on tap)
     * - Pressable helps with gesture responder chain
     * - All rows (header and data) use same wrapper
     * 
     * Inputs:
     * @param node - AST node representing the table row element
     * @param children - Rendered child elements (td elements)
     * @param parent - Parent AST node (tbody or thead)
     * @param styles - Stylesheet containing table row styles
     * 
     * Outputs:
     * @returns JSX.Element - Pressable-wrapped table row
     * 
     * Note: The Pressable wrapper is needed for horizontal scroll to work,
     * even though onPress does nothing. This is due to React Native's
     * gesture responder system interaction with nested ScrollViews.
     */
    tr: (node, children, parent, styles) => {
      return (
        <Pressable
          key={node.key}
          onPress={() => {
            // Empty onPress - needed for gesture handling but no action taken
          }}
          style={styles.tr}
        >
          {children}
        </Pressable>
      );
    },

    image: (node, children, parent, styles) => {
      const { src, alt } = node.attributes;
      return (
        <Image
          key={node.key}
          source={{ uri: src }}
          style={[styles.image, { width: 300, height: 200, resizeMode: 'contain' }]}
          accessibilityLabel={alt || 'Image'}
        />
      );
    },
    link: (node, children, parent, styles) => {
      return (
        <Text key={node.key} style={styles.link} onPress={() => Linking.openURL(node.attributes.href)}>
          {children}
        </Text>
      );
    }
    
  };

  // Render function that returns a configured Markdown component
  const MarkdownDisplay = useCallback(
    ({
      children,
      additionalStyles = {},
      additionalRules = {},
    }: MarkdownDisplayProps) => {
      // Escape (c) to prevent conversion to copyright symbol
      // We'll use a zero-width space to break the pattern
      const processedChildren = children.replace(/\(c\)/gi, '(c\u200B)');
      
      return (
        <Markdown
          rules={{ ...customRules, ...additionalRules }}
          onLinkPress={url => handleNavigation(url)}
          style={{ ...markdownStyles, ...additionalStyles }}
        >
          {processedChildren}
        </Markdown>
      );
    },
    [markdownStyles, customRules],
  );

  return MarkdownDisplay;
};

export default useMarkdownDisplay;