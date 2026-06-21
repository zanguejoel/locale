import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useFocusEffect, Stack } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassSurface } from '@/components/GlassSurface';
import { getContract } from '@/lib/freelance/contracts';
import { Contract } from '@/lib/freelance/types';

export default function ContractDetail() {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { contractId } = useLocalSearchParams<{ contractId: string }>();
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!contractId) return;
    setContract(await getContract(contractId));
    setLoading(false);
  }, [contractId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading || !contract) {
    return (
      <GradientBackground variant="background" style={styles.container}>
        <View style={styles.center}><ActivityIndicator color={theme.colors.primary} /></View>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground variant="background" style={styles.container}>
      <Stack.Screen options={{ title: contract.name }} />
      <ScrollView contentContainerStyle={styles.content}>
        <GlassSurface style={styles.card} borderRadius={16}>
          <Text style={styles.title}>{contract.name}</Text>
          <Text style={styles.type}>{contract.type}</Text>
          <View style={styles.divider} />
          <Field label="Start date" value={contract.startDate} />
          <Field label="End date" value={contract.endDate} />
          <Field label="Renewal date" value={contract.renewalDate} />
          <Field label="Payment terms" value={contract.paymentTerms} />
          <Field label="Notice period" value={contract.noticePeriod} />
        </GlassSurface>
        {!!contract.extractedText && (
          <GlassSurface style={styles.card} borderRadius={16}>
            <Text style={styles.sectionTitle}>Extracted Text</Text>
            <Text style={styles.excerpt}>{contract.extractedText.slice(0, 1500)}</Text>
          </GlassSurface>
        )}
      </ScrollView>
    </GradientBackground>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  const theme = useTheme();
  const styles = getStyles(theme);
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value ?? '—'}</Text>
    </View>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, gap: 12 },
  card: { padding: 16, gap: 8 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  type: { fontSize: 13, color: theme.colors.mutedForeground },
  divider: { height: 1, backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)', marginVertical: 6 },
  fieldRow: { flexDirection: 'row', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 12, color: theme.colors.mutedForeground },
  fieldValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
  excerpt: { fontSize: 12, color: theme.colors.mutedForeground, lineHeight: 18 },
});
