import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Markdown, {
  MarkdownProps,
  RenderRules,
} from 'react-native-markdown-display';
import { StyleSheet, Text, View, Image, Platform, Linking } from 'react-native';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Types';
import { useTheme } from './useTheme';

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

    // Tables
    table: {
      borderWidth: 1,
      borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      borderRadius: 4,
      marginVertical: 10,
      width: '100%',
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
    },
    tr: {
      borderBottomWidth: 0.5,
      borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
      flexDirection: 'row',
    },
    td: {
      padding: 8,
      flex: 1,
    },

    // Horizontal rule
    hr: {
      backgroundColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
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
        <View key={node.key} style={styles.code_block}>
          <Text selectable>{node.content}</Text>
        </View>
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
    }: MarkdownDisplayProps) => (
      <Markdown
        rules={{ ...additionalRules }}
        onLinkPress={url => handleNavigation(url)}
        style={{ ...markdownStyles, ...additionalStyles }}
      >
        {children}
      </Markdown>
    ),
    [markdownStyles, customRules],
  );

  return MarkdownDisplay;
};

export default useMarkdownDisplay;