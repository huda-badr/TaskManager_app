import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useTaskContext } from '@/app/context/TaskContext';

interface RealtimeUpdateIndicatorProps {
  isDark: boolean;
}

const RealtimeUpdateIndicator = ({ isDark }: RealtimeUpdateIndicatorProps) => {
  const { loading } = useTaskContext();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const rotateAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (loading) {
      // Start rotation animation
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
      
      // Show indicator
      setVisible(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Keep visible for a short time after loading is done
      timer = setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setVisible(false);
          rotateAnim.setValue(0);
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, fadeAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        isDark && styles.darkContainer,
        { opacity: fadeAnim }
      ]}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <MaterialIcons name="sync" size={18} color={isDark ? '#64B5F6' : '#2196F3'} />
      </Animated.View>
      <Text style={[styles.text, isDark && styles.darkText]}>
        Real-time updates active
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    marginBottom: 12,
  },
  darkContainer: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
  },
  text: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  darkText: {
    color: '#64B5F6',
  },
});

export default RealtimeUpdateIndicator; 