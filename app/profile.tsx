
import { FormData as AuthFormData, useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import EditProfileModal from "@/components/modals/EditProfileModal/EditProfileModal";
import DeleteAccountConfirmModal from "@/components/modals/DeleteAccountConfirmModal/DeleteAccountConfirmModal";
import DeleteAccountOTPModal from "@/components/modals/DeleteAccountOTPModal/DeleteAccountOTPModal";

import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/constants/Types";
import Colors from "@/constants/Colors";
import { mixpanelService } from "@/utils/mixpanel/MixpanelService";
import { SettingsEvent } from "@/types/mixpanel";
import { useEffect } from "react";
import api from "@/utils/ApiClient";
import { router } from "expo-router";
import { deleteToken } from "@/utils/SecureTokenManager";

// Define profile-specific form data type
interface ProfileFormData {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  postalCode: string;
  state: string;
}

const Profile = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { user, updateUser, signOut } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: user?.first_name || '',
    lastName: user?.last_name || '',
    address: user?.address || '',
    city: user?.city || '',
    postalCode: user?.postal_code || '',
    state: user?.state || ''
  });

  // Delete account state
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showDeleteOTPModal, setShowDeleteOTPModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Track profile viewed
  useEffect(() => {
    mixpanelService.trackSettings(SettingsEvent.PROFILE_VIEWED);
  }, []);

  // Cooldown timer for resend code
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Delete account handlers
  const handleRequestDeletion = async () => {
    setShowDeleteConfirmModal(false);
    setIsDeleting(true);

    // Track delete account requested
    await mixpanelService.trackSettings(SettingsEvent.PROFILE_UPDATED, {
      action: 'delete_account_requested',
    });

    try {
      const response = await api.requestAccountDeletion();

      if (response.ok) {
        setShowDeleteOTPModal(true);
        setResendCooldown(60);
        Alert.alert(
          'Verification Code Sent',
          'Please check your email for the verification code.',
          [{ text: 'OK' }]
        );
      } else {
        const errorMessage = response.data?.detail || 'Failed to send verification code.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error requesting account deletion:', error);
      Alert.alert('Error', 'Failed to send verification code. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    // Track delete account confirmed
    await mixpanelService.trackSettings(SettingsEvent.PROFILE_UPDATED, {
      action: 'delete_account_confirmed',
    });

    try {
      const code = otpCode.join('');
      const response = await api.deleteAccount(code, user?.email || '');

      if (response.ok) {
        Alert.alert(
          'Account Deleted',
          'Your account has been successfully deleted.',
          [
            {
              text: 'OK',
              onPress: async () => {
                // Clear auth and navigate to login
                await deleteToken();
                setShowDeleteOTPModal(false);
                router.replace('/login');
              },
            },
          ]
        );
      } else {
        const errorMessage = response.data?.detail || 'Failed to delete account.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    setIsDeleting(true);
    try {
      const response = await api.requestAccountDeletion();

      if (response.ok) {
        setResendCooldown(60);
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
      } else {
        const errorMessage = response.data?.detail || 'Failed to resend verification code.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error) {
      console.error('Error resending code:', error);
      Alert.alert('Error', 'Failed to resend verification code. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccountCancel = async () => {
    // Track delete account cancelled
    await mixpanelService.trackSettings(SettingsEvent.PROFILE_UPDATED, {
      action: 'delete_account_cancelled',
    });
    setShowDeleteConfirmModal(false);
  };

  const renderProfileInfo = () => {
    const userData = [
      { label: "First Name", value: user?.first_name, icon: "person-outline" },
      { label: "Last Name", value: user?.last_name, icon: "person-outline" },
      { label: "Email", value: user?.email, icon: "mail-outline" },
      { label: "Phone", value: user?.phone, icon: "call-outline" },
    /*   { label: "Birth Date", value: user?.date_of_birth, icon: "calendar-outline" }, */
      { label: "Street Address", value: user?.address, icon: "home-outline" },
      { label: "City", value: user?.city, icon: "map-outline" },
      { label: "State", value: user?.state, icon: "globe-outline" },
      { label: "Postal Code", value: user?.postal_code, icon: "business-outline" },
    ];


    return userData.map((item, index) => (
      <View key={index} style={[styles.infoCard, userData.length - 1 === index && { borderBottomWidth: 0 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={18} color={Colors.common.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value || 'Not provided'}</Text>
        </View>
      </View>
    ));
  };

  const handleSave = async () => {
    // Convert ProfileFormData to AuthFormData format expected by updateUser
    const authFormData: AuthFormData = {
      ...formData,
      email: user?.email || '',
      phone: user?.phone || '',
      password: '',
      confirmPassword: '',
    };
    
    // Determine which fields were updated
    const updatedFields: string[] = [];
    if (formData.firstName !== user?.first_name) updatedFields.push('firstName');
    if (formData.lastName !== user?.last_name) updatedFields.push('lastName');
    if (formData.address !== user?.address) updatedFields.push('address');
    if (formData.city !== user?.city) updatedFields.push('city');
    if (formData.postalCode !== user?.postal_code) updatedFields.push('postalCode');
    if (formData.state !== user?.state) updatedFields.push('state');
    
    // Track profile update
    await mixpanelService.trackSettings(SettingsEvent.PROFILE_UPDATED, {
      fields_updated: updatedFields,
    });
    
    await updateUser(authFormData, '', {} as any);
    setIsModalVisible(false);
  };

  return (
    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
      <View style={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImage}>
              <Text style={styles.profileInitials}>
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </Text>
            </View>
          </View>
          <Text style={styles.profileName}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <View style={styles.infoContainer}>
            {renderProfileInfo()}
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsModalVisible(true)}
          >
            <Text style={styles.buttonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone Section */}
        <View style={styles.dangerZoneContainer}>
         
          <View style={styles.dangerZoneCard}>
            <View style={styles.dangerZoneHeader}>
              <Ionicons name="warning" size={20} color={Colors.common.error} />
              <Text style={styles.dangerZoneHeaderText}>Delete Account</Text>
            </View>
            <Text style={styles.dangerZoneDescription}>
              These actions are permanent and cannot be undone. Please proceed with caution.
            </Text>
            <View style={styles.warningBox}>
              <Text style={styles.warningBoxTitle}>⚠️ This will permanently delete:</Text>
              <Text style={styles.warningBoxItem}>• Chat history and conversations</Text>
              <Text style={styles.warningBoxItem}>• Account data and preferences</Text>
              <Text style={styles.warningBoxItem}>• Billing history and subscriptions</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteAccountButton}
              onPress={() => setShowDeleteConfirmModal(true)}
            >
              <Ionicons name="trash" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Modals */}
      <EditProfileModal
        isModalVisible={isModalVisible}
        setIsModalVisible={setIsModalVisible}
        handleInputChange={handleInputChange}
        formData={formData}
        handleSave={handleSave}
      />
      <DeleteAccountConfirmModal
        isModalVisible={showDeleteConfirmModal}
        setIsModalVisible={setShowDeleteConfirmModal}
        onConfirm={handleRequestDeletion}
        isDeleting={isDeleting}
      />
      <DeleteAccountOTPModal
        isModalVisible={showDeleteOTPModal}
        setIsModalVisible={setShowDeleteOTPModal}
        onConfirm={handleDeleteAccount}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        isDeleting={isDeleting}
        userEmail={user?.email || ''}
        onResendCode={handleResendCode}
        resendCooldown={resendCooldown}
      />
    </ScrollView>

  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  safeArea: {
    flex: 1,
    marginBottom: 80,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 80,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  profileImageContainer: {
    marginBottom: 10,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: theme.isDark 
      ? 'rgba(100, 181, 246, 0.15)' 
      : '#e5f3f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.common.primary,
    letterSpacing: 0.5,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 3,
    letterSpacing: -0.3,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.common.greyLight,
    opacity: 0.9,
  },
  sectionContainer: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: theme.colors.text,
    letterSpacing: -0.2,
    opacity: 0.9,
  },
  infoContainer: {
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    padding: 10,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: theme.isDark 
      ? 'rgba(255, 255, 255, 0.06)' 
      : 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    color: theme.colors.greyLight,
    marginBottom: 2,
    opacity: 0.8,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text,
    letterSpacing: -0.1,
  },
  editButton: {
    backgroundColor: Colors.common.primary,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: Colors.common.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: '#F9F9F9',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  // Danger Zone Styles
  dangerZoneContainer: {
    marginTop: 20,
    marginBottom: 14,
  },
  dangerZoneTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
    color: Colors.common.error,
    letterSpacing: -0.2,
  },
  dangerZoneCard: {
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    padding: 14,
    shadowColor: Colors.common.error,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(239, 68, 68, 0.2)',
  },
  dangerZoneHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.common.error,
    marginLeft: 8,
    letterSpacing: -0.2,
  },
  dangerZoneDescription: {
    fontSize: 12,
    color: theme.colors.greyLight,
    marginBottom: 10,
    lineHeight: 17,
    opacity: 0.9,
  },
  warningBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  warningBoxTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.common.error,
    marginBottom: 6,
  },
  warningBoxItem: {
    fontSize: 11,
    color: Colors.common.error,
    marginLeft: 8,
    marginBottom: 3,
    opacity: 0.9,
  },
  deleteAccountButton: {
    backgroundColor: Colors.common.error,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.common.error,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  deleteAccountButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});

export default Profile;