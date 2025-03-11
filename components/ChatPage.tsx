import { presets } from '@/constants/LocalModels';
import React, {useState} from 'react';
import {
  StyleSheet,
  Text,
  Button,
  TextInput,
  SafeAreaView,
  View,
} from 'react-native';
import RNFS, {
  DownloadBeginCallbackResult,
  DownloadProgressCallbackResult,
} from 'react-native-fs';
import {Pipeline} from 'react-native-transformers';

export default function App() {
  const [progress, setProgress] = useState<number>(0);
  const [input, setInput] = useState<string>('We love local LLM');
  const [output, setOutput] = useState<string>();

  const loadModel = async (preset: {
    name: string;
    model: string;
    onnx_path: string;
    options?: any;
  }) => {
    console.log('Loading model...');
    setProgress(0);

    try {
      await Pipeline.TextGeneration.init(preset.model, preset.onnx_path, {
        verbose: true,
        fetch: async (url: string) => {
          console.log('Downloading... ' + url);

          const localPath = `${RNFS.CachesDirectoryPath}/${url
            .split('/')
            .pop()!}`;

          if (await RNFS.exists(localPath)) {
            console.log('Model already downloaded at: ' + localPath);
            setProgress(1);
            return localPath;
          }

          const downloadResumable = RNFS.downloadFile({
            fromUrl: url,
            toFile: localPath,
            background: true,
            discretionary: true,
            cacheable: true,
            progress: (res: DownloadProgressCallbackResult) => {
              let progressPercent =
                (res.bytesWritten / res.contentLength) * 100;
              setProgress(progressPercent);
            },
          });

          await downloadResumable.promise;

          console.log('Downloaded model to ' + localPath);
          setProgress(1);
          return localPath;
        },
        ...preset.options,
      });

      console.log('Model loaded successfully');
    } catch (error) {
      console.error('Model loading failed:', error);
    }
  };

  const AutoComplete = () => {
    if (!input) return;
    Pipeline.TextGeneration.generate(input, setOutput);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text>Select a model</Text>
      {presets.map(preset => (
        <Button
          key={preset.name}
          title={preset.name}
          onPress={() => loadModel(preset)}
        />
      ))}
      <Text>Input: </Text>
      <TextInput
        value={input}
        onChangeText={setInput}
        style={styles.input}
        placeholder="Type something..."
      />
      <Text>Output: {output || 'No output yet'}</Text>

      {/* Display progress */}
      <View style={styles.progressContainer}>
        <Text>{`Download Progress: ${(progress * 100).toFixed(2)}%`}</Text>
      </View>

      <Button title="Run" onPress={AutoComplete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: 'gray',
    padding: 8,
    marginVertical: 8,
    width: '80%',
  },
  progressContainer: {
    marginVertical: 8,
  },
});
