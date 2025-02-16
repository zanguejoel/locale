import MessageInput from '@/components/ChatInput';
import { defaultStyles } from '@/constants/Styles';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import ChatMessage from '@/components/ChatMessage';
import MessageIdeas from '@/components/MessageIdeas';
import { useChat } from '@/hooks/useChat';
import { Message } from '@/utils/Interfaces';


const ChatPage = () => {
  const [height, setHeight] = useState(0);
  const messageListRef = useRef<FlashList<Message>>(null);
  const chat = useChat();
  const {messages, sendMessage, setCurrentRoom} = chat;
  let { id } = useLocalSearchParams<{ id: string }>();

  useEffect(() => {
    if(id) {
      setCurrentRoom(id);
    }
  }, [id]);


  useEffect(() => {
    if(messages.length && messageListRef?.current) {
      messageListRef.current?.scrollToIndex({index: messages.length - 1, animated:true})
    }
  }, [messages, id]);

  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeight(height / 2);
  };


  
  return (
    <View style={defaultStyles.pageContainer}>
      <Stack.Screen
        options={{
          headerTitle: () => (
           <></>
          ),
        }}
      />
      <View style={styles.page} onLayout={onLayout}>
        {messages.length == 0 && (
          <View style={[styles.logoContainer, { marginTop: height / 2 - 100 }]}>
            <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.image} />
          </View>
        )}

        <FlashList
          ref={messageListRef}
          initialScrollIndex={0}
          data={messages}
          renderItem={({ item }) => <ChatMessage {...item} />}
          estimatedItemSize={400}
          contentContainerStyle={{ paddingTop: 20, paddingBottom: 150 }}
          keyboardDismissMode="on-drag"
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={70}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
        }}>
         
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
});
export default ChatPage;
