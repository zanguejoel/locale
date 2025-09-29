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
import { useLocalSearchParams } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Theme } from "@/constants/Types";


interface ErrorType {
    email?: string;
    code?: string
}

const SuccessPage = () => {
    const { signIn } = useAuth();
    const theme = useTheme();
    const styles = getStyles(theme);

    const { email, password } = useLocalSearchParams();
    const [isLoading, setLoading] = useState(false)
    const handleHome = async () => {
        setLoading(true)
        try {
            await signIn(decodeURIComponent(`${email}`), decodeURIComponent(`${password}`));
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
                    {/* Logo commented out */}
                    {/* <Image source={theme.isDark ? require('@/assets/images/Odysseylogodark.png') : require('@/assets/images/Odysseylogowhite.png')} style={styles.logo} /> */}
                    <Text style={styles.appTitle}>Odyssey</Text>
                    <View style={{ flex: 1, justifyContent: 'center', bottom: 20 }}>
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

const getStyles = (theme: Theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        justifyContent: 'space-between',
        flex: 1,
    },
    headerContainer: {
        flex: 1,
        alignItems: 'center',
        marginTop: 80,
        marginBottom: 50,
        paddingHorizontal: 24,
        paddingVertical: 20,
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
    appTitle: {
        fontSize: 42,
        fontWeight: "bold",
        marginBottom: 8,
        letterSpacing: 1,
        color: theme.colors.primary,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: theme.colors.primary,
        marginBottom: 12,
        textAlign: 'center',
    },
    timerText: {
        fontSize: 13,
        marginLeft: 4,
        color: theme.colors.primary,
        textAlign: 'center',
        lineHeight: 22,
    },
    subtitle: {
        fontSize: 17,
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 22,
    },
    formContainer: {

        paddingHorizontal: 24,
    },
    errorText: {
        color: theme.colors.red,
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
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
    },
    cancelButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
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
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: 8,
    },
    emailText: {
        fontSize: 18,
        fontWeight: '600',
        color: theme.colors.primary,
        marginBottom: 16,
    },
    instructionText: {
        fontSize: 16,
        color: theme.colors.text,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    returnButton: {
        height: 50,
        backgroundColor: theme.colors.primary,
        borderRadius: 12,
    },
    resendButton: {
        height: 50,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
});

export default SuccessPage;