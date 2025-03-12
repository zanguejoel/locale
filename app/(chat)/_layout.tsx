import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { Link, useNavigation, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Image,
  Text,
  View,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  TextInput,
  Alert,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

import * as ContextMenu from 'zeego/context-menu';
import { useRevenueCat } from '@/providers/RevenueCat';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Swipeable } from 'react-native-gesture-handler';

export const CustomDrawerContent = (props: any) => {
  const { bottom, top } = useSafeAreaInsets();
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
  const [page, setPage] = useState(1);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const navigation = useNavigation();
  const limitRef = useRef(20);


  const [openSwipeable, setOpenSwipeable] = useState(null);

  const showLoading = isLoading || localLoading;

  useEffect(() => {
    limitRef.current = 20;
    setHasMore(true);
    fetchConversation(query, limitRef.current);
  }, [fetchConversation, query]);


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

  const closeOpenSwipeable = () => {
    if (openSwipeable) {
      openSwipeable.close();
      setOpenSwipeable(null);
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

  const renderRightActions = (chatId: string) => {
    return (
      <View style={styles.swipeActionContainer}>
        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => {
            closeOpenSwipeable();
            onDeleteChat(chatId);
          }}
        >
          <Ionicons name="trash-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    );
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

  return (
    <View style={styles.drawerContainer}>
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
        <DrawerContentScrollView
          {...props}
          onScroll={handleScroll}
          scrollEventThrottle={400}
          contentContainerStyle={styles.scrollViewContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
            />
          }
        >
          {filteredConversations.map((chat) => {

            return (
              <Swipeable
                key={chat?.id || Math.random().toString()}
                renderRightActions={() => renderRightActions(chat?.id || '')}
                onSwipeableOpen={() => {
                  // Close previously opened swipeable
                  closeOpenSwipeable();
                  // Set this one as the open one
                  setOpenSwipeable(chat?.id);
                }}
                ref={(ref) => {
                  if (chat?.id === openSwipeable) {
                    setOpenSwipeable(ref);
                  }
                }}
              >
                <ContextMenu.Root>
                  <ContextMenu.Trigger>
                    <Pressable
                      style={({ pressed }) => [
                        styles.chatItem,
                        chat?.id?.toString() === currentConversationId?.toString() && styles.activeChatItem,
                        pressed && styles.pressedChatItem,
                      ]}
                      onPress={() => router.push(`/(chat)/${chat?.id}`)}
                    >
                      <View style={styles.chatItemContent}>
                        <View style={styles.chatIconContainer}>
                          <Ionicons name="chatbubble" size={18} color={Colors.primary} />
                        </View>
                        <View style={styles.chatDetails}>
                          <Text style={styles.chatTitle} numberOfLines={1}>
                            {chat?.title || 'Untitled Chat'}
                          </Text>
                          <Text style={styles.chatTimestamp} numberOfLines={1}>
                            {new Date().toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={styles.chatActions}>
                          <Pressable
                            style={styles.actionButton}
                            onPress={() => onRenameChat(chat?.id || '', chat?.title || '')}
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
                          <Text style={styles.previewTitle}>{chat?.title || 'Untitled Chat'}</Text>
                        </View>
                      )}
                    </ContextMenu.Preview>

                    <ContextMenu.Item key={'rename'} onSelect={() => onRenameChat(chat?.id || '', chat?.title || '')}>
                      <ContextMenu.ItemTitle>Rename</ContextMenu.ItemTitle>
                      <ContextMenu.ItemIcon
                        ios={{
                          name: 'pencil',
                          pointSize: 18,
                        }}
                      />
                    </ContextMenu.Item>
                    <ContextMenu.Item key={'delete'} onSelect={() => onDeleteChat(chat?.id || '')} destructive>
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
            )
          })}
        </DrawerContentScrollView>
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

const Layout = () => {
  const dimensions = useWindowDimensions();
  const { user } = useRevenueCat();
  const router = useRouter();
  const { createNewConversation, resetChat } = useChat();

  const handleNewChat = async () => {
    try {
      // Create a new conversation and get its ID
      const newChatId = await createNewConversation();

      // Navigate to the new conversation
      router.push(`/(chat)/${newChatId}`);
    } catch (error) {
      console.error('Error creating new chat:', error);
      Alert.alert('Error', 'Failed to create a new chat');

      // If there's an error, still try to navigate to the new chat route
      resetChat();
      router.push('/(chat)/new');
    }
  };

  return (
    <Drawer

      drawerContent={CustomDrawerContent}
      screenOptions={(navigation) => ({
        /*   headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.navigation.toggleDrawer()}
              style={styles.headerButton}>
                <Ionicons name="menu-sharp" size={22} color={Colors.grey} />
            </TouchableOpacity>
          ), */
        headerTintColor: Colors.light.tint,
        headerStyle: {
          backgroundColor: Colors.light.background,
          height: 110,
        },
        headerShadowVisible: true,
        drawerActiveBackgroundColor: Colors.selected,
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#000',
        overlayColor: 'rgba(0, 0, 0, 0.2)',
        drawerItemStyle: { borderRadius: 12 },
        drawerLabelStyle: { marginLeft: -20 },
        drawerStyle: {
          width: dimensions.width * 0.85,
          backgroundColor: '#FFFFFF',
        },
        drawerType: 'front',
        drawerAnimationType: 'slide',
        drawerAnimationDuration: 300,
      })}>
      <Drawer.Screen
        name="new"

        getId={() => Math.random().toString()}
        options={{
          title: 'Jaiime AI',
          headerTitle: () => (
            <View style={styles.headerTitleContainer}>
              <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.headerLogo} />
              <Text style={styles.headerTitle}>Jaiime AI</Text>
            </View>
          ),
          drawerIcon: () => (
            <View style={styles.drawerIconContainer}>
              <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.drawerIcon} />
            </View>
          ),
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
              <Ionicons
                name="add"
                size={24}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <Drawer.Screen
        name="[id]"
        options={{
          title: 'Jaiime AI',
          drawerItemStyle: {
            display: 'none',
          },
          headerRight: () => (
            <TouchableOpacity style={styles.headerButton} onPress={handleNewChat}>
              <Ionicons
                name="add"
                size={24}
                color={Colors.light.tint}
              />
            </TouchableOpacity>
          ),
        }}
      />
    </Drawer>
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
  headerButton: {
    padding: 12,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerLogo: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.grey,
  },
  drawerIconContainer: {
    backgroundColor: '#F5F5F5',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
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

export default Layout;