import { Drawer } from 'expo-router/drawer';
import { DrawerContentScrollView, DrawerItem, DrawerItemList } from '@react-navigation/drawer';
import { Link, useRouter } from 'expo-router';
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
} from 'react-native';
import Colors from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { FontAwesome6 } from '@expo/vector-icons';
import { useDrawerStatus } from '@react-navigation/drawer';
import * as ContextMenu from 'zeego/context-menu';
import { useRevenueCat } from '@/providers/RevenueCat';
import { useAuth } from '@/hooks/useAuth';
import { useChat } from '@/hooks/useChat';
import { useState } from 'react';


export const CustomDrawerContent = (props: any) => {
  const { bottom, top } = useSafeAreaInsets()

  // const isDrawerOpen = useDrawerStatus() === 'open';
  const { conversations, currentConversationId, fetchConversation, } = useChat();
  const router = useRouter();
  const {user} = useAuth();
  const [query, setQuery] = useState('');


  

  const onDeleteChat = (chatId: string) => {
    Alert.alert('Delete Chat', 'Are you sure you want to delete this chat?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        onPress: async () => {
          // Delete the chat
          
        },
      },
    ]);
  };

  const onRenameChat = (chatId: string) => {
    Alert.prompt('Rename Chat', 'Enter a new name for the chat', async (newName) => {
      if (newName) {
        // Rename the chat
       
      }
    });
  };

  return (
    <View style={{ flex: 1, marginTop: top }}>
      <View style={{ backgroundColor: '#fff', paddingBottom: 10 }}>
        <View style={styles.searchSection}>
          <Ionicons style={styles.searchIcon} name="search" size={20} color={Colors.greyLight} />
          <TextInput
            style={styles.input}
            placeholder="Search"
            underlineColorAndroid="transparent"
            onChangeText={(value) => setQuery(value)}
          />
        </View>
      </View>
      

      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ backgroundColor: '#fff', paddingTop: 0 }}>
       
        {conversations?.length && conversations.filter( c => !query || c.title?.toLowerCase()?.includes(query.toLowerCase())).map((chat) => (
          <ContextMenu.Root key={chat.id}>
            <ContextMenu.Trigger>
              <DrawerItem
                label={chat.title || ''}
                onPress={() => router.push(`/(chat)/${chat.id}`)}
                inactiveTintColor="#000"
              />
            </ContextMenu.Trigger>
            <ContextMenu.Content>
              <ContextMenu.Preview>
                {() => (
                  <View style={{ padding: 16, height: 200, backgroundColor: '#fff' }}>
                    <Text>{chat.title}</Text>
                  </View>
                )}
              </ContextMenu.Preview>

              <ContextMenu.Item key={'rename'} onSelect={() => onRenameChat(chat.id || '')}>
                <ContextMenu.ItemTitle>Rename</ContextMenu.ItemTitle>
                <ContextMenu.ItemIcon
                  ios={{
                    name: 'pencil',
                    pointSize: 18,
                  }}
                />
              </ContextMenu.Item>
              <ContextMenu.Item key={'delete'} onSelect={() => onDeleteChat(chat.id|| '')} destructive>
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
        ))}
      </DrawerContentScrollView>

      <View
        style={{
          padding: 16,
          paddingBottom: 10 + bottom,
          backgroundColor: Colors.light.background,
        }}>
        <Link href="/(modal)/settings" asChild>
          <TouchableOpacity style={styles.footer}>
            <Text style={styles.userName}>{user?.first_name || 'John'}</Text>
            <Ionicons name="ellipsis-horizontal" size={24} color={Colors.greyLight} />
          </TouchableOpacity>
        </Link>
      </View>
    </View>
  );
};

const Layout = () => {
  //const navigation = useNavigation();
  const dimensions = useWindowDimensions();
  const { user } = useRevenueCat();
  const router = useRouter();

  return (
    <Drawer
      drawerContent={CustomDrawerContent}
      screenOptions={(navigation) => ({
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => navigation.navigation.toggleDrawer()}
            style={{ marginLeft: 16 }}>
            <FontAwesome6 name="bars" size={24} color={Colors.grey} />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: Colors.light.background,
        },
        headerShadowVisible: false,
        drawerActiveBackgroundColor: Colors.selected,
        drawerActiveTintColor: '#000',
        drawerInactiveTintColor: '#000',
        overlayColor: 'rgba(0, 0, 0, 0.2)',
        drawerItemStyle: { borderRadius: 12 },
        drawerLabelStyle: { marginLeft: -20 },
        drawerStyle: { width: dimensions.width * 0.86 },
      })}>
      <Drawer.Screen
        name="new"
        getId={() => Math.random().toString()}
        options={{
          title: 'Jaiime Chat',
          drawerIcon: () => (
            <View style={[styles.item, { backgroundColor: '#000' }]}>
              <Image source={require('@/assets/images/icon.png')} style={styles.btnImage} />
            </View>
          ),
          headerRight: () => (
            <Link href={'/(chat)/new'} push asChild>
              <TouchableOpacity>
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={Colors.grey}
                  style={{ marginRight: 16 }}
                />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
      <Drawer.Screen
        name="[id]"
        options={{
          drawerItemStyle: {
            display: 'none',
          },
          headerRight: () => (
            <Link href={'/(chat)/new'} push asChild>
              <TouchableOpacity>
                <Ionicons
                  name="create-outline"
                  size={24}
                  color={Colors.grey}
                  style={{ marginRight: 16 }}
                />
              </TouchableOpacity>
            </Link>
          ),
        }}
      />
    </Drawer>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    marginHorizontal: 16,
    borderRadius: 10,
    height: 34,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.input,
  },
  searchIcon: {
    padding: 6,
  },
  input: {
    flex: 1,
    paddingTop: 8,
    paddingRight: 8,
    paddingBottom: 8,
    paddingLeft: 0,
    alignItems: 'center',
    color: '#424242',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  roundImage: {
    width: 30,
    height: 30,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  item: {
    borderRadius: 15,
    overflow: 'hidden',
  },
  btnImage: {
    margin: 6,
    width: 16,
    height: 16,
  },
  dallEImage: {
    width: 28,
    height: 28,
    resizeMode: 'cover',
  },
});

export default Layout;
