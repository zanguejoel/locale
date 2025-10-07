import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface LinkMetadata {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

interface LinkPreviewProps {
  url: string;
  onPress?: () => void;
}

/**
 * Extracts URLs from text
 */
export const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

/**
 * Fetches metadata for a URL
 * Note: In production, this should be done server-side to avoid CORS issues
 */
const fetchLinkMetadata = async (url: string): Promise<LinkMetadata | null> => {
  try {
    // For now, we'll create a basic preview from the URL
    // In production, you should use a backend service or a third-party API
    // like Microlink, LinkPreview, or your own metadata scraper
    
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    
    // Basic metadata from URL structure
    const metadata: LinkMetadata = {
      url,
      siteName: domain,
      title: domain,
      description: urlObj.pathname,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    };

    return metadata;
  } catch (error) {
    console.error('Failed to fetch link metadata:', error);
    return null;
  }
};

const LinkPreview: React.FC<LinkPreviewProps> = ({ url, onPress }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        setLoading(true);
        setError(false);
        const data = await fetchLinkMetadata(url);
        setMetadata(data);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [url]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading preview...</Text>
      </View>
    );
  }

  if (error || !metadata) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={styles.fallbackContainer}
        accessibilityLabel={`Open link ${url}`}
        accessibilityRole="link"
      >
        <Ionicons name="link" size={16} color={theme.colors.primary} />
        <Text style={styles.fallbackUrl} numberOfLines={1}>
          {url}
        </Text>
        <Ionicons name="open-outline" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.previewContainer}
      accessibilityLabel={`Open ${metadata.siteName || 'link'}`}
      accessibilityRole="link"
      activeOpacity={0.7}
    >
      {metadata.image && (
        <Image
          source={{ uri: metadata.image }}
          style={styles.previewImage}
          resizeMode="cover"
        />
      )}
      
      <View style={styles.previewContent}>
        <View style={styles.previewHeader}>
          {metadata.favicon && (
            <Image
              source={{ uri: metadata.favicon }}
              style={styles.favicon}
              resizeMode="contain"
            />
          )}
          {metadata.siteName && (
            <Text style={styles.siteName} numberOfLines={1}>
              {metadata.siteName}
            </Text>
          )}
          <Ionicons
            name="open-outline"
            size={14}
            color={theme.colors.textSecondary}
            style={styles.openIcon}
          />
        </View>

        {metadata.title && (
          <Text style={styles.previewTitle} numberOfLines={2}>
            {metadata.title}
          </Text>
        )}

        {metadata.description && (
          <Text style={styles.previewDescription} numberOfLines={2}>
            {metadata.description}
          </Text>
        )}

        <Text style={styles.previewUrl} numberOfLines={1}>
          {metadata.url}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    marginVertical: 4,
  },
  loadingText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  fallbackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 8,
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    marginVertical: 4,
  },
  fallbackUrl: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  previewContainer: {
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    overflow: 'hidden',
    marginVertical: 8,
  },
  previewImage: {
    width: '100%',
    height: 180,
    backgroundColor: theme.isDark ? '#2a2a2a' : '#f5f5f5',
  },
  previewContent: {
    padding: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  favicon: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  siteName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  openIcon: {
    marginLeft: 'auto',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
    lineHeight: 22,
  },
  previewDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  previewUrl: {
    fontSize: 12,
    color: theme.colors.primary,
    opacity: 0.8,
  },
});

export default LinkPreview;

