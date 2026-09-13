import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

const METRIX_HOME_IMG = require('@/assets/images/metrixhome.jpg');
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// metrixhome.jpg is a vertical 9:16 portrait
const IMAGE_WIDTH = SCREEN_WIDTH;
const IMAGE_HEIGHT = Math.round(SCREEN_WIDTH * (16 / 9));
// Frame from just above the red eclipse arc down to mid-mountain (half mountain)
const CONTAINER_HEIGHT = Math.round(SCREEN_WIDTH * 0.86);
const IMAGE_OFFSET_TOP = -Math.round(SCREEN_WIDTH * 0.18);

interface MountainFooterGraphicProps {
  height?: number;
  width?: number | string;
}

export function MountainFooterGraphic({
  height = CONTAINER_HEIGHT,
}: MountainFooterGraphicProps) {
  return (
    <View style={[styles.container, { height }]}>
      <Image
        source={METRIX_HOME_IMG}
        style={[
          styles.image,
          {
            width: IMAGE_WIDTH,
            height: IMAGE_HEIGHT,
            top: IMAGE_OFFSET_TOP,
          },
        ]}
        contentFit="cover"
      />

      {/* Soft edge blend at the top to seamlessly merge with the black background */}
      <LinearGradient
        colors={['#050608', 'rgba(5, 6, 8, 0.3)', 'transparent']}
        locations={[0, 0.35, 1]}
        style={styles.topGradient}
      />

      {/* Bottom smooth fade for half mountain into black background */}
      <LinearGradient
        colors={['transparent', 'rgba(5, 6, 8, 0.5)', '#050608']}
        locations={[0, 0.55, 1]}
        style={styles.bottomGradient}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    marginHorizontal: -20,
    marginTop: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#050608',
  },
  image: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
});

