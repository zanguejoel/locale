import React from 'react';
import { View, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { InputAccessoryView } from 'react-native';
import * as Haptics from 'expo-haptics';

interface KeyboardAccessoryViewProps {
  inputAccessoryViewID: string;
  onDismiss?: () => void;
  showDismissButton?: boolean;
}

/**
 * iOS Keyboard Accessory View
 * Provides a native toolbar above the keyboard with quick actions
 * Only renders on iOS (Android doesn't support InputAccessoryView)
 */
const KeyboardAccessoryView: React.FC<KeyboardAccessoryViewProps> = ({
  inputAccessoryViewID,
  onDismiss,
  showDismissButton = true,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  // Only render on iOS
  if (Platform.OS !== 'ios') {
    return null;
  }

  const handleDismiss = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss?.();
  };

  return (
    <InputAccessoryView nativeID={inputAccessoryViewID}>
      <View style={styles.container}>
        <View style={styles.leftActions}>
          {/* Future: Add more quick actions here like formatting, attachments, etc */}
        </View>
        
        {showDismissButton && (
          <TouchableOpacity 
            onPress={handleDismiss}
            style={styles.dismissButton}
            accessibilityLabel="Dismiss keyboard"
            accessibilityRole="button"
            activeOpacity={0.6}
          >
            <Ionicons name="chevron-down" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </InputAccessoryView>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.greyLight,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dismissButton: {
    padding: 8,
    borderRadius: 8,
  },
});

export default KeyboardAccessoryView;

