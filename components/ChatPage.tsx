import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text, Animated, Easing, ScrollView, FlatList, Keyboard, Clipboard, Alert, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import MessageIdeas from '@/components/MessageIdeas';
import ChatInput from '@/components/ChatInput';
import { defaultStyles } from '@/constants/Styles';
import { Message, Role, MessageReaction } from '@/utils/Interfaces';
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
import HeaderModelSelector from './HeaderModelSelector';
import DateSeparator from './DateSeparator';
import SmartSuggestions from './SmartSuggestions';
import OfflineBanner from './OfflineBanner';
import SwipeableMessage from './SwipeableMessage';
import VoiceRecordingUI from './VoiceRecordingUI';
import { getDateSeparator, isSameDay } from '@/utils/dateHelpers';
import { RefreshControl } from 'react-native';
import * as Haptics from 'expo-haptics';
import { storage } from '@/hooks/useMMKVStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import MessageReactions from '@/components/MessageReactions';
import MessageEditModal from '@/components/MessageEditModal';
import MessageSearchBar from '@/components/MessageSearchBar';
import PinnedMessagesBar from '@/components/PinnedMessagesBar';
import ThreadReplyIndicator from '@/components/ThreadReplyIndicator';
import { isLlamaModel } from '@/constants/Models';
import SkeletonLoader from '@/components/SkeletonLoader';
import ErrorBanner from '@/components/ErrorBanner';
import EnhancedEmptyState from '@/components/EnhancedEmptyState';
import { SelectedFile } from '@/components/FilePreviewModal';
import CreditPurchaseModal from '@/components/CreditPurchaseModal';
import ArtifactViewerModal from '@/components/artifacts/ArtifactViewerModal';
import { Artifact } from '@/utils/ArtifactTypes';
import apiClient from '@/utils/ApiClient';

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
  const router = useRouter();

  const theme = useTheme();
  const styles = getStyles(theme);
  const insets = useSafeAreaInsets();
  
  // Get selected models (using hooks to ensure reactivity)
  const selectedCloudModel = useDefaultModel();
  const selectedLocalModel = useDefaultLocalModel();

  // States
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelRecording, setCancelRecording] = useState<() => void>(() => () => {});
  // Track if user has manually scrolled up - used for free scrolling during streaming
  // When true, the app won't auto-scroll to bottom, allowing users to read older messages
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  
  // New feature states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorState, setErrorState] = useState<{ show: boolean; type: 'network' | 'api' | 'permission' | 'model' | 'generic'; message: string } | null>(null);
  const [showCreditPurchaseModal, setShowCreditPurchaseModal] = useState(false);
  
  // Artifact modal state
  const [artifactModalVisible, setArtifactModalVisible] = useState(false);
  const [selectedArtifacts, setSelectedArtifacts] = useState<Artifact[]>([]);
  const [selectedArtifactIndex, setSelectedArtifactIndex] = useState(0);


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
    resetChat,
    conversations,
    currentConversationId,
    createNewConversation,
    chatError,
    clearChatError,
    artifacts,
    currentStreamingArtifact,
    getArtifactsForMessage,
  } = chat;


  const id = (params as { id?: string })?.id
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  // File attachments state
  const [files, setFiles] = useState<SelectedFile[]>([]);

  // Type-safe wrapper for fetchMessages
  const handleFetchMessages = useCallback((conversationId?: string) => {
    if (id) {
      return fetchMessages(id);
    }
  }, [id, fetchMessages]);

  // Handle artifact press
  const handleArtifactPress = useCallback((artifact: Artifact, allMessageArtifacts?: Artifact[]) => {
    console.log('[ChatPage] Artifact pressed:', artifact.title);
    
    // Use provided artifacts if available, otherwise just show the single artifact
    const artifactsToShow = allMessageArtifacts && allMessageArtifacts.length > 0 
      ? allMessageArtifacts 
      : [artifact];
    
    // Find index of pressed artifact
    const index = artifactsToShow.findIndex(a => a.id === artifact.id);
    
    console.log('[ChatPage] Opening modal with', artifactsToShow.length, 'artifacts, index:', index);
    
    setSelectedArtifacts(artifactsToShow);
    setSelectedArtifactIndex(index !== -1 ? index : 0);
    setArtifactModalVisible(true);
  }, []);

  const handleCloseArtifactModal = useCallback(() => {
    setArtifactModalVisible(false);
  }, []);

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

  // Effect to handle conversation loading/clearing based on route
  useEffect(() => {
    const loadConversation = async () => {
      if (id) {
        setIsLoadingMessages(true);
        try {
          setCurrentRoom(id);
          await fetchMessages(id);
          setUserHasScrolledUp(false);
        } catch (error) {
          console.error('Error loading conversation:', error);
          setErrorState({
            show: true,
            type: 'network',
            message: 'Unable to load messages. Please try again.'
          });
        } finally {
          setIsLoadingMessages(false);
        }
      } else {
        // Clear conversation when navigating to /new route
        // This prevents old conversation from being refetched
        resetChat();
        setIsLoadingMessages(false);
      }
    };

    loadConversation();

    // Entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [id, resetChat, setCurrentRoom, fetchMessages]);
  
  // Set model selection when conversation loads
  useEffect(() => {
    const currentConversation = conversations.find(c => c.id === id);
    if (currentConversation?.model_type) {
      // Simply set the model - the model selector will handle if it exists or not
      storage.set('default_model_id', currentConversation.model_type);
    }
  }, [id, conversations]);

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
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentOffset = contentOffset.y;
    
    // Store current scroll offset
    scrollOffsetRef.current = currentOffset;

    // In normal list (not inverted), check if user is near the bottom
    // Bottom = where newest messages are
    const scrollPosition = currentOffset + layoutMeasurement.height;
    const bottomThreshold = contentSize.height - 100; // 100px from bottom
    
    // User has scrolled up if they're not near the bottom
    if (scrollPosition < bottomThreshold) {
      setUserHasScrolledUp(true);
    } else {
      setUserHasScrolledUp(false);
    }
  };

  const scrollToBottom = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (messageListRef.current) {
      try {
        // Scroll to the end (bottom) of the list where newest messages are
        messageListRef.current.scrollToEnd({ animated: true });
        setUserHasScrolledUp(false);
      } catch (error) {
        // console.error('Failed to scroll to bottom:', error);
      }
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (id) {
        await fetchMessages(id);
      }
    } catch (error) {
      setErrorState({
        show: true,
        type: 'network',
        message: 'Unable to refresh messages. Check your connection.'
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Handle model selection from header
  const handleModelSelect = async (modelId: string) => {
    try {
      // For local mode, just update storage (no auto-switch needed)
      if (isLocal) {
        storage.set('default_local_model_id', modelId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      // For cloud mode, check if we need to auto-switch between Llama and non-Llama models
      const currentConversation = conversations.find(c => c.id === currentConversationId);
      const currentConversationModelType = currentConversation?.model_type;
      
      // Get current model type - use conversation's model_type if available, 
      // otherwise fall back to the current default model
      const currentModelType = currentConversationModelType || selectedCloudModel?.id;
      
      // Check if switching between Llama and non-Llama models
      const currentIsLlama = currentModelType ? isLlamaModel(currentModelType) : false;
      const newIsLlama = isLlamaModel(modelId);
      
      // Only trigger auto-switch if:
      // 1. We have a model to compare against (conversation or default)
      // 2. We're switching between Llama and non-Llama
      // 3. The current conversation has at least one message
      const isSwitchingBetweenLlamaTypes = currentModelType && 
                                           currentIsLlama !== newIsLlama;
      const hasMessages = messages && messages.length > 0;

      // Update model preference in storage
      storage.set('default_model_id', modelId);

      // If switching between Llama and non-Llama cloud models and there are messages, create new chat
      if (isSwitchingBetweenLlamaTypes && hasMessages) {
        try {
          // Clear current messages from UI
          resetChat();
          
          // Create a new conversation to start fresh
          const newConvId = await createNewConversation();
          if (newConvId) {
            // Navigate to the new conversation
            router.push(`/(chat)/${newConvId}`);
          }
        } catch (error) {
          // console.error('Error creating new conversation after model switch:', error);
          Alert.alert('Error', 'Failed to create new conversation, but model switched successfully');
        }
      }
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // console.error('Error switching model:', error);
      Alert.alert('Error', 'Failed to switch model');
    }
  };

  // Swipe action handlers
  const handleCopyMessage = async (content: string) => {
    Clipboard.setString(content);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Could show a toast here
  };

  const handleDeleteMessage = async (messageId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Delete Message',
      'Are you sure you want to delete this message?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel',
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement delete message logic in useChat hook
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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

  // Messages in chronological order (oldest first, newest last)
  // Newest messages appear at top of screen with bottom spacing
  const displayMessages = useMemo(() => {
    return messages; // No reversal needed
  }, [messages]);

  // New feature handlers
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredMessages([]);
      return;
    }
    
    const filtered = messages.filter(msg =>
      msg.content.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredMessages(filtered);
  }, [messages]);

  const handleMessagePin = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const isPinned = pinnedMessages.some(m => m.id === messageId);
    
    if (isPinned) {
      setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setPinnedMessages(prev => [...prev, { ...message, isPinned: true }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [messages, pinnedMessages]);

  const handleScrollToPinnedMessage = useCallback((messageId: string) => {
    const messageIndex = displayMessages.findIndex(m => m.id === messageId);
    if (messageIndex >= 0 && messageListRef.current) {
      messageListRef.current.scrollToIndex({
        index: messageIndex,
        animated: true,
        viewPosition: 0.5,
      });
    }
  }, [displayMessages]);

  const handleEditMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message && message.role === Role.User) {
      setEditingMessage(message);
    }
  }, [messages]);

  const handleSaveEdit = useCallback((newContent: string) => {
    if (!editingMessage) return;
    
    // Update local messages state
    // In production, you'd also send this to the backend
    // For now, we'll just update locally
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setEditingMessage(null);
  }, [editingMessage]);

  const handleReplyToMessage = useCallback((messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (message) {
      setReplyToMessage(message);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, [messages]);

  const handleAddReaction = useCallback((messageId: string, emoji: string) => {
    // In production, send this to backend
    // For now, update locally
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleRemoveReaction = useCallback((messageId: string, emoji: string) => {
    // In production, send this to backend
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleLikeMessage = useCallback(async (messageId: string, currentReaction?: 'like' | 'dislike' | null) => {
    // Don't do anything if already liked
    if (currentReaction === 'like') return;
    
    // Validate chat_id - should be a UUID or at least not be a temporary msg- ID
    if (!messageId || String(messageId).startsWith('msg-')) {
      Alert.alert('Error', 'Cannot submit feedback - message not synced yet');
      return;
    }
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const response = await apiClient.submitChatFeedback(String(messageId), 'like');
      
      if (response.ok && response.data) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Refresh messages to show the updated reaction
        if (id) {
          fetchMessages(id);
        }
      } else {
        const errorMsg = response.data?.detail || response.problem || 'Failed to submit feedback';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error submitting like:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  }, [id, fetchMessages]);

  const handleDislikeMessage = useCallback(async (messageId: string, currentReaction?: 'like' | 'dislike' | null) => {
    // Don't do anything if already disliked
    if (currentReaction === 'dislike') return;
    
    // Validate chat_id - should be a UUID or at least not be a temporary msg- ID
    if (!messageId || String(messageId).startsWith('msg-')) {
      Alert.alert('Error', 'Cannot submit feedback - message not synced yet');
      return;
    }
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const response = await apiClient.submitChatFeedback(String(messageId), 'dislike');
      
      if (response.ok && response.data) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Refresh messages to show the updated reaction
        if (id) {
          fetchMessages(id);
        }
      } else {
        const errorMsg = response.data?.detail || response.problem || 'Failed to submit feedback';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      console.error('Error submitting dislike:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  }, [id, fetchMessages]);

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    // In normal list, last index is the newest message
    const isLastBotMessage = item.role === Role.Bot && index === displayMessages.length - 1;
    const hasNoContent = !item.content || item.content.trim() === '';
    
    // Show loading state on the last bot message while sending
    // This includes: loading dots (when no content) OR intermediate state (during streaming)
    const showLoading = isLastBotMessage && isSending && (hasNoContent || !!intermediate);
    
    // Show date separator if first message or different day from previous
    const showDateSeparator = 
      index === 0 || 
      !isSameDay(item.timestamp, displayMessages[index - 1]?.timestamp);

    // Check if message can be retried (user message that failed or needs retry)
    const canRetry = item.role === Role.User && !isSending;
    
    // Check if message is pinned
    const isPinned = pinnedMessages.some(m => m.id === item.id);
    
    // Message grouping logic
    const previousMessage = displayMessages[index - 1];
    const nextMessage = displayMessages[index + 1];
    
    const isFirstInGroup = !previousMessage || previousMessage.role !== item.role;
    const isLastInGroup = !nextMessage || nextMessage.role !== item.role;
    const isOnlyInGroup = isFirstInGroup && isLastInGroup;

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
          // onDelete={() => handleDeleteMessage(item.id || `${index}`)}
          onRetry={() => handleRetryMessage(item.content)}
          // onEdit={() => handleEditMessage(item.id || `${index}`)}
          onPin={() => handleMessagePin(item.id || `${index}`)}
          // onReply={() => handleReplyToMessage(item.id || `${index}`)}
          canRetry={canRetry}
          isPinned={isPinned}
        >
          <View>
            {item.replyToMessageId && (
              <ThreadReplyIndicator
                replyToMessageId={item.replyToMessageId}
                replyToContent={item.replyToContent}
                replyToRole={item.replyToRole}
                onPress={() => handleScrollToPinnedMessage(item.replyToMessageId!)}
              />
            )}
            <ChatMessage
              {...item}
              intermediate={intermediate}
              loading={showLoading}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              isOnlyInGroup={isOnlyInGroup}
              artifacts={getArtifactsForMessage(item.id || '')}
              streamingArtifact={currentStreamingArtifact}
              onArtifactPress={handleArtifactPress}
              onCopy={() => handleCopyMessage(item.content)}
              onPin={() => handleMessagePin(item.id || `${index}`)}
              onRetry={() => handleRetryMessage(item.content)}
              isPinned={isPinned}
              canRetry={canRetry}
              onLike={() => handleLikeMessage(item.chat_id || item.id || `${index}`, item.reaction)}
              onDislike={() => handleDislikeMessage(item.chat_id || item.id || `${index}`, item.reaction)}
            />
            {item.reactions && item.reactions.length > 0 && (
              <MessageReactions
                messageId={item.id || `${index}`}
                reactions={item.reactions}
                onAddReaction={handleAddReaction}
                onRemoveReaction={handleRemoveReaction}
              />
            )}
          </View>
        </SwipeableMessage>
      </>
    );
  }, [displayMessages, isSending, intermediate, pinnedMessages, handleCopyMessage, handleDeleteMessage, handleRetryMessage, handleEditMessage, handleMessagePin, handleReplyToMessage, handleScrollToPinnedMessage, handleAddReaction, handleRemoveReaction]);

  const CustomView = Platform.OS === 'ios' ? PanGestureHandler : View

  // File preview is handled via FilePreviewModal in ChatInput

  return (
    <GradientBackground variant="background" style={styles.pageContainer}>
      {/* Error Banner - Priority to chatError from useChat */}
      {(chatError || errorState?.show) && (
        <ErrorBanner
          type={chatError?.type || errorState!.type}
          message={chatError?.message || errorState!.message}
          onDismiss={() => {
            if (chatError) {
              clearChatError();
            } else {
              setErrorState(null);
            }
          }}
          autoHide={true}
          autoHideDuration={chatError?.type === 'credit' ? 10000 : 5000}
          action={chatError?.type === 'credit' ? {
            text: 'Purchase Credits',
            onPress: () => {
              clearChatError();
              setShowCreditPurchaseModal(true);
            }
          } : {
            text: 'Retry',
            onPress: () => {
              if (chatError) {
                clearChatError();
              } else {
                setErrorState(null);
              }
              if (id) fetchMessages(id);
            }
          }}
        />
      )}
      
      {/* <OfflineBanner isLocal={isLocal} /> */}
      {showSearch && (
        <MessageSearchBar
          onSearch={handleSearch}
          onClose={() => {
            setShowSearch(false);
            setSearchQuery('');
            setFilteredMessages([]);
          }}
        />
      )}
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
        style={styles.keyboardAvoidingView}
      >
        {/* Pinned Messages Bar - Outside main content area */}
        {pinnedMessages.length > 0 && (
          <PinnedMessagesBar
            pinnedMessages={pinnedMessages}
            onMessagePress={handleScrollToPinnedMessage}
            onUnpin={handleMessagePin}
          />
        )}
        
        {/* Main Message List Container - Takes all available space */}
        <View style={styles.page} onLayout={onLayout}>
          {/* Enhanced Empty State */}
          {messages.length === 0 && !isLoadingMessages && (
            <Animated.View
              style={[
                { flex: 1, opacity: fadeAnim }
              ]}
            >
              <EnhancedEmptyState
                firstName={user?.first_name}
                modelName={isLocal ? selectedLocalModel?.displayName : selectedCloudModel?.displayName}
                isLocal={isLocal}
              />
            </Animated.View>
          )}

          {/* Skeleton Loaders when loading messages */}
          {isLoadingMessages && messages.length === 0 && (
            <View style={{ flex: 1, paddingTop: 20 }}>
              <SkeletonLoader variant="message" count={5} />
            </View>
          )}

          {/* Loading indicator when switching conversations */}
          {isLoadingMessages && messages.length > 0 && (
            <View style={styles.loadingOverlay} pointerEvents="box-none">
              <View style={styles.loadingContainer} pointerEvents="auto">
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            </View>
          )}

          {messages.length > 0 && (
          <CustomView style={{ flex: 1 }}>
            {/* 
              FlashList configured for top-aligned messages with bottom spacing:
              - Chronological order: Oldest first, newest last
              - Newest messages appear at TOP of screen (immediately visible under header)
              - Bottom spacing component provides padding for comfortable reading
              - No auto-scroll during streaming: User control
              - Smooth content updates without scroll jumping
            */}
            <FlashList
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ref={messageListRef}
              data={displayMessages}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.id || `msg-${index}`}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              estimatedItemSize={150}
              scrollEventThrottle={16}
              // Disable automatic scrolling during streaming by not including extraData
              // This prevents the list from re-rendering and jumping during stream updates
              // Add bottom spacer component for comfortable reading
              ListFooterComponent={<View style={{ height: 300 }} />}
              // Pull to refresh
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.colors.primary}
                  colors={[theme.colors.primary]}
                  progressViewOffset={20}
                />
              }
              // Pagination
              onEndReachedThreshold={0.5}
              onEndReached={() => {
                // Load more messages when scrolling to bottom (older messages in pagination)
                if (!refreshing && displayMessages.length > 0) {
                  // You can implement pagination here
                }
              }}
              // Memory optimization - Different recycling for user/bot messages
              getItemType={(item) => {
                return item.role === Role.User ? 'user' : 'bot';
              }}
              // Drawing optimization
              drawDistance={500}
            />
          </CustomView>
          )}
          {showScrollButton && messages.length > 0 && (
            <TouchableOpacity
              style={[styles.scrollButton, styles.touchTarget]}
              onPress={scrollToBottom}
              accessibilityLabel="Scroll to latest message"
              accessibilityRole="button"
              activeOpacity={0.6}
            >
              <Text style={styles.textScrollDown}>
                {isSending ? 'Streaming...' : 'New messages'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={Colors.common.grey} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Bottom Section - Fixed Elements (Outside scrollable area) */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom }]}>
          {/* Local Model Progress */}
          {isLocal && (
            <LocalModelDownloadProgress 
              progress={localModelDownloadProgress} 
              isReady={isLocalModelReady} 
            />
          )}
          
          {/* Voice Recording UI */}
          <VoiceRecordingUI 
            isRecording={isRecording}
            onCancel={cancelRecording}
          />
          
          {/* Reply To Message */}
          {replyToMessage && (
            <View style={styles.replyContainer}>
              <ThreadReplyIndicator
                replyToMessageId={replyToMessage.id}
                replyToContent={replyToMessage.content}
                replyToRole={replyToMessage.role}
                onClear={() => setReplyToMessage(null)}
              />
            </View>
          )}
          
          {/* Attachment Preview */}
          {files.length > 0 && (
            <View style={styles.attachmentPreviewContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {files.map((file, index) => (
                  <View key={`file-${index}`} style={styles.attachmentPreview}>
                    <Image
                      source={{ uri: file.uri }}
                      style={styles.attachmentPreviewImage}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.removeAttachmentButton}
                      onPress={() => {
                        setFiles(files.filter((_, i) => i !== index));
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      accessibilityLabel="Remove attachment"
                      accessibilityRole="button"
                    >
                      <Ionicons name="close-circle" size={24} color={theme.colors.red} />
                    </TouchableOpacity>
                    <View style={styles.attachmentInfo}>
                      <Ionicons name="image" size={16} color="#FFFFFF" />
                      <Text style={styles.attachmentName} numberOfLines={1}>
                        {file.name || 'Attachment'}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}
          
          {/* Chat Input - Always at Bottom */}
          <ChatInput
            files={files}
            setFiles={setFiles}
            fetchMessages={handleFetchMessages}
            onShouldSend={(message: string, type?: string, operation?: string | null, additionalData?: string, options?: any) => {
              // Auto-scroll to bottom only when sending a new message (not during streaming)
              // Only if user hasn't manually scrolled up to read older messages
              if (!userHasScrolledUp) {
                scrollToBottom();
              }
              return isLocal ? handleSendLocalMessage(message) : sendMessage(message, type, operation, additionalData, options);
            }}
            isLoading={isSending}
            isLocal={isLocal}
            onRecordingStateChange={(recording, onCancel) => {
              setIsRecording(recording);
              setCancelRecording(() => onCancel);
            }}
            messages={messages}
            conversationTitle={id ? `Conversation ${id}` : 'Chat'}
            currentModelId={isLocal ? selectedLocalModel?.id : selectedCloudModel?.id}
          />
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <MessageEditModal
        visible={!!editingMessage}
        originalContent={editingMessage?.content || ''}
        onClose={() => setEditingMessage(null)}
        onSave={handleSaveEdit}
      />
      <CreditPurchaseModal
        visible={showCreditPurchaseModal}
        onClose={() => setShowCreditPurchaseModal(false)}
        onSuccess={() => {
          // Refetch messages or take appropriate action after purchase
          if (id) fetchMessages(id);
        }}
        source={chatError?.type === 'credit' ? 'error_banner' : 'header_badge'}
      />
      
      {/* Artifact Viewer Modal */}
      <ArtifactViewerModal
        visible={artifactModalVisible}
        artifacts={selectedArtifacts}
        initialIndex={selectedArtifactIndex}
        onClose={handleCloseArtifactModal}
      />
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
  // Attachment Preview Styles
  attachmentPreviewContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
  },
  attachmentPreview: {
    position: 'relative',
    width: 120,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.backgroundLight,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  attachmentPreviewImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  removeAttachmentButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  attachmentInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  attachmentName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    flex: 1,
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
    flex: 1, // Takes all available space above the input
  },
  keyboardAvoidingView: {
    flex: 1,
    backgroundColor: 'transparent', // Let gradient show through
  },
  bottomSection: {
    // Container for all bottom fixed elements (input, attachments, etc.)
    // Fixed to bottom with proper safe area padding
    width: '100%',
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
  },
  replyContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  // Touch target improvements (minimum 44px as per iOS HIG)
  touchTarget: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Loading overlay styles
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
  },

});

export default ChatPage;
