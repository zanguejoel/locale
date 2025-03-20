import { useColorScheme } from 'react-native';
import Colors from '@/constants/Colors';
import { Theme } from '@/constants/Types';

export const useTheme = () => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      ...Colors[isDark ? 'dark' : 'light'],
      ...Colors.common,
    },
  } as Theme;
}; 