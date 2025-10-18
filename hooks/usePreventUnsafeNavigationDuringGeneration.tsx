import { useEffect, useRef } from 'react';
import { Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';

interface UsePreventUnsafeNavigationOptions {
  isGenerating: boolean;
  onInterrupt: () => void;
  modelType?: 'local' | 'cloud';
}

/**
 * Hook to prevent unsafe navigation/unmounting during model generation
 * 
 * According to ExecuTorch documentation:
 * "If you try to dismount the component using this hook while generation is still going on, 
 * it will result in crash. You'll need to interrupt the model first and wait until 
 * isGenerating is set to false."
 * 
 * This hook:
 * 1. Blocks Android back button during generation
 * 2. Shows warning dialog if user tries to navigate away
 * 3. Automatically interrupts generation if user confirms navigation
 * 
 * @see https://docs.swmansion.com/react-native-executorch/docs/hooks/natural-language-processing/useLLM#interrupting-the-model
 */
export function usePreventUnsafeNavigationDuringGeneration(
  options: UsePreventUnsafeNavigationOptions
) {
  const { isGenerating, onInterrupt, modelType = 'local' } = options;
  const router = useRouter();
  const isGeneratingRef = useRef(isGenerating);

  // Keep ref up to date
  useEffect(() => {
    isGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Block Android hardware back button during generation
  useEffect(() => {
    if (!isGenerating) {
      return;
    }

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isGeneratingRef.current) {
          Alert.alert(
            'Generation in Progress',
            `The ${modelType} model is currently generating a response. Would you like to stop it and go back?`,
            [
              {
                text: 'Keep Generating',
                style: 'cancel',
              },
              {
                text: 'Stop & Go Back',
                onPress: () => {
                  console.log('[Navigation] User chose to interrupt and go back');
                  onInterrupt();
                  
                  // Wait a bit for interrupt to take effect, then navigate
                  setTimeout(() => {
                    router.back();
                  }, 300);
                },
                style: 'destructive',
              },
            ]
          );
          return true; // Prevent default back behavior
        }
        return false; // Allow default back behavior
      }
    );

    return () => backHandler.remove();
  }, [isGenerating, onInterrupt, modelType, router]);

  /**
   * Function to safely navigate away
   * Shows warning if generation is in progress
   * 
   * Usage:
   * ```
   * const safeNavigate = useSafeNavigate({ isGenerating, onInterrupt });
   * safeNavigate(() => router.push('/new-route'));
   * ```
   */
  const safeNavigate = (navigationCallback: () => void): boolean => {
    if (isGeneratingRef.current) {
      Alert.alert(
        'Generation in Progress',
        `The ${modelType} model is currently generating a response. Would you like to stop it and navigate away?`,
        [
          {
            text: 'Keep Generating',
            style: 'cancel',
          },
          {
            text: 'Stop & Navigate',
            onPress: () => {
              console.log('[Navigation] User chose to interrupt and navigate');
              onInterrupt();
              
              // Wait for interrupt to take effect
              setTimeout(() => {
                navigationCallback();
              }, 300);
            },
            style: 'destructive',
          },
        ]
      );
      return false; // Navigation blocked
    }

    // Safe to navigate
    navigationCallback();
    return true;
  };

  return {
    safeNavigate,
    isGenerating,
    canSafelyNavigate: !isGenerating,
  };
}

