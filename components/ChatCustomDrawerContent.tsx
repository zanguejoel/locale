
import { DrawerContentScrollView, useDrawerStatus } from '@react-navigation/drawer';
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
import { useChat } from '@/hooks/useChat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';


export const CustomDrawerContent = (props: any) => {
    const drawerStatus = useDrawerStatus();
    const { bottom } = useSafeAreaInsets();
    const {
        conversations,
        currentConversationId,
        fetchConversation,
        isLoading,
        deleteConversation,
        renameConversation
    } = useChat();

    const router = useRouter();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [localLoading, setLocalLoading] = useState(false);

    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingDisplayChats, setLoadingDisplayChats] = useState(true);
    const [openSwipeableId, setOpenSwipeableId] = useState(null);
    const swipeableRef = useRef(null);
    const navigation = useNavigation();
    const limitRef = useRef(20);


    const [openSwipeable, setOpenSwipeable] = useState(null);

    const showLoading = isLoading || localLoading;

    const [layoutInfo, setLayoutInfo] = useState({
        x: 0, y: 0, width: 0, height: 0,
        pageX: 0, pageY: 0
    });
    const viewRef = useRef<View>(null);

    useEffect(() => {
        limitRef.current = 20;
        setHasMore(true);
        fetchConversation(query, limitRef.current);
    }, [fetchConversation, query]);

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
                        console.error('Error deleting chat:', error);
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
                            console.error('Error renaming chat:', error);
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
    const loadMoreConversations = useCallback(async () => {
        if (isFetchingMore || !hasMore) return;
        setIsFetchingMore(true);
        const newLimit = limitRef.current + 20;
        const newData = await fetchConversation(query, newLimit);

        if (newData.length < newLimit) {
            setHasMore(false);
        }
        limitRef.current = newLimit;
        setIsFetchingMore(false);
    }, [isFetchingMore, hasMore, fetchConversation, query]);

    const handleScroll = ({ nativeEvent }) => {
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
            console.error("Error refreshing:", error);
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

        if (!query) {
            return conversations;
        }

        const lowercaseQuery = query.toLowerCase();
        return conversations.filter(conversation => {

            if (!conversation) return false;


            const title = conversation.title || 'Untitled Chat';
            return title.toLowerCase().includes(lowercaseQuery);
        });
    }, [conversations, query]);


    const closeOpenSwipeable = useCallback(() => {
        if (swipeableRef.current) {
            swipeableRef.current.close();
            swipeableRef.current = null;
        }
        setOpenSwipeableId(null);
    }, []);

    const renderRightActions = useCallback(
        (chatId) => (
            <View style={styles.swipeActionsContainer}>
                <Pressable
                    style={styles.swipeDeleteButton}
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

    const renderItem = useCallback(({ item }) => {
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
                        <Pressable
                            style={({ pressed }) => [
                                styles.chatItem,
                                chatId.toString() === currentConversationId?.toString() && styles.activeChatItem,
                                pressed && styles.pressedChatItem,
                            ]}
                            onPress={() => router.push(`/(chat)/${chatId}`)}
                        >
                            <View style={styles.chatItemContent}>
                                <View style={styles.chatIconContainer}>
                                    <Ionicons name="chatbubble" size={18} color={Colors.primary} />
                                </View>
                                <View style={styles.chatDetails}>
                                    <Text style={styles.chatTitle} numberOfLines={1}>
                                        {chatTitle}
                                    </Text>
                                    <Text style={styles.chatTimestamp} numberOfLines={1}>
                                        {new Date().toLocaleDateString()}
                                    </Text>
                                </View>
                                <View style={styles.chatActions}>
                                    <Pressable
                                        style={styles.actionButton}
                                        onPress={() => onRenameChat(chatId, chatTitle)}
                                    >
                                        <Ionicons name="pencil" size={16} color={Colors.greyLight} />
                                    </Pressable>
                                </View>
                            </View>
                        </Pressable>
                    </ContextMenu.Trigger>

                    <ContextMenu.Content>
                        <ContextMenu.Preview>
                            {() => (
                                <View style={styles.contextMenuPreview}>
                                    <Text style={styles.previewTitle}>{chatTitle}</Text>
                                </View>
                            )}
                        </ContextMenu.Preview>

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
        router
    ]);

    const keyExtractor = useCallback((item) => item?.id?.toString(), []);

    if (isLoadingDisplayChats) {
        return (
            <View style={styles.loaderContainer}>
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
                    <ActivityIndicator size="large" color={Colors.primary} />
                </View>
            )}

            <View style={styles.headerContainer}>
                <View style={styles.searchContainer}>
                    <View style={styles.searchSection}>

                        <Ionicons style={styles.searchIcon} name="search" size={20} color={Colors.greyLight} />
                        <TextInput
                            style={styles.input}
                            placeholder="Search conversations"
                            placeholderTextColor={Colors.greyLight}
                            underlineColorAndroid="transparent"
                            onChangeText={(value) => setQuery(value)}
                            value={query}
                        />
                        {query ? (
                            <TouchableOpacity onPress={() => setQuery('')}>
                                <Ionicons name="close-circle" size={18} color={Colors.greyLight} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
                <Text style={styles.historyTitle}>Chat History</Text>
            </View>

            {filteredConversations.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <Ionicons name="chatbubble-outline" size={50} color={Colors.greyLight} />
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
                    style={{ flex: 1 }}
                />
            )}

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
                        <Ionicons name="settings-outline" size={20} color={Colors.greyLight} />
                    </TouchableOpacity>
                </Link>
            </View>
        </View>
    );
};


const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerContainer: {
        backgroundColor: '#FFFFFF',
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        marginTop: 70,
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
        color: Colors.grey,
    },
    searchSection: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
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
        color: Colors.grey,
        paddingVertical: 8,
    },
    scrollViewContent: {
        backgroundColor: '#FFFFFF',
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
        color: Colors.grey,
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubText: {
        fontSize: 14,
        color: Colors.greyLight,
        marginTop: 8,
        textAlign: 'center',
    },
    chatItem: {
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: '#F9F9F9',
        overflow: 'hidden',
    },
    activeChatItem: {
        backgroundColor: '#e5f3f7',
    },
    pressedChatItem: {
        opacity: 0.7,
    },
    chatItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    chatIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#e5f3f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    chatDetails: {
        flex: 1,
    },
    chatTitle: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.grey,
    },
    chatTimestamp: {
        fontSize: 12,
        color: Colors.greyLight,
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
        color: Colors.grey,
    },
    footerContainer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#e5f3f7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    userInitials: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.primary,
    },
    userName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.grey,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.grey,
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
});