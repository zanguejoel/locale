import MessageInput from '@/components/ChatInput';
import { defaultStyles } from '@/constants/Styles';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, View, StyleSheet, KeyboardAvoidingView, Platform, Alert, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import ChatMessage from '@/components/ChatMessage';
import { Message, Role } from '@/utils/Interfaces';
import MessageIdeas from '@/components/MessageIdeas';
import { addChat, addMessage, getMessages } from '@/utils/Database';
import { useSQLiteContext } from 'expo-sqlite';
import { processStream } from '@/utils/ChatStream';
import { polyfill as polyfillURL } from 'react-native-polyfill-globals/src/url';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
polyfillURL();
polyfillFetch();
polyfillEncoding();
polyfillReadableStream();

const BASE_URL = 'https://jaiime-dev.app.neptunetech.io';

function updateLastItem<T>(
  array: T[],
  updateFn: (item: T) => T
): T[] {
  if (array.length === 0) {
    return array;
  }
  
  return [
    ...array.slice(0, -1),
    updateFn(array[array.length - 1])
  ];
}

const ChatPage = () => {
  const [height, setHeight] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);

  const [error, setError] = useState('');
  const [stream, setStream] = useState('');
  const [intermediate, setIntermediate] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [files, setFiles] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [pastedActive, setPastedActive] = useState(false);

  const db = useSQLiteContext();
  let { id } = useLocalSearchParams<{ id: string }>();


 

  const [chatId, _setChatId] = useState(id);
  const chatIdRef = useRef(chatId);
  function setChatId(id: string) {
    chatIdRef.current = id;
    _setChatId(id);
  }

  useEffect(() => {
    const _messages = updateLastItem(messages, message => ({
      ...message,
      content: stream
    }))
  setMessages(_messages);
 }, [stream, isSending]);

  useEffect(() => {
    if (id) {
      getMessages(db, parseInt(id)).then((res) => {
        setMessages(res);
      });
    }
  }, [id]);
  

  const onLayout = (event: any) => {
    const { height } = event.nativeEvent.layout;
    setHeight(height / 2);
  };


  const handleError = (error: string) => {
    console.log({
      title: 'We encounted an error.',
      description: error,
      variant: 'destructive',
      position: 'top-right'
    });
  };


  const sendMessageJaiime = async (
    message: string,
    messageType = 'text',
    operation = null,
    params:any = null
  ) => {
    setError('');
    setStream('');
    setIntermediate('');
    setIsSending(true);
    

    setMessages((state) => [
      ...state,
      { role: Role.User, content: message || '' },
      { role: Role.Bot, content: '', isLoading: true }
    ]);

    const formData = new FormData();
    let file = null;
    formData.append(
      'text',
      ['text', 'phone'].includes(messageType) && typeof message === 'string'
        ? message
        : ''
    );
    if (files?.length || messageType === 'audio') {
      file = ['phone', 'audio'].includes(messageType)
        ? [
            new File([message], `recorded-audio.wav`, {
              type: message?.type || 'audio/wav',
              lastModified: new Date().getTime()
            })
          ]
        : [...files];

      file.forEach((_file, i) => {
        formData.append(
          ['phone', 'audio'].includes(messageType) ? 'audio' : `files`,
          _file,
          _file.name
        );
      });
      setFiles([]);
    }

    try {
      formData.append('operations', JSON.stringify(operation));
     
      formData.append('conversation_id', '52112');
      const _controller = new AbortController();
      const _response = await fetch(`https://jaiime-dev.app.neptunetech.io/chat`, {
        method: 'POST',
        headers: {
          Authorization: ' ' + `d2540ef6-f652-4b77-b37b-95abc0d775bb`,
          'Content-Type': 'application/json',
        },
        body: formData,
        reactNative: { textStreaming: true },
        signal: _controller.signal,
        
      });
      // console.log("API response--",  _response);

      if (!_response.ok) {
        const errorMessage = await _response.text();
        throw new Error(`Error: ${_response.status} - ${errorMessage}`);
      }
      // const respBody = await _response.formData();
      // console.log("API response--",  await _response.formData());
      const response = await processStream(
        _response.body,
        setStream,
        handleError,
        setIntermediate
      );
      
      try {
        
        console.log('update message', response);
      } catch (parseError) {
        console.error('Error parsing chat history:', parseError);
        // console.log('Raw history data:', history);
      }

      setInputDisabled(false);
      setPastedActive(false)
      
      // updateHistory((state) => state + 1); // update messages
      // console.log('Full response:', JSON.stringify(response));
    } catch (e) {
      console.error('Error in sendMessageJaiime:', e);
      console.log({
        title: 'We encountered an error.',
        description: 'Please try again',
        variant: 'destructive',
        position: 'top-right'
      });
    } finally {
      setIsSending(false);
      setInputDisabled(false);
    }
  
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
         
        {messages.length === 0 && <MessageIdeas onSelectCard={sendMessageJaiime} />}
        <MessageInput onShouldSend={sendMessageJaiime} />
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
