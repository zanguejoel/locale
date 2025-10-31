import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';
import { useCredits } from '@/hooks/useCredits';
import CreditPurchaseModalIAP from './CreditPurchaseModalIAP';
import * as Haptics from 'expo-haptics';

interface CreditBadgeProps {
  variant?: 'compact' | 'full';
  onPress?: () => void;
  source?: 'header_badge' | 'settings' | 'error_banner' | 'empty_state';
}

const CreditBadge: React.FC<CreditBadgeProps> = ({ variant = 'compact', onPress, source = 'header_badge' }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { credits, isLoading } = useCredits();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  const handlePress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onPress) {
      onPress();
    } else {
      setShowPurchaseModal(true);
    }
  };

  if (isLoading && !credits) {
    return (
      <View style={[styles.badge, variant === 'full' && styles.badgeFull]}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (!credits) {
    return null;
  }

  const { remaining_credits } = credits;
  const isLow = remaining_credits < 100;
  const isCritical = remaining_credits < 50;

  if (variant === 'full') {
    return (
      <>
        <TouchableOpacity
          style={[styles.badgeFull, isCritical && styles.badgeCritical]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          <View style={styles.badgeFullIcon}>
            <Ionicons
              name="wallet"
              size={20}
              color={isCritical ? theme.colors.destructive : theme.colors.primary}
            />
          </View>
          <View style={styles.badgeFullContent}>
            <Text style={styles.badgeFullLabel}>Credits</Text>
            <Text style={[styles.badgeFullAmount, isCritical && styles.badgeFullAmountCritical]}>
              {remaining_credits}
            </Text>
          </View>
          <Ionicons
            name="add-circle"
            size={24}
            color={theme.colors.primary}
            style={styles.badgeFullAdd}
          />
        </TouchableOpacity>
        <CreditPurchaseModalIAP
          visible={showPurchaseModal}
          onClose={() => setShowPurchaseModal(false)}
          source={source}
        />
      </>
    );
  }

  // Compact variant (default)
  return (
    <>
      <TouchableOpacity
        style={[
          styles.badge,
          isLow && styles.badgeLow,
          isCritical && styles.badgeCritical,
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <Ionicons
          name="diamond"
          size={12}
          color={isCritical ? theme.colors.destructive : isLow ? '#FFA500' : theme.colors.primary}
        />
        <Text style={[styles.badgeText, isCritical && styles.badgeTextCritical]}>
          {remaining_credits}
        </Text>
      </TouchableOpacity>
      <CreditPurchaseModalIAP
        visible={showPurchaseModal}
        onClose={() => setShowPurchaseModal(false)}
        source={source}
      />
    </>
  );
};

const getStyles = (theme: Theme) =>
  StyleSheet.create({
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 12,
      backgroundColor: theme.colors.backgroundLight,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
      gap: 4,
    },
    badgeLow: {
      borderColor: '#FFA500',
      backgroundColor: '#FFA50010',
    },
    badgeCritical: {
      borderColor: theme.colors.destructive,
      backgroundColor: theme.colors.destructive + '10',
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.text,
    },
    badgeTextCritical: {
      color: theme.colors.destructive,
    },
    badgeFull: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      borderRadius: 16,
      backgroundColor: theme.colors.backgroundLight,
      borderWidth: 1,
      borderColor: theme.colors.primary + '40',
      gap: 12,
    },
    badgeFullIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.primary + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeFullContent: {
      flex: 1,
    },
    badgeFullLabel: {
      fontSize: 12,
      color: theme.colors.greyLight,
      marginBottom: 2,
    },
    badgeFullAmount: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    badgeFullAmountCritical: {
      color: theme.colors.destructive,
    },
    badgeFullAdd: {
      marginLeft: 'auto',
    },
  });

export default CreditBadge;

