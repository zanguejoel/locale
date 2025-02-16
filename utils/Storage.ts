import { MMKV } from 'react-native-mmkv';


export const chatStorage = new MMKV({
  id: 'chats',
});
