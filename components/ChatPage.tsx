import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text, Animated, Easing, ScrollView, FlatList, Keyboard, Clipboard, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useRouter } from 'expo-router';
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
import { useDefaultModel } from '@/hooks/useDefaultModel';
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
import ArtifactViewerModal from '@/components/artifacts/ArtifactViewerModal';
import { Artifact } from '@/utils/ArtifactTypes';
import apiClient from '@/utils/ApiClient';
import { ModelDownloadScreen } from '@/components/ModelDownloadScreen';
import { DEFAULT_LOCAL_MODEL, LOCAL_MODEL_LIMITS } from '@/constants/LocalModelsConfig';

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

  // States
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cancelRecording, setCancelRecording] = useState<() => void>(() => () => {});
  const [flashListReady, setFlashListReady] = useState(false);
  // Track if user has manually scrolled up - used for free scrolling during streaming
  // When true, the app won't auto-scroll to bottom, allowing users to read older messages
  const [userHasScrolledUp, setUserHasScrolledUp] = useState(false);
  // Track if we're currently auto-scrolling (to prevent interference with user scrolling)
  const isAutoScrollingRef = useRef(false);
  // Track if user is actively interacting with scroll
  const userIsScrollingRef = useRef(false);
  
  // New feature states
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [errorState, setErrorState] = useState<{ show: boolean; type: 'network' | 'api' | 'permission' | 'model' | 'generic'; message: string } | null>(null);
  
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
  const hasScrolledForConversationRef = useRef<string | null>(null); // Track which conversation we've scrolled for

  // Hooks
  const chat = useChat();
  const { 
    messages, 
    sendMessage, 
    setCurrentRoom, 
    isSending, 
    stream, 
    fetchMessages, 
    intermediate,
    reasoningText,
    resetChat,
    conversations,
    currentConversationId,
    createNewConversation,
    chatError,
    clearChatError,
    artifacts,
    currentStreamingArtifact,
    getArtifactsForMessage,
    updateMessageReaction,
    stopStreaming,
    streamingForConversationId,
    // Local model global state
    isLocal,
    isLocalModelReady,
    isLocalModelGenerating,
    localModelDownloadProgress,
    isLocalModelDownloading,
    localModelError,
    isLocalModelSupported,
    llm: globalLLM, // Get global LLM instance
    updateLocalModelReady,
    updateLocalModelGenerating,
  } = chat;

  // ============ Local Model Integration ============

  // Local messages state (separate from cloud messages)
  const [localConversationMessages, setLocalConversationMessages] = useState<Message[]>([]);
  const localAssistantMessageIdRef = useRef<string | null>(null);
  const [localStreamContent, setLocalStreamContent] = useState('');
  
  // Monitor global LLM response for streaming
  useEffect(() => {
    if (isLocal && globalLLM?.response) {
      const response = globalLLM.response;
      console.log('[ChatPage] Global LLM stream update:', response.length, 'chars');
      setLocalStreamContent(response);
    }
  }, [globalLLM?.response, isLocal]);
  
  // Update assistant message when stream content changes
  useEffect(() => {
    if (localStreamContent && localAssistantMessageIdRef.current) {
      setLocalConversationMessages(prev => {
        const updated = [...prev];
        const lastIndex = updated.length - 1;
        if (lastIndex >= 0 && updated[lastIndex].role === Role.Bot) {
          updated[lastIndex] = {
            ...updated[lastIndex],
            content: localStreamContent,
          };
        }
        return updated;
      });
    }
  }, [localStreamContent]);
  
  // Monitor global LLM generating state
  useEffect(() => {
    if (globalLLM?.isGenerating !== undefined) {
      console.log('[ChatPage] Global LLM generating state:', globalLLM.isGenerating);
      updateLocalModelGenerating(globalLLM.isGenerating);
    }
  }, [globalLLM?.isGenerating, updateLocalModelGenerating]);

  // Calculate dynamic buffer height based on last user message type
  // Audio messages need more buffer than text messages to prevent clipping
  const dynamicBufferHeight = useMemo(() => {
    const screenHeight = Dimensions.get('window').height;
    const headerHeight = 100; // Approximate header height including navigation
    const feedbackIconsHeight = 50; // Height of like/dislike feedback buttons on assistant messages
    
    // Check if the last user message is audio (needs extra 20px)
    let isLastUserMessageAudio = false;
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message?.role === Role.User) {
        isLastUserMessageAudio = !!message?.files && message.files.length > 0;
        break;
      }
    }
    
    const audioExtraBuffer = isLastUserMessageAudio ? -40 : 0; // Extra 20px for audio messages
    
    return Math.max(
      450 + audioExtraBuffer,  // Minimum buffer + extra for audio if needed
      screenHeight * 0.5 - insets.top - insets.bottom - headerHeight - feedbackIconsHeight + audioExtraBuffer
    );
  }, [messages, insets]);


  const id = (params as { id?: string })?.id
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  // Only show streaming content if it belongs to the current conversation
  // This prevents background streams from appearing in the wrong conversation
  const isStreamingForThisConversation = !streamingForConversationId || streamingForConversationId === id;
  const displayStream = isStreamingForThisConversation ? stream : '';
  const displayIntermediate = isStreamingForThisConversation ? intermediate : '';
  const displayReasoningText = isStreamingForThisConversation ? reasoningText : '';
  const displayStreamingArtifact = isStreamingForThisConversation ? currentStreamingArtifact : null;
  
  // Debug: Log reasoning text changes
  useEffect(() => {
    if (reasoningText) {
      console.log('[ChatPage] 🧠 reasoningText updated:', {
        length: reasoningText.length,
        preview: reasoningText.substring(0, 100) + (reasoningText.length > 100 ? '...' : '')
      });
    }
  }, [reasoningText]);
  
  // Debug: Monitor intermediate state changes
  useEffect(() => {
    if (__DEV__) {
      console.log('[ChatPage] 🔍 Intermediate state changed in ChatPage:', {
        intermediate,
        isSending,
        hasIntermediate: !!displayIntermediate
      });
    }
  }, [displayIntermediate, isSending]);
  
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
        
        // Reset all scroll-related state and refs when opening a new chat
        console.log('[ChatPage] 🔄 Resetting scroll state for new conversation:', id);
        setUserHasScrolledUp(false);
        setFlashListReady(false); // Reset FlashList ready state
        scrollOffsetRef.current = 0;
        isAutoScrollingRef.current = false;
        userIsScrollingRef.current = false;
        prevMessagesRef.current = []; // Reset to allow fresh detection
        hasScrolledForConversationRef.current = null; // Clear scroll tracking for new conversation
        
        try {
          setCurrentRoom(id);
          await fetchMessages(id);
          
          // Note: Scroll will happen in separate effect below after messages update
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
        
        // Reset scroll refs for new empty chat
        prevMessagesRef.current = [];
        setUserHasScrolledUp(false);
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
  
  // Separate effect to scroll to bottom after messages are loaded from API
  // This runs AFTER messages state updates, ensuring we have the correct count
  useEffect(() => {
    // Only scroll if:
    // 1. We just finished loading
    // 2. We have messages
    // 3. We have a conversation ID
    // 4. FlashList is ready (has been laid out)
    // 5. We haven't already scrolled for this conversation
    if (!isLoadingMessages && messages.length > 0 && id && flashListReady && hasScrolledForConversationRef.current !== id) {
      // Check if this is an initial load (prevMessagesRef was reset to empty)
      if (prevMessagesRef.current.length === 0) {
        console.log('[ChatPage] 📜 Initial load detected for conversation:', id);
        console.log('[ChatPage] 📊 Messages count:', messages.length);
        console.log('[ChatPage] ✅ FlashList is ready');
        
        // Mark that we're handling scroll for this conversation
        hasScrolledForConversationRef.current = id;
        
        // Wait a brief moment after layout for final adjustments, then scroll
        setTimeout(() => {
          if (messageListRef.current && messages.length > 0) {
            try {
              console.log('[ChatPage] 🎯 Scrolling to end of list');
              messageListRef.current.scrollToEnd({ animated: false });
              console.log('[ChatPage] ✅ Initial scroll completed for conversation:', id);
            } catch (error) {
              console.warn('[ChatPage] ❌ Scroll failed:', error);
            }
          }
        }, 200); // Reduced delay since FlashList is already laid out
      }
    }
  }, [isLoadingMessages, messages.length, id, flashListReady]);
  
  // Set model selection when conversation loads
  useEffect(() => {
    const currentConversation = conversations.find(c => c.id === id);
    if (currentConversation?.model_type) {
      console.log('[ChatPage] 🎯 Loading conversation with model:', currentConversation.model_type);
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

  // Handle auto-scroll behavior during streaming
  // This effect manages scrolling while messages are being streamed
  useEffect(() => {
    // Only consider auto-scrolling if:
    // 1. We have messages
    // 2. We're currently sending/streaming
    // 3. User hasn't manually scrolled up to read older content
    if (messages.length > 0 && isSending && !userHasScrolledUp && !userIsScrollingRef.current) {
      // Use a small delay to allow content to render before scrolling
      const scrollTimer = setTimeout(() => {
        // Re-check all conditions before scrolling (user might have started scrolling during delay)
        if (messageListRef.current && !userHasScrolledUp && !userIsScrollingRef.current && messages.length > 0) {
          try {
            // Mark as auto-scrolling to prevent handleScroll interference
            isAutoScrollingRef.current = true;
            
            // Use scrollToIndex for more reliable scrolling during streaming
            const lastIndex = messages.length - 1;
            messageListRef.current.scrollToIndex({ 
              index: lastIndex, 
              animated: false, // No animation during streaming for smoothness
              viewPosition: 1, 
            });
            
            // Keep flag set longer to cover full scroll event propagation
            setTimeout(() => {
              isAutoScrollingRef.current = false;
            }, 150);
          } catch (error) {
            // Fallback to scrollToEnd if scrollToIndex fails
            try {
              messageListRef.current.scrollToEnd({ animated: false });
            } catch (fallbackError) {
              // Silent fail
            }
            isAutoScrollingRef.current = false;
          }
        }
      }, 100);

      return () => clearTimeout(scrollTimer);
    }
    
    // Reset user scrolling flag when streaming stops
    if (!isSending) {
      userIsScrollingRef.current = false;
    }
  }, [messages, isSending, userHasScrolledUp]);

  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeight(height / 2);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const currentOffset = contentOffset.y;
    
    // Store current scroll offset
    scrollOffsetRef.current = currentOffset;

    // Don't update userHasScrolledUp if we're auto-scrolling
    if (isAutoScrollingRef.current) {
      return;
    }

    // Mark that user is actively scrolling (for debouncing)
    userIsScrollingRef.current = true;

    // In normal list (not inverted), check if user is near the bottom
    // Bottom = where newest messages are
    const scrollPosition = currentOffset + layoutMeasurement.height;
    // Use a proportional threshold based on dynamic buffer (minimum 150px)
    const thresholdDistance = Math.max(150, dynamicBufferHeight * 0.25);
    const bottomThreshold = contentSize.height - thresholdDistance;
    
    // User has scrolled up if they're not near the bottom
    if (scrollPosition < bottomThreshold) {
      setUserHasScrolledUp(true);
    } else {
      setUserHasScrolledUp(false);
    }
  };

  const scrollToBottom = async (animated: boolean = true) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (messageListRef.current && displayMessages.length > 0) {
      try {
        // Mark that we're auto-scrolling to prevent handleScroll from interfering
        isAutoScrollingRef.current = true;
        
        // Use scrollToIndex to scroll to last message (more reliable than scrollToEnd with FlashList)
        // viewPosition: 1 means the item will be at the bottom of the viewport
        const lastIndex = displayMessages.length - 1;
        messageListRef.current.scrollToIndex({ 
          index: lastIndex, 
          animated,
          viewPosition: 1, // Position at bottom of viewport
        });
        setUserHasScrolledUp(false);
        
        // Reset auto-scrolling flag after animation completes
        setTimeout(() => {
          isAutoScrollingRef.current = false;
        }, animated ? 350 : 0); // Animation typically takes ~300ms
      } catch (error) {
        // Fallback to scrollToEnd if scrollToIndex fails
        try {
          messageListRef.current.scrollToEnd({ animated });
          setUserHasScrolledUp(false);
        } catch (fallbackError) {
          // Silent fail
        }
        isAutoScrollingRef.current = false;
        // console.error('Failed to scroll to bottom:', error);
      }
    }
  };
  const onRefresh = async () => {
    setRefreshing(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Mark that we want to scroll after refresh
    const shouldScrollAfterRefresh = true;
    
    try {
      if (id) {
        await fetchMessages(id);
        
        // Scroll to bottom after messages are refreshed
        if (shouldScrollAfterRefresh) {
          // Wait for FlashList to update with new messages
          setTimeout(() => {
            if (messageListRef.current && messages.length > 0) {
              try {
                const lastIndex = messages.length - 1;
                console.log('[ChatPage] 🔄 Scrolling to bottom after refresh (index:', lastIndex, ')');
                
                messageListRef.current.scrollToIndex({ 
                  index: lastIndex, 
                  animated: true,
                  viewPosition: 1, // Bottom of viewport
                });
              } catch (error) {
                // Fallback to scrollToEnd
                console.log('[ChatPage] ⚠️ Refresh scroll failed, using fallback');
                try {
                  messageListRef.current.scrollToEnd({ animated: true });
                } catch (fallbackError) {
                  // Silent fail
                }
              }
            }
          }, 400); // Increased delay for reliability
        }
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
    // Resend the message (cloud-only now)
    sendMessage(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Messages in chronological order (oldest first, newest last)
  // Newest messages appear at top of screen with bottom spacing
  const displayMessages = useMemo(() => {
    // Separation of concerns: Local mode shows local messages, Cloud shows cloud messages
    if (isLocal) {
      // Local mode: Show ONLY local messages (even if empty to show empty state)
      console.log('[ChatPage] 📊 displayMessages (LOCAL MODE):', {
        localCount: localConversationMessages.length,
        messages: localConversationMessages.map(m => ({
          role: m.role,
          contentLength: m.content?.length || 0,
          id: m.id
        })),
      });
      return localConversationMessages;
    }
    
    // Cloud mode: Show cloud messages
    console.log('[ChatPage] 📊 displayMessages (CLOUD MODE):', {
      count: messages.length,
    });
    return messages;
  }, [messages, isLocal, localConversationMessages]);
  
  // Track previous messages to detect new user messages
  const prevMessagesRef = useRef<Message[]>([]);
  
  // Auto-scroll to newly sent user messages
  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessagesRef.current.length;
    
    console.log('[ChatPage] 🔍 Message count changed:', { currentCount, prevCount });
    
    // Only act if messages were added (not removed or initial load)
    if (currentCount > prevCount && prevCount > 0) {
      // Find newly added messages by comparing with previous state
      const newMessages = messages.slice(prevCount);
      
      console.log('[ChatPage] 🆕 New messages detected:', newMessages.length);
      
      // Check if any of the new messages is from the user
      const hasNewUserMessage = newMessages.some(msg => msg.role === Role.User);
      
      console.log('[ChatPage] 👤 Has new user message:', hasNewUserMessage);
      
      if (hasNewUserMessage) {
        // Find the last user message in the entire list
        let lastUserMessageIndex = -1;
        for (let i = messages.length - 1; i >= 0; i--) {
          if (messages[i].role === Role.User) {
            lastUserMessageIndex = i;
            break;
          }
        }
        
        if (lastUserMessageIndex >= 0) {
          // Capture the index value to avoid closure issues
          const targetIndex = lastUserMessageIndex;
          const totalMessages = messages.length;
          
          console.log('[ChatPage] 🎯 Will scroll to user message at index:', targetIndex, 'of', totalMessages);
          
          // Scroll to bring the new user message into view
          // Use a slight delay to ensure the message has rendered
          setTimeout(() => {
            try {
              if (messageListRef.current) {
                console.log('[ChatPage] 📜 Executing scroll to index:', targetIndex);
                
                // Simple approach: scroll to the user message at the top
                // viewPosition: 0 means item appears at the top of the viewport
                // Use small positive viewOffset to add padding from the top
                
                messageListRef.current.scrollToIndex({
                  index: targetIndex,
                  animated: true,
                  viewPosition: 0, // Align to top of viewport
                  viewOffset: 20, // Small positive offset for padding from top
                });
                
                console.log('[ChatPage] ✅ Scroll command executed successfully');
              } else {
                console.log('[ChatPage] ⚠️ messageListRef.current is null');
              }
            } catch (error) {
              // Fallback to scrollToEnd if scrollToIndex fails (e.g., item not measured yet)
              console.log('[ChatPage] ⚠️ scrollToIndex failed:', error);
              try {
                messageListRef.current?.scrollToEnd({ animated: true });
                console.log('[ChatPage] ✅ Fallback scrollToEnd executed');
              } catch (fallbackError) {
                console.warn('[ChatPage] ❌ Auto-scroll completely failed:', fallbackError);
              }
            }
          }, 200); // Delay for rendering
        }
      }
    }
    
    // Update the ref for next comparison
    prevMessagesRef.current = messages;
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
      
      // Optimistically update the message locally to avoid flash
      updateMessageReaction(messageId, 'like');
      
      const response = await apiClient.submitChatFeedback(String(messageId), 'like');
      
      if (response.ok && response.data) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Don't refetch messages - optimistic update is sufficient
        // Refetching causes a flash as FlashList re-renders all items
        // The reaction is already updated locally and will sync naturally
        // on next conversation switch or app reload
        console.log('[ChatPage] ✅ Like submitted successfully (using optimistic update)');
      } else {
        // Revert optimistic update on error
        updateMessageReaction(messageId, currentReaction || null);
        
        const errorMsg = response.data?.detail || response.problem || 'Failed to submit feedback';
        Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      // Revert optimistic update on error
      updateMessageReaction(messageId, currentReaction || null);
      
      console.error('Error submitting like:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  }, [id, updateMessageReaction]);

  const handleDislikeMessage = useCallback(async (messageId: string, currentReaction?: 'like' | 'dislike' | null) => {
    // Don't do anything if already disliked
    if (currentReaction === 'dislike') return;
    
    // Validate chat_id - should be a UUID or at least not be a temporary msg- ID
    if (!messageId || String(messageId).startsWith('msg-')) {
      // Alert.alert('Error', 'Cannot submit feedback - message not synced yet');
      return;
    }
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Optimistically update the message locally to avoid flash
      updateMessageReaction(messageId, 'dislike');
      
      const response = await apiClient.submitChatFeedback(String(messageId), 'dislike');
      
      if (response.ok && response.data) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Don't refetch messages - optimistic update is sufficient
        // Refetching causes a flash as FlashList re-renders all items
        // The reaction is already updated locally and will sync naturally
        // on next conversation switch or app reload
        console.log('[ChatPage] ✅ Dislike submitted successfully (using optimistic update)');
      } else {
        // Revert optimistic update on error
        updateMessageReaction(messageId, currentReaction || null);
        
        const errorMsg = response.data?.detail || response.problem || 'Failed to submit feedback';
        // Alert.alert('Error', errorMsg);
      }
    } catch (error) {
      // Revert optimistic update on error
      updateMessageReaction(messageId, currentReaction || null);
      
      console.error('Error submitting dislike:', error);
      // Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    }
  }, [id, updateMessageReaction]);

  const renderItem = useCallback(({ item, index }: { item: Message; index: number }) => {
    // In normal list, last index is the newest message
    const isLastBotMessage = item.role === Role.Bot && index === displayMessages.length - 1;
    const hasNoContent = !item.content || item.content.trim() === '';
    
    // Show loading state ONLY when:
    // 1. This is the last bot message
    // 2. We're currently sending
    // 3. No content has arrived yet
    // Once streaming begins (content arrives), hide loading dots
    // Intermediate states will be shown separately in ChatMessage
    const showLoading = isLastBotMessage && isSending && hasNoContent;
    
    // Debug log for loading state in renderItem
    if (__DEV__ && isLastBotMessage && isSending) {
      console.log('[ChatPage] 🎯 renderItem for last bot message:', {
        hasNoContent,
        hasContent: !hasNoContent,
        hasIntermediate: !!intermediate,
        intermediateValue: intermediate,
        showLoading,
        isSending,
        contentPreview: item.content?.substring(0, 50) + '...'
      });
    }
    
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
              loading={showLoading}
              isFirstInGroup={isFirstInGroup}
              isLastInGroup={isLastInGroup}
              isOnlyInGroup={isOnlyInGroup}
              artifacts={!isLocal ? getArtifactsForMessage(item.id || '') : []} // No artifacts in local mode
              streamingArtifact={!isLocal ? displayStreamingArtifact : null} // No artifacts in local mode
              streamingReasoning={!isLocal ? (() => {
                const isLastMessage = index === displayMessages.length - 1;
                const reasoning = isLastMessage ? displayReasoningText : undefined;
                if (reasoning && reasoning.length > 0) {
                  console.log('[ChatPage] 🧠 Passing reasoning to last message:', {
                    messageIndex: index,
                    isLastMessage,
                    reasoningLength: reasoning.length,
                    reasoningPreview: reasoning.substring(0, 50) + '...'
                  });
                }
                return reasoning;
              })() : undefined} // No reasoning in local mode
              onArtifactPress={!isLocal ? handleArtifactPress : undefined}
              onCopy={() => handleCopyMessage(item.content)} // Copy still works
              onPin={!isLocal ? () => handleMessagePin(item.id || `${index}`) : undefined} // No pinning in local mode
              onRetry={!isLocal ? () => handleRetryMessage(item.content) : undefined} // No retry in local mode
              isPinned={!isLocal && isPinned}
              canRetry={!isLocal && canRetry}
              onLike={!isLocal ? () => handleLikeMessage(item.chat_id || item.id || `${index}`, item.reaction) : undefined}
              onDislike={!isLocal ? () => handleDislikeMessage(item.chat_id || item.id || `${index}`, item.reaction) : undefined}
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
  }, [displayMessages, isSending, pinnedMessages, handleCopyMessage, handleDeleteMessage, handleRetryMessage, handleEditMessage, handleMessagePin, handleReplyToMessage, handleScrollToPinnedMessage, handleAddReaction, handleRemoveReaction, getArtifactsForMessage, displayStreamingArtifact, displayReasoningText, id, fetchMessages, handleLikeMessage, handleDislikeMessage]);

  const CustomView = Platform.OS === 'ios' ? PanGestureHandler : View

  // File preview is handled via FilePreviewModal in ChatInput

  // Gate the chat behind the on-device model being downloaded + loaded.
  // On first launch ExecuTorch downloads ~1.2GB; show real progress instead
  // of letting the user type into a model that isn't ready.
  if (isLocal && isLocalModelSupported && !isLocalModelReady) {
    return (
      <GradientBackground variant="background" style={styles.pageContainer}>
        <ModelDownloadScreen
          progress={localModelDownloadProgress}
          isDownloading={isLocalModelDownloading || localModelDownloadProgress > 0}
          estimatedTimeRemaining={null}
          downloadSizeMB={1180}
          onStartDownload={() => { /* ExecuTorch loads automatically */ }}
          onCancelDownload={() => { /* download is managed by the library */ }}
          modelName={DEFAULT_LOCAL_MODEL.name}
        />
      </GradientBackground>
    );
  }

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
          autoHideDuration={5000}
          action={{
            text: 'Retry',
            onPress: async () => {
              if (chatError) {
                clearChatError();
              } else {
                setErrorState(null);
              }
              if (id) {
                await fetchMessages(id);
                
                // Scroll to bottom after retry fetch
                // Wait for FlashList to render updated messages
                setTimeout(() => {
                  if (messageListRef.current && messages.length > 0) {
                    try {
                      const lastIndex = messages.length - 1;
                      console.log('[ChatPage] 🔄 Scrolling to bottom after retry (index:', lastIndex, ')');
                      
                      messageListRef.current.scrollToIndex({ 
                        index: lastIndex, 
                        animated: true,
                        viewPosition: 1, // Bottom of viewport
                      });
                    } catch (error) {
                      // Fallback to scrollToEnd
                      console.log('[ChatPage] ⚠️ Retry scroll failed, using fallback');
                      try {
                        messageListRef.current.scrollToEnd({ animated: true });
                      } catch (fallbackError) {
                        // Silent fail
                      }
                    }
                  }
                }, 400); // Increased delay for reliability
              }
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
              source={theme.isDark ? require('@/assets/images/Localelogodark.png') : require('@/assets/images/Localelogowhite.png')} 
              style={styles.logo} 
            />
          </View>
        ),
        headerRight: () => (
          <View style={{ marginRight: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons name="hardware-chip-outline" size={16} color={theme.colors.text} />
            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>
              On-device AI
            </Text>
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
          {displayMessages.length === 0 && !isLoadingMessages && (
            <Animated.View
              style={[
                { flex: 1, opacity: fadeAnim }
              ]}
            >
              <EnhancedEmptyState
                firstName={user?.first_name}
                modelName={isLocal ? 'Local AI' : selectedCloudModel?.name}
                isLocal={isLocal}
              />
            </Animated.View>
          )}

          {/* Skeleton Loaders when loading messages */}
          {isLoadingMessages && displayMessages.length === 0 && (
            <View style={{ flex: 1, paddingTop: 20 }}>
              <SkeletonLoader variant="message" count={5} />
            </View>
          )}

          {/* Loading indicator when switching conversations */}
          {isLoadingMessages && displayMessages.length > 0 && (
            <View style={styles.loadingOverlay} pointerEvents="box-none">
              <View style={styles.loadingContainer} pointerEvents="auto">
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading messages...</Text>
              </View>
            </View>
          )}

          {displayMessages.length > 0 && (
          <CustomView style={{ flex: 1 }}>
            {/* 
              FlashList configured for top-aligned messages with bottom spacing:
              - Chronological order: Oldest first, newest last
              - Newest messages appear at TOP of screen (immediately visible under header)
              - Bottom spacing component provides padding for comfortable reading
              - No auto-scroll during streaming: User control
              - Smooth content updates without scroll jumping
              - Works for both cloud and local messages
            */}
            <FlashList
              contentContainerStyle={{ paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              ref={messageListRef}
              data={displayMessages}
              renderItem={renderItem}
              keyExtractor={(item, index) => item.id || `msg-${index}`}
              // Debug: Log when list updates
              extraData={displayMessages.length} // Force re-render when length changes
              ListEmptyComponent={() => {
                console.log('[ChatPage] 🔍 FlashList is empty, displayMessages:', displayMessages.length);
                return null;
              }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              onLayout={() => {
                // Mark FlashList as ready after initial layout
                if (!flashListReady) {
                  console.log('[ChatPage] 📐 FlashList layout complete, marking as ready');
                  setFlashListReady(true);
                }
              }}
              onScroll={handleScroll}
              onScrollBeginDrag={() => {
                // User started dragging - mark as actively scrolling
                userIsScrollingRef.current = true;
              }}
              onScrollEndDrag={() => {
                // Don't clear immediately - user might start momentum scroll
                // Keep the flag set briefly to prevent auto-scroll from interfering
                setTimeout(() => {
                  userIsScrollingRef.current = false;
                }, 300);
              }}
              onMomentumScrollBegin={() => {
                // Momentum scroll started - ensure flag stays set
                userIsScrollingRef.current = true;
              }}
              onMomentumScrollEnd={() => {
                // Momentum scrolling ended - clear flag after brief delay
                setTimeout(() => {
                  userIsScrollingRef.current = false;
                }, 200);
              }}
              estimatedItemSize={200} // Increased for better scroll position calculation
              // PERFORMANCE OPTIMIZATION: Reduce scroll event frequency during streaming
              // During streaming: 100ms throttle (reduces scroll event overhead)
              // Normal state: 16ms for 60 FPS responsiveness
              scrollEventThrottle={isSending ? 100 : 16}
              // ChatMessage components access intermediate state directly from context
              // This avoids forcing FlashList re-renders for better performance
              // Add bottom spacer component for comfortable reading
              // Dynamic height ensures user message appears at top without showing previous response
              ListFooterComponent={<View style={{ height: dynamicBufferHeight }} />}
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
              onPress={() => scrollToBottom(true)}
              accessibilityLabel="Scroll to latest message"
              accessibilityRole="button"
              activeOpacity={0.6}
            >
              <Text style={isSending && styles.textScrollDown}>
                {isSending ? 'Streaming...' : ''}
              </Text>
              <Ionicons name="chevron-down" size={16} color={theme.isDark ? theme.colors.text : Colors.common.grey} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Bottom Section - Fixed Elements (Outside scrollable area) */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom }]}>
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
          
          {/* Chat Input - Shows in chat mode, hidden in download mode */}
          <ChatInput
            files={isLocal ? [] : files} // No file attachments in local mode
            setFiles={isLocal ? () => {} : setFiles} // Disable file setting in local mode
            fetchMessages={handleFetchMessages}
            onShouldSend={async (message: string, type?: string, operation?: string | null, additionalData?: string, options?: any) => {
              // Separation of concerns: Route based on global isLocal state
              if (isLocal) {
                // ===== LOCAL MODEL PATH =====
                console.log('[ChatPage] 🏠 Sending to local model:', message);
                
                if (!globalLLM || !isLocalModelReady) {
                  console.error('[ChatPage] Local model not ready!');
                  Alert.alert(
                    'Model loading',
                    isLocalModelDownloading
                      ? 'The on-device model is still downloading. Please wait for it to finish.'
                      : 'The on-device model is still loading. Please try again in a moment.'
                  );
                  return;
                }

                // Create user message
                const userMessage: Message = {
                  id: Date.now().toString() + '_user',
                  chat_id: Date.now().toString() + '_user',
                  role: Role.User,
                  content: message,
                  timestamp: new Date(),
                };
                
                // Create empty assistant message for streaming
                const assistantId = Date.now().toString() + '_assistant';
                localAssistantMessageIdRef.current = assistantId;
                
                const assistantMessage: Message = {
                  id: assistantId,
                  chat_id: assistantId,
                  role: Role.Bot,
                  content: '',
                  timestamp: new Date(),
                };
                
                // Add both to local conversation
                setLocalConversationMessages(prev => {
                  const updated = [...prev, userMessage, assistantMessage];
                  console.log('[ChatPage] 💬 Local messages updated, total:', updated.length);
                  return updated;
                });
                
                // Build context messages from prior local conversation so the
                // model has multi-turn history (capped to avoid token overflow).
                const history = localConversationMessages
                  .filter(m => (m.content || '').trim().length > 0)
                  .slice(-LOCAL_MODEL_LIMITS.MAX_CONTEXT_MESSAGES)
                  .map(m => ({
                    role: m.role === Role.User ? 'user' : 'assistant',
                    content: m.content || '',
                  }));

                const contextMessages = [
                  { role: 'system', content: `You are a helpful AI assistant. Current time: ${new Date().toLocaleString()}` },
                  ...history,
                  { role: 'user', content: message },
                ];

                // Generate using global LLM
                console.log('[ChatPage] 🚀 Starting generation with global LLM');
                await globalLLM.generate(contextMessages);
                console.log('[ChatPage] ✅ Generation complete');
              } else {
                // ===== CLOUD MODEL PATH =====
                console.log('[ChatPage] ☁️ Sending to cloud model');
                return sendMessage(message, type, operation, additionalData, options);
              }
            }}
            isLoading={isSending || (isLocal && isLocalModelGenerating)}
            onStopStreaming={async () => {
              if (isLocal && globalLLM?.interrupt) {
                console.log('[ChatPage] Interrupting local generation');
                globalLLM.interrupt();
              } else {
                await stopStreaming();
              }
            }}
            isLocal={isLocal}
            currentModelId={selectedCloudModel?.id}
            onRecordingStateChange={(recording, onCancel) => {
              setIsRecording(recording);
              setCancelRecording(() => onCancel);
            }}
            messages={messages}
            conversationTitle={id ? `Conversation ${id}` : 'Chat'}
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
      {/* Artifact Viewer Modal */}
      <ArtifactViewerModal
        visible={artifactModalVisible}
        artifacts={selectedArtifacts}
        initialIndex={selectedArtifactIndex}
        onClose={handleCloseArtifactModal}
        streamingArtifact={currentStreamingArtifact}
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
    backgroundColor: theme.isDark ? theme.colors.background : 'rgba(240, 240, 240, 0.9)',
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
    color: theme.isDark ? theme.colors.text : Colors.common.grey,
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
