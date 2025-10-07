
import { useState } from 'react';
import { MMKV } from 'react-native-mmkv';

// Initialize MMKV storage
export const storage = new MMKV();

// Custom hook for MMKV storage operations
const useMMKVStorage = <T,>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(() => {
      try {
        const item = storage.getString(key);
        return item ? JSON.parse(item) : initialValue;
      } catch (error) {
        // console.error('Error reading from MMKV:', error);
        return initialValue;
      }
    });
  
    const setValue = (value: T | ((prevValue: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        storage.set(key, JSON.stringify(valueToStore));
      } catch (error) {
        // console.error('Error writing to MMKV:', error);
      }
    };
  
    return [storedValue, setValue] as const;
  };


  export default useMMKVStorage;
