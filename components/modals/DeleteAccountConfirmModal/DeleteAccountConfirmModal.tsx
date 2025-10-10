import Colors from "@/constants/Colors";
import { Theme } from "@/constants/Types";
import { useTheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View, ScrollView } from "react-native";

interface IDeleteAccountConfirmModalProps {
    isModalVisible: boolean;
    setIsModalVisible: (visible: boolean) => void;
    onConfirm: () => void;
    isDeleting: boolean;
}

const DeleteAccountConfirmModal = ({ 
    isModalVisible, 
    setIsModalVisible, 
    onConfirm,
    isDeleting 
}: IDeleteAccountConfirmModalProps) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    return (
        <Modal
            visible={isModalVisible}
            animationType="fade"
            transparent={true}
            onRequestClose={() => !isDeleting && setIsModalVisible(false)}
        >
            <View style={styles.modalBackground}>
                <View style={styles.modalContent}>
                    {/* Header with Warning Icon */}
                    <View style={styles.modalHeader}>
                        <View style={styles.warningIconContainer}>
                            <Ionicons name="warning" size={48} color={Colors.common.error} />
                        </View>
                        <Text style={styles.modalTitle}>Delete Account</Text>
                        <TouchableOpacity
                            onPress={() => !isDeleting && setIsModalVisible(false)}
                            style={styles.closeButton}
                            disabled={isDeleting}
                        >
                            <Ionicons name="close" size={24} color={theme.colors.greyLight} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        {/* Main Warning Message */}
                        <Text style={styles.warningText}>
                            Are you absolutely sure you want to permanently delete your account?
                        </Text>

                        {/* Cannot be undone message */}
                        <Text style={styles.descriptionText}>
                            This action <Text style={styles.boldRedText}>cannot be undone</Text>. All your data will be permanently deleted, including:
                        </Text>

                        {/* List of items to be deleted */}
                        <View style={styles.listContainer}>
                            <View style={styles.listItem}>
                                <Ionicons name="chatbubble" size={18} color={Colors.common.error} />
                                <Text style={styles.listItemText}>Chat history and conversations</Text>
                            </View>
                            <View style={styles.listItem}>
                                <Ionicons name="person" size={18} color={Colors.common.error} />
                                <Text style={styles.listItemText}>Account data and preferences</Text>
                            </View>
                            <View style={styles.listItem}>
                                <Ionicons name="card" size={18} color={Colors.common.error} />
                                <Text style={styles.listItemText}>Billing history and subscriptions</Text>
                            </View>
                        </View>

                        {/* Verification notice */}
                        <Text style={styles.verificationText}>
                            If you proceed, we will send a verification code to your email address to confirm this action.
                        </Text>
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => setIsModalVisible(false)}
                            disabled={isDeleting}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.deleteButton]}
                            onPress={onConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="trash" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                                    <Text style={styles.deleteButtonText}>Yes, Delete My Account</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default React.memo(DeleteAccountConfirmModal);

const getStyles = (theme: Theme) => StyleSheet.create({
    modalBackground: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContent: {
        backgroundColor: theme.colors.backgroundLight,
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        maxHeight: '80%',
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
    },
    modalHeader: {
        alignItems: 'center',
        marginBottom: 16,
    },
    warningIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: Colors.common.error,
        marginBottom: 8,
    },
    closeButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        padding: 4,
    },
    scrollView: {
        marginBottom: 16,
    },
    warningText: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
        lineHeight: 22,
    },
    descriptionText: {
        fontSize: 14,
        color: theme.colors.greyLight,
        marginBottom: 12,
        lineHeight: 20,
    },
    boldRedText: {
        fontWeight: 'bold',
        color: Colors.common.error,
    },
    listContainer: {
        marginBottom: 16,
        paddingLeft: 8,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    listItemText: {
        fontSize: 14,
        color: theme.colors.text,
        marginLeft: 10,
        flex: 1,
    },
    verificationText: {
        fontSize: 14,
        fontWeight: '500',
        color: theme.colors.text,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    cancelButton: {
        backgroundColor: theme.colors.background,
        borderWidth: 1,
        borderColor: theme.colors.greyLight,
    },
    cancelButtonText: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '600',
    },
    deleteButton: {
        backgroundColor: Colors.common.error,
    },
    deleteButtonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});

