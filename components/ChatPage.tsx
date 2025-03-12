import { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text, Animated, Easing, ScrollView, FlatList } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import MessageIdeas from '@/components/MessageIdeas';
import MessageInput from '@/components/ChatInput';
import { defaultStyles } from '@/constants/Styles';
import { Message, Role } from '@/utils/Interfaces';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { PanGestureHandler } from 'react-native-gesture-handler';

const ChatPage = () => {
  // States
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [lastContentHeight, setLastContentHeight] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isTypingIndicatorVisible, setIsTypingIndicatorVisible] = useState(false);

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
  const { messages, sendMessage, setCurrentRoom, isSending, stream, fetchMessages } = chat;
  const { id } = useLocalSearchParams<{ id: string }>();
  // Initial setup when conversation changes

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

  const isNearBottom = () => {
    const scrollThreshold = 50; // px from bottom to consider "near bottom"
    const distanceFromBottom = contentHeightRef.current - (scrollPositionRef.current + layoutHeightRef.current);
    return distanceFromBottom <= scrollThreshold;
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

  const handleContentSizeChange = (width, height) => {
    contentHeightRef.current = height;

    if (autoScrollEnabled && !isManualScrollRef.current && messages.length > 0) {
      scrollToBottomWithDelay(0);
    }
  };
  useEffect(() => {
    if (isSending && messageListRef?.current && messages.length) {
      const extraOffset = 50;
      const targetOffset = Math.max(
        contentHeightRef.current - layoutHeightRef.current - extraOffset,
        0
      );
      messageListRef.current.scrollToOffset({ offset: targetOffset, animated: true });
    }
  }, [messages, isSending]);
  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isLastBotMessage =
      item.role === Role.Bot &&
      index === messages.length - 1;

    const isLoading = isLastBotMessage && isSending && !stream;
    const isStreaming = isLastBotMessage && isSending && !!stream;

    return (
      <ChatMessage
        {...item}
        loading={isLoading}
        streamingContent={isStreaming}
      />
    );
  };

  return (
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen options={{ headerTitle: () => <></> }} />

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
            <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.image} />
            <Text style={styles.welcomeText}>How can I assist you today?</Text>
          </Animated.View>
        )}
        <PanGestureHandler>
          <FlatList
            showsVerticalScrollIndicator={false}
            ref={messageListRef}
            data={messages}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 20 }}
            keyboardDismissMode="on-drag"
            onScroll={handleScroll}
            scrollEventThrottle={16}
            extraData={[isSending, stream]}
            onContentSizeChange={handleContentSizeChange}

          />
        </PanGestureHandler>
        {showScrollButton && (
          <TouchableOpacity
            style={styles.scrollButton}
            onPress={scrollToBottom}
            accessibilityLabel="Scroll to bottom"
            accessibilityRole="button"
            activeOpacity={0.7}
          >
            <Text style={styles.textScrollDown}>
              {autoScrollEnabled ? 'Scroll down' : 'Auto-scroll disabled'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.grey} />
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView

        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={85}
        style={styles.keyboardAvoidingView}
      >
        <BlurView intensity={80} tint="light" style={styles.inputBlurContainer}>
          {messages.length === 0 && <MessageIdeas onSelectCard={sendMessage} />}
          <MessageInput
            fetchMessages={fetchMessages}
            onShouldSend={(message, type, operation, additionalData) => {
              isManualScrollRef.current = false;
              setAutoScrollEnabled(true);
              scrollToBottomWithDelay(300);
              return sendMessage(message, type, operation, additionalData);
            }}
            isLoading={isSending}
          />
        </BlurView>
      </KeyboardAvoidingView>

    </View>
  );
};

const styles = StyleSheet.create({
  // Logo and welcome
  logoContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
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
    color: '#000',
    textAlign: 'center',
  },
  page: {
    flex: 1,
    paddingBottom: 80,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
  },
  inputBlurContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,230,230,0.5)',
  },
  scrollButton: {
    position: 'absolute',
    bottom: 80,
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
    color: Colors.grey,
    fontWeight: '500',
    marginRight: 4,
  },

});

export default ChatPage;