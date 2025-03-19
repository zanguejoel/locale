import Colors from "@/constants/Colors";
import { Theme } from "@/constants/Types";
import { FormData } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface IEditProfileModalProps {
    isModalVisible: boolean;
    setIsModalVisible: (visible: boolean) => void;
    handleInputChange: (field: keyof FormData, value: string) => void;
    formData: FormData;
    handleSave: () => void;
}

const EditProfileModal = ({ isModalVisible, setIsModalVisible, handleInputChange, formData, handleSave }: IEditProfileModalProps) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <Modal
            visible={isModalVisible}
            animationType="slide"
            transparent={true}
            onRequestClose={() => setIsModalVisible(false)}
        >
            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <View style={styles.modalBackground}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity
                                onPress={() => setIsModalVisible(false)}
                                style={styles.closeButton}
                            >
                                <Ionicons name="close" size={24} color={theme.colors.greyLight} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>First Name</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.firstName}
                                onChangeText={(value) => handleInputChange("firstName", value)}
                                placeholder="Enter your first name"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Last Name</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.lastName}
                                onChangeText={(value) => handleInputChange("lastName", value)}
                                placeholder="Enter your last name"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Street Address</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.address}
                                onChangeText={(value) => handleInputChange("address", value)}
                                placeholder="Enter your address"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>City</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.city}
                                onChangeText={(value) => handleInputChange("city", value)}
                                placeholder="Enter your city"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>State</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.state}
                                onChangeText={(value) => handleInputChange("state", value)}
                                placeholder="Enter your state"
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Postal Code</Text>
                            <TextInput
                                style={styles.input}
                                value={formData.postalCode}
                                onChangeText={(value) => handleInputChange("postalCode", value)}
                                placeholder="Enter your postal code"
                            />
                        </View>
                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleSave}
                        >
                            <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal >
    )
}


export default React.memo(EditProfileModal)

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    content: {
        flex: 1
    },
    profileImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e5f3f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    label: {
        fontSize: 13,
        color: theme.colors.text,
        marginBottom: 2,
    },
    value: {
        fontSize: 15,
        fontWeight: '500',
        color: theme.colors.text,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: 14,
        width: '85%',
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    closeButton: {
        padding: 4,
    },
    inputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 13,
        color: theme.colors.text,
        marginBottom: 6,
    },
    input: {
        color: theme.colors.text,
        backgroundColor: theme.colors.backgroundLight,
        borderWidth: 1,
        borderColor: theme.colors.greyLight,
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        fontSize: 15,
    },
    saveButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 6,
    },
    saveButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
