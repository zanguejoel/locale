import Colors from '@/constants/Colors';
import { StyleSheet } from 'react-native';
import { typography, textStyles } from '@/constants/Typography';

export const defaultStyles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    backgroundColor: Colors.common.primary,
    ...textStyles.button, // Apply typography
  },
  btnSecondary: {
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: Colors.common.primary,
    ...textStyles.button, // Apply typography
  },
  loadingOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  pageContainer: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
});
