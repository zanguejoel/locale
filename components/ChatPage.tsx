import { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text, Animated, Easing, ScrollView, FlatList, Keyboard } from 'react-native';
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

const ChatPage = () => {
  const { params } = useRoute();

  // States
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [lastContentHeight, setLastContentHeight] = useState(0);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);


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
  const { messages, sendMessage, setCurrentRoom, isSending, stream, fetchMessages, intermediate } = chat;


  const id = params?.id
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePickerAsset>(null);

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
      scrollToBottom()
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
        intermediate={intermediate}
        loading={isLoading}
        streamingContent={isStreaming}
      />
    );
  };

  const CustomView = Platform.OS === 'ios' ? PanGestureHandler : View

  const KeyboardVisibleStyle = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0
  }

  const renderSelectedFile = () => {
    return (
      <View style={styles.selectedFileContainer}>
        <AntDesign onPress={() => setSelectedImage('')} name="closecircleo" style={styles.closeIcon} size={14} color={Colors.red} />
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
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen options={{
        headerTitleAlign: 'center',
        headerTitle: () => <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.logo} />
      }} />
      <KeyboardAvoidingView
        contentContainerStyle={{
          backgroundColor: Colors.light.background,
        }}
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
              <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.image} />
              <Text style={styles.welcomeText}>How can I assist you today?</Text>
            </Animated.View>
          )}
          <CustomView style={{ flex: 1 }}>
            <FlatList
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingTop: 20 }}
              showsVerticalScrollIndicator={false}
              ref={messageListRef}
              data={messages}
              renderItem={renderItem}
              keyboardDismissMode="on-drag"
              onScroll={handleScroll}
              scrollEventThrottle={16}
              extraData={[isSending, stream]}
              onContentSizeChange={handleContentSizeChange}

            />
          </CustomView>
          {showScrollButton && messages.length > 0 && (
            <TouchableOpacity
              style={styles.scrollButton}
              onPress={scrollToBottom}
              accessibilityLabel="Scroll to bottom"
              accessibilityRole="button"
              activeOpacity={0.7}
            >
              <Text style={styles.textScrollDown}>
                {autoScrollEnabled ? 'Scroll down' : 'Scroll to bottom'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.grey} />
            </TouchableOpacity>
          )}
        </View>
        {messages.length === 0 && <MessageIdeas onSelectCard={sendMessage} />}
        {selectedImage && renderSelectedFile()}
        <BlurView intensity={80} tint="light" style={[styles.inputBlurContainer]}>
          <MessageInput
            setSelectedImage={setSelectedImage}
            selectedImage={selectedImage}
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
    color: '#000',
    textAlign: 'center',
  },
  page: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  inputBlurContainer: {
    width: '100%',
    height: 90,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: 'rgba(230,230,230,0.5)',
  },
  logo: {
    width: 110,
    height: 30,
  },
  scrollButton: {
    position: 'absolute',
    bottom: 0,
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
  closeIcon: {
    left: 33,
    top: 2,
    zIndex: 1000
  }

});

export default ChatPage;