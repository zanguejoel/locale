/**
 * Configure Integration Modal Component
 * 
 * Modal for configuring integration settings (API keys, URLs, etc.)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Integration, ConfigField } from '@/types/integrations';
import { useIntegrations } from '@/contexts/IntegrationsContext';
import IntegrationLogo from './IntegrationLogo';

interface ConfigureIntegrationModalProps {
  visible: boolean;
  integration: Integration | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ConfigureIntegrationModal({
  visible,
  integration,
  onClose,
  onSuccess,
}: ConfigureIntegrationModalProps) {
  const theme = useTheme();
  const { configureIntegration } = useIntegrations();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});

  const handleClose = () => {
    setSettings({});
    onClose();
  };

  const handleSave = async () => {
    if (!integration) return;

    setLoading(true);
    try {
      await configureIntegration(integration.id, settings);
      Alert.alert(
        'Success',
        'Integration settings saved successfully!',
        [
          {
            text: 'OK',
            onPress: () => {
              handleClose();
              onSuccess?.();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: ConfigField) => {
    if (field.isTitle) {
      return (
        <Text
          key={field.label}
          style={[styles.sectionTitle, { color: theme.colors.text }]}
        >
          {field.label}
        </Text>
      );
    }

    const value = settings[field.value] || field.default || '';

    switch (field.inputType) {
      case 'text':
      case 'password':
        return (
          <View key={field.value} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.cardBackground,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={value}
              onChangeText={(text) => setSettings({ ...settings, [field.value]: text })}
              placeholder={field.placeholder}
              placeholderTextColor={theme.colors.grey}
              secureTextEntry={field.inputType === 'password'}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        );

      case 'textarea':
        return (
          <View key={field.value} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textarea,
                {
                  backgroundColor: theme.colors.cardBackground,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={value}
              onChangeText={(text) => setSettings({ ...settings, [field.value]: text })}
              placeholder={field.placeholder}
              placeholderTextColor={theme.colors.grey}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        );

      case 'switch':
        return (
          <View key={field.value} style={[styles.fieldContainer, styles.switchContainer]}>
            <Text style={[styles.label, { color: theme.colors.text, flex: 1 }]}>
              {field.label}
            </Text>
            <Switch
              value={value === true || value === 'true'}
              onValueChange={(val) => setSettings({ ...settings, [field.value]: val })}
              trackColor={{ false: theme.colors.grey, true: theme.colors.tint }}
            />
          </View>
        );

      case 'select':
        // For now, just use a simple input - can enhance with picker later
        return (
          <View key={field.value} style={styles.fieldContainer}>
            <Text style={[styles.label, { color: theme.colors.text }]}>
              {field.label}
              {field.required && <Text style={styles.required}> *</Text>}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.cardBackground,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                },
              ]}
              value={value}
              onChangeText={(text) => setSettings({ ...settings, [field.value]: text })}
              placeholder={field.placeholder || 'Select...'}
              placeholderTextColor={theme.colors.grey}
            />
          </View>
        );

      default:
        return null;
    }
  };

  if (!integration) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} disabled={loading}>
            <Ionicons name="close" size={28} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Configure</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content */}
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Integration Info */}
          <View style={styles.integrationInfo}>
            <IntegrationLogo integration={integration} size={60} />
            <Text style={[styles.name, { color: theme.colors.text }]}>
              {integration.integration_name}
            </Text>
          </View>

          {/* Configuration Fields */}
          {integration.configFields && integration.configFields.length > 0 ? (
            integration.configFields.map(renderField)
          ) : (
            <View style={styles.noFieldsContainer}>
              <Ionicons name="settings-outline" size={48} color={theme.colors.grey} />
              <Text style={[styles.noFieldsText, { color: theme.colors.grey }]}>
                No configuration required
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        {integration.configFields && integration.configFields.length > 0 && (
          <View style={[styles.footer, { borderTopColor: theme.colors.border }]}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: theme.colors.cardBackground },
              ]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                { backgroundColor: theme.colors.tint, opacity: loading ? 0.6 : 1 },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Settings</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  integrationInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 12,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textarea: {
    minHeight: 100,
    paddingTop: 10,
  },
  noFieldsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noFieldsText: {
    fontSize: 16,
    marginTop: 12,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    marginRight: 8,
  },
  saveButton: {
    marginLeft: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConfigureIntegrationModal;

