import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  met: boolean;
  text: string;
}

export enum PasswordStrength {
  WEAK = 0,
  FAIR = 1,
  GOOD = 2,
  STRONG = 3,
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password,
  showRequirements = true,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const analysis = useMemo(() => {
    const requirements: PasswordRequirement[] = [
      {
        met: password.length >= 8,
        text: 'At least 8 characters',
      },
      {
        met: /[A-Z]/.test(password),
        text: 'One uppercase letter',
      },
      {
        met: /[a-z]/.test(password),
        text: 'One lowercase letter',
      },
      {
        met: /\d/.test(password),
        text: 'One number',
      },
      {
        met: /[@$!%*?&]/.test(password),
        text: 'One special character (@$!%*?&)',
      },
    ];

    const metCount = requirements.filter(r => r.met).length;
    
    let strength: PasswordStrength;
    let strengthText: string;
    let strengthColor: string;

    if (metCount === 0 || password.length === 0) {
      strength = PasswordStrength.WEAK;
      strengthText = '';
      strengthColor = theme.colors.grey;
    } else if (metCount <= 2) {
      strength = PasswordStrength.WEAK;
      strengthText = 'Weak';
      strengthColor = theme.colors.destructive;
    } else if (metCount === 3 || metCount === 4) {
      strength = PasswordStrength.FAIR;
      strengthText = 'Fair';
      strengthColor = theme.colors.warning;
    } else {
      strength = PasswordStrength.STRONG;
      strengthText = 'Strong';
      strengthColor = theme.colors.success;
    }

    return {
      requirements,
      strength,
      strengthText,
      strengthColor,
      metCount,
      totalCount: requirements.length,
    };
  }, [password, theme]);

  if (!password) return null;

  return (
    <View style={styles.container}>
      {/* Strength Bar */}
      <View style={styles.strengthBarContainer}>
        <View style={styles.strengthBarTrack}>
          <View
            style={[
              styles.strengthBarFill,
              {
                width: `${(analysis.metCount / analysis.totalCount) * 100}%`,
                backgroundColor: analysis.strengthColor,
              },
            ]}
          />
        </View>
        {analysis.strengthText && (
          <Text style={[styles.strengthText, { color: analysis.strengthColor }]}>
            {analysis.strengthText}
          </Text>
        )}
      </View>

      {/* Requirements List */}
      {showRequirements && (
        <View style={styles.requirementsContainer}>
          {analysis.requirements.map((req, index) => (
            <View key={index} style={styles.requirementRow}>
              <Ionicons
                name={req.met ? 'checkmark-circle' : 'ellipse-outline'}
                size={16}
                color={req.met ? theme.colors.success : theme.colors.grey}
              />
              <Text style={[
                styles.requirementText,
                { color: req.met ? theme.colors.success : theme.colors.textSecondary }
              ]}>
                {req.text}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 8,
  },
  strengthBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  strengthBarTrack: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.greyLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  strengthBarFill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  strengthText: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 50,
  },
  requirementsContainer: {
    gap: 6,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    lineHeight: 18,
  },
});

export default PasswordStrengthMeter;

