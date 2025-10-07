import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface MessageEditModalProps {
  visible: boolean;
  originalContent: string;
  onClose: () => void;
  onSave: (newContent: string) => void;
}

const MessageEditModal: React.FC<MessageEditModalProps> = ({
  visible,
  originalContent,
  onClose,
  onSave,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const [editedContent, setEditedContent] = useState(originalContent);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEditedContent(originalContent);
    setHasChanges(false);
  }, [originalContent, visible]);

  const handleContentChange = (text: string) => {
    setEditedContent(text);
    setHasChanges(text !== originalContent && text.trim().length > 0);
  };

  const handleSave = () => {
    if (hasChanges) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave(editedContent.trim());
      onClose();
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditedContent(originalContent);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <Pressable style={styles.overlay} onPress={handleCancel}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <Text style={styles.title}>Edit Message</Text>
              <TouchableOpacity
                onPress={handleCancel}
                style={styles.closeButton}
                accessibilityLabel="Cancel editing"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.content}>
              <TextInput
                value={editedContent}
                onChangeText={handleContentChange}
                multiline
                style={styles.input}
                placeholder="Type your message..."
                placeholderTextColor={theme.colors.textSecondary}
                autoFocus
                maxLength={4000}
              />
              <Text style={styles.charCount}>
                {editedContent.length} / 4000
              </Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleCancel}
                style={[styles.button, styles.cancelButton]}
                accessibilityLabel="Cancel"
                accessibilityRole="button"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!hasChanges}
                style={[
                  styles.button,
                  styles.saveButton,
                  !hasChanges && styles.saveButtonDisabled,
                ]}
                accessibilityLabel="Save changes"
                accessibilityRole="button"
                accessibilityState={{ disabled: !hasChanges }}
              >
                <Ionicons
                  name="checkmark"
                  size={18}
                  color={hasChanges ? '#fff' : theme.colors.textSecondary}
                />
                <Text
                  style={[
                    styles.saveButtonText,
                    !hasChanges && styles.saveButtonTextDisabled,
                  ]}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: theme.colors.background,
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
    minHeight: 150,
  },
  input: {
    fontSize: 16,
    color: theme.colors.text,
    lineHeight: 24,
    minHeight: 120,
    maxHeight: 300,
    textAlignVertical: 'top',
    backgroundColor: theme.colors.backgroundLight,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  charCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'right',
    marginTop: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  cancelButton: {
    backgroundColor: theme.colors.backgroundLight,
    borderWidth: 1,
    borderColor: theme.isDark ? '#3a3a3a' : '#e0e0e0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
  },
  saveButtonDisabled: {
    backgroundColor: theme.colors.backgroundLight,
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  saveButtonTextDisabled: {
    color: theme.colors.textSecondary,
  },
});

export default MessageEditModal;

