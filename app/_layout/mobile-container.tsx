import React from 'react';
import { View, StyleSheet, Platform, ViewStyle } from 'react-native';

interface MobileContainerProps {
  children: React.ReactNode;
}

const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  // Only apply special container on web
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <View style={[styles.phoneFrame, webOnlyStyles]}>
          {children}
        </View>
      </View>
    );
  }
  
  // On native platforms, just return the children
  return <>{children}</>;
};

// Regular React Native styles that work on all platforms
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 480,
    height: '100%',
    maxHeight: 900,
    backgroundColor: 'white',
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#333',
    borderRadius: 20,
  }
});

// Web-specific styles applied directly
const webOnlyStyles = Platform.OS === 'web' ? {
  // @ts-ignore - these are web-only styles
  boxShadow: '0px 0px 20px rgba(0, 0, 0, 0.3)',
} : {};

export default MobileContainer; 