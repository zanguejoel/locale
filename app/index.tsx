import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import 'react-native-gesture-handler';


export default function Index() {
  const { user, isSignedIn } = useAuth();

  if (user?.email) {
    return <Redirect href="/(chat)/new" />;
  } else if (!isSignedIn) {
    return <Redirect href="/login" />;
  }

  return null;
}