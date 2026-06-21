
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
    NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import ContextMenu, { ContextMenuOnPressNativeEvent } from 'react-native-context-menu-view';

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
import { storage } from '@/hooks/useMMKVStorage';
import { isLlamaModel } from '@/constants/Models';
import { LinearGradient } from 'expo-linear-gradient';
import { formatMessageTimestamp } from '@/utils/dateHelpers';
import { checkLocalAISupport } from '@/utils/DeviceCapabilities';
import { GradientBackground } from './GradientBackground';
import { GlassSurface, GlassCard } from './GlassSurface';
import { NAVIGATOR_MODULES } from '@/lib/navigators/registry';


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
        createNewConversation,
        resetChat,
        clearAllConversations,
        // Local model properties
        isLocal,
        setIsLocal,
        isLocalModelReady,
        isLocalModelGenerating,
    } = useChat();

    const router = useRouter();
    const { user } = useAuth();
    const [query, setQuery] = useState('');
    const [localLoading, setLocalLoading] = useState(false);
    
    // Check device capability for local AI
    const deviceCapability = checkLocalAISupport();
    const showLocalAIOption = deviceCapability.isSupported; // Show if iOS 17+ or Android 8+
    
    // Log device capability (once)
    useEffect(() => {
        console.log('[Drawer] Device capability check:', {
            supported: deviceCapability.isSupported,
            model: deviceCapability.deviceModel,
            ram: deviceCapability.estimatedRAM,
            showAIMode: showLocalAIOption,
            reason: deviceCapability.reason,
        });
    }, []);

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
        router.push(`/(chat)/${chatId}`);
    }, [router]);

    const renderItem = useCallback(({ item }: { item: Conversations }) => {
        const chatId = item?.id || '';
        const chatTitle = item?.title || 'Untitled Chat';
        const chatDate = item?.time_updated ?? item?.time_created;
        const chatDateLabel = chatDate ? new Date(chatDate).toLocaleDateString() : '';
        const isActive = chatId.toString() === currentConversationId?.toString();

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
                <ContextMenu
                    actions={[
                        { title: pinnedChats.has(chatId) ? 'Unpin' : 'Pin', systemIcon: pinnedChats.has(chatId) ? 'pin.slash' : 'pin' },
                        { title: 'Rename', systemIcon: 'pencil' },
                        { title: 'Delete', systemIcon: 'trash', destructive: true },
                    ]}
                    onPress={(e: NativeSyntheticEvent<ContextMenuOnPressNativeEvent>) => {
                        switch (e.nativeEvent.index) {
                            case 0:
                                togglePinChat(chatId);
                                break;
                            case 1:
                                onRenameChat(chatId, chatTitle);
                                break;
                            case 2:
                                onDeleteChat(chatId);
                                break;
                        }
                    }}
                >
                        <Pressable
                            style={({ pressed }) => [pressed && styles.pressedChatItem]}
                            onPress={() => handleConversationSelect(chatId)}
                        >
                            <GlassSurface
                                style={styles.chatItem}
                                borderRadius={12}
                                strong={isActive}
                                highlighted={isActive}
                            >
                                <View style={styles.chatItemContent}>
                                    <View style={[styles.chatIconContainer, isActive && styles.activeChatIconContainer]}>
                                        <Ionicons
                                            name={isActive ? 'chatbubble' : 'chatbubble-outline'}
                                            size={18}
                                            color={isActive ? theme.colors.primary : theme.colors.greyLight}
                                        />
                                    </View>
                                    <View style={styles.chatDetails}>
                                        <View style={styles.chatTitleRow}>
                                            <Text
                                                style={[styles.chatTitle, isActive && styles.activeChatText]}
                                                numberOfLines={1}
                                            >
                                                {chatTitle}
                                            </Text>
                                            {pinnedChats.has(chatId) && (
                                                <View style={[styles.pinnedBadge, !isActive && styles.inactivePinnedBadge]}>
                                                    <Ionicons name="pin" size={10} color={isActive ? '#FFFFFF' : theme.colors.primary} />
                                                </View>
                                            )}
                                        </View>
                                        {!!chatDateLabel && (
                                            <View style={styles.chatMetaRow}>
                                                <Ionicons name="time-outline" size={10} color={theme.colors.greyLight} />
                                                <Text style={styles.chatTimestamp} numberOfLines={1}>
                                                    {chatDateLabel}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </GlassSurface>
                        </Pressable>
                </ContextMenu>
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
        <GradientBackground
            variant="background"
            style={styles.drawerContainer}
        >
        <View
            ref={viewRef}
            style={styles.drawerInner}>
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
                {/* On-device AI status (local-only app — no cloud toggle) */}
                <View style={styles.modelToggleContainer}>
                    <GlassCard style={styles.localModelSection} padding={12} borderRadius={12}>
                        <View style={styles.localModelHeader}>
                            <Text style={styles.localModelTitle}>📱 On-device AI</Text>
                            {!isLocalModelReady && (
                                <ActivityIndicator size="small" color={theme.colors.mutedForeground} />
                            )}
                        </View>

                        {/* Privacy indicator */}
                        <Text style={styles.privacyText}>
                            {isLocalModelReady ? '🔒 Private & Offline' : '⏳ Loading model…'}
                        </Text>

                        {/* Generating indicator */}
                        {isLocalModelGenerating && (
                            <View style={styles.generatingBadge}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={styles.generatingText}>Generating...</Text>
                            </View>
                        )}
                    </GlassCard>
                </View>

                {/* Navigator modules (Legal, and future modules) — rendered from the registry */}
                <View style={styles.navigatorSection}>
                    {NAVIGATOR_MODULES.map((mod) => (
                        <TouchableOpacity
                            key={mod.id}
                            activeOpacity={0.8}
                            onPress={() => {
                                (navigation as any).closeDrawer?.();
                                router.push(mod.route as any);
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={mod.title}
                        >
                            <GlassSurface style={styles.navigatorRow} borderRadius={12}>
                                <View style={styles.navigatorIconWrap}>
                                    <Ionicons name={mod.icon as any} size={20} color={theme.colors.primary} />
                                </View>
                                <Text style={styles.navigatorLabel}>{mod.title}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.colors.greyLight} />
                            </GlassSurface>
                        </TouchableOpacity>
                    ))}

                    {/* Freelancer Hub: a multi-entity business-management module, not a
                        single-case NavigatorModule, so it's a standalone row here rather
                        than coming from the registry loop above. */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            (navigation as any).closeDrawer?.();
                            router.push('/(freelancer)' as any);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Freelancer Hub"
                    >
                        <GlassSurface style={styles.navigatorRow} borderRadius={12}>
                            <View style={styles.navigatorIconWrap}>
                                <Ionicons name="briefcase-outline" size={20} color={theme.colors.primary} />
                            </View>
                            <Text style={styles.navigatorLabel}>Freelancer Hub</Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.colors.greyLight} />
                        </GlassSurface>
                    </TouchableOpacity>
                </View>

                {/* Show search and history title (conversations persist to Supabase in both local and cloud mode) */}
                {(
                    <>
                        <View style={styles.searchContainer}>
                            <GlassSurface style={styles.searchSection} borderRadius={12}>
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
                            </GlassSurface>
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
                {(
                        // Conversation list (persisted to Supabase for both local and cloud mode)
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
                <GlassSurface style={styles.footerGlass} borderRadius={16}>
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
                                    {user?.email || 'user@locale.ai'}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.settingsButton}>
                            <Ionicons name="settings-outline" size={20} color={theme.colors.primary} />
                        </View>
                    </TouchableOpacity>
                </Link>
                </GlassSurface>
            </Animated.View>
        </View>
        </GradientBackground>
    );
};


const getStyles = (theme: Theme) => StyleSheet.create({
    drawerContainer: {
        flex: 1,
    },
    drawerInner: {
        flex: 1,
    },
    headerContainer: {
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
        height: 42,
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
        marginBottom: 6,
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
    activeChatText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    chatIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: theme.colors.chatIconContainer,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    activeChatIconContainer: {
        backgroundColor: theme.isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.15)',
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
    footerContainer: {
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: 8,
    },
    footerGlass: {
        // wraps the settings/profile row in a glass card
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
    
    // ===== Local Model Styles =====
    localModelSection: {
        marginBottom: 16,
    },
    navigatorSection: {
        marginBottom: 16,
        gap: 8,
    },
    navigatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 10,
    },
    navigatorIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: theme.isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(59, 130, 246, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navigatorLabel: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
        letterSpacing: -0.2,
    },
    localModelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    localModelTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.text,
    },
    localModelOptions: {
        flexDirection: 'row',
        gap: 8,
    },
    modelOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 2,
        borderColor: theme.isDark ? '#3a3a3a' : '#ddd',
        backgroundColor: theme.isDark ? '#2a2a2a' : '#fff',
        alignItems: 'center',
    },
    modelOptionActive: {
        borderColor: '#007AFF',
        backgroundColor: theme.isDark ? '#1a3a5a' : '#E3F2FD',
    },
    modelOptionDisabled: {
        opacity: 0.5,
    },
    modelOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: theme.colors.mutedForeground,
    },
    modelOptionTextActive: {
        color: '#007AFF',
    },
    modelOptionTextDisabled: {
        color: theme.colors.mutedForeground,
        opacity: 0.6,
    },
    modelOptionSubtext: {
        fontSize: 10,
        color: theme.colors.mutedForeground,
        marginTop: 2,
    },
    privacyText: {
        fontSize: 11,
        color: theme.colors.mutedForeground,
        marginTop: 8,
        textAlign: 'center',
    },
    generatingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#007AFF',
        borderRadius: 12,
    },
    generatingText: {
        fontSize: 12,
        color: '#fff',
        fontWeight: '600',
    },
});