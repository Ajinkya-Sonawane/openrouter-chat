import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { COLORS } from '../constants';

const TypingIndicator: React.FC = () => {
  // Animation values for the three dots - both opacity and scale
  const dot1Opacity = useRef(new Animated.Value(0.3)).current;
  const dot2Opacity = useRef(new Animated.Value(0.3)).current;
  const dot3Opacity = useRef(new Animated.Value(0.3)).current;
  
  const dot1Scale = useRef(new Animated.Value(0.8)).current;
  const dot2Scale = useRef(new Animated.Value(0.8)).current;
  const dot3Scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Create animations for each dot with different delays
    const animateDot = (dotOpacity: Animated.Value, dotScale: Animated.Value, delay: number) => {
      return Animated.parallel([
        // Opacity animation
        Animated.sequence([
          Animated.timing(dotOpacity, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
            easing: Easing.ease
          }),
          Animated.timing(dotOpacity, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.ease
          })
        ]),
        // Scale animation
        Animated.sequence([
          Animated.timing(dotScale, {
            toValue: 1.2,
            duration: 400,
            delay,
            useNativeDriver: true,
            easing: Easing.ease
          }),
          Animated.timing(dotScale, {
            toValue: 0.8,
            duration: 400,
            useNativeDriver: true,
            easing: Easing.ease
          })
        ])
      ]);
    };

    // Create a loop animation
    const animation = Animated.loop(
      Animated.parallel([
        animateDot(dot1Opacity, dot1Scale, 0),
        animateDot(dot2Opacity, dot2Scale, 150),
        animateDot(dot3Opacity, dot3Scale, 300)
      ])
    );

    // Start the animation
    animation.start();

    // Clean up
    return () => {
      animation.stop();
    };
  }, [dot1Opacity, dot2Opacity, dot3Opacity, dot1Scale, dot2Scale, dot3Scale]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.dot, 
          { 
            opacity: dot1Opacity,
            transform: [{ scale: dot1Scale }] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.dot, 
          { 
            opacity: dot2Opacity,
            transform: [{ scale: dot2Scale }] 
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.dot, 
          { 
            opacity: dot3Opacity,
            transform: [{ scale: dot3Scale }] 
          }
        ]} 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.secondary,
    marginHorizontal: 3,
  }
});

export default TypingIndicator; 