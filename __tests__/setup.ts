/**
 * Test Setup File
 * 
 * This file contains global test setup and configurations
 * that will be loaded before all tests run.
 */

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock MMKV Storage
jest.mock('react-native-mmkv', () => ({
  MMKV: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    getString: jest.fn(),
    getNumber: jest.fn(),
    getBoolean: jest.fn(),
    delete: jest.fn(),
    clearAll: jest.fn(),
    contains: jest.fn(),
  })),
}));

// Mock Expo SecureStore
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock Expo FileSystem
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file:///mock/documents/',
  cacheDirectory: 'file:///mock/cache/',
  downloadAsync: jest.fn(() => Promise.resolve({ uri: 'file:///mock/download.pdf' })),
  readAsStringAsync: jest.fn(() => Promise.resolve('')),
  writeAsStringAsync: jest.fn(() => Promise.resolve()),
  deleteAsync: jest.fn(() => Promise.resolve()),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn(() => Promise.resolve([])),
}));

// Mock React Native FS
jest.mock('react-native-fs', () => ({
  mkdir: jest.fn(() => Promise.resolve()),
  moveFile: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  pathForBundle: jest.fn(() => Promise.resolve('')),
  pathForGroup: jest.fn(() => Promise.resolve('')),
  getFSInfo: jest.fn(() => Promise.resolve({ totalSpace: 0, freeSpace: 0 })),
  getAllExternalFilesDirs: jest.fn(() => Promise.resolve([])),
  unlink: jest.fn(() => Promise.resolve()),
  exists: jest.fn(() => Promise.resolve(false)),
  stopDownload: jest.fn(),
  resumeDownload: jest.fn(() => Promise.resolve()),
  isResumable: jest.fn(() => Promise.resolve(false)),
  stopUpload: jest.fn(),
  completeHandlerIOS: jest.fn(),
  readDir: jest.fn(() => Promise.resolve([])),
  readDirAssets: jest.fn(() => Promise.resolve([])),
  existsAssets: jest.fn(() => Promise.resolve(false)),
  readdir: jest.fn(() => Promise.resolve([])),
  setReadable: jest.fn(() => Promise.resolve(true)),
  stat: jest.fn(() => Promise.resolve({ size: 0, isFile: () => true, isDirectory: () => false })),
  readFile: jest.fn(() => Promise.resolve('')),
  read: jest.fn(() => Promise.resolve('')),
  readFileAssets: jest.fn(() => Promise.resolve('')),
  hash: jest.fn(() => Promise.resolve('')),
  copyFileAssets: jest.fn(() => Promise.resolve()),
  copyFileAssetsIOS: jest.fn(() => Promise.resolve()),
  copyAssetsVideoIOS: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
  appendFile: jest.fn(() => Promise.resolve()),
  write: jest.fn(() => Promise.resolve()),
  downloadFile: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({ statusCode: 200, bytesWritten: 0 }),
  })),
  uploadFiles: jest.fn(() => ({
    jobId: 1,
    promise: Promise.resolve({ statusCode: 200, body: '' }),
  })),
  touch: jest.fn(() => Promise.resolve()),
  MainBundlePath: '',
  CachesDirectoryPath: '/mock/caches',
  DocumentDirectoryPath: '/mock/documents',
  ExternalDirectoryPath: '/mock/external',
  ExternalStorageDirectoryPath: '/mock/external-storage',
  TemporaryDirectoryPath: '/mock/temp',
  LibraryDirectoryPath: '/mock/library',
  PicturesDirectoryPath: '/mock/pictures',
}));

// Mock Expo Image Manipulator
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn((uri, actions, options) => 
    Promise.resolve({
      uri: uri,
      width: 800,
      height: 600,
      base64: null,
    })
  ),
  FlipType: {
    Horizontal: 'horizontal',
    Vertical: 'vertical',
  },
  SaveFormat: {
    JPEG: 'jpeg',
    PNG: 'png',
    WEBP: 'webp',
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
  addEventListener: jest.fn(() => jest.fn()),
}));

// Mock react-native-executorch (native on-device LLM, no JS runtime in tests)
jest.mock('react-native-executorch', () => ({
  useLLM: () => ({
    messageHistory: [],
    response: '',
    token: '',
    isReady: false,
    isGenerating: false,
    downloadProgress: 0,
    error: null,
    configure: jest.fn(),
    getGeneratedTokenCount: jest.fn(() => 0),
    generate: jest.fn(() => Promise.resolve()),
    sendMessage: jest.fn(() => Promise.resolve()),
    deleteMessage: jest.fn(),
    interrupt: jest.fn(),
  }),
  LLAMA3_2_1B_QLORA: { modelSource: 'mock', tokenizerSource: 'mock', tokenizerConfigSource: 'mock' },
  LLAMA3_2_1B_SPINQUANT: { modelSource: 'mock', tokenizerSource: 'mock', tokenizerConfigSource: 'mock' },
  LLAMA3_2_3B_QLORA: { modelSource: 'mock', tokenizerSource: 'mock', tokenizerConfigSource: 'mock' },
}));

// Mock Expo Haptics
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock React Native Gesture Handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Expo Clipboard
jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(() => Promise.resolve('')),
  setStringAsync: jest.fn(() => Promise.resolve()),
  hasStringAsync: jest.fn(() => Promise.resolve(false)),
}));

// Mock Expo Image Picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted', canAskAgain: true, granted: true, expires: 'never' })
  ),
  requestCameraPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted', canAskAgain: true, granted: true, expires: 'never' })
  ),
  launchImageLibraryAsync: jest.fn(() => 
    Promise.resolve({ 
      canceled: false, 
      assets: [{ uri: 'file:///mock/image.jpg', width: 800, height: 600 }] 
    })
  ),
  launchCameraAsync: jest.fn(() => 
    Promise.resolve({ 
      canceled: false, 
      assets: [{ uri: 'file:///mock/photo.jpg', width: 800, height: 600 }] 
    })
  ),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-v4'),
  v1: jest.fn(() => 'mock-uuid-v1'),
  v3: jest.fn(() => 'mock-uuid-v3'),
  v5: jest.fn(() => 'mock-uuid-v5'),
}));

// Mock Mixpanel
jest.mock('mixpanel-react-native', () => ({
  Mixpanel: jest.fn().mockImplementation(() => ({
    init: jest.fn(() => Promise.resolve()),
    identify: jest.fn(),
    track: jest.fn(),
    reset: jest.fn(),
    getPeople: jest.fn(() => ({
      set: jest.fn(),
      setOnce: jest.fn(),
      increment: jest.fn(),
      append: jest.fn(),
      union: jest.fn(),
      remove: jest.fn(),
      unset: jest.fn(),
      deleteUser: jest.fn(),
    })),
    setLoggingEnabled: jest.fn(),
    hasOptedOutTracking: jest.fn(() => Promise.resolve(false)),
    optInTracking: jest.fn(),
    optOutTracking: jest.fn(),
    flush: jest.fn(),
  })),
}));

// Mock Supabase client (no real network/env in tests)
jest.mock('@/lib/supabase/client', () => {
  const queryBuilder: any = {
    select: jest.fn(() => queryBuilder),
    insert: jest.fn(() => queryBuilder),
    update: jest.fn(() => queryBuilder),
    delete: jest.fn(() => queryBuilder),
    eq: jest.fn(() => queryBuilder),
    ilike: jest.fn(() => queryBuilder),
    order: jest.fn(() => queryBuilder),
    limit: jest.fn(() => queryBuilder),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    then: (resolve: any) => resolve({ data: [], error: null }),
  };
  return {
    supabase: {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
        onAuthStateChange: jest.fn(() => ({ data: { subscription: { unsubscribe: jest.fn() } } })),
        signInWithPassword: jest.fn(() => Promise.resolve({ error: null })),
        signUp: jest.fn(() => Promise.resolve({ error: null })),
        signOut: jest.fn(() => Promise.resolve({ error: null })),
        verifyOtp: jest.fn(() => Promise.resolve({ data: null, error: null })),
        resetPasswordForEmail: jest.fn(() => Promise.resolve({ error: null })),
        resend: jest.fn(() => Promise.resolve({ error: null })),
        updateUser: jest.fn(() => Promise.resolve({ error: null })),
        signInWithIdToken: jest.fn(() => Promise.resolve({ error: null })),
      },
      from: jest.fn(() => queryBuilder),
    },
    registerSupabaseAutoRefresh: jest.fn(),
  };
});

// Mock Expo Constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        mixpanelToken: 'mock-token',
      },
    },
    manifest: {},
    platform: {},
  },
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
};

// Set up fake timers
jest.useFakeTimers();

