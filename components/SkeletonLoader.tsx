import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Theme } from '@/constants/Types';

interface SkeletonLoaderProps {
  variant?: 'message' | 'conversation' | 'model';
  count?: number;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ variant = 'message', count = 3 }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();

    return () => shimmerAnimation.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const renderMessageSkeleton = () => (
    <View style={styles.messageContainer}>
      {/* Avatar */}
      <Animated.View 
        style={[
          styles.skeletonAvatar, 
          styles.shimmer,
          { opacity: shimmerOpacity }
        ]} 
      />
      
      {/* Content */}
      <View style={styles.messageContent}>
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '80%', opacity: shimmerOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '60%', marginTop: 8, opacity: shimmerOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '40%', marginTop: 8, height: 12, opacity: shimmerOpacity }
          ]} 
        />
      </View>
    </View>
  );

  const renderConversationSkeleton = () => (
    <View style={styles.conversationContainer}>
      <Animated.View 
        style={[
          styles.skeletonAvatar, 
          styles.smallAvatar,
          styles.shimmer,
          { opacity: shimmerOpacity }
        ]} 
      />
      <View style={styles.conversationContent}>
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '70%', opacity: shimmerOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '50%', marginTop: 6, height: 12, opacity: shimmerOpacity }
          ]} 
        />
      </View>
    </View>
  );

  const renderModelSkeleton = () => (
    <View style={styles.modelContainer}>
      <Animated.View 
        style={[
          styles.skeletonModelIcon,
          styles.shimmer,
          { opacity: shimmerOpacity }
        ]} 
      />
      <View style={styles.modelContent}>
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '60%', opacity: shimmerOpacity }
          ]} 
        />
        <Animated.View 
          style={[
            styles.skeletonLine, 
            styles.shimmer,
            { width: '40%', marginTop: 6, height: 12, opacity: shimmerOpacity }
          ]} 
        />
      </View>
    </View>
  );

  const renderSkeleton = () => {
    switch (variant) {
      case 'conversation':
        return renderConversationSkeleton();
      case 'model':
        return renderModelSkeleton();
      default:
        return renderMessageSkeleton();
    }
  };

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index}>
          {renderSkeleton()}
        </View>
      ))}
    </View>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 8,
  },
  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.muted,
    marginRight: 12,
  },
  smallAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageContent: {
    flex: 1,
  },
  skeletonLine: {
    height: 16,
    borderRadius: 4,
    backgroundColor: theme.colors.muted,
  },
  shimmer: {
    // Shimmer effect is handled via animation
  },
  conversationContainer: {
    flexDirection: 'row',
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  conversationContent: {
    flex: 1,
    marginLeft: 8,
  },
  modelContainer: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
  },
  skeletonModelIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.muted,
    marginRight: 12,
  },
  modelContent: {
    flex: 1,
    justifyContent: 'center',
  },
});

export default SkeletonLoader;

