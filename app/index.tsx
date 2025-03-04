import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';
import 'react-native-gesture-handler';

const Index = () => {
  const { user, isSignedIn } = useAuth();

  if (user?.email) {
    // console.log("User----", user)
    Redirect({ href: "/(chat)/new" });
  } else if (!isSignedIn) {
    Redirect({ href: "/login" });
  }

}

export default Index;