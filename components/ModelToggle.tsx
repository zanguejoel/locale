import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';

interface ModelToggleProps {
  onSelectModel: (modelType: 'local' | 'Odyssey') => void;
  initialState?: boolean;
  disableLocal?: boolean;
}

const ModelToggle: React.FC<ModelToggleProps> = ({ 
  onSelectModel, 
  initialState = true,
  disableLocal = false
}) => {
  const theme = useTheme();
  const [isLocal, setIsLocal] = useState<boolean>(initialState);
  const [animation] = useState<Animated.Value>(new Animated.Value(initialState ? 0 : 1));

  const handleToggle = (local: boolean): void => {
    setIsLocal(local);
    onSelectModel(local ? 'local' : 'Odyssey');
    
    Animated.timing(animation, {
      toValue: local ? 0 : 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.toggleContainer, { backgroundColor: theme.isDark ? '#333' : '#F5F5F5' }]}>
        <Animated.View style={[styles.slider, { transform: [{ translateX }], backgroundColor: theme.colors.primary }]} />
        
        <TouchableOpacity 
            disabled={disableLocal}
          onPress={() => handleToggle(true)} 
          style={[styles.option, disableLocal && styles.disabledOption]}
        >
          <Ionicons 
            name="phone-portrait-outline" 
            size={20} 
            color={isLocal ? '#FFFFFF' : theme.isDark ? '#BBBBBB' : '#9E9E9E'} 
          />
          <Text style={[
            styles.optionText, 
            { color: isLocal ? '#FFFFFF' : theme.isDark ? '#BBBBBB' : '#9E9E9E' }
          ]}>
            Local
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => handleToggle(false)} 
          style={styles.option}
        >
          <Ionicons 
            name="cloud-outline" 
            size={20} 
            color={!isLocal ? '#FFFFFF' : theme.isDark ? '#BBBBBB' : '#9E9E9E'} 
          />
          <Text style={[
            styles.optionText, 
            { color: !isLocal ? '#FFFFFF' : theme.isDark ? '#BBBBBB' : '#9E9E9E' }
          ]}>
          Odyssey
          </Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.modelInfo, { color: theme.isDark ? '#BBBBBB' : '#757575' }]}>
        {disableLocal 
          ? 'Local model not supported on this device' 
          : isLocal 
            ? 'Using local model (works offline)' 
            : 'Using Odyssey (more powerful)'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 30,
    height: 50,
    width: 240,
    position: 'relative',
    overflow: 'hidden',
  },
  slider: {
    position: 'absolute',
    width: 120,
    height: 50,
    borderRadius: 30,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  disabledOption: {
    opacity: 0.4,
  },
  optionText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  modelInfo: {
    marginTop: 12,
    fontSize: 12,
  },
});

export default ModelToggle;

// Usage:
// <ModelToggle 
//   initialState={true}
//   onSelectModel={(modelType: 'local' | 'Odyssey') => console.log(`Selected: ${modelType}`)} 
// />