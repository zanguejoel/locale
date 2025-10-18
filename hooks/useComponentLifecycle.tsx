import { useEffect, useRef } from 'react';

/**
 * Debug hook to track component lifecycle and detect unnecessary unmounts
 * Only active in development mode
 */
export function useComponentLifecycle(componentName: string, props?: any) {
  const mountCount = useRef(0);
  const renderCount = useRef(0);
  const previousProps = useRef<any>(props);

  // Track mount/unmount
  useEffect(() => {
    mountCount.current += 1;
    const currentMount = mountCount.current;
    
    if (__DEV__) {
      console.log(`[Lifecycle] 🟢 ${componentName} MOUNTED (mount #${currentMount})`);
      
      if (currentMount > 1) {
        console.warn(
          `[Lifecycle] ⚠️ ${componentName} has been mounted ${currentMount} times!`,
          'This might indicate unnecessary unmounting/remounting.'
        );
      }
    }

    return () => {
      if (__DEV__) {
        console.log(`[Lifecycle] 🔴 ${componentName} UNMOUNTING (was mount #${currentMount})`);
      }
    };
  }, [componentName]);

  // Track renders and prop changes
  useEffect(() => {
    renderCount.current += 1;

    if (__DEV__ && props && previousProps.current) {
      const changedProps: any = {};
      const allKeys = Object.keys({ ...previousProps.current, ...props });

      allKeys.forEach((key) => {
        if (previousProps.current[key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current[key],
            to: props[key],
          };
        }
      });

      if (Object.keys(changedProps).length > 0) {
        console.log(
          `[Lifecycle] 🔄 ${componentName} re-rendered (render #${renderCount.current})`,
          'Changed props:',
          changedProps
        );
      }
    }

    previousProps.current = props;
  });

  return {
    mountCount: mountCount.current,
    renderCount: renderCount.current,
  };
}

/**
 * Hook to prevent a component from unmounting
 * Useful for expensive components that should stay mounted
 */
export function usePreventUnmount(componentName: string) {
  useEffect(() => {
    if (__DEV__) {
      console.log(`[PreventUnmount] ${componentName} is configured to stay mounted`);
    }

    return () => {
      if (__DEV__) {
        console.warn(
          `[PreventUnmount] ⚠️ ${componentName} is unmounting!`,
          'This component was supposed to stay mounted. Check your component hierarchy.'
        );
      }
    };
  }, [componentName]);
}

/**
 * Hook to track render performance
 */
export function useRenderPerformance(componentName: string, threshold = 16) {
  const renderStartTime = useRef<number>(0);

  // Before render
  renderStartTime.current = performance.now();

  // After render
  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;

    if (__DEV__ && renderTime > threshold) {
      console.warn(
        `[Performance] ⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render`,
        `(threshold: ${threshold}ms)`
      );
    }
  });
}

/**
 * Wrapper component that prevents children from unmounting
 * Shows/hides using opacity instead
 */
import React from 'react';
import { View, ViewProps } from 'react-native';
import { Animated } from 'react-native';

interface KeepMountedProps extends ViewProps {
  visible: boolean;
  children: React.ReactNode;
  animateTransition?: boolean;
}

export const KeepMounted: React.FC<KeepMountedProps> = ({
  visible,
  children,
  animateTransition = false,
  style,
  ...props
}) => {
  const opacity = useRef(new Animated.Value(visible ? 1 : 0)).current;

  useEffect(() => {
    if (animateTransition) {
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      opacity.setValue(visible ? 1 : 0);
    }
  }, [visible, animateTransition, opacity]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: animateTransition ? opacity : visible ? 1 : 0,
          display: visible ? 'flex' : 'none',
        },
      ]}
      {...props}
    >
      {children}
    </Animated.View>
  );
};

/**
 * Example usage:
 * 
 * function MyComponent(props) {
 *   // Track lifecycle
 *   useComponentLifecycle('MyComponent', props);
 *   
 *   // Prevent unmounting
 *   usePreventUnmount('MyComponent');
 *   
 *   // Track performance
 *   useRenderPerformance('MyComponent', 16);
 *   
 *   return <View>...</View>;
 * }
 * 
 * // Keep expensive component mounted
 * <KeepMounted visible={isVisible} animateTransition>
 *   <ExpensiveComponent />
 * </KeepMounted>
 */

