import React, { useState } from "react";
import { defaultStyles } from "@/constants/Styles";
import {
    View,
    StyleSheet,
    Text,
    TouchableOpacity,
    Image,
    SafeAreaView,
} from "react-native";
import Colors from "@/constants/Colors";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useChat } from "@/hooks/useChat";


interface ErrorType {
    email?: string;
    code?: string
}

const SuccessPage = () => {
    const { signIn } = useAuth();

    const { email, password } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(false)
    const handleHome = async () => {
        setLoading(true)
        try {
            await signIn(email, password);
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container} >
            <SafeAreaView style={styles.content}>
                <View style={styles.headerContainer}>
                    <Image source={require('@/assets/images/Jaiimelogodark.png')} style={styles.logo} />
                    <View style={{ flex: 1, justifyContent: 'center', bottom: 60 }}>
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>Success!</Text>
                            <Text style={styles.subtitle}>
                                Congratulations, your account has been successfully created.
                            </Text>
                        </View>
                    </View>

                </View>
                <View style={styles.formContainer}>
                    <View style={styles.btnContainer}>
                        <TouchableOpacity
                            style={[defaultStyles.btn, styles.resetButton]}
                            onPress={handleHome}
                        >
                            <Text style={styles.buttonText}>Home</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        justifyContent: 'space-between',
        flex: 1,
    },
    headerContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: 60,
        marginBottom: 40,
        paddingHorizontal: 24,
    },
    resendContainerTimer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
    },
    titleContainer: {
    },
    logo: {
        width: 150,
        height: 75,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        color: Colors.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    timerText: {
        fontSize: 13,
        marginLeft: 4,
        color: Colors.primary,
        textAlign: 'center',
        lineHeight: 22,
    },
    subtitle: {
        fontSize: 17,
        color: Colors.grey,
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {

        paddingHorizontal: 24,
    },
    errorText: {
        color: Colors.red,
        fontSize: 12,
        marginTop: 4,
        marginLeft: 12,
    },
    btnContainer: {
        gap: 16,
        marginTop: 24,
    },
    resetButton: {
        height: 50,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    cancelButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // Success screen styles
    successContainer: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 60,
    },
    successMessage: {
        fontSize: 16,
        color: Colors.grey,
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
        color: Colors.primary,
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 16,
        color: Colors.grey,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    returnButton: {
        height: 50,
        backgroundColor: Colors.primary,
        borderRadius: 12,
    },
    resendButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.primary,
    },
});

export default SuccessPage;