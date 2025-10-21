/**
 * Nango WebView Component
 * 
 * Uses Nango Frontend SDK in WebView to match web app behavior exactly
 * Provides same OAuth experience as web app using @nangohq/frontend
 */

import React, { useRef, useState } from 'react';
import { Modal, View, StyleSheet, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface NangoWebViewProps {
  visible: boolean;
  sessionToken: string;
  integrationId: string;
  integrationName: string;
  onSuccess: (connectionId: string) => void;
  onClose: () => void;
  onError: (error: string) => void;
}

export function NangoWebView({
  visible,
  sessionToken,
  integrationId,
  integrationName,
  onSuccess,
  onClose,
  onError,
}: NangoWebViewProps) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  // HTML that loads Nango SDK (exactly like web app)
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: ${theme.isDark ? '#1e293b' : '#ffffff'};
      color: ${theme.isDark ? '#e2e8f0' : '#1e293b'};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      text-align: center;
      max-width: 400px;
    }
    .title {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 8px;
      color: ${theme.isDark ? '#e2e8f0' : '#1e293b'};
    }
    .subtitle {
      font-size: 14px;
      color: #94a3b8;
      margin-bottom: 24px;
    }
    .spinner {
      margin: 20px auto;
      width: 40px;
      height: 40px;
      border: 3px solid ${theme.isDark ? '#334155' : '#e2e8f0'};
      border-top-color: #60a5fa;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .error {
      color: #EF4444;
      margin-top: 16px;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="title">Connecting to ${integrationName}</div>
    <div class="subtitle">Opening secure authentication...</div>
    <div class="spinner"></div>
    <div id="error-message" class="error" style="display: none;"></div>
  </div>

  <script>
    console.log('[Nango] Starting SDK load...');
    
    // Load Nango SDK dynamically with better error handling
    function loadNangoSDK() {
      return new Promise((resolve, reject) => {
        console.log('[Nango] Loading SDK from CDN...');
        
        // Try multiple CDN sources
        const cdnUrls = [
          'https://cdn.jsdelivr.net/npm/@nangohq/frontend@0.43.3/dist/index.umd.js',
          'https://unpkg.com/@nangohq/frontend@0.43.3/dist/index.umd.js',
        ];
        
        let currentIndex = 0;
        
        function tryLoadScript() {
          if (currentIndex >= cdnUrls.length) {
            const error = 'Failed to load Nango SDK from all CDN sources. Check network connection.';
            console.error('[Nango]', error);
            reject(new Error(error));
            return;
          }
          
          console.log('[Nango] Attempting to load from:', cdnUrls[currentIndex]);
          
          const script = document.createElement('script');
          script.src = cdnUrls[currentIndex];
          script.async = true;
          script.crossOrigin = 'anonymous';
          
          script.onload = () => {
            console.log('[Nango] Script loaded from:', cdnUrls[currentIndex]);
            // Wait for SDK to initialize globally
            setTimeout(() => {
              if (typeof Nango !== 'undefined') {
                console.log('[Nango] SDK initialized successfully');
                resolve(true);
              } else {
                console.warn('[Nango] Script loaded but Nango not defined, trying next CDN...');
                currentIndex++;
                tryLoadScript();
              }
            }, 300);
          };
          
          script.onerror = (e) => {
            console.error('[Nango] Script error from:', cdnUrls[currentIndex], e);
            currentIndex++;
            tryLoadScript();
          };
          
          console.log('[Nango] Appending script to head...');
          document.head.appendChild(script);
        }
        
        tryLoadScript();
      });
    }

    
    // Initialize Nango when SDK is ready
    loadNangoSDK()
      .then(() => {
        try {
          console.log('Initializing Nango Connect UI...');
          
          // Create Nango instance (matches web app)
          const nango = new Nango();
          
          // Open Connect UI with event handlers (matches web app IntegrationsSection.tsx)
          const connect = nango.openConnectUI({
            onEvent: (event) => {
              console.log('Nango event:', event);
              
              if (event.type === 'connect') {
                // Success - send connection ID to React Native
                console.log('Connection successful:', event.payload.connectionId);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'connect',
                  connectionId: event.payload.connectionId,
                  integrationId: '${integrationId}'
                }));
              } else if (event.type === 'close') {
                // User closed modal
                console.log('User closed Nango modal');
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'close'
                }));
              } else if (event.type === 'error') {
                // Error occurred
                console.error('Nango error:', event.payload);
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'error',
                  error: event.payload?.message || 'Connection failed'
                }));
              }
            }
          });
          
          // Set session token to start the flow (matches web app)
          console.log('Setting session token...');
          connect.setSessionToken('${sessionToken}');
          
        } catch (error) {
          console.error('Nango initialization error:', error);
          document.getElementById('error-message').textContent = 
            'Failed to initialize connection: ' + error.message;
          document.getElementById('error-message').style.display = 'block';
          
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            error: error.message || 'Failed to initialize'
          }));
        }
      })
      .catch((error) => {
        console.error('Failed to load Nango SDK:', error);
        document.getElementById('error-message').textContent = error.message;
        document.getElementById('error-message').style.display = 'block';
        
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: error.message
        }));
      });
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[NangoWebView] Received message:', data);

      switch (data.type) {
        case 'connect':
          // Connection successful
          console.log('[NangoWebView] Connection successful, connectionId:', data.connectionId);
          onSuccess(data.connectionId);
          break;
        case 'close':
          // User closed the modal
          console.log('[NangoWebView] User closed modal');
          onClose();
          break;
        case 'error':
          // Error occurred
          console.error('[NangoWebView] Error event:', data.error);
          onError(data.error || 'Connection failed');
          break;
        default:
          console.log('[NangoWebView] Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[NangoWebView] Error parsing message:', error, event.nativeEvent.data);
      onError('Failed to process connection');
    }
  };

  const handleConsoleMessage = (event: any) => {
    console.log('[NangoWebView Console]', event.nativeEvent.message);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Connect Integration
          </Text>
          <View style={{ width: 40 }} />
        </View>

        {/* WebView with Nango SDK */}
        <WebView
          ref={webViewRef}
          source={{ html }}
          onMessage={handleMessage}
          onConsoleMessage={handleConsoleMessage}
          onLoadStart={() => {
            console.log('[NangoWebView] WebView loading...');
            setLoading(true);
          }}
          onLoadEnd={() => {
            console.log('[NangoWebView] WebView loaded');
            setLoading(false);
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[NangoWebView] WebView error:', nativeEvent);
            onError('Failed to load WebView: ' + nativeEvent.description);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[NangoWebView] HTTP error:', nativeEvent.statusCode, nativeEvent.url);
          }}
          style={styles.webView}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          thirdPartyCookiesEnabled={true}
          sharedCookiesEnabled={true}
          originWhitelist={['*']}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.grey }]}>
                Initializing secure connection...
              </Text>
            </View>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
});

export default NangoWebView;

