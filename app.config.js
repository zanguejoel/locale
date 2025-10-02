export default {
    name: 'Odyssey',
    slug: 'Odyssey',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'odyssey',
    userInterfaceStyle: 'automatic',
    newArchEnabled: false,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.neptunetech.odyssey',
    },
    android: {
        package: 'com.neptunetech.odyssey',
        adaptiveIcon: {
          foregroundImage: './assets/images/adaptive-icon.png',
          backgroundColor: '#ffffff'
        }
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
        'expo-router',
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
    experiments: {
      typedRoutes: true
    }
};
