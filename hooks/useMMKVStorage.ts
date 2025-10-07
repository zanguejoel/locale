
import { useState, useCallback } from 'react';
import { MMKV } from 'react-native-mmkv';
import { Alert } from 'react-native';

// Initialize MMKV storage
export const storage = new MMKV();

// Maximum size for a single value (5MB)
const MAX_VALUE_SIZE = 5 * 1024 * 1024;

// Custom hook for MMKV storage operations with comprehensive error handling
const useMMKVStorage = <T,>(key: string, initialValue: T) => {
    const [storedValue, setStoredValue] = useState<T>(() => {
      try {
        const item = storage.getString(key);
        
        if (!item) {
          return initialValue;
        }
        
        try {
          return JSON.parse(item) as T;
        } catch (parseError) {
          console.error(`[Storage] Failed to parse data for key "${key}":`, parseError);
          
          // Remove corrupted data
          try {
            storage.delete(key);
            console.log(`[Storage] Removed corrupted data for key "${key}"`);
          } catch (deleteError) {
            console.error(`[Storage] Failed to delete corrupted key "${key}":`, deleteError);
          }
          
          return initialValue;
        }
      } catch (error) {
        console.error(`[Storage] Error reading key "${key}":`, error);
        return initialValue;
      }
    });
  
    const setValue = useCallback((value: T | ((prevValue: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        
        // Serialize the value
        let serialized: string;
        try {
          serialized = JSON.stringify(valueToStore);
        } catch (serializeError) {
          console.error(`[Storage] Failed to serialize value for key "${key}":`, serializeError);
          Alert.alert(
            'Save Failed',
            'The data could not be saved. Please try again.'
          );
          return;
        }
        
        // Check size limit
        if (serialized.length > MAX_VALUE_SIZE) {
          console.warn(`[Storage] Value for key "${key}" exceeds size limit (${serialized.length} bytes)`);
          Alert.alert(
            'Storage Warning',
            'The data is too large to save. Please reduce the amount of data or clear some conversations.'
          );
          return;
        }
        
        // Try to save
        try {
          storage.set(key, serialized);
          setStoredValue(valueToStore);
        } catch (saveError: any) {
          console.error(`[Storage] Failed to save key "${key}":`, saveError);
          
          // Check for specific error types
          const errorMessage = saveError?.message || String(saveError);
          
          if (errorMessage.toLowerCase().includes('full') || 
              errorMessage.toLowerCase().includes('space') ||
              errorMessage.toLowerCase().includes('quota')) {
            Alert.alert(
              'Storage Full',
              'Your device storage is full. Please free up space by deleting old conversations or other data.'
            );
          } else if (errorMessage.toLowerCase().includes('permission')) {
            Alert.alert(
              'Permission Denied',
              'The app does not have permission to save data. Please check your device settings.'
            );
          } else {
            Alert.alert(
              'Save Failed',
              'Failed to save data. Please try again.'
            );
          }
        }
      } catch (error: any) {
        console.error(`[Storage] Unexpected error for key "${key}":`, error);
        Alert.alert(
          'Error',
          'An unexpected error occurred. Please try again.'
        );
      }
    }, [key, storedValue]);
  
    return [storedValue, setValue] as const;
  };


  export default useMMKVStorage;
