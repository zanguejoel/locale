import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      ...Colors[isDark ? 'dark' : 'light'],
      ...Colors.common,
    },
  };
}; 