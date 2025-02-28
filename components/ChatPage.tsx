import { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Animated, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useChat } from '@/hooks/useChat';
import ChatMessage from '@/components/ChatMessage';
import MessageIdeas from '@/components/MessageIdeas';
import MessageInput from '@/components/ChatInput';
import { defaultStyles } from '@/constants/Styles';
import { Message } from '@/utils/Interfaces';
import Colors from '@/constants/Colors';

const ChatPage = () => {
  const [height, setHeight] = useState(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messageListRef = useRef<FlashList<Message>>(null);
  const chat = useChat();
  const { messages, currentConversationId, sendMessage, setCurrentRoom } = chat;
  let { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if (id) {
      setCurrentRoom(id);
    }
  }, [id]);


  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeight(height / 2);
  };

  const handleScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
    setShowScrollButton(!isAtBottom);
  };

  const scrollToBottom = () => {
    messageListRef.current?.scrollToEnd({ animated: true });
  };

  return (
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen options={{ headerTitle: () => <></> }} />

      <View style={styles.page} onLayout={onLayout}>
        {messages.length === 0 && (
          <View style={[styles.logoContainer, { marginTop: height / 2 - 100 }]}>
            <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.image} />
          </View>
        )}

        <FlashList
          showsVerticalScrollIndicator={false}
          ref={messageListRef}
          initialScrollIndex={0}
          data={messages}
          renderItem={({ item }) => <ChatMessage {...item} />}
          estimatedItemSize={400}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 150 }}
          keyboardDismissMode="on-drag"
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />

        {showScrollButton && (
          <TouchableOpacity style={styles.scrollButton} onPress={scrollToBottom}>
            <Text style={styles.textScrollDown}>
              Scroll down
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={70}
        style={styles.keyboardAvoidingView}>
        {messages.length === 0 && <MessageIdeas onSelectCard={sendMessage} />}
        <MessageInput onShouldSend={sendMessage} />
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  logoContainer: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: 90,
    height: 60,
    resizeMode: 'cover',
  },
  page: {
    flex: 1,
  },
  keyboardAvoidingView: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
  },
  scrollButton: {
    position: 'absolute',
    bottom: 80,
    width: '100%',
    alignItems: 'center',
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  textScrollDown: {
    fontSize: 12,
    color: Colors.grey
  }
});

export default ChatPage;
