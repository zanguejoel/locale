import Colors from "@/constants/Colors";
import { FormData, useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import EditProfileModal from "@/components/modals/EditProfileModal/EditProfileModal";



const Profile = () => {
  const { user, updateUser } = useAuth();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: user?.first_name,
    lastName: user?.last_name,
    address: user?.address,
    city: user?.city,
    postalCode: user?.postal_code,
    state: user?.state
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const renderProfileInfo = () => {
    const userData = [
      { label: "First Name", value: user?.first_name, icon: "person-outline" },
      { label: "Last Name", value: user?.last_name, icon: "person-outline" },
      { label: "Email", value: user?.email, icon: "mail-outline" },
      { label: "Phone", value: user?.phone, icon: "call-outline" },
      { label: "Birth Date", value: user?.date_of_birth, icon: "calendar-outline" },
      { label: "Street Address", value: user?.address, icon: "home-outline" },
      { label: "City", value: user?.city, icon: "map-outline" },
      { label: "State", value: user?.state, icon: "globe-outline" },
      { label: "Postal Code", value: user?.postal_code, icon: "business-outline" },
    ];


    return userData.map((item, index) => (
      <View key={index} style={[styles.infoCard, userData.length - 1 === index && { borderBottomWidth: 0 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
        </View>
        <View style={styles.infoContent}>
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.value}>{item.value || 'Not provided'}</Text>
        </View>
      </View>
    ));
  };

  const handleSave = async () => {
    await updateUser(formData);
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
        </View>

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>

  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    marginBottom: 80,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 90,
    backgroundColor: '#FFFFFF',

  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImageContainer: {
    marginBottom: 12,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5f3f7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitials: {
    fontSize: 30,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.grey,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: Colors.greyLight,
  },
  sectionContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: Colors.grey,
  },
  infoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    padding: 12,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5f3f7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: Colors.greyLight,
    marginBottom: 2,
  },
  value: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.grey,
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
});

export default Profile;