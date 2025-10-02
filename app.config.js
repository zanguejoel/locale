export default {
    name: 'Odyssey',
    slug: 'Odyssey',
    ios: {
        bundleIdentifier: 'com.neptunetech.odyssey',
        supportsTablet: true,
    },
    android: {
        package: 'com.neptunetech.odyssey',
    },
    plugins: [
        [
            'expo-build-properties',
            {
                android: {
                    compileSdkVersion: 35,
                    targetSdkVersion: 34,
                    minSdkVersion: 24,
                    buildToolsVersion: '35.0.0',
                    kotlinVersion: '1.9.25',
                },
            }
        ],
    ],
};
