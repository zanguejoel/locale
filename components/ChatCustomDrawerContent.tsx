
import { useDrawerProgress, useDrawerStatus } from '@react-navigation/drawer';
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
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import ModelToggle from './ModelToggle';
import { getLocalModelById } from '@/constants/LocalModels';
import { getDefaultLocalModelId } from '@/hooks/useDefaultLocalModel';
import { storage } from '@/hooks/useMMKVStorage';
import { isLlamaModel } from '@/constants/Models';
import { LinearGradient } from 'expo-linear-gradient';


export const CustomDrawerContent = (props: any) => {
    const theme = useTheme();
    const styles = getStyles(theme);
    const drawerStatus = useDrawerStatus();
    const { bottom } = useSafeAreaInsets();
    const progressDrawer = useDrawerProgress()
    const [isShowData, setShowData] = useState(false)

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
        isLocalLLMSupported
    } = useChat();

    const router = useRouter();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingDisplayChats, setLoadingDisplayChats] = useState(true);
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

    useAnimatedReaction(
        () => progressDrawer.value,
        (currentValue) => {
            if (currentValue >= 0.9) {
                runOnJS(setShowData)(true);
            } else {
                runOnJS(setShowData)(false);
            }
        }
    );

    useEffect(() => {
        if (drawerStatus === 'open') {
            setLoadingDisplayChats(false)
        } else {
            setLoadingDisplayChats(true)

        }
    }, [drawerStatus])

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
        
        // Check if trying to switch to local mode on unsupported device
        if (newIsLocal && !isLocalLLMSupported) {
            Alert.alert(
                'Local LLM Not Supported',
                'Your device does not support local LLM. Please use cloud models instead.',
                [{ text: 'OK' }]
            );
            return;
        }
        
        try {
            setLocalLoading(true);
            
            if (newIsLocal) {
                // For local mode, ALWAYS navigate to a new conversation
                // even if user is already in local mode
                const wasAlreadyLocal = isLocal;
                
                // Update state to local mode
                setIsLocal(true);
                
                // Reset the chat (no server-side conversation needed)
                resetChat();
                
                // Always navigate to a fresh conversation
                router.push('/(chat)/new');
                
                // Show info about local model only if switching FROM cloud mode
                if (!wasAlreadyLocal) {
                    setTimeout(() => {
                        const selectedModel = getLocalModelById(getDefaultLocalModelId());
                        Alert.alert(
                            'Switched to Local Mode',
                            `Using ${selectedModel?.displayName || 'Llama 3.2 1B'} (${selectedModel?.size || '~1.2GB'}).\n\nThe model will download on first use and run completely offline.`,
                            [{ text: 'Got it' }]
                        );
                    }, 300);
                }
            } else if (newIsLocal !== isLocal) {
                // For cloud mode, only create new conversation if switching FROM local mode
                setIsLocal(false);
                
                // Create a new server-side conversation
                const newConvId = await createNewConversation();
                if (newConvId) {
                    router.push(`/(chat)/${newConvId}`);
                } else {
                    // Fallback if creation fails
                    resetChat();
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
                    <Ionicons name="trash" size={20} color="white" />
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
                            // Active chat with gradient
                            <LinearGradient
                                colors={theme.isDark 
                                    ? ['#1e3a8a', '#1e40af']
                                    : ['#3b82f6', '#2563eb']
                                }
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
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
                                                    <Ionicons name="pin" size={14} color="#FFFFFF" style={styles.pinIcon} />
                                                )}
                                            </View>
                                            <Text style={[styles.chatTimestamp, styles.activeChatTimestamp]} numberOfLines={1}>
                                                {new Date().toLocaleDateString()}
                                            </Text>
                                        </View>
                                        <View style={styles.chatActions}>
                                            <Pressable
                                                style={styles.actionButton}
                                                onPress={() => onRenameChat(chatId, chatTitle)}
                                            >
                                                <Ionicons name="pencil" size={16} color="#FFFFFF" />
                                            </Pressable>
                                        </View>
                                    </View>
                                </Pressable>
                            </LinearGradient>
                        ) : (
                            // Non-active chat without gradient
                            <Pressable
                                style={({ pressed }) => [
                                    styles.chatItem,
                                    pressed && styles.pressedChatItem,
                                ]}
                                onPress={() => handleConversationSelect(chatId)}
                            >
                                <View style={styles.chatItemContent}>
                                    <View style={styles.chatIconContainer}>
                                        <Ionicons name="chatbubble" size={18} color={theme.colors.primary} />
                                    </View>
                                    <View style={styles.chatDetails}>
                                        <View style={styles.chatTitleRow}>
                                            <Text style={styles.chatTitle} numberOfLines={1}>
                                                {chatTitle}
                                            </Text>
                                            {pinnedChats.has(chatId) && (
                                                <Ionicons name="pin" size={14} color={theme.colors.primary} style={styles.pinIcon} />
                                            )}
                                        </View>
                                        <Text style={styles.chatTimestamp} numberOfLines={1}>
                                            {new Date().toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.chatActions}>
                                        <Pressable
                                            style={styles.actionButton}
                                            onPress={() => onRenameChat(chatId, chatTitle)}
                                        >
                                            <Ionicons name="pencil" size={16} color={theme.colors.greyLight} />
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

    if (isLoadingDisplayChats) {
        return (
            <View style={styles.drawerContainer}>
                <ActivityIndicator size="small" />
            </View>
        );
    }

    return (
        <View
            ref={viewRef}
            style={styles.drawerContainer}>
            {showLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color={Colors.common.primary} />
                </View>
            )}

         

            <View style={styles.headerContainer}>
            
           
                <ModelToggle onSelectModel={handleModelSwitch} initialState={isLocal} disableLocal={!isLocalLLMSupported} />
        
                {/* Only show search and history title for cloud mode */}
                {!isLocal && (
                    <>
                        <View style={styles.searchContainer}>
                            <View style={styles.searchSection}>
                                <Ionicons style={styles.searchIcon} name="search" size={20} color={theme.colors.greyLight} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Search conversations"
                                    placeholderTextColor={theme.colors.greyLight}
                                    underlineColorAndroid="transparent"
                                    onChangeText={(value) => setQuery(value)}
                                    value={query}
                                />
                                {query ? (
                                    <TouchableOpacity onPress={() => setQuery('')}>
                                        <Ionicons name="close-circle" size={18} color={theme.colors.greyLight} />
                                    </TouchableOpacity>
                                ) : null}
                            </View>
                        </View>
                        <Text style={styles.historyTitle}>Chat History</Text>
                    </>
                )}
            </View>
            
            {/* New Chat Button */}
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
                activeOpacity={0.7}
            >
                <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                <Text style={styles.newChatButtonText}>New Chat</Text>
            </TouchableOpacity>

            {!isShowData ? <></> :
                <View style={{ flex: 1 }}>
                    {isLocal ? (
                        // Local mode - show info message instead of conversation list
                        <View style={styles.localModeInfoContainer}>
                            <Ionicons name="phone-portrait-outline" size={60} color={theme.colors.primary} />
                            <Text style={styles.localModeTitle}>Local Mode</Text>
                            <Text style={styles.localModeText}>
                                You're using local models that run completely offline on your device.
                            </Text>
                            <Text style={styles.localModeSubText}>
                                Local conversations are not saved to the cloud. Start a new chat to begin!
                            </Text>
                        </View>
                    ) : (
                        // Cloud mode - show conversation list
                        <>
                            {filteredConversations.length === 0 ? (
                                <View style={styles.emptyStateContainer}>
                                    <Ionicons name="chatbubble-outline" size={50} color={Colors.common.greyLight} />
                                    <Text style={styles.emptyStateText}>No conversations found</Text>
                                    <Text style={styles.emptyStateSubText}>
                                        {query ? 'Try a different search term' : 'Start a new chat to begin'}
                                    </Text>
                                </View>
                            ) : (
                                <FlashList
                                    data={filteredConversations}
                                    keyExtractor={keyExtractor}
                                    renderItem={renderItem}
                                    onScroll={handleScroll}
                                    scrollEventThrottle={16}
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
            }
            <View style={[styles.footerContainer, { paddingBottom: 10 + bottom }]}>
                <Link href="/(modal)/settings" asChild>
                    <TouchableOpacity style={styles.footer}>
                        <View style={styles.userContainer}>
                            <View style={styles.userAvatar}>
                                <Text style={styles.userInitials}>
                                    {user?.first_name?.[0] || 'J'}
                                </Text>
                            </View>
                            <Text style={styles.userName}>{user?.first_name || 'John'}</Text>
                        </View>
                        <Ionicons name="settings-outline" size={20} color={theme.colors.greyLight} />
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
};


const getStyles = (theme: Theme) => StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        borderRightWidth: theme.isDark ? 0.5 : 1,
        borderRightColor: theme.colors.greyLight,
    },
    headerContainer: {
        backgroundColor: theme.colors.background,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.greyLight,
        marginTop: 50,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    historyTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 20,
        marginTop: 8,
        color: theme.colors.text,
    },
    newChatButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        marginHorizontal: 16,
        marginVertical: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 10,
    },
    newChatButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.primary,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: 12,
        height: 40,
        paddingHorizontal: 12,
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
        paddingTop: 8,
        paddingHorizontal: 12,
    },
    emptyStateContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.text,
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubText: {
        fontSize: 14,
        color: Colors.common.greyLight,
        marginTop: 8,
        textAlign: 'center',
    },
    localModeInfoContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 40,
    },
    localModeTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: theme.colors.text,
        marginTop: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    localModeText: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 12,
    },
    localModeSubText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    chatItem: {
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: theme.colors.chatItemBg,
        overflow: 'hidden',
    },
    activeChatItem: {
        backgroundColor: theme.colors.activeChatItem,
    },
    activeChatItemGradient: {
        // No background color - gradient handles it
        shadowColor: '#3b82f6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    pressedChatItem: {
        opacity: 0.7,
    },
    chatItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    chatItemContentTransparent: {
        backgroundColor: 'transparent',
    },
    activeChatText: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    activeChatTimestamp: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    chatIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.chatIconContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    activeChatIconContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    chatDetails: {
        flex: 1,
    },
    chatTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pinIcon: {
        marginLeft: 4,
    },
    chatTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
        flex: 1,
    },
    chatTimestamp: {
        fontSize: 12,
        color: theme.colors.greyLight,
        marginTop: 2,
    },
    chatActions: {
        flexDirection: 'row',
    },
    actionButton: {
        padding: 6,
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
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: theme.colors.background,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    userContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.backgroundLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userInitials: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: theme.colors.text,
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
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    swipeActionContainer: {
        width: 80,
        height: '100%',
        marginBottom: 8,
    },
    deleteAction: {
        flex: 1,
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        borderTopRightRadius: 12,
        borderBottomRightRadius: 12,
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