# 🎯 COMPREHENSIVE BUG FIX PLAN
**Odyssey Mobile App - Code Quality Improvement Project**

---

## **Executive Summary**

This plan addresses **100+ issues** across 6 categories over 4 phases (~3-4 weeks). Issues are prioritized by severity, with critical security vulnerabilities addressed first.

### **Issues Overview**
- **Total Issues Found:** 100+
- **TypeScript Errors:** 81
- **Security Vulnerabilities:** 4 Critical, 2 High
- **Runtime Bugs:** 15+
- **Performance Issues:** 8+
- **Code Smells:** 30+

---

## **Table of Contents**
1. [Phase 1: Critical Security Fixes (Days 1-3)](#phase-1-critical-security-fixes)
2. [Phase 2: TypeScript Type Safety (Days 4-8)](#phase-2-typescript-type-safety)
3. [Phase 3: Runtime Bugs & Stability (Days 9-14)](#phase-3-runtime-bugs--stability)
4. [Phase 4: Code Quality & Performance (Days 15-20)](#phase-4-code-quality--performance)
5. [Phase 5: Testing & Deployment Prep (Days 21-25)](#phase-5-testing--deployment-prep)
6. [Final Checklist](#final-checklist)
7. [Timeline & Resources](#timeline--resources)

---

## **PHASE 1: CRITICAL SECURITY FIXES** 🔴
**Timeline:** Days 1-3 | **Risk Level:** CRITICAL | **Must Complete Before Production**

### **Task 1.1: Remove Hardcoded Security Tokens** ⚠️
**Time:** 2 hours | **File:** `hooks/useAuth.tsx:215`

**Issue:**
```typescript
"X-Mobile-Recaptcha-Token": "It2wh;Wcj&pkgdD4X2'~6@6FmpqLr1"
```

**Solution:**
```bash
pnpm add expo-recaptcha
```

```typescript
// utils/RecaptchaConfig.ts
export const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY;

// hooks/useAuth.tsx - Update changePassword function
const changePassword = async (oldPassword: string, newPassword: string, confirmPassword: string) => {
  const recaptchaToken = await generateRecaptchaToken(); // Implement token generation
  
  const response = await api.patch<{ token: string } | any>(`/auth/change-password`, {
    old_password: oldPassword,
    new_password: newPassword,
  }, {
    headers: {
      "X-Mobile-Recaptcha-Token": recaptchaToken, // Dynamic token
      "Content-Type": "application/json",
    }
  });
};
```

**Verification Checklist:**
- [ ] No hardcoded tokens in codebase
- [ ] Tokens generated at runtime
- [ ] Environment variables properly configured

---

### **Task 1.2: Eliminate Password Exposure in URLs** ⚠️
**Time:** 4 hours | **Files:** `hooks/useAuth.tsx` (lines 97, 166, 276)

**Issue:**
```typescript
router.push(`/email-verification?email=${email}&password=${password}`)
```

**Solution:**
```bash
pnpm add expo-secure-store
```

```typescript
// utils/SecureSession.ts
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export const createSecureSession = async (data: any): Promise<string> => {
  const sessionId = uuidv4();
  await SecureStore.setItemAsync(`session_${sessionId}`, JSON.stringify(data));
  setTimeout(() => clearSecureSession(sessionId), 10 * 60 * 1000); // Auto-expire in 10 minutes
  return sessionId;
};

export const getSecureSession = async (sessionId: string): Promise<any> => {
  const data = await SecureStore.getItemAsync(`session_${sessionId}`);
  return data ? JSON.parse(data) : null;
};

export const clearSecureSession = async (sessionId: string): Promise<void> => {
  await SecureStore.deleteItemAsync(`session_${sessionId}`);
};

// hooks/useAuth.tsx - Update signUp
const signUp = async (formData: FormData, router: any) => {
  // ... existing code ...
  if (response.ok) {
    const sessionId = await createSecureSession({
      email: formData.email,
      requiresVerification: true,
      timestamp: Date.now()
    });
    router.push(`/email-verification?session=${sessionId}`); // No password!
  }
};

// app/email-verification.tsx - Retrieve data
const { session } = useLocalSearchParams();
const sessionData = await getSecureSession(session as string);
// Use sessionData.email instead of URL params
```

**Verification Checklist:**
- [ ] No passwords in URL parameters
- [ ] No passwords in console logs
- [ ] Session expires after 10 minutes
- [ ] Test on both iOS and Android

---

### **Task 1.3: Migrate Tokens to Secure Storage** ⚠️
**Time:** 3 hours | **Files:** `hooks/useAuth.tsx`, `constants/Types.ts`

**Issue:** JWT tokens stored alongside user data in potentially insecure MMKV storage

**Solution:**
```typescript
// utils/SecureTokenManager.ts
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export const saveToken = async (token: string): Promise<void> => {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
  return await SecureStore.getItemAsync(TOKEN_KEY);
};

export const deleteToken = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
};

// constants/Types.ts - Update User interface
export interface User {
  first_name: string;
  middle_name: null | string;
  last_name: string;
  username: string;
  email: string;
  phone: string;
  address?: string;
  date_of_birth: string;
  city?: string;
  state?: string;
  country: null | string;
  postal_code?: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  user_teams: UserTeam[];
  // REMOVE: token: string; ❌
}

// hooks/useAuth.tsx - Update signIn
import { saveToken, getToken, deleteToken } from '@/utils/SecureTokenManager';

const signIn = async (email: string, password: string) => {
  try {
    setIsLoading(true);
    const response = await api.post<{ token: string } | any>('/auth/login', {
      email,
      password
    });
    
    if (response.data?.token) {
      await saveToken(response.data.token); // Store securely
      const userWithoutToken = { ...userResponse.data }; // Don't include token
      setUser(userWithoutToken);
      api.setAuthToken(response.data.token);
    }
  } catch (error) {
    // ...
  }
};

// Update useEffect to retrieve token
useEffect(() => {
  const initAuth = async () => {
    if (user?.user_id) {
      const token = await getToken();
      if (token) {
        api.setAuthToken(token);
        setIsSignedIn(true);
      }
    }
  };
  initAuth();
}, [user]);

// Update signOut
const signOut = async () => {
  await deleteToken();
  setUser(null);
  setIsSignedIn(false);
};
```

**Verification Checklist:**
- [ ] Token not in User object
- [ ] Token retrieved from secure storage
- [ ] Token deleted on logout
- [ ] Works across app restarts

---

### **Task 1.4: Fix Authorization Header Format**
**Time:** 1 hour | **Files:** `hooks/useChat.tsx:439`, `hooks/useAuth.tsx:272`

**Issue:**
```typescript
Authorization: `${user?.token}` // Missing "Bearer" prefix
```

**Solution:**
```typescript
// utils/AuthHelpers.ts
export const formatAuthHeader = (token: string): string => {
  return `Bearer ${token}`;
};

// hooks/useChat.tsx - Update fetch call
const token = await getToken();
const response = await fetch(`${BASE_URL}/chat`, {
  method: 'POST',
  headers: {
    Authorization: formatAuthHeader(token || ''),
    'Accept': 'text/event-stream, application/json',
  },
  // ...
});

// hooks/useAuth.tsx - Update handleForgotPasswordChange
headers: {
  "Content-Type": "application/json",
  "Authorization": formatAuthHeader(token)
}
```

**Verification Checklist:**
- [ ] All API calls use Bearer format
- [ ] Backend accepts new format
- [ ] Test all authentication flows

---

## **PHASE 2: TYPESCRIPT TYPE SAFETY** 🟠
**Timeline:** Days 4-8 | **Risk Level:** HIGH | **Blocks Code Quality**

### **Task 2.1: Fix Theme Type Mismatches**
**Time:** 4 hours | **Files:** `constants/Colors.ts`, `constants/Types.ts`

**Issue:** Missing color properties causing 20+ TypeScript errors

**Solution:**
```typescript
// constants/Colors.ts - Update interfaces
export interface ColorTheme {
  text: string;
  background: string;
  tint: string;
  tabIconDefault: string;
  tabIconSelected: string;
  primary: string;
  backgroundLight: string;
  light: string;
  chatIcons: string;
  chatInputBg: string;
  chatItemBg: string;
  activeChatItem: string;
  pressedChatItem: string;
  chatIconContainer: string;
  chaRawHistoryBG: string; // Add missing property
}

// Update theme definitions
const theme: AppTheme = {
  light: {
    // ... existing properties ...
    chaRawHistoryBG: '#f5f5f5',
  },
  dark: {
    // ... existing properties ...
    chaRawHistoryBG: '#1a1a1a',
  },
  common: {
    // Already complete
  },
};

// constants/Types.ts - Update Theme interface
export interface Theme {
  isDark?: boolean;
  colors: ColorTheme & CommonColors; // Merge both interfaces
}

// app/login.tsx, app/registration.tsx
// Remove theme prop from all CustomInput components
<CustomInput
  icon="mail-outline"
  placeholder="Email"
  value={emailAddress}
  onChangeText={setEmailAddress}
  error={formSubmitted && !!errors.email}
  autoCapitalize="none"
  keyboardType="email-address"
  // REMOVE: theme={theme} ❌
/>
```

**Verification Checklist:**
- [ ] Run `npx tsc --noEmit` - 0 theme errors
- [ ] All color references resolve
- [ ] No runtime color errors

---

### **Task 2.2: Fix Array Type Annotations**
**Time:** 2 hours | **File:** `hooks/useChat.tsx`

**Issue:** Arrays typed as `never[]` preventing proper type checking

**Solution:**
```typescript
// hooks/useChat.tsx
import { File } from '@/utils/Interfaces';
import { Conversations, ChatRoom } from '@/hooks/useChat';

// Line 105 - Fix conversations
const [conversations, setConversations] = useState<Conversations[]>([]);

// Line 113 - Fix files
const [files, setFiles] = useState<File[]>([]);

// Line 118 - Fix additionalData
const [additionalData, setAdditionalData] = useState<File[]>([]);
```

**Verification Checklist:**
- [ ] No `never[]` type errors
- [ ] Autocomplete works for array methods
- [ ] Type checking catches errors

---

### **Task 2.3: Fix FormData File Upload Types**
**Time:** 6 hours | **File:** `hooks/useChat.tsx` (lines 341, 351, 361)

**Issue:** React Native FormData expects different types than Web FormData

**Solution:**
```typescript
// types/react-native-formdata.d.ts
declare module 'react-native' {
  interface FormDataPart {
    uri: string;
    type: string;
    name: string;
  }
  
  interface FormData {
    append(name: string, value: string | Blob | FormDataPart): void;
  }
}

// utils/FileUploadHelpers.ts
import { Platform } from 'react-native';

export interface FileUploadData {
  uri: string;
  type: string;
  name: string;
}

export const createFormDataFile = (
  uri: string,
  type: string,
  name: string
): FileUploadData => {
  return { uri, type, name };
};

export const appendFile = (
  formData: FormData,
  fieldName: string,
  file: FileUploadData
): void => {
  // Type assertion needed for React Native
  formData.append(fieldName, file as any);
};

// hooks/useChat.tsx - Update file uploads
import { createFormDataFile, appendFile } from '@/utils/FileUploadHelpers';

// Audio upload (line 341)
const audioFile = createFormDataFile(savedFilePath, 'audio/x-m4a', 'audio.m4a');
appendFile(formData, 'audio', audioFile);

// Image upload (line 351)
const imageFile = createFormDataFile(optimizedImagePath, mimeType, `image.${extension}`);
appendFile(formData, 'files', imageFile);
```

**Verification Checklist:**
- [ ] TypeScript errors resolved
- [ ] File uploads work on iOS
- [ ] File uploads work on Android

---

### **Task 2.4: Fix Component Prop Type Errors**
**Time:** 3 hours | **Files:** `components/ChatPage.tsx`, `components/ChatMessage.tsx`

**Solution:**
```typescript
// components/ChatMessage.tsx - Add missing prop
interface ChatMessageProps {
  role: Role;
  content: string;
  loading?: boolean;
  error?: boolean;
  imageUrl?: string;
  prompt?: string;
  category?: string;
  files?: File[];
  message_type?: string;
  onLongPress?: () => void;
  onPress?: () => void;
  onRetry?: () => void;
  streamingContent?: boolean;
  isSending?: boolean;
  streamWorking?: boolean;
  imageData?: string;
  intermediate?: string; // Add this missing prop
}

// components/ChatPage.tsx - Fix image state
const [selectedImage, setSelectedImage] = useState<ImagePickerAsset | null>(null);

// Fix callback types
const handleUpdateMessage = useCallback((
  message: string,
  type: string = 'text',
  operation: string | null = null,
  additionalData: string = ''
) => {
  sendMessage(message, type, operation, additionalData);
}, [sendMessage]);
```

**Verification Checklist:**
- [ ] No prop type errors
- [ ] Components render correctly

---

### **Task 2.5: Create Proper Type Definitions**
**Time:** 3 hours

**Solution:**
```typescript
// types/router.d.ts
import { Router } from 'expo-router';
export type AppRouter = Router;

// types/error.d.ts
export interface ApiError {
  detail?: string | Array<{ msg: string }>;
  message?: string;
  problem?: string;
}

export interface AppError extends Error {
  detail?: string;
  code?: string;
  status?: number;
}

// types/form.d.ts
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegistrationFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileUpdateFormData {
  firstName: string;
  lastName: string;
  address?: string;
  city?: string;
  postalCode?: string;
  state?: string;
}

// Update all files to use these types
// hooks/useAuth.tsx
import { AppRouter } from '@/types/router';
import { ApiError } from '@/types/error';
import { RegistrationFormData } from '@/types/form';

// Replace all: router: any → router: AppRouter
// Replace all: err: any → err: ApiError
```

**Verification Checklist:**
- [ ] Zero `any` types in auth flows
- [ ] Proper error type checking

---

## **PHASE 3: RUNTIME BUGS & STABILITY** 🟡
**Timeline:** Days 9-14 | **Risk Level:** MEDIUM | **Improves Reliability**

### **Task 3.1: Fix Memory Leaks**
**Time:** 4 hours | **Files:** `utils/ApiClient.ts`, `hooks/useChat.tsx`

**Solution:**
```typescript
// utils/ApiClient.ts - Fix interval leak
class ApiClient {
  private cleanupInterval: NodeJS.Timeout | null = null;

  private setupCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      for (const [key, value] of this.cache.entries()) {
        if (Date.now() - value.timestamp > value.duration) {
          this.cache.delete(key);
        }
      }
    }, CONFIG.CACHE_CLEANUP_INTERVAL);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.retryCount.clear();
  }
}

// hooks/useChat.tsx - Fix AbortController
const sendMessage = useCallback(async (...) => {
  const controllerRef = useRef<AbortController | null>(null);
  
  // Cleanup previous request
  if (controllerRef.current) {
    controllerRef.current.abort();
  }
  
  controllerRef.current = new AbortController();
  
  try {
    const response = await fetch(`${BASE_URL}/chat`, {
      signal: controllerRef.current.signal,
      // ...
    });
  } catch (e) {
    if (e.name === 'AbortError') {
      console.log('Request cancelled');
      return;
    }
    Alert.alert('Error', 'Something went wrong.');
  } finally {
    controllerRef.current = null;
  }
}, [...]);

// Add cleanup effect
useEffect(() => {
  return () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
  };
}, []);

// hooks/useAuth.tsx - Fix setState after unmount
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // ... API calls ...
      
      if (isMountedRef.current) {
        setUser(newUser);
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };
};
```

**Verification Checklist:**
- [ ] No memory leaks in profiler
- [ ] No "setState on unmounted component" warnings
- [ ] Intervals cleared on cleanup

---

### **Task 3.2: Fix Race Conditions**
**Time:** 3 hours | **File:** `hooks/useChat.tsx`

**Solution:**
```typescript
// hooks/useChat.tsx - Fix initialization
useEffect(() => {
  const initChat = async () => {
    if (user?.user_id) {
      await fetchConversation(undefined, undefined, setCurrentRoom);
    }
  };
  
  initChat();
  Keyboard.dismiss();
}, [user]); // Add user dependency

// utils/ApiClient.ts - Add request deduplication
class ApiClient {
  private pendingRequests: Map<string, Promise<any>> = new Map();

  private getRequestKey(method: string, url: string, params: any): string {
    return `${method}:${url}:${JSON.stringify(params)}`;
  }

  public async get<T>(url: string, params: object = {}, config: AxiosRequestConfig = {}): Promise<ApiResponse<T>> {
    const key = this.getRequestKey('GET', url, params);
    
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }
    
    const request = this.api.get(url, params, config);
    this.pendingRequests.set(key, request);
    
    try {
      return await request;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
}
```

**Verification Checklist:**
- [ ] No duplicate API calls on mount
- [ ] Conversations load after user available

---

### **Task 3.3: Fix File Operation Errors**
**Time:** 4 hours | **File:** `hooks/useChat.tsx`

**Solution:**
```typescript
// hooks/useChat.tsx - Add directory checks
const saveBase64ToFile = useCallback(async (base64: string, filename: string) => {
  const directory = FileSystem.documentDirectory;
  
  if (!directory) {
    throw new Error('Document directory not available');
  }
  
  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(directory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  }
  
  const path = directory + filename;
  
  try {
    if (!base64 || base64.length < 10) {
      throw new Error('Invalid base64 data');
    }
    
    await FileSystem.writeAsStringAsync(path, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    const fileInfo = await FileSystem.getInfoAsync(path, { size: true });
    if (!fileInfo.exists) {
      throw new Error('File was not created successfully');
    }
    
    return path;
  } catch (error) {
    console.error('Error saving file:', error);
    try {
      await FileSystem.deleteAsync(path, { idempotent: true });
    } catch {}
    throw error;
  }
}, []);

// Add better error messages
const optimizeImage = useCallback(async (imagePath: string): Promise<string> => {
  try {
    const fileInfo = await FileSystem.getInfoAsync(imagePath, { size: true });
    if (!fileInfo.exists) {
      throw new Error(`Image file not found: ${imagePath}`);
    }
    
    if (!fileInfo.size || fileInfo.size === 0) {
      throw new Error(`Image file is empty: ${imagePath}`);
    }
    
    // ... rest of optimization ...
  } catch (error) {
    Alert.alert(
      'Image Error',
      error instanceof Error ? error.message : 'Failed to process image'
    );
    throw error;
  }
}, []);
```

**Verification Checklist:**
- [ ] File operations work on fresh install
- [ ] Clear error messages when files missing

---

### **Task 3.4: Remove Dead Code**
**Time:** 2 hours

**Solution:**
```typescript
// hooks/useChat.tsx - DELETE line 432-434
// for (let [key, value] of formData.entries()) {
//   // Empty loop
// }

// utils/ApiClient.ts - DELETE line 273-275
// /* if (isHttpError(response.status)) {
//   handleError(response);
// } */

// components/CustomInput.tsx - DELETE line 33
// const [err] = useState(error);
// Use 'error' prop directly

// Search for all dead code
// git grep -n "TODO\|FIXME\|alert(JSON"
```

**Verification Checklist:**
- [ ] No commented code blocks
- [ ] No debug alert() statements

---

## **PHASE 4: CODE QUALITY & PERFORMANCE** 🔵
**Timeline:** Days 15-20 | **Risk Level:** LOW | **Enhances Maintainability**

### **Task 4.1: Optimize Performance**
**Time:** 6 hours

**Solution:**
```typescript
// components/ChatPage.tsx - Add memoization
const handleUpdateMessage = useCallback((
  message: string,
  type: string = 'text',
  operation: string | null = null,
  additionalData: string = ''
) => {
  sendMessage(message, type, operation, additionalData);
}, [sendMessage]);

// hooks/useChat.tsx - Optimize deduplication (line 489-494)
const fetchConversation = useCallback(async (...) => {
  if (effectiveLimit > 20) {
    setConversations(prev => {
      // O(n) instead of O(n²)
      const seen = new Set(prev.map(c => c.id));
      const newConversations = response.data.filter(c => !seen.has(c.id));
      return [...prev, ...newConversations];
    });
  }
}, [user]);

// components/ChatPage.tsx - Optimize FlashList
<FlashList
  ref={messageListRef}
  data={messages}
  renderItem={renderMessage}
  keyExtractor={(item, index) => `msg-${index}-${item.content?.substring(0, 10)}`}
  estimatedItemSize={100}
  drawDistance={500}
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  updateCellsBatchingPeriod={50}
  initialNumToRender={15}
  windowSize={11}
/>

// Move polyfills to app entry (app/_layout.tsx top)
import { polyfill as polyfillEncoding } from 'react-native-polyfill-globals/src/encoding';
import { polyfill as polyfillReadableStream } from 'react-native-polyfill-globals/src/readable-stream';
import { polyfill as polyfillFetch } from 'react-native-polyfill-globals/src/fetch';
import { polyfill as polyfillURL } from 'react-native-polyfill-globals/src/url';

polyfillEncoding();
polyfillReadableStream();
polyfillFetch();
polyfillURL();

// Remove from hooks/useChat.tsx (lines 1-11)
```

**Verification Checklist:**
- [ ] Profile app before/after
- [ ] Test on lower-end devices

---

### **Task 4.2: Standardize Error Handling**
**Time:** 5 hours

**Solution:**
```typescript
// utils/ErrorHandler.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
    public detail?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const parseApiError = (error: any): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  let message = 'An unexpected error occurred';
  let detail = undefined;

  if (typeof error === 'string') {
    message = error;
  } else if (error?.detail) {
    if (Array.isArray(error.detail)) {
      message = error.detail.map((e: any) => e.msg).join('\n');
      detail = error.detail;
    } else if (typeof error.detail === 'string') {
      message = error.detail;
      detail = error.detail;
    }
  } else if (error?.message) {
    message = error.message;
  } else if (error?.problem) {
    message = error.problem;
  }

  return new AppError(message, error?.code, error?.status, detail);
};

export const handleError = (error: any, context?: string): void => {
  const appError = parseApiError(error);
  console.error(`[${context || 'App'}] Error:`, appError);
  Alert.alert('Error', appError.message, [{ text: 'OK' }]);
};

// Update all error handling
// hooks/useAuth.tsx
import { handleError, parseApiError } from '@/utils/ErrorHandler';

const signIn = async (email: string, password: string) => {
  try {
    // ... API calls ...
  } catch (error) {
    handleError(error, 'SignIn');
    throw parseApiError(error);
  }
};
```

**Verification Checklist:**
- [ ] All errors use AppError class
- [ ] Consistent error messages

---

### **Task 4.3: Extract Constants**
**Time:** 2 hours

**Solution:**
```typescript
// constants/Config.ts
export const FILE_UPLOAD = {
  MAX_IMAGE_SIZE: 2 * 1024 * 1024,
  MAX_IMAGE_DIMENSION: 1200,
  MAX_FILE_SIZE: 10 * 1024 * 1024,
  SUPPORTED_IMAGE_FORMATS: ['jpg', 'jpeg', 'png', 'heic', 'heif'],
  SUPPORTED_AUDIO_FORMATS: ['m4a', 'mp3', 'wav'],
} as const;

export const API_CONFIG = {
  BASE_URL: 'https://api.odysseytech.ai',
  TIMEOUT: 30000,
  MAX_RETRIES: 3,
} as const;

export const CACHE_CONFIG = {
  SIZE: 100,
  CLEANUP_INTERVAL: 60 * 1000,
  DEFAULT_DURATION: 60 * 60 * 1000,
  SHORT_TERM: 15 * 60 * 1000,
  MEDIUM_TERM: 30 * 60 * 1000,
  LONG_TERM: 12 * 60 * 60 * 1000,
  VERY_LONG_TERM: 24 * 60 * 60 * 1000,
} as const;

export const VALIDATION = {
  EMAIL_REGEX: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  MIN_PASSWORD_LENGTH: 8,
  MAX_NAME_LENGTH: 50,
} as const;

// Replace all magic values with imports
import { FILE_UPLOAD } from '@/constants/Config';
```

**Verification Checklist:**
- [ ] No magic numbers in code
- [ ] All constants centralized

---

### **Task 4.4: Add Input Validation**
**Time:** 4 hours

**Solution:**
```typescript
// utils/Validation.ts
import { VALIDATION } from '@/constants/Config';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Email is required' };
  }
  
  if (!VALIDATION.EMAIL_REGEX.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validatePassword = (password: string): ValidationResult => {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }
  
  if (password.length < VALIDATION.MIN_PASSWORD_LENGTH) {
    return {
      isValid: false,
      error: `Password must be at least ${VALIDATION.MIN_PASSWORD_LENGTH} characters`,
    };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
    return {
      isValid: false,
      error: 'Password must contain uppercase, lowercase, number, and special character',
    };
  }
  
  return { isValid: true };
};

export const validateName = (name: string, fieldName: string = 'Name'): ValidationResult => {
  if (!name || name.trim().length === 0) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (name.length > VALIDATION.MAX_NAME_LENGTH) {
    return {
      isValid: false,
      error: `${fieldName} must be less than ${VALIDATION.MAX_NAME_LENGTH} characters`,
    };
  }
  
  if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    return {
      isValid: false,
      error: `${fieldName} contains invalid characters`,
    };
  }
  
  return { isValid: true };
};

export const validateFormData = (
  formData: any,
  rules: Record<string, (value: any) => ValidationResult>
): Record<string, string> => {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(rules)) {
    const result = validator(formData[field]);
    if (!result.isValid && result.error) {
      errors[field] = result.error;
    }
  }
  
  return errors;
};
```

**Verification Checklist:**
- [ ] All forms validated before submission
- [ ] Clear error messages

---

### **Task 4.5: Refactor Large Files**
**Time:** 8 hours

**Break down useChat.tsx (732 lines):**

```typescript
// hooks/useConversations.ts
export const useConversations = () => {
  const [conversations, setConversations] = useState<Conversations[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  
  // Move: fetchConversations, deleteConversation, renameConversation, createNewConversation
  
  return { conversations, currentConversationId, /* methods */ };
};

// hooks/useMessages.ts
export const useMessages = (conversationId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Move: fetchMessages, appendMessage
  
  return { messages, /* methods */ };
};

// hooks/useFileUpload.ts
export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  
  // Move: optimizeImage, saveBase64ToFile, checkFileExists
  
  return { files, /* methods */ };
};

// hooks/useLocalLLM.ts
export const useLocalLLM = () => {
  // Move: LLM initialization, handleSendLocalMessage
  
  return { isLocal, /* methods */ };
};

// hooks/useChat.tsx (now ~200 lines)
import { useConversations } from './useConversations';
import { useMessages } from './useMessages';
import { useFileUpload } from './useFileUpload';
import { useLocalLLM } from './useLocalLLM';

export const ChatProvider: React.FC = ({ children }) => {
  const conversations = useConversations();
  const messages = useMessages(conversations.currentConversationId);
  const fileUpload = useFileUpload();
  const localLLM = useLocalLLM();
  
  // Compose functionality
  
  return <ChatContext.Provider value={contextValue}>{children}</ChatContext.Provider>;
};
```

**Verification Checklist:**
- [ ] All functionality still works
- [ ] File sizes under 300 lines each

---

### **Task 4.6: Add Error Boundaries**
**Time:** 3 hours

**Solution:**
```typescript
// components/ErrorBoundary.tsx
import React, { Component, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <Text style={styles.title}>Oops! Something went wrong</Text>
          <Text style={styles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#51b0cb',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// app/_layout.tsx - Wrap routes
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ChatProvider>
          <Stack>{/* routes */}</Stack>
        </ChatProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
```

**Verification Checklist:**
- [ ] Errors caught at boundaries
- [ ] App doesn't crash completely

---

### **Task 4.7: Add Missing Configuration**
**Time:** 2 hours

**Solution:**
```json
// app.json - Update
{
  "expo": {
    "android": {
      "package": "com.neptunetech.odyssey",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECORD_AUDIO"
      ]
    },
    "ios": {
      "infoPlist": {
        "NSPhotoLibraryUsageDescription": "Odyssey needs access to your photos",
        "NSCameraUsageDescription": "Odyssey needs access to your camera",
        "NSMicrophoneUsageDescription": "Odyssey needs access to your microphone"
      }
    },
    "plugins": [
      "expo-router",
      ["expo-image-picker", {
        "photosPermission": "Allow Odyssey to access your photos"
      }],
      ["expo-av", {
        "microphonePermission": "Allow Odyssey to access your microphone"
      }]
    ]
  }
}
```

```typescript
// app/_layout.tsx - Add deep linking
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

const linking = {
  prefixes: [prefix, 'odyssey://'],
  config: {
    screens: {
      'email-verification': 'verify-email/:session',
      'forgot-password-change': 'reset-password/:token',
      '(chat)/[id]': 'chat/:id',
    },
  },
};

export default function RootLayout() {
  return (
    <NavigationContainer linking={linking}>
      {/* routes */}
    </NavigationContainer>
  );
}
```

**Verification Checklist:**
- [ ] Deep links work
- [ ] Permissions requested properly

---

## **PHASE 5: TESTING & DEPLOYMENT PREP** ✅
**Timeline:** Days 21-25 | **Final Phase**

### **Task 5.1: Add Essential Tests**
**Time:** 8 hours

**Setup:**
```bash
pnpm add -D @testing-library/react-native @testing-library/jest-native
```

**Create tests:**
```typescript
// __tests__/utils/Validation.test.ts
import { validateEmail, validatePassword } from '@/utils/Validation';

describe('Validation', () => {
  describe('validateEmail', () => {
    it('should validate correct email', () => {
      const result = validateEmail('test@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('Passw0rd!');
      expect(result.isValid).toBe(true);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
    });
  });
});

// __tests__/hooks/useAuth.test.tsx
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth, AuthProvider } from '@/hooks/useAuth';

describe('useAuth', () => {
  it('should sign in successfully', async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    await act(async () => {
      await result.current.signIn('test@example.com', 'password');
    });

    await waitFor(() => {
      expect(result.current.isSignedIn).toBe(true);
    });
  });
});

// __tests__/components/CustomInput.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import CustomInput from '@/components/CustomInput';

describe('CustomInput', () => {
  it('should render correctly', () => {
    const { getByPlaceholderText } = render(
      <CustomInput icon="mail" placeholder="Email" />
    );
    expect(getByPlaceholderText('Email')).toBeDefined();
  });

  it('should call onChangeText', () => {
    const onChangeText = jest.fn();
    const { getByPlaceholderText } = render(
      <CustomInput
        icon="mail"
        placeholder="Email"
        onChangeText={onChangeText}
      />
    );
    
    fireEvent.changeText(getByPlaceholderText('Email'), 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
  });
});
```

**Add test scripts:**
```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

**Verification Checklist:**
- [ ] All tests pass
- [ ] Coverage > 60% for critical paths

---

### **Task 5.2: Setup Pre-commit Hooks**
**Time:** 2 hours

```bash
pnpm add -D husky lint-staged
npx husky-init && pnpm install
```

**Configure:**
```json
// package.json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --bail --findRelatedTests"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged
pnpm tsc --noEmit
```

**Verification Checklist:**
- [ ] Pre-commit hooks run
- [ ] Cannot commit with TypeScript errors

---

### **Task 5.3: Environment Configuration**
**Time:** 2 hours

**Create files:**
```bash
# .env.example
EXPO_PUBLIC_API_URL=https://api.odysseytech.ai
EXPO_PUBLIC_RECAPTCHA_SITE_KEY=your-site-key
EXPO_PUBLIC_SENTRY_DSN=your-sentry-dsn
EXPO_PUBLIC_ENV=production

# .env.development
EXPO_PUBLIC_API_URL=https://dev-api.odysseytech.ai
EXPO_PUBLIC_ENV=development
```

**Create config:**
```typescript
// utils/Config.ts
const ENV = process.env.EXPO_PUBLIC_ENV || 'development';
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.odysseytech.ai';
const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY || '';

if (!RECAPTCHA_SITE_KEY && ENV === 'production') {
  throw new Error('RECAPTCHA_SITE_KEY is required in production');
}

export const config = {
  env: ENV,
  apiUrl: API_URL,
  recaptchaSiteKey: RECAPTCHA_SITE_KEY,
  isDevelopment: ENV === 'development',
  isProduction: ENV === 'production',
} as const;

// utils/ApiClient.ts - Update
import { config } from './Config';
const apiClient = new ApiClient(config.apiUrl);
```

**Verification Checklist:**
- [ ] Environment variables loaded
- [ ] Different configs for dev/staging/prod

---

### **Task 5.4: Add Logging & Monitoring**
**Time:** 3 hours

**Install:**
```bash
pnpm add @sentry/react-native
npx @sentry/wizard -i reactNative
```

**Configure:**
```typescript
// utils/Monitoring.ts
import * as Sentry from '@sentry/react-native';
import { config } from './Config';

export const initMonitoring = () => {
  if (config.isProduction) {
    Sentry.init({
      dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      enableAutoSessionTracking: true,
      tracesSampleRate: 1.0,
      environment: config.env,
    });
  }
};

export const logError = (error: Error, context?: Record<string, any>) => {
  if (config.isProduction) {
    Sentry.captureException(error, { extra: context });
  } else {
    console.error('Error:', error, context);
  }
};

// app/_layout.tsx
import { initMonitoring } from '@/utils/Monitoring';
initMonitoring();
```

**Verification Checklist:**
- [ ] Errors logged to Sentry
- [ ] Performance monitoring active

---

### **Task 5.5: Documentation**
**Time:** 4 hours

**Create README.md:**
```markdown
# Odyssey Mobile App

## Setup

### Prerequisites
- Node.js >= 18
- pnpm
- Xcode (for iOS)
- Android Studio (for Android)

### Installation
```bash
pnpm install
cp .env.example .env
# Edit .env with your values
```

### Running
```bash
# iOS
pnpm ios

# Android
pnpm android
```

## Project Structure
```
/app - Expo Router pages
/components - Reusable UI components
/hooks - Custom React hooks
/utils - Utility functions
/constants - App constants
```

## Testing
```bash
pnpm test
pnpm test:coverage
```

## Deployment
```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```
```

**Create CHANGELOG.md:**
```markdown
# Changelog

## [1.1.0] - 2025-XX-XX

### Security
- Removed hardcoded security tokens
- Migrated auth tokens to secure storage
- Fixed password exposure in URLs

### Fixed
- Fixed 81 TypeScript errors
- Fixed memory leaks
- Fixed race conditions
- Fixed file upload issues

### Improved
- Optimized performance
- Standardized error handling
- Added input validation
```

**Verification Checklist:**
- [ ] README complete
- [ ] CHANGELOG updated

---

## **FINAL CHECKLIST** ✅

### **Pre-Production Verification**

#### Security ✅
- [ ] No hardcoded credentials
- [ ] Tokens in secure storage
- [ ] No passwords in URLs
- [ ] HTTPS only in production
- [ ] Input validation on all forms
- [ ] Authorization headers correct

#### Type Safety ✅
- [ ] Zero TypeScript errors (`npx tsc --noEmit`)
- [ ] No `any` types in critical paths
- [ ] All interfaces properly defined

#### Performance ✅
- [ ] App starts in < 3 seconds
- [ ] Chat scrolling at 60 FPS
- [ ] Image uploads optimized
- [ ] No memory leaks detected

#### Testing ✅
- [ ] All tests pass
- [ ] Critical paths covered
- [ ] Manual testing on iOS
- [ ] Manual testing on Android

#### Code Quality ✅
- [ ] No console.errors in production
- [ ] No commented code
- [ ] No TODO/FIXME
- [ ] ESLint passes
- [ ] Pre-commit hooks work

#### Documentation ✅
- [ ] README complete
- [ ] CHANGELOG updated
- [ ] API documented

---

## **TIMELINE SUMMARY**

| Phase | Duration | Description |
|-------|----------|-------------|
| **Phase 1** | 3 days | Critical security fixes |
| **Phase 2** | 5 days | TypeScript type safety |
| **Phase 3** | 6 days | Runtime bugs & stability |
| **Phase 4** | 6 days | Code quality & performance |
| **Phase 5** | 5 days | Testing & deployment prep |
| **Total** | **~25 days** | **Full implementation** |

---

## **RESOURCE ALLOCATION**

**Recommended Team:**
- 1 Senior Developer (Phases 1-2, 5)
- 1 Mid-Level Developer (Phases 3-4)
- 1 QA Engineer (Phase 5)

**Solo Development:**
- Expect 3-4 weeks full-time
- Prioritize Phases 1-2 first
- Phases 3-5 can be done incrementally

---

## **SUCCESS METRICS**

- ✅ Zero critical security vulnerabilities
- ✅ Zero TypeScript errors
- ✅ < 5 bugs in production (first month)
- ✅ 90%+ crash-free rate
- ✅ 60%+ test coverage
- ✅ < 3s app startup time
- ✅ 60 FPS UI performance

---

## **PRIORITY IMPLEMENTATION ORDER**

### **MUST DO (Week 1)**
1. Remove hardcoded reCAPTCHA token
2. Stop passing passwords in URLs
3. Migrate tokens to secure storage
4. Fix Authorization header format
5. Fix all TypeScript type errors

### **SHOULD DO (Week 2)**
6. Fix memory leaks
7. Fix race conditions
8. Add input validation
9. Standardize error handling
10. Remove dead code

### **NICE TO HAVE (Week 3+)**
11. Optimize performance
12. Refactor large files
13. Add error boundaries
14. Add comprehensive tests
15. Setup monitoring

---

## **NEXT STEPS**

1. Review this plan with the team
2. Set up development environment
3. Create feature branch: `feature/bug-fixes-q4-2025`
4. Start with Phase 1, Task 1.1
5. Create PR after each phase completion
6. Schedule QA testing before Phase 5
7. Plan production deployment

---

**Document Version:** 1.0  
**Last Updated:** October 2, 2025  
**Author:** AI Code Audit Team  
**Status:** Ready for Implementation

