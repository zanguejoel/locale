import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import Markdown, {
  MarkdownProps,
  RenderRules,
} from 'react-native-markdown-display';

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



  // Custom styles for markdown elements
  const markdownStyles = {
    body: {
      fontSize: 14,
      lineHeight: 20,
    },
    strong: { fontWeight: '700' },
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
        style={{ ...markdownStyles, ...additionalStyles }}>
        {children}
      </Markdown>
    ),
    [markdownStyles],
  );

  return MarkdownDisplay;
};

export default useMarkdownDisplay;
