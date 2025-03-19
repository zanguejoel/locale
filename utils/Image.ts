import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

// https://stackoverflow.com/questions/73706343/i-want-to-download-an-image-with-react-native-expo-from-a-url
export const downloadAndSaveImage = async (imageUrl: string): Promise<any> => {

  const fileUri = `${FileSystem.documentDirectory}${Date.now()}.jpg`;

  try {

    const response = await FileSystem.downloadAsync(imageUrl, fileUri);

    await saveFile(response.uri);

  } catch (error) {
    console.error('File system error:', error);
  }
};


export const downloadAndSaveVideo = async (videoUrl?: string) => {
  if (!videoUrl) {
    return;
  }
  try {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Media library permissions are needed to save the video.');
      return;
    }

    const fileName = videoUrl.split('/').pop();
    const fileUri = FileSystem.cacheDirectory + fileName;

    const { uri } = await FileSystem.downloadAsync(videoUrl, fileUri);

    const asset = await MediaLibrary.createAssetAsync(uri);

    await MediaLibrary.createAlbumAsync('Downloaded Videos', asset, false);

    Alert.alert('Success', 'Video downloaded and saved successfully!');
  } catch (error) {
    console.log('Error downloading video:', error);
  }
};

const saveFile = async (fileUri: string) => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status === 'granted') {
    try {
      const asset = await MediaLibrary.createAssetAsync(fileUri);
      const album = await MediaLibrary.getAlbumAsync('Download');
      if (album == null) {
        const result = await MediaLibrary.createAlbumAsync('Download', asset, false);
        if (result) {
          Alert.alert('Image saved to Photos');
        }
      } else {
        const result = await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
        if (result) {
          Alert.alert('Image saved to Photos');
        }
      }
    } catch (err) {
      console.error('Save err: ', err);
    }
  } else if (status === 'denied') {
    Alert.alert('please allow permissions to download');
  }
};

export const copyImageToClipboard = async (imageUrl: string) => {
  let fileUri = FileSystem.documentDirectory + `${new Date().getTime()}.jpg`;

  try {
    const res = await FileSystem.downloadAsync(imageUrl, fileUri);
    const base64 = await FileSystem.readAsStringAsync(res.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    await Clipboard.setImageAsync(base64);
  } catch (err) {
    console.error('FS Err: ', err);
  }
};

export const shareImage = async (imageUrl: string) => {
  try {

    const fileUri = FileSystem.documentDirectory + `${Date.now()}.jpg`;

    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);

    await Sharing.shareAsync(downloadResult.uri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'Share Image',
      UTI: 'public.image',
    });
  } catch (error) {
    console.error('Error sharing image:', error);
  }
};


import { RawImage } from '@huggingface/transformers';

export async function getImageData(uri: string, maxSize: number = 512): global.Image {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const size = Math.max(image.width, image.height);
      const scale = size > maxSize ? maxSize / size : 1;
      const newWidth = Math.round(image.width * scale);
      const newHeight = Math.round(image.height * scale);
      const canvas = new OffscreenCanvas(newWidth, newHeight);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, newWidth, newHeight);

      resolve(ctx.getImageData(0, 0, newWidth, newHeight));
      canvas.surface?.destroy();
    }
    image.onerror = reject;
    image.src = uri;
  });
}

export function createRawImage(imageData: ImageData): RawImage {
  return new RawImage(imageData.data, imageData.width, imageData.height, 4);
}

export function calcPosition(
  mode: 'contain'|'cover',
  containerWidth: number,
  containerHeight: number,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number
): [number, number, number, number] {
  const w = Math.min(containerWidth, imageWidth);
  const h = Math.min(containerHeight, imageHeight);
  const ratio = mode === 'contain' ? Math.min(w / imageWidth, h / imageHeight) : Math.max(w / imageWidth, h / imageHeight);
  const offsetX = (containerWidth - imageWidth * ratio) / 2;
  const offsetY = (containerHeight - imageHeight * ratio) / 2;
  const newWidth = imageWidth * ratio;
  const newHeight = imageHeight * ratio;
  const newX = (containerWidth - newWidth) * x + offsetX;
  const newY = (containerHeight - newHeight) * y + offsetY;
  return [newX, newY, newWidth, newHeight];
}
