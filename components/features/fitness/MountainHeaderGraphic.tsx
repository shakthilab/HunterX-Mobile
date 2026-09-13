import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const METRIX_FIT_IMG = require('@/assets/images/metrixfit.jpg');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// metrixfit.jpg is a square 1:1 image
const IMAGE_SIZE = Math.round(SCREEN_WIDTH * 1.12);
const IMAGE_TOP = -Math.round(SCREEN_WIDTH * 0.14);
const IMAGE_RIGHT = -Math.round(SCREEN_WIDTH * 0.04);

interface MountainHeaderGraphicProps {
  height?: number;
  width?: number | string;
  showQuote?: boolean;
}

export function MountainHeaderGraphic({
  height = 230,
}: MountainHeaderGraphicProps) {
  return (
    <View style={[styles.container, { height }]} pointerEvents="none">
      <Image
        source={METRIX_FIT_IMG}
        style={[
          styles.image,
          {
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            top: IMAGE_TOP,
            right: IMAGE_RIGHT,
          },
        ]}
        contentFit="cover"
      />

      {/* Left dark gradient so the title, brand text & back button remain razor sharp */}
      <LinearGradient
        colors={['#050608', 'rgba(5, 6, 8, 0.85)', 'rgba(5, 6, 8, 0.4)', 'transparent']}
        locations={[0, 0.42, 0.68, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.85, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Top subtle fade */}
      <LinearGradient
        colors={['rgba(5, 6, 8, 0.5)', 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.35 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Bottom smooth fade into the dashboard content */}
      <LinearGradient
        colors={['transparent', 'rgba(5, 6, 8, 0.75)', '#050608']}
        locations={[0, 0.5, 1]}
        style={styles.bottomGradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    overflow: 'hidden',
    backgroundColor: '#050608',
  },
  image: {
    position: 'absolute',
    right: 0,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
});
