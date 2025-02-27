import Colors from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import React, { useState } from "react";
import { View, StyleSheet, Text, SafeAreaView, Modal, TextInput, TouchableOpacity } from "react-native";


interface FormData {
  firstName?: string;
  lastName?: string;
}
const Profile = () => {
  const { user, updateUser } = useAuth();

  const [isModalVisible, setIsModalVisible] = useState(false);


  const [formData, setFormData] = useState<FormData>({
    firstName: user?.first_name,
    lastName: user?.last_name,
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const renderProfileInfo = () => {
    const userData = [
      { label: "First Name", value: user?.first_name },
      { label: "Last Name", value: user?.last_name },
      { label: "Email", value: user?.email },
      { label: "Phone", value: user?.phone },
      { label: "Date of Birth", value: user?.date_of_birth },
    ];

    return userData.map((item, index) => (
      <View key={index} style={[styles.infoRow, userData.length - 1 === index && { borderBottomWidth: 0 }]}>
        <Text style={styles.label}>{item.label}</Text>
        <Text style={styles.value}>{item.value}</Text>
      </View>
    ));
  };

  const handleSave = async () => {
    await updateUser(formData)

    setIsModalVisible(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.rawContainer}>
          {renderProfileInfo()}
        </View>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Text style={styles.buttonText}>Edit Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for editing profile */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalBackground}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TextInput
              style={styles.input}
              value={formData.firstName}
              onChangeText={(value) => handleInputChange("firstName", value)}
              placeholder="First Name"
            />
            <TextInput
              style={styles.input}
              value={formData.lastName}
              onChangeText={(value) => handleInputChange("lastName", value)}
              placeholder="Last Name"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setIsModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    width: '100%',
    backgroundColor: Colors.light.background,
  },
  content: {
    paddingHorizontal: 16,
    alignItems: 'center',
    flex: 1,
    width: '100%',
    marginTop: 24,
  },
  rawContainer: {
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 12,
    borderBottomColor: Colors.greyLight,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 16,
  },
  editButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  buttonText: {
    color: Colors.light.background,
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: Colors.white,
    padding: 20,
    marginTop: 180,

    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.background,
    marginBottom: 20,
  },
  input: {
    width: '100%',
    height: 40,
    backgroundColor: Colors.light.background,
    borderColor: Colors.greyLight,
    borderWidth: 1,
    borderRadius: 5,
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    width: '45%',
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.greyLight,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
});

export default Profile;
