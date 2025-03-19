import { AntDesign, Ionicons, Octicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ImageZoom } from '@likashefqet/react-native-image-zoom';
import { downloadAndSaveImage, shareImage } from '@/utils/Image';
import {
  BottomSheetModal,
  BottomSheetModalProvider,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Colors from '@/constants/Colors';
import { defaultStyles } from '@/constants/Styles';
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-root-toast';
import { RootSiblingParent } from 'react-native-root-siblings';


const Page = () => {
  const { url, prompt } = useLocalSearchParams<{ url: string; prompt?: string }>();
  const { bottom } = useSafeAreaInsets();

  const [isProcessLoading, setProcessLoading] = useState(false);
  const [isImageSaved, setImageSaved] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isImageSaved) {
      fadeAnim.setValue(0);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setImageSaved(false);
          });
        }, 1500);
      });
    }
  }, [isImageSaved]);

  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['40%'], []);


  const handleCloseModalPress = useCallback(() => {
    bottomSheetModalRef.current?.dismiss();
  }, []);

  const onCopyPrompt = () => {
    Clipboard.setStringAsync(prompt!);

    Toast.show('Prompt copied to clipboard', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
      shadow: true,
      animation: true,
      hideOnPress: true,
      delay: 0,
    });
  };

  const handleDownload = async (imgUrl: string) => {
    setProcessLoading(true);
    try {
      await downloadAndSaveImage(imgUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessLoading(false);
      setImageSaved(true);
    }
  };

  const handleShareFile = async (url: string) => {
    setProcessLoading(true);

    try {
      await shareImage(url as string)
    } catch (err) {
      console.error(err)
    } finally {
      setProcessLoading(false);
    }
  }

  const renderImageSavedTitle = () => {
    if (!isImageSaved) return null;

    return (
      <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
        <Text style={styles.titleImageSaved}>Image saved !</Text>
      </Animated.View>
    );
  };

  const renderLoading = () => {
    if (!isProcessLoading) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={Colors.primary} size={'small'} />
        <Text style={styles.titleProcess}>Processing...</Text>
      </View>
    );
  };

  return (
    <RootSiblingParent>
      <BottomSheetModalProvider>
        <View style={styles.container}>
          <Stack.Screen
            options={{
              headerRight: () => (
                <AntDesign
                  onPress={() => router.back()}
                  name="closecircleo"
                  style={styles.closeIcon}
                  size={24}
                  color={Colors.dark.text}
                />
              ),
            }}
          />
          <ImageZoom
            uri={url}
            minScale={0.5}
            maxScale={5}
            minPanPointers={1}
            doubleTapScale={2}
            isSingleTapEnabled
            isDoubleTapEnabled
            style={styles.image}
            resizeMode="contain"
          />

          {renderLoading()}

          {renderImageSavedTitle()}

          <BlurView intensity={95} tint={'dark'} style={[styles.blurview, { paddingBottom: bottom }]}>
            <View style={styles.row}>
              <TouchableOpacity
                style={{ alignItems: 'center', flex: 1 }}
                onPress={() => handleDownload(url as string)}
              >
                <Octicons name="download" size={24} color="white" />
                <Text style={styles.btnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ alignItems: 'center', flex: 1 }}
                onPress={() => handleShareFile(url)}
              >
                <Octicons name="share" size={24} color="white" />
                <Text style={styles.btnText}>Share</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        <BottomSheetModal
          ref={bottomSheetModalRef}
          index={0}
          snapPoints={snapPoints}
          backgroundStyle={{ backgroundColor: Colors.grey }}
          handleIndicatorStyle={{ backgroundColor: Colors.greyLight }}
        >
          <View style={[styles.modalContainer, { paddingBottom: bottom, flex: 1 }]}>
            <BottomSheetScrollView>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={styles.titleText}>Prompt</Text>
                  <Pressable onPress={handleCloseModalPress} style={styles.closeBtn}>
                    <Ionicons name="close-outline" size={24} color={Colors.greyLight} />
                  </Pressable>
                </View>
                <Text style={styles.promptText}>{prompt}</Text>
              </View>
            </BottomSheetScrollView>
            <TouchableOpacity
              style={[defaultStyles.btn, { backgroundColor: '#fff', marginTop: 16 }]}
              onPress={onCopyPrompt}
            >
              <Text style={styles.buttonText}>Copy</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetModal>
      </BottomSheetModalProvider>
    </RootSiblingParent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  blurview: {
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  loadingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
  },
  titleProcess: {
    marginTop: 10,
    color: '#fff',
    fontSize: 12,
  },
  titleImageSaved: {
    marginTop: 10,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  btnText: {
    color: '#fff',
    fontSize: 12,
    paddingTop: 6,
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  closeIcon: {},
  titleText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  promptText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonText: {
    color: Colors.grey,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
  },
  closeBtn: {
    borderRadius: 20,
    height: 26,
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default Page;
