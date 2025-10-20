
import { useDrawerStatus } from '@react-navigation/drawer';
import { Link, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    Pressable,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import * as ContextMenu from 'zeego/context-menu';

import { useAuth } from '@/hooks/useAuth';
import { useChat, Conversations } from '@/hooks/useChat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';
import Animated, { 
    FadeIn,
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import ModelToggle from './ModelToggle';
import { getLocalModelById } from '@/constants/LocalModels';
import { getDefaultLocalModelId } from '@/hooks/useDefaultLocalModel';
import { storage } from '@/hooks/useMMKVStorage';
import { isLlamaModel } from '@/constants/Models';
import { LinearGradient } from 'expo-linear-gradient';
import { ModelFileManager } from '@/utils/ModelFileManager';
import { CrashReporter } from '@/utils/CrashReporter';
import { FEATURES } from '@/constants/Config';


export const CustomDrawerContent = (props: any) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const drawerStatus = useDrawerStatus();
    const { bottom } = useSafeAreaInsets();

    const {
        conversations,
        currentConversationId,
        fetchConversation,
        isLoading,
        deleteConversation,
        renameConversation,
        setIsLocal,
        isLocal,
        createNewConversation,
        resetChat,
        clearAllConversations,
        isLocalLLMSupported
    } = useChat();

    const router = useRouter();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [openSwipeableId, setOpenSwipeableId] = useState<string | null>(null);
    const [pinnedChats, setPinnedChats] = useState<Set<string>>(new Set());

    const swipeableRef = useRef<Swipeable | null>(null);
    const navigation = useNavigation();
    const limitRef = useRef(20);

    const showLoading = isLoading || localLoading;

    const viewRef = useRef<View>(null);

    useEffect(() => {
        limitRef.current = 20;
        setHasMore(true);
        fetchConversation(query, limitRef.current);
    }, [fetchConversation, query]);

    // Removed drawer animation reaction to prevent list flashing
    // The list is now always rendered for better performance

    useEffect(() => {
        const unsubscribe = navigation.addListener('state', () => {
            fetchConversation(query, 20);
            limitRef.current = 20;
        });

        return unsubscribe;
    }, [navigation]);

    const onDeleteChat = (chatId: string) => {
        Alert.alert('Delete Chat', 'Are you sure you want to delete this chat?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setLocalLoading(true);
                        const success = await deleteConversation(chatId);

                        if (success) {

                            if (chatId === currentConversationId) {
                                router.push('/(chat)/new');
                            }
                        } else {
                            Alert.alert('Error', 'Failed to delete chat');
                        }
                    } catch (error) {
                        // console.error('Error deleting chat:', error);
                        Alert.alert('Error', 'An unexpected error occurred');
                    } finally {
                        setLocalLoading(false);
                    }
                },
            },
        ]);
    };

    const onRenameChat = (chatId: string, currentTitle: string = '') => {
        Alert.prompt(
            'Rename Chat',
            'Enter a new name for the chat',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Rename',
                    onPress: async (newTitle) => {
                        if (!newTitle || newTitle.trim() === '') {
                            Alert.alert('Error', 'Chat name cannot be empty');
                            return;
                        }

                        try {
                            setLocalLoading(true);
                            const success = await renameConversation(chatId, newTitle);

                            if (!success) {
                                Alert.alert('Error', 'Failed to rename chat');
                            }
                        } catch (error) {
                            // console.error('Error renaming chat:', error);
                            Alert.alert('Error', 'An unexpected error occurred');
                        } finally {
                            setLocalLoading(false);
                        }
                    },
                },
            ],
            'plain-text',
            currentTitle
        );
    };

    const togglePinChat = (chatId: string) => {
        setPinnedChats(prev => {
            const newSet = new Set(prev);
            if (newSet.has(chatId)) {
                newSet.delete(chatId);
            } else {
                // Limit to 5 pinned chats
                if (newSet.size >= 5) {
                    Alert.alert('Limit Reached', 'You can only pin up to 5 conversations');
                    return prev;
                }
                newSet.add(chatId);
            }
            return newSet;
        });
    };

    const handleModelSwitch = async (modelType: 'local' | 'Odyssey') => {
        const newIsLocal = modelType === 'local';
        
        // Check if local models are temporarily disabled due to crashes
        if (newIsLocal && CrashReporter.isLocalModelsDisabled()) {
            Alert.alert(
                'Local Models Temporarily Disabled',
                'Local models were disabled due to recent crashes. Please try again later or use cloud models.',
                [
                    { text: 'Use Cloud', style: 'cancel' },
                    { text: 'Enable Anyway', onPress: () => {
                        CrashReporter.reenableLocalModels();
                        performModelSwitch(true);
                    }}
                ]
            );
            return;
        }
        
        // Check if trying to switch to local mode on unsupported device
        if (newIsLocal && !isLocalLLMSupported) {
            Alert.alert(
                'Local LLM Not Supported',
                'Your device does not support local LLM. Please use cloud models instead.',
                [{ text: 'OK' }]
            );
            return;
        }
        
        // If switching to local mode from cloud mode, show confirmation alert first
        if (newIsLocal && !isLocal) {
            const selectedModel = getLocalModelById(getDefaultLocalModelId());
            if (selectedModel) {
                // Check available storage first
                try {
                    const deviceStorage = await ModelFileManager.getDeviceStorageInfo();
                    const requiredBytes = ModelFileManager.parseSizeString(selectedModel.size);
                    const requiredWithBuffer = requiredBytes * 1.2; // 20% buffer
                    
                    if (deviceStorage.freeSpace < requiredWithBuffer) {
                        const freeSpaceFormatted = ModelFileManager.formatFileSize(deviceStorage.freeSpace);
                        const requiredFormatted = ModelFileManager.formatFileSize(requiredWithBuffer);
                        
                        Alert.alert(
                            '⚠️ Insufficient Storage',
                            `Not enough space to download ${selectedModel.displayName}.\n\n` +
                            `Required: ${requiredFormatted} (with 20% buffer)\n` +
                            `Available: ${freeSpaceFormatted}\n\n` +
                            `Please free up approximately ${ModelFileManager.formatFileSize(requiredWithBuffer - deviceStorage.freeSpace)} to continue.\n\n` +
                            `Tip: Go to Model Manager in settings to delete unused models.`,
                            [{ text: 'OK' }]
                        );
                        return;
                    }
                } catch (error) {
                    console.error('[ChatDrawer] Error checking storage:', error);
                    // Continue with download if storage check fails
                }

                // Calculate estimated download time
                const sizeMatch = selectedModel.size.match(/(\d+\.?\d*)\s*(MB|GB)/i);
                const sizeValue = sizeMatch ? parseFloat(sizeMatch[1]) : 1000;
                const sizeUnit = sizeMatch ? sizeMatch[2].toUpperCase() : 'MB';
                const sizeInMB = sizeUnit === 'GB' ? sizeValue * 1024 : sizeValue;
                const estimatedMinutes = Math.ceil(sizeInMB / 10);
                const downloadTimeText = estimatedMinutes < 2 
                    ? '1-2 minutes' 
                    : estimatedMinutes < 5 
                    ? '2-5 minutes'
                    : `${estimatedMinutes} minutes`;

                Alert.alert(
                    '📥 Download Local Model?',
                    `${selectedModel.displayName}\n${selectedModel.description}\n\n` +
                    `📦 File Size: ${selectedModel.size}\n` +
                    `⏱️ Estimated Time: ${downloadTimeText}\n` +
                    `📡 Network Usage: ${selectedModel.size} of data\n` +
                    `📱 Storage Required: ${selectedModel.size} free space\n\n` +
                    `💡 We recommend downloading over Wi-Fi to avoid using mobile data.`,
                    [
                        { 
                            text: 'Cancel', 
                            style: 'cancel' 
                        },
                        {
                            text: 'Download',
                            onPress: async () => {
                                await performModelSwitch(true);
                            },
                        },
                    ]
                );
                return; // Don't proceed with switch yet
            }
        }
        
        // Proceed with actual model switch
        await performModelSwitch(newIsLocal);
    };

    const performModelSwitch = async (newIsLocal: boolean) => {
        try {
            setLocalLoading(true);
            
            // Clear all conversation history when switching between cloud and local modes
            // This removes any preservation logic and ensures a clean break
            if (newIsLocal !== isLocal) {
                // Delete current conversation if it exists
                if (currentConversationId) {
                    await deleteConversation(currentConversationId);
                }
                
                // Clear all conversations to remove any trace of history
                await clearAllConversations();
                
                // Reset chat state completely
                resetChat();
            }
            
            if (newIsLocal) {
                // For local mode, switch to local and navigate to new conversation
                const wasAlreadyLocal = isLocal;
                
                // Defer state update to avoid blocking UI
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Update state to local mode FIRST (before navigation)
                setIsLocal(true);
                
                // Only navigate to new conversation if switching FROM cloud mode
                if (!wasAlreadyLocal) {
                    // Small delay before navigation to ensure state is updated
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                    // Navigate to new conversation with completely clean slate
                    router.push('/(chat)/new');
                }
            } else if (newIsLocal !== isLocal) {
                // For cloud mode, switch to cloud and create new conversation
                setIsLocal(false);
                
                // Small delay to ensure state update propagates
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Create a new server-side conversation
                const newConvId = await createNewConversation();
                if (newConvId) {
                    router.push(`/(chat)/${newConvId}`);
                } else {
                    // Fallback: just navigate to /new route
                    router.push('/(chat)/new');
                }
            }
        } catch (error) {
            // console.error('Error handling model switch:', error);
            Alert.alert('Error', 'Failed to switch model');
            // Revert state on error
            setIsLocal(!newIsLocal);
        } finally {
            setLocalLoading(false);
        }
    };

    const loadMoreConversations = useCallback(async () => {
        if (isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);
        const newLimit = limitRef.current + 20;
        const newData = await fetchConversation(query, newLimit);

        if (newData && newData.length < newLimit) {
            setHasMore(false);
        }
        limitRef.current = newLimit;
        setIsFetchingMore(false);
    }, [isFetchingMore, hasMore, fetchConversation, query]);

    const handleScroll = ({ nativeEvent }: any) => {
        const paddingToBottom = 20;
        const isCloseToBottom =
            nativeEvent.layoutMeasurement.height + nativeEvent.contentOffset.y >=
            nativeEvent.contentSize.height - paddingToBottom;
        if (isCloseToBottom) {
            loadMoreConversations();
        }
    };



    const onRefresh = async () => {
        setIsRefreshing(true);
        try {
            limitRef.current = 20;
            setHasMore(true);
            await fetchConversation(query, limitRef.current);
        } catch (error) {
            // console.error("Error refreshing:", error);
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);

            }, 1000)
        }
    };


    const filteredConversations = React.useMemo(() => {
        if (!conversations || !Array.isArray(conversations)) {
            return [];
        }

        let filtered = conversations;
        
        if (query) {
            const lowercaseQuery = query.toLowerCase();
            filtered = conversations.filter(conversation => {
                if (!conversation) return false;
                const title = conversation.title || 'Untitled Chat';
                return title.toLowerCase().includes(lowercaseQuery);
            });
        }

        // Sort: pinned chats first, then by date
        return filtered.sort((a, b) => {
            const aId = a.id || '';
            const bId = b.id || '';
            const aPinned = pinnedChats.has(aId);
            const bPinned = pinnedChats.has(bId);
            
            if (aPinned && !bPinned) return -1;
            if (!aPinned && bPinned) return 1;
            
            // If both pinned or both not pinned, sort by date
            const aDate = a.time_updated || a.time_created || new Date(0);
            const bDate = b.time_updated || b.time_created || new Date(0);
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
    }, [conversations, query, pinnedChats]);


    const closeOpenSwipeable = useCallback(() => {
        if (swipeableRef.current) {
            swipeableRef.current.close();
            swipeableRef.current = null;
        }
        setOpenSwipeableId(null);
    }, []);

    const renderRightActions = useCallback(
        (chatId: string) => (
            <View style={styles.swipeActionContainer}>
                <Pressable
                    style={styles.deleteAction}
                    onPress={() => {
                        onDeleteChat(chatId);
                        closeOpenSwipeable();
                    }}
                >
                    <Ionicons name="trash" size={18} color="white" />
                </Pressable>
            </View>
        ),
        [closeOpenSwipeable, onDeleteChat]
    );

    const handleConversationSelect = useCallback((chatId: string) => {
        // Find the selected conversation
        const selectedConversation = conversations.find(c => c.id === chatId);
        const conversationModelType = selectedConversation?.model_type;
        
        // All stored conversations are cloud-based, so we need to switch out of local mode
        if (isLocal) {
            // User is currently in local mode but selecting a cloud conversation
            // Switch to cloud mode
            setIsLocal(false);
        }
        
        if (conversationModelType) {
            // Update the default cloud model to match this conversation's model
            try {
                storage.set('default_model_id', conversationModelType);
            } catch (error) {
                // console.error('Error updating model selection:', error);
            }
        }
        
        router.push(`/(chat)/${chatId}`);
    }, [router, setIsLocal, conversations, isLocal]);

    const renderItem = useCallback(({ item }: { item: Conversations }) => {
        const chatId = item?.id || '';
        const chatTitle = item?.title || 'Untitled Chat';

        return (
            <Swipeable
                key={chatId}
                ref={(ref) => {
                    if (chatId === openSwipeableId) {
                        swipeableRef.current = ref;
                    }
                }}
                renderRightActions={() => renderRightActions(chatId)}
                onSwipeableOpen={() => {
                    closeOpenSwipeable();
                    setOpenSwipeableId(chatId);
                }}
            >
                <ContextMenu.Root>
                    <ContextMenu.Trigger>
                        {chatId.toString() === currentConversationId?.toString() ? (
                            // Active chat with modern gradient
                            <LinearGradient
                                colors={theme.isDark 
                                    ? ['#2563eb', '#1e40af', '#1e3a8a']
                                    : ['#60a5fa', '#3b82f6', '#2563eb']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.chatItem, styles.activeChatItemGradient]}
                            >
                                <Pressable
                                    style={({ pressed }) => [
                                        styles.chatItemContentTransparent,
                                        pressed && styles.pressedChatItem,
                                    ]}
                                    onPress={() => handleConversationSelect(chatId)}
                                >
                                    <View style={styles.chatItemContent}>
                                        <View style={[styles.chatIconContainer, styles.activeChatIconContainer]}>
                                            <Ionicons name="chatbubble" size={18} color="#FFFFFF" />
                                        </View>
                                        <View style={styles.chatDetails}>
                                            <View style={styles.chatTitleRow}>
                                                <Text style={[styles.chatTitle, styles.activeChatText]} numberOfLines={1}>
                                                    {chatTitle}
                                                </Text>
                                                {pinnedChats.has(chatId) && (
                                                    <View style={styles.pinnedBadge}>
                                                        <Ionicons name="pin" size={10} color="#FFFFFF" />
                                                    </View>
                                                )}
                                            </View>
                                            <View style={styles.chatMetaRow}>
                                                <Ionicons name="time-outline" size={10} color="rgba(255, 255, 255, 0.8)" />
                                                <Text style={[styles.chatTimestamp, styles.activeChatTimestamp]} numberOfLines={1}>
                                                    {new Date().toLocaleDateString()}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.chatActions}>
                                            <Pressable
                                                style={[styles.actionButton, styles.activeActionButton]}
                                                onPress={() => onRenameChat(chatId, chatTitle)}
                                            >
                                                <Ionicons name="pencil" size={14} color="#FFFFFF" />
                                            </Pressable>
                                            <Pressable
                                                style={[styles.actionButton, styles.activeActionButton]}
                                                onPress={() => onDeleteChat(chatId)}
                                            >
                                                <Ionicons name="trash-outline" size={14} color="#FFFFFF" />
                                            </Pressable>
                                        </View>
                                    </View>
                                </Pressable>
                            </LinearGradient>
                        ) : (
                            // Non-active chat with modern design
                            <Pressable
                                style={({ pressed }) => [
                                    styles.chatItem,
                                    pressed && styles.pressedChatItem,
                                ]}
                                onPress={() => handleConversationSelect(chatId)}
                            >
                                <View style={styles.chatItemContent}>
                                    <LinearGradient
                                        colors={theme.isDark 
                                            ? ['rgba(59, 130, 246, 0.15)', 'rgba(99, 102, 241, 0.15)']
                                            : ['rgba(59, 130, 246, 0.12)', 'rgba(99, 102, 241, 0.12)']
                                        }
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={styles.chatIconContainer}
                                    >
                                        <Ionicons name="chatbubble-outline" size={18} color={theme.colors.primary} />
                                    </LinearGradient>
                                    <View style={styles.chatDetails}>
                                        <View style={styles.chatTitleRow}>
                                            <Text style={styles.chatTitle} numberOfLines={1}>
                                                {chatTitle}
                                            </Text>
                                            {pinnedChats.has(chatId) && (
                                                <View style={[styles.pinnedBadge, styles.inactivePinnedBadge]}>
                                                    <Ionicons name="pin" size={9} color={theme.colors.primary} />
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.chatMetaRow}>
                                            <Ionicons name="time-outline" size={10} color={theme.colors.greyLight} />
                                            <Text style={styles.chatTimestamp} numberOfLines={1}>
                                                {new Date().toLocaleDateString()}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.chatActions}>
                                        <Pressable
                                            style={styles.actionButton}
                                            onPress={() => onRenameChat(chatId, chatTitle)}
                                        >
                                            <Ionicons name="create-outline" size={16} color={theme.colors.primary} />
                                        </Pressable>
                                        <Pressable
                                            style={styles.actionButton}
                                            onPress={() => onDeleteChat(chatId)}
                                        >
                                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                                        </Pressable>
                                    </View>
                                </View>
                            </Pressable>
                        )}
                    </ContextMenu.Trigger>

                    <ContextMenu.Content>
                        <ContextMenu.Preview>
                            {() => (
                                <View style={styles.contextMenuPreview}>
                                    <Text style={styles.previewTitle}>{chatTitle}</Text>
                                </View>
                            )}
                        </ContextMenu.Preview>

                        <ContextMenu.Item key={'pin'} onSelect={() => togglePinChat(chatId)}>
                            <ContextMenu.ItemTitle>
                                {pinnedChats.has(chatId) ? 'Unpin' : 'Pin'}
                            </ContextMenu.ItemTitle>
                            <ContextMenu.ItemIcon
                                ios={{
                                    name: pinnedChats.has(chatId) ? 'pin.slash' : 'pin',
                                    pointSize: 18,
                                }}
                            />
                        </ContextMenu.Item>

                        <ContextMenu.Item key={'rename'} onSelect={() => onRenameChat(chatId, chatTitle)}>
                            <ContextMenu.ItemTitle>Rename</ContextMenu.ItemTitle>
                            <ContextMenu.ItemIcon
                                ios={{
                                    name: 'pencil',
                                    pointSize: 18,
                                }}
                            />
                        </ContextMenu.Item>

                        <ContextMenu.Item key={'delete'} onSelect={() => onDeleteChat(chatId)} destructive>
                            <ContextMenu.ItemTitle>Delete</ContextMenu.ItemTitle>
                            <ContextMenu.ItemIcon
                                ios={{
                                    name: 'trash',
                                    pointSize: 18,
                                }}
                            />
                        </ContextMenu.Item>
                    </ContextMenu.Content>
                </ContextMenu.Root>
            </Swipeable>
        );
    }, [
        closeOpenSwipeable,
        currentConversationId,
        onDeleteChat,
        onRenameChat,
        openSwipeableId,
        renderRightActions,
        handleConversationSelect,
        pinnedChats,
        togglePinChat
    ]);

    const keyExtractor = useCallback((item: Conversations) => item?.id?.toString() || '', []);

    return (
        <View
            ref={viewRef}
            style={styles.drawerContainer}>
            {showLoading && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContent}>
                        <LinearGradient
                            colors={theme.isDark 
                                ? ['#3b82f6', '#6366f1', '#8b5cf6']
                                : ['#60a5fa', '#3b82f6', '#6366f1']
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.loadingIndicatorGradient}
                        >
                            <ActivityIndicator size="large" color="#FFFFFF" />
                        </LinearGradient>
                        <Text style={styles.loadingText}>Loading...</Text>
                    </View>
                </View>
            )}

         

            <Animated.View 
                style={styles.headerContainer}
                entering={FadeIn.duration(400)}
            >
                {/* Only show ModelToggle if local LLM feature is enabled */}
                {FEATURES.LOCAL_LLM_ENABLED && (
                    <View style={styles.modelToggleContainer}>
                        <ModelToggle onSelectModel={handleModelSwitch} initialState={isLocal} disableLocal={!isLocalLLMSupported} />
                    </View>
                )}
        
                {/* Show search and history title for cloud mode (or always if local models disabled) */}
                {(!isLocal || !FEATURES.LOCAL_LLM_ENABLED) && (
                    <>
                        <View style={styles.searchContainer}>
                            <View style={styles.searchSection}>
                                <Ionicons style={styles.searchIcon} name="search" size={18} color={theme.colors.greyLight} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search conversations..."
                                    placeholderTextColor={theme.colors.greyLight}
                                    underlineColorAndroid="transparent"
                                    onChangeText={(value) => setQuery(value)}
                                    value={query}
                                />
                                {query ? (
                                    <TouchableOpacity 
                                        onPress={() => setQuery('')}
                                        style={styles.clearButton}
                                    >
                                        <Ionicons name="close-circle" size={18} color={theme.colors.greyLight} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                        <View style={styles.historyHeader}>
                            <Text style={styles.historyTitle}>Recent Chats</Text>
                            {conversations.length > 0 && (
                                <Text style={styles.chatCount}>{conversations.length}</Text>
                            )}
                        </View>
                    </>
                )}
            </Animated.View>
            
            {/* Modern New Chat Button */}
            <Animated.View 
                style={styles.newChatButtonContainer}
                entering={FadeIn.delay(100).duration(400)}
            >
                <TouchableOpacity 
                    style={styles.newChatButton}
                    onPress={async () => {
                        try {
                            setLocalLoading(true);
                            
                            if (isLocal) {
                                // For local mode, just reset the chat and navigate to new
                                resetChat();
                                router.push('/(chat)/new');
                            } else {
                                // For cloud mode, create a new server-side conversation
                                const newConvId = await createNewConversation();
                                if (newConvId) {
                                    router.push(`/(chat)/${newConvId}`);
                                } else {
                                    // Fallback to new chat route if creation fails
                                    resetChat();
                                    router.push('/(chat)/new');
                                }
                            }
                        } catch (error) {
                            // console.error('Error creating new chat:', error);
                            // Fallback: just reset and navigate to new chat
                            resetChat();
                            router.push('/(chat)/new');
                            Alert.alert('Note', 'Started a new chat session');
                        } finally {
                            setLocalLoading(false);
                        }
                    }}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={theme.isDark 
                            ? ['#3b82f6', '#2563eb']
                            : ['#60a5fa', '#3b82f6']
                        }
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.newChatGradient}
                    >
                        <View style={styles.newChatIconContainer}>
                            <Ionicons name="add" size={18} color="#FFFFFF" />
                        </View>
                        <Text style={styles.newChatButtonText}>New Conversation</Text>
                        <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.8)" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>

            <View style={{ flex: 1 }}>
                {(isLocal && FEATURES.LOCAL_LLM_ENABLED) ? (
                        // Local mode - show modern info message
                        <Animated.View 
                            style={styles.localModeInfoContainer}
                            entering={FadeIn.duration(500)}
                        >
                            <View style={styles.localModeIconContainer}>
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.localModeIconGradient}
                                >
                                    <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
                                </LinearGradient>
                            </View>
                            <Text style={styles.localModeTitle}>Local & Private</Text>
                            <Text style={styles.localModeText}>
                                Your conversations run completely offline on your device with end-to-end privacy.
                            </Text>
                            <View style={styles.localModeFeatures}>
                                <View style={styles.localModeFeature}>
                                    <Ionicons name="wifi-outline" size={20} color={theme.colors.primary} style={styles.localModeFeatureIcon} />
                                    <Text style={styles.localModeFeatureText}>Works offline</Text>
                                </View>
                                <View style={styles.localModeFeature}>
                                    <Ionicons name="lock-closed" size={20} color={theme.colors.primary} style={styles.localModeFeatureIcon} />
                                    <Text style={styles.localModeFeatureText}>100% private</Text>
                                </View>
                                <View style={styles.localModeFeature}>
                                    <Ionicons name="flash" size={20} color={theme.colors.primary} style={styles.localModeFeatureIcon} />
                                    <Text style={styles.localModeFeatureText}>Fast responses</Text>
                                </View>
                            </View>
                            <Text style={styles.localModeSubText}>
                                Note: Conversations aren't synced to cloud
                            </Text>
                        </Animated.View>
                    ) : (
                        // Cloud mode - show conversation list
                        <>
                            {filteredConversations.length === 0 ? (
                                <Animated.View 
                                    style={styles.emptyStateContainer}
                                    entering={FadeIn.duration(500)}
                                >
                                    <View style={styles.emptyStateIconContainer}>
                                        <LinearGradient
                                            colors={theme.isDark 
                                                ? ['rgba(99, 102, 241, 0.2)', 'rgba(139, 92, 246, 0.2)']
                                                : ['rgba(59, 130, 246, 0.2)', 'rgba(99, 102, 241, 0.2)']
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.emptyStateIconGradient}
                                        >
                                            <Ionicons name="chatbubbles-outline" size={48} color={theme.colors.primary} />
                                        </LinearGradient>
                                    </View>
                                    <Text style={styles.emptyStateText}>
                                        {query ? 'No conversations found' : 'Your conversations await'}
                                    </Text>
                                    <Text style={styles.emptyStateSubText}>
                                        {query ? 'Try adjusting your search' : 'Create your first conversation to get started'}
                                    </Text>
                                </Animated.View>
                            ) : (
                                <FlashList
                                    data={filteredConversations}
                                    keyExtractor={keyExtractor}
                                    renderItem={renderItem}
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
                                    estimatedItemSize={56}
                                    refreshControl={
                                        <RefreshControl
                                            refreshing={isRefreshing}
                                            onRefresh={onRefresh}
                                        />
                                    }
                                    onEndReached={loadMoreConversations}
                                    onEndReachedThreshold={0.5}
                                    contentContainerStyle={styles.scrollViewContent}
                                />
                            )}
                        </>
                    )}
                </View>
            <Animated.View 
                style={[styles.footerContainer, { paddingBottom: 10 + bottom }]}
                entering={FadeIn.delay(200).duration(400)}
            >
                <Link href="/(modal)/settings" asChild>
                    <TouchableOpacity style={styles.footer} activeOpacity={0.7}>
                        <View style={styles.userContainer}>
                            <LinearGradient
                                colors={theme.isDark 
                                    ? ['#4f46e5', '#7c3aed']
                                    : ['#6366f1', '#8b5cf6']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.userAvatar}
                            >
                                <Text style={styles.userInitials}>
                                    {user?.first_name?.[0] || 'J'}
                                </Text>
                            </LinearGradient>
                            <View style={styles.userInfo}>
                                <Text style={styles.userName}>{user?.first_name || 'John'} {user?.last_name?.[0] || 'D'}.</Text>
                                <Text style={styles.userEmail} numberOfLines={1}>
                                    {user?.email || 'user@odyssey.ai'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.settingsButton}>
                            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
                        </View>
                    </TouchableOpacity>
                </Link>
            </Animated.View>
        </View>
    );
};


const getStyles = (theme: Theme) => StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    headerContainer: {
        backgroundColor: theme.colors.background,
        paddingBottom: 10,
        paddingTop: 8,
        borderBottomWidth: 0,
        marginTop: 50,
    },
    modelToggleContainer: {
        paddingHorizontal: 14,
        paddingTop: 0,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 6,
    },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 2,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: 0.2,
    },
    chatCount: {
        fontSize: 12,
        fontWeight: '600',
        color: theme.colors.textSecondary,
        backgroundColor: theme.colors.backgroundLight,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        overflow: 'hidden',
    },
    newChatButtonContainer: {
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    newChatButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    newChatGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 14,
    },
    newChatIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    newChatButtonText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: '#FFFFFF',
        marginLeft: 10,
        letterSpacing: 0.2,
    },
    clearButton: {
        padding: 4,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundLight,
        borderWidth: 1.5,
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
        borderRadius: 12,
        height: 42,
        paddingHorizontal: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 3,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: theme.colors.text,
        paddingVertical: 8,
    },
    scrollViewContent: {
        backgroundColor: theme.colors.background,
        paddingTop: 6,
        paddingHorizontal: 14,
        paddingBottom: 16,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    emptyStateIconContainer: {
        marginBottom: 20,
    },
    emptyStateIconGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateText: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 8,
        textAlign: 'center',
        letterSpacing: 0.2,
    },
    emptyStateSubText: {
        fontSize: 15,
        color: theme.colors.textSecondary,
        marginTop: 12,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    localModeInfoContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 40,
    },
    localModeIconContainer: {
        marginBottom: 16,
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    localModeIconGradient: {
        width: 90,
        height: 90,
        borderRadius: 45,
        justifyContent: 'center',
        alignItems: 'center',
    },
    localModeTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 16,
        marginBottom: 12,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    localModeText: {
        fontSize: 16,
        fontWeight: '500',
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    localModeFeatures: {
        flexDirection: 'column',
        gap: 14,
        width: '100%',
        marginBottom: 24,
    },
    localModeFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundLight,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    localModeFeatureIcon: {
        marginRight: 12,
    },
    localModeFeatureText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
    localModeSubText: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    chatItem: {
        borderRadius: 12,
        marginBottom: 6,
        backgroundColor: theme.colors.chatItemBg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: theme.isDark ? 0.08 : 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    activeChatItem: {
        backgroundColor: theme.colors.activeChatItem,
    },
    activeChatItemGradient: {
        backgroundColor: '#3b82f6',
        borderColor: '#2563eb',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
        transform: [{ scale: 1.01 }],
    },
    pressedChatItem: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    chatItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
    },
    chatItemContentTransparent: {
        backgroundColor: 'transparent',
    },
    activeChatText: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    activeChatTimestamp: {
        color: 'rgba(255, 255, 255, 0.85)',
    },
    chatIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.chatIconContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
        elevation: 2,
    },
    activeChatIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        shadowColor: '#FFFFFF',
        shadowOpacity: 0.2,
    },
    chatDetails: {
        flex: 1,
    },
    chatTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 3,
    },
    chatMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    pinIcon: {
        marginLeft: 2,
    },
    pinnedBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        borderRadius: 6,
        width: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    inactivePinnedBadge: {
        backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)',
    },
    chatTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
        flex: 1,
        letterSpacing: 0.1,
    },
    chatTimestamp: {
        fontSize: 11,
        color: theme.colors.greyLight,
        fontWeight: '500',
    },
    chatActions: {
        flexDirection: 'row',
        gap: 4,
    },
    actionButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
    },
    activeActionButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    contextMenuPreview: {
        padding: 16,
        height: 80,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.common.grey,
    },
    footerContainer: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
        borderTopWidth: 1,
        borderTopColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
        backgroundColor: theme.colors.background,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderWidth: 1.5,
        borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        shadowColor: '#6366f1',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    userInitials: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: '700',
        color: theme.colors.text,
        letterSpacing: 0.2,
    },
    userEmail: {
        fontSize: 11,
        fontWeight: '500',
        color: theme.colors.textSecondary,
        marginTop: 1,
    },
    settingsButton: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
    },
    drawerIcon: {
        width: 20,
        height: 20,
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    loadingContent: {
        alignItems: 'center',
        gap: 16,
    },
    loadingIndicatorGradient: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    loadingText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        letterSpacing: 0.3,
    },
    swipeActionContainer: {
        width: 70,
        height: '100%',
        marginBottom: 6,
    },
    deleteAction: {
        flex: 1,
        backgroundColor: '#EF4444',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
        elevation: 4,
    },
    actionButtonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        padding: 12,
        marginRight: 12,
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    headerButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
    },
});