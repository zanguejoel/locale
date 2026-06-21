import React, { useState } from 'react';
import { Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { addClient } from '@/lib/freelance/clients';
import { indexClient } from '@/lib/freelance/index_rag';

export default function NewClient() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const router = useRouter();

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give the client a name.');
      return;
    }
    try {
      setSaving(true);
      const created = await addClient({
        name: name.trim(),
        company: company.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });
      await indexClient(created).catch((e) => console.error('[Freelancer] Index client failed:', e));
      router.replace(`/(freelancer)/clients/${created.id}` as any);
    } catch (e) {
      console.error('[Freelancer] Failed to create client:', e);
      Alert.alert('Error', 'Could not create the client. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <GradientBackground variant="background" style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Name</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Jane Doe" placeholderTextColor={theme.colors.mutedForeground} autoFocus />
        </GlassSurface>

        <Text style={styles.label}>Company (optional)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="e.g. National Bank" placeholderTextColor={theme.colors.mutedForeground} />
        </GlassSurface>

        <Text style={styles.label}>Email (optional)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="e.g. jane@company.com" placeholderTextColor={theme.colors.mutedForeground} keyboardType="email-address" autoCapitalize="none" />
        </GlassSurface>

        <Text style={styles.label}>Phone (optional)</Text>
        <GlassSurface style={styles.inputWrap} borderRadius={12}>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="e.g. +1 555 123 4567" placeholderTextColor={theme.colors.mutedForeground} keyboardType="phone-pad" />
        </GlassSurface>

        <TouchableOpacity style={styles.createBtn} onPress={onCreate} disabled={saving} activeOpacity={0.85}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.createText}>Add Client</Text>}
        </TouchableOpacity>
      </ScrollView>
    </GradientBackground>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 8 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 12, marginBottom: 2, marginLeft: 4 },
  inputWrap: { paddingHorizontal: 14, paddingVertical: 4 },
  input: { fontSize: 16, color: theme.colors.text, paddingVertical: 10 },
  createBtn: { marginTop: 24, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  createText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
});
