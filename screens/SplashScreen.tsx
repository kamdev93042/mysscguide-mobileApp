import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { useSplash } from '../context/SplashContext';
import { useTheme } from '../context/ThemeContext';

export default function SplashScreen() {
  const { isSplashing } = useSplash();
  const { isDark } = useTheme();
  
  const [fadeAnim] = useState(new Animated.Value(1)); // Initial opacity is 1
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!isSplashing) {
      // Fade out when splashing is done
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setIsVisible(false));
    } else {
      // Fade in instantly when splashing starts
      setIsVisible(true);
      fadeAnim.setValue(1); 
    }
  }, [isSplashing, fadeAnim]);

  // If totally faded out, completely unmount/hide to allow touches underneath
  if (!isVisible) return null;

  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: '#ffffff',
          opacity: fadeAnim 
        }
      ]}
      pointerEvents={isSplashing ? 'auto' : 'none'}
    >
      <Image 
        source={require('../assets/sscguidelogo.png')} 
        style={styles.logo}
        resizeMode="contain"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's always on top
  },
  logo: {
    width: 200,
    height: 200,
  }
});
