import Colors from '@/constants/Colors';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';

import { View, Text, StyleSheet, Button } from 'react-native';

const rawPage = [{
  id: 1,
  key: 'profile',
  title: 'Profile'
}, {
  id: 2,
  key: 'sign_out',
  title: 'Sign Out'
},]

interface IItemRaw {
  id: number,
  key: string,
  title: string
}
const Page = () => {


  const router = useRouter();

  const { signOut } = useAuth();

  const handleInstruction = (type: string) => {
    switch (type) {
      case 'profile':
        return router.push('/profile')
      case 'sign_out':
        return signOut()
    }
  }


  const renderRaw = (item: IItemRaw, index: number) => {
    return (
      <View style={[styles.raw, rawPage.length - 1 === index && { borderBottomWidth: 0 }]}>
        <Button title={item.title} onPress={() => handleInstruction(item.key)} color={Colors.grey} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {rawPage.map((item, index) => renderRaw(item, index))}
    </View>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  raw: {
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderColor: Colors.greyLight
  },
  label: {
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 5,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 20,
    backgroundColor: '#fff',
  },

  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 16,
  },
});
export default Page;
