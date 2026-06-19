export default {
    name: 'Locale',
    slug: 'locale',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'locale',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    extra: {
      mixpanelToken: process.env.EXPO_PUBLIC_MIXPANEL_TOKEN,
      webFrontendUrl: process.env.EXPO_PUBLIC_WEB_FRONTEND_URL || 'https://odysseytech.ai',
    },
    ios: {
        supportsTablet: true,
        bundleIdentifier: 'com.neptunetech.locale',
        usesAppleSignIn: true,
        infoPlist: {
            CFBundleURLTypes: [
                {
                    CFBundleURLSchemes: ['locale', 'com.neptunetech.locale']
                }
            ],
        },
    },
    android: {
        package: 'com.neptunetech.locale',
        adaptiveIcon: {
          foregroundImage: './assets/images/adaptive-icon.png',
          backgroundColor: '#ffffff'
        },
        intentFilters: [
            {
                action: 'VIEW',
                autoVerify: true,
                data: [
                    {
                        scheme: 'locale',
                        host: 'auth'
                    }
                ],
                category: ['BROWSABLE', 'DEFAULT']
            }
        ]
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
        'expo-router',
        'expo-localization',
        'expo-apple-authentication',
        'expo-asset',
        'expo-font',
        'expo-secure-store',
        [
            'expo-build-properties',
            {
                ios: {
                    deploymentTarget: '17.0',
                },
                android: {
                    compileSdkVersion: 35,
                    targetSdkVersion: 34,
                    minSdkVersion: 33,
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
