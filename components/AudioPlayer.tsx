import React from 'react';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { AntDesign, Entypo } from '@expo/vector-icons';
import Waveform from './ui/Waveform/Waveform';
import { Role } from '@/utils/Interfaces';
import Colors from '@/constants/Colors';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface AudioPlayerProps {
    handleSeek: (progress: number) => void;
    duration: number;
    position: number;
    handlePress: () => void;
    onLongPress?: () => void; // Make optional since it might be undefined
    role: Role;
    playAudio: () => void;
    isPlaying: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({
    handleSeek,
    duration,
    position,
    handlePress,
    onLongPress,
    role,
    playAudio,
    isPlaying,
}) => {
    const theme = useTheme();
    const styles = getStyles(theme);

    const progress = duration > 0 ? position / duration : 0;

    return (
        <Pressable
            onLongPress={onLongPress}
            onPress={handlePress}
            style={[
                styles.contentContainer,
                styles.customPlayer,
                role === Role.Bot ? styles.botContent : styles.userContent,
            ]}
            accessible
            accessibilityLabel={`${role === Role.Bot ? 'Assistant' : 'Your'} audio message`}
            accessibilityRole="button"
            testID="audio-player-container"
        >
            <Pressable style={styles.audioPlayer} onPress={playAudio} testID="audio-play-button">
                {!isPlaying ? (
                    <View style={styles.audioPlayer}>
                        <AntDesign name="caretright" size={17} color={theme.colors.chatIcons} />
                    </View>
                ) : (
                    <View style={styles.audioPlayer}>
                        <Entypo name="controller-paus" size={17} color={theme.colors.chatIcons} />
                    </View>
                )}
            </Pressable>
            <Waveform onSeek={handleSeek} progress={progress} />
        </Pressable>
    );
};

export default AudioPlayer;

const getStyles = (theme: Theme) => StyleSheet.create({
    audioPlayer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        marginRight: 4,
        width: 30
    },
    contentContainer: {
        borderRadius: 15,
        paddingHorizontal: 12,
        maxWidth: '100%',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.2,
                shadowRadius: 2,
            },
            android: {
                elevation: 2,
            },
        }),
    },
    botContent: {
        backgroundColor: `${Colors.common.greyLight}20`,
        borderBottomLeftRadius: 4,
    },
    userContent: {
        backgroundColor: `${Colors.common.primary}20`,
        borderBottomRightRadius: 4,
    },
    customPlayer: {
        flexDirection: 'row',
        width: 210,
        paddingVertical: 8,
    },
});
