import { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text, Animated, Easing, ScrollView, FlatList, Keyboard, Clipboard, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import MessageIdeas from '@/components/MessageIdeas';
import MessageInput from '@/components/ChatInput';
import { defaultStyles } from '@/constants/Styles';
import { Message, Role } from '@/utils/Interfaces';
import Colors from '@/constants/Colors';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useRoute } from '@react-navigation/native';
import { ImagePickerAsset } from 'expo-image-picker';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { LocalModelDownloadProgress } from './LocalModelDownloadProgress';
import { useDefaultModel } from '@/hooks/useDefaultModel';
import { useDefaultLocalModel } from '@/hooks/useDefaultLocalModel';
import { GradientBackground } from './GradientBackground';
import TypingIndicator from './TypingIndicator';
import DateSeparator from './DateSeparator';
import SmartSuggestions from './SmartSuggestions';
import OfflineBanner from './OfflineBanner';
import SwipeableMessage from './SwipeableMessage';
import VoiceRecordingUI from './VoiceRecordingUI';
import { getDateSeparator, isSameDay } from '@/utils/dateHelpers';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';

const ChatPage = () => {

  const { params } = useRoute();

  const theme = useTheme();
  const styles = getStyles(theme);
  
  // Get selected models (using hooks to ensure reactivity)
  const selectedCloudModel = useDefaultModel();
  const selectedLocalModel = useDefaultLocalModel();
  
  // Log model initialization on mount
  useEffect(() => {
    console.log('[ChatPage] Models loaded on launch:');
    console.log('  Cloud Model:', selectedCloudModel?.displayName, '(ID:', selectedCloudModel?.id + ')');
    console.log('  Local Model:', selectedLocalModel?.displayName, '(ID:', selectedLocalModel?.id + ')');
  }, []);

  // States
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [lastContentHeight, setLastContentHeight] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelRecording, setCancelRecording] = useState<() => void>(() => () => {});


  // Animation values
  const scrollButtonAnimation = useRef(new Animated.Value(0)).current;
  const logoAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const messageListRef = useRef<FlashList<Message>>(null);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  const layoutHeightRef = useRef(0);
  const isManualScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const chat = useChat();
  const { 
    messages, 
    isLocal, 
    sendMessage, 
    handleSendLocalMessage, 
    setCurrentRoom, 
    isSending, 
    stream, 
    fetchMessages, 
    intermediate,
    localModelDownloadProgress,
    isLocalModelReady
  } = chat;


  const id = (params as { id?: string })?.id
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePickerAsset | null>(null);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      scrollToBottom();
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      // scrollToBottom();
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (id) {
      setCurrentRoom(id);
      setAutoScrollEnabled(true);
    }
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [id]);

  // Force scroll to bottom when messages array changes (new message added)
  // Force scroll to bottom when messages array changes (new message added)
  useEffect(() => {
    if (messages.length > 0 && autoScrollEnabled) {
      scrollToBottomWithDelay(300);

      // Animate logo out
      Animated.timing(logoAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    } else if (messages.length === 0) {
      // Animate logo in
      Animated.timing(logoAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    }
  }, [messages.length]);

  // Auto-scroll when streaming content updates
  useEffect(() => {
    if (stream && autoScrollEnabled && !isManualScrollRef.current) {
      scrollToBottomWithDelay(0);
    }
  }, [stream]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeight(height / 2);
    layoutHeightRef.current = height;
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollY = contentOffset.y;
    const contentHeight = contentSize.height;

    // Update references for later use
    scrollPositionRef.current = scrollY;
    contentHeightRef.current = contentHeight;
    layoutHeightRef.current = layoutMeasurement.height;

    // Calculate if we're at the bottom
    const distanceFromBottom = contentHeight - (scrollY + layoutMeasurement.height);
    const isAtBottom = distanceFromBottom < 20;

    // Show or hide scroll button
    setShowScrollButton(!isAtBottom);

    // Detect user manual scrolling away from bottom
    if (!isAtBottom && Math.abs(lastContentHeight - contentHeight) < 10) {
      isManualScrollRef.current = true;
      setAutoScrollEnabled(false);
    }

    // If user scrolled to bottom manually, re-enable auto-scroll
    if (isAtBottom && isManualScrollRef.current) {
      isManualScrollRef.current = false;
      setAutoScrollEnabled(true);
    }

    setLastContentHeight(contentHeight);
  };

  const scrollToBottomWithDelay = (delay = 0) => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set new timeout
    scrollTimeoutRef.current = setTimeout(() => {
      if (messageListRef.current) {
        try {
          messageListRef.current.scrollToEnd({ animated: true });
        } catch (error) {
          console.error('Failed to scroll to bottom:', error);
        }
      }
    }, delay);
  };

  const scrollToBottom = () => {
    isManualScrollRef.current = false;
    setAutoScrollEnabled(true);
    scrollToBottomWithDelay(0);
  };

  const handleContentSizeChange = (width: number, height: number) => {
    contentHeightRef.current = height;

    if (autoScrollEnabled && !isManualScrollRef.current && messages.length > 0) {
      scrollToBottomWithDelay(0);
    }
  };
  useEffect(() => {
    if (isSending && messageListRef?.current && messages.length) {
      scrollToBottom()
    }
  }, [messages, isSending]);
  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchMessages(id);
    }
    setRefreshing(false);
  };

  // Swipe action handlers
  const handleCopyMessage = (content: string) => {
    Clipboard.setString(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Could show a toast here
  };

  const handleDeleteMessage = (messageId: string) => {
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete message logic in useChat hook
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleRetryMessage = (content: string) => {
    // Resend the message
    isLocal ? handleSendLocalMessage(content) : sendMessage(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isLastBotMessage =
      item.role === Role.Bot &&
      index === messages.length - 1;

    const isLoading = isLastBotMessage && isSending && !stream;
    const isStreaming = isLastBotMessage && isSending && !!stream;
    
    // Show date separator if first message or different day from previous
    const showDateSeparator = 
      index === 0 || 
      !isSameDay(item.timestamp, messages[index - 1]?.timestamp);

    // Check if message can be retried (user message that failed or needs retry)
    const canRetry = item.role === Role.User && !isLoading;

    return (
      <>
        {showDateSeparator && item.timestamp && (
          <DateSeparator label={getDateSeparator(item.timestamp)} />
        )}
        <SwipeableMessage
          messageId={item.id || `${index}`}
          role={item.role}
          content={item.content}
          onCopy={() => handleCopyMessage(item.content)}
          onDelete={() => handleDeleteMessage(item.id || `${index}`)}
          onRetry={() => handleRetryMessage(item.content)}
          canRetry={canRetry}
        >
          <ChatMessage
            {...item}
            intermediate={intermediate}
            loading={isLoading}
            streamingContent={isStreaming}
          />
        </SwipeableMessage>
      </>
    );
  };

  const CustomView = Platform.OS === 'ios' ? PanGestureHandler : View

  const KeyboardVisibleStyle = {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0
  }

  const renderSelectedFile = () => {
    return (
      <View style={styles.selectedFileContainer}>
        <AntDesign onPress={() => setSelectedImage(null)} name="closecircleo" style={styles.closeIcon} size={14} color={theme.colors.red} />
        <Image
          source={{ uri: selectedImage?.uri, cache: 'force-cache' }}
          style={styles.previewImage}
          resizeMode="cover"
          onError={(e) => console.error('Error loading inline image:', e.nativeEvent.error)}
          testID="inline-image"
        />
      </View>
    )
  }

  return (
    <GradientBackground variant="background" style={styles.pageContainer}>
      <OfflineBanner isLocal={isLocal} />
      <Stack.Screen options={{
        headerTitleAlign: 'center',
        headerTitle: () => (
          <View style={styles.headerContainer}>
            <Image 
              source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')} 
              style={styles.logo} 
            />
            {(selectedCloudModel || selectedLocalModel) && (
              <Text style={styles.headerModelText}>
                {isLocal 
                  ? selectedLocalModel?.displayName || 'Local Model'
                  : selectedCloudModel?.displayName || 'Cloud Model'}
              </Text>
            )}
          </View>
        ),
        headerRight: () => (
          <View style={styles.modelBadge}>
            <Ionicons 
              name={isLocal ? 'phone-portrait' : 'cloud'} 
              size={16} 
              color={theme.colors.primary} 
            />
          </View>
        ),
      }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={110}
        style={[
          styles.keyboardAvoidingView,
          // isKeyboardVisible && KeyboardVisibleStyle,
          isSending && KeyboardVisibleStyle,
        ]}
      >
        <View style={styles.page} onLayout={onLayout}>
          {messages.length === 0 && (
            <Animated.View
              style={[
                styles.logoContainer,
                {
                  marginTop: height / 2 - 100,
                  opacity: logoAnimation,
                  transform: [
                    { scale: logoAnimation },
                    {
                      translateY: logoAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20, 0]
                      })
                    }
                  ]
                }
              ]}
            >
             {/*  <Image source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')} style={styles.image} /> */}
             <Text style={styles.logoText}>Odyssey</Text>
              <Text style={styles.welcomeText}>How can I assist you today?</Text>
              {(selectedCloudModel || selectedLocalModel) && (
                <Text style={[styles.modelNameText, { color: theme.colors.grey }]}>
                  {isLocal 
                    ? `Using: ${selectedLocalModel?.displayName || 'Local Model'}` 
                    : `Using: ${selectedCloudModel?.displayName || 'Cloud Model'}`}
                </Text>
              )}
            </Animated.View>
          )}
          <CustomView style={{ flex: 1 }}>
            <FlashList
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingTop: 20 }}
              showsVerticalScrollIndicator={false}
              ref={messageListRef}
              data={messages}
              renderItem={renderItem}
              keyboardDismissMode="on-drag"
              onScroll={handleScroll}
              estimatedItemSize={100}
              scrollEventThrottle={16}
              extraData={[isSending, stream]}
              onContentSizeChange={handleContentSizeChange}
              ListFooterComponent={() => {
                const lastMessage = messages[messages.length - 1];
                const showSuggestions = !isSending && lastMessage?.role === Role.Bot && messages.length > 1;
                
                return (
                  <>
                    {isSending && !stream && messages.length > 0 && (
                      <TypingIndicator 
                        modelName={isLocal ? selectedLocalModel?.displayName : selectedCloudModel?.displayName} 
                      />
                    )}
                    {/* Temporarily commented out - interfering with voice UI */}
                    {/* {showSuggestions && (
                      <SmartSuggestions 
                        onSelectSuggestion={(suggestion) => {
                          isLocal ? handleSendLocalMessage(suggestion) : sendMessage(suggestion);
                        }}
                      />
                    )} */}
                  </>
                );
              }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                />
              }
            />
          </CustomView>
          {showScrollButton && messages.length > 0 && (
            <TouchableOpacity
              style={styles.scrollButton}
              onPress={scrollToBottom}
              accessibilityLabel="Scroll to bottom"
              accessibilityRole="button"
              activeOpacity={0.6}
            >
              <Text style={styles.textScrollDown}>
                {autoScrollEnabled ? 'Scroll down' : 'Scroll to bottom'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.common.grey} />
            </TouchableOpacity>
          )}
        </View>
        {messages.length === 0 && <MessageIdeas onSelectCard={isLocal ? handleSendLocalMessage : sendMessage} />}
        {selectedImage && renderSelectedFile()}
        {isLocal && (
          <LocalModelDownloadProgress 
            progress={localModelDownloadProgress} 
            isReady={isLocalModelReady} 
          />
        )}
        <VoiceRecordingUI 
          isRecording={isRecording}
          onCancel={cancelRecording}
        />
        <BlurView intensity={80} tint="light" style={[styles.inputBlurContainer]}>
          <MessageInput
            setSelectedImage={setSelectedImage as any} // Type mismatch between ImagePickerAsset and DocumentPickerAsset
            selectedImage={selectedImage}
            fetchMessages={fetchMessages as any} // Signature mismatch - accepts optional param
            onShouldSend={(message: string, type?: string, operation?: string | null, additionalData?: string) => {
              isManualScrollRef.current = false;
              setAutoScrollEnabled(true);
              scrollToBottomWithDelay(300);
              return isLocal ? handleSendLocalMessage(message) : sendMessage(message, type, operation, additionalData);
            }}
            isLoading={isSending}
            onRecordingStateChange={(recording, onCancel) => {
              setIsRecording(recording);
              setCancelRecording(() => onCancel);
            }}
          />
        </BlurView>
      </KeyboardAvoidingView>

    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  pageContainer: {
    flex: 1,
    // backgroundColor removed - gradient handles it
  },
  // Logo and welcome
  logoContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    paddingTop: 20,
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  selectedFileContainer: {
    marginBottom: 4,
    marginLeft: 16,
  },
  previewImage: {
    width: 40,
    height: 40,
    borderRadius: 12,
  },
  image: {
    width: 120,
    height: 80,
    resizeMode: 'cover',
  },
  welcomeText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '500',
    color: theme.colors.text,
    textAlign: 'center',
  },
  modelNameText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
  page: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: 'transparent', // Let gradient show through
  },
  inputBlurContainer: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',

  },
  logo: {
    width: 180,
    resizeMode: 'contain',
    height: 30,
  },
  headerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerModelText: {
    fontSize: 11,
    color: theme.colors.grey,
    marginTop: 2,
  },
  modelBadge: {
    backgroundColor: theme.colors.background200,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollButton: {
    position: 'absolute',
    bottom: 10,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(240, 240, 240, 0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  textScrollDown: {
    fontSize: 12,
    color: Colors.common.grey,
    fontWeight: '500',
    marginRight: 4,
  },
  closeIcon: {
    left: 33,
    top: 2,
    zIndex: 1000
  }

});

export default ChatPage;
