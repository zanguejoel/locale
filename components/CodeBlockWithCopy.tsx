import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Clipboard, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface CodeBlockWithCopyProps {
  content: string;
  language?: string;
}

const CodeBlockWithCopy: React.FC<CodeBlockWithCopyProps> = ({ content, language }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  const handleCopy = () => {
    // Clear any existing timeout to prevent multiple timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    Clipboard.setString(content);
    setCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {language && <Text style={styles.language}>{language}</Text>}
        <TouchableOpacity
          onPress={handleCopy}
          style={styles.copyButton}
          accessibilityLabel={copied ? "Copied" : "Copy code"}
          accessibilityRole="button"
        >
          <Ionicons
            name={copied ? "checkmark" : "copy-outline"}
            size={16}
            color={copied ? theme.colors.primary : theme.colors.textSecondary}
          />
          <Text style={[styles.copyText, copied && styles.copiedText]}>
            {copied ? 'Copied!' : 'Copy'}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.codeContainer}>
        <Text selectable style={styles.codeText}>
          {content}
        </Text>
      </View>
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.isDark ? '#1e1e1e' : '#f5f5f5',
    borderRadius: 6,
    marginVertical: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: theme.isDark ? '#2a2a2a' : '#e8e8e8',
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  language: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: theme.isDark ? '#333' : '#fff',
  },
  copyText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  copiedText: {
    color: theme.colors.primary,
  },
  codeContainer: {
    padding: 10,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
    color: theme.isDark ? '#d4d4d4' : '#333',
  },
});

export default CodeBlockWithCopy;

