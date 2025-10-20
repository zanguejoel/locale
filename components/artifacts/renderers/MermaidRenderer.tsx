/**
 * Mermaid Flowchart/Diagram Renderer
 * 
 * Renders Mermaid diagrams using WebView with embedded Mermaid.js
 * Supports: flowcharts, sequence diagrams, class diagrams, state diagrams, etc.
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import WebView from 'react-native-webview';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { extractCodeContent } from '@/utils/ArtifactParser';

interface MermaidRendererProps {
  content: string;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ content }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Extract mermaid code from markdown code blocks if present
  const mermaidCode = extractCodeContent(content);

  // HTML template with Mermaid.js CDN
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: ${theme.isDark ? '#1a1a1a' : '#ffffff'};
      color: ${theme.isDark ? '#e0e0e0' : '#333333'};
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
      overflow-x: auto;
    }
    #diagram-container {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .mermaid {
      max-width: 100%;
      height: auto;
    }
    /* Mermaid theme customization */
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
    /* Error message */
    .error {
      color: #ef4444;
      font-size: 14px;
      padding: 20px;
      text-align: center;
      background-color: ${theme.isDark ? '#2a1a1a' : '#fef2f2'};
      border-radius: 8px;
      border: 1px solid #ef4444;
    }
  </style>
</head>
<body>
  <div id="diagram-container">
    <div class="mermaid">
${mermaidCode}
    </div>
  </div>
  
  <script>
    try {
      // Initialize Mermaid with theme
      mermaid.initialize({
        startOnLoad: true,
        theme: '${theme.isDark ? 'dark' : 'default'}',
        securityLevel: 'loose',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        sequence: {
          useMaxWidth: true,
          wrap: true
        }
      });
      
      // Notify React Native that rendering is complete
      window.ReactNativeWebView?.postMessage(JSON.stringify({ 
        type: 'loaded',
        success: true 
      }));
    } catch (error) {
      // Show error in diagram
      document.getElementById('diagram-container').innerHTML = 
        '<div class="error">Error rendering diagram: ' + error.message + '</div>';
      
      // Notify React Native about error
      window.ReactNativeWebView?.postMessage(JSON.stringify({ 
        type: 'error',
        message: error.message 
      }));
    }
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'loaded' && data.success) {
        setLoading(false);
        setError(false);
      } else if (data.type === 'error') {
        setLoading(false);
        setError(true);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Rendering diagram...</Text>
        </View>
      )}
      
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Failed to render diagram. Please check the syntax.
          </Text>
        </View>
      )}
      
      <WebView
        source={{ html }}
        style={[styles.webview, loading && styles.hidden]}
        onMessage={handleMessage}
        onLoadEnd={() => {
          // Fallback if message doesn't arrive
          setTimeout(() => {
            if (loading) setLoading(false);
          }, 3000);
        }}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        scrollEnabled={true}
        bounces={false}
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        androidLayerType="hardware"
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={false}
        // Prevent zoom
        scalesPageToFit={false}
        // Security
        allowsInlineMediaPlayback={false}
        mediaPlaybackRequiresUserAction={true}
      />
    </View>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      width: '100%',
      minHeight: 300,
      backgroundColor: theme.isDark ? '#1a1a1a' : '#ffffff',
      borderRadius: 8,
      overflow: 'hidden',
    },
    webview: {
      width: '100%',
      minHeight: 300,
      backgroundColor: 'transparent',
    },
    hidden: {
      opacity: 0,
      height: 0,
    },
    loadingContainer: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.isDark ? '#1a1a1a' : '#ffffff',
      zIndex: 10,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    errorContainer: {
      padding: 20,
      backgroundColor: theme.isDark ? '#2a1a1a' : '#fef2f2',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#ef4444',
      margin: 16,
    },
    errorText: {
      fontSize: 14,
      color: '#ef4444',
      textAlign: 'center',
    },
  });

export default MermaidRenderer;

