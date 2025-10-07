import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
import { PanGestureHandler } from 'react-native-gesture-handler';
import { useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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
import HeaderModelSelector from './HeaderModelSelector';
import { getDateSeparator, isSameDay } from '@/utils/dateHelpers';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { storage } from '@/hooks/useMMKVStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';

// Helper function to get time-based greeting
const getGreeting = (firstName: string = 'there') => {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 12) {
    return `Good morning, ${firstName}`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, ${firstName}`;
  } else {
    // 5 PM - 4:59 AM shows "Good evening"
    return `Good evening, ${firstName}`;
  }
};

const ChatPage = () => {

  const { params } = useRoute();
  const { user } = useAuth();

  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  
  // Get selected models (using hooks to ensure reactivity)
  const selectedCloudModel = useDefaultModel();
  const selectedLocalModel = useDefaultLocalModel();
  
  // Log model initialization on mount
  useEffect(() => {
    // console.log('[ChatPage] Models loaded on launch:');
    // console.log('  Cloud Model:', selectedCloudModel?.displayName, '(ID:', selectedCloudModel?.id + ')');
    // console.log('  Local Model:', selectedLocalModel?.displayName, '(ID:', selectedLocalModel?.id + ')');
  }, []);

  // States
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelRecording, setCancelRecording] = useState<() => void>(() => () => {});
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);


  // Animation values
  const scrollButtonAnimation = useRef(new Animated.Value(0)).current;
  const logoAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Refs
  const messageListRef = useRef<FlashList<Message>>(null);
  const scrollOffsetRef = useRef(0);

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
    isLocalModelReady,
    setIsLocal,
    isLocalLLMSupported,
    resetChat
  } = chat;


  const id = (params as { id?: string })?.id
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // Type-safe wrapper for setSelectedImage
  const handleSetSelectedImage = useCallback((asset: ImagePicker.ImagePickerAsset | DocumentPicker.DocumentPickerAsset | null) => {
    // If it's a DocumentPickerAsset, we only use the URI which is compatible with ImagePickerAsset
    if (asset && 'mimeType' in asset) {
      // DocumentPickerAsset - convert to a compatible format
      setSelectedImage({
        uri: asset.uri,
        width: 0,
        height: 0,
        assetId: null,
      } as ImagePicker.ImagePickerAsset);
    } else {
      setSelectedImage(asset as ImagePicker.ImagePickerAsset | null);
    }
  }, []);

  // Type-safe wrapper for fetchMessages
  const handleFetchMessages = useCallback((conversationId?: string) => {
    if (id) {
      return fetchMessages(id);
    }
  }, [id, fetchMessages]);

  useEffect(() => {
    let isMounted = true;
    
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (isMounted) {
        setKeyboardVisible(true);
      }
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      if (isMounted) {
        setKeyboardVisible(false);
      }
    });

    return () => {
      isMounted = false;
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (id) {
      setCurrentRoom(id);
      setUserHasScrolledUp(false);
    }
    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [id]);

  // Handle logo animation based on messages
  useEffect(() => {
    if (messages.length > 0) {
      // Animate logo out
      Animated.timing(logoAnimation, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    } else {
      // Animate logo in
      Animated.timing(logoAnimation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad)
      }).start();
    }
  }, [messages.length]);

  // Show "scroll to bottom" when user scrolls up
  useEffect(() => {
    // Show button after a short delay when user scrolls up
    if (userHasScrolledUp && messages.length > 0) {
      setShowScrollButton(true);
    } else {
      setShowScrollButton(false);
    }
  }, [userHasScrolledUp, messages.length]);

  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeight(height / 2);
  };

  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    const currentOffset = contentOffset.y;
    
    // Store current scroll offset
    scrollOffsetRef.current = currentOffset;

    // In inverted list, positive scroll = scrolling up to see older messages
    // Show button when user has scrolled up more than 100 points
    if (currentOffset > 100) {
      setUserHasScrolledUp(true);
    } else {
      setUserHasScrolledUp(false);
    }
  };

  const scrollToBottom = () => {
    if (messageListRef.current) {
      try {
        messageListRef.current.scrollToOffset({ offset: 0, animated: true });
        setUserHasScrolledUp(false);
      } catch (error) {
        // console.error('Failed to scroll to bottom:', error);
      }
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    if (id) {
      await fetchMessages(id);
    }
    setRefreshing(false);
  };

  // Handle model selection from header
  const handleModelSelect = (modelId: string) => {
    try {
      // Update model preference in storage for current mode
      if (isLocal) {
        storage.set('default_local_model_id', modelId);
      } else {
        storage.set('default_model_id', modelId);
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // console.error('Error switching model:', error);
      Alert.alert('Error', 'Failed to switch model');
    }
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

  // Reverse messages for inverted list (newest at index 0)
  // Memoized to prevent array creation on every render
  const reversedMessages = useMemo(() => {
    return [...messages].reverse();
  }, [messages]);

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    // In inverted list with reversed array, index 0 is the newest message
    const isLastBotMessage =
      item.role === Role.Bot &&
      index === 0;

    const isLoading = isLastBotMessage && isSending && !stream;
    const isStreaming = isLastBotMessage && isSending && !!stream;
    
    // Show date separator if last message or different day from next (inverted)
    const showDateSeparator = 
      index === reversedMessages.length - 1 || 
      !isSameDay(item.timestamp, reversedMessages[index + 1]?.timestamp);

    // Check if message can be retried (user message that failed or needs retry)
    const canRetry = item.role === Role.User && !isLoading;

    return (
      <>
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
        {showDateSeparator && item.timestamp && (
          <DateSeparator label={getDateSeparator(item.timestamp)} />
        )}
      </>
    );
  }, [reversedMessages, isSending, stream, intermediate, handleCopyMessage, handleDeleteMessage, handleRetryMessage]);

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
           
          </View>
        ),
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <HeaderModelSelector
              isLocal={isLocal}
              currentModelId={isLocal ? selectedLocalModel?.id : selectedCloudModel?.id}
              onSelectModel={handleModelSelect}
              isLocalSupported={isLocalLLMSupported}
            />
          </View>
        ),
      }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={[
          styles.keyboardAvoidingView,
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
             <Text style={styles.logoText}>{getGreeting(user?.first_name)}</Text>
              <Text style={styles.welcomeText}>How can I assist you today?</Text>
              {(selectedCloudModel || selectedLocalModel) && (
                <Text style={[styles.modelNameText, { color: theme.isDark ? theme.colors.greyLight : theme.colors.grey }]}>
                  {isLocal 
                    ? `${selectedLocalModel?.displayName || 'Local Model'}` 
                    : `${selectedCloudModel?.displayName || 'Cloud Model'}`}
                </Text>
              )}
            </Animated.View>
          )}
          <CustomView style={{ flex: 1 }}>
            <FlashList
              contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ref={messageListRef}
              data={reversedMessages}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.id || `msg-${index}`}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              estimatedItemSize={200}
              scrollEventThrottle={16}
              extraData={[isSending, stream]}
              inverted
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10
              }}
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                // Load more messages when scrolling to top (older messages)
                if (!refreshing && reversedMessages.length > 0) {
                  // You can implement pagination here
                }
              }}
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
              <Text style={styles.textScrollDown}>New messages</Text>
              <Ionicons name="chevron-down" size={16} color={Colors.common.grey} />
            </TouchableOpacity>
          )}
        </View>
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
        <View style={[styles.inputBlurContainer]}>
          <MessageInput
            setSelectedImage={handleSetSelectedImage}
            selectedImage={selectedImage}
            fetchMessages={handleFetchMessages}
            onShouldSend={(message: string, type?: string, operation?: string | null, additionalData?: string, options?: any) => {
              // Scroll to bottom when sending a new message
              setUserHasScrolledUp(false);
              scrollToBottom();
              return isLocal ? handleSendLocalMessage(message) : sendMessage(message, type, operation, additionalData, options);
            }}
            isLoading={isSending}
            isLocal={isLocal}
            onRecordingStateChange={(recording, onCancel) => {
              setIsRecording(recording);
              setCancelRecording(() => onCancel);
            }}
          />
        </View>
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
