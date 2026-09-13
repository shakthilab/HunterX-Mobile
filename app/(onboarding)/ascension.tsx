import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { DustParticles } from '@/components/common/DustParticles';
import { Screen } from '@/components/common/Screen';
import { fontFamilies } from '@/theme/typography';
import { useAuth } from '@/hooks/useAuth';
import { CLOUDINARY_ASSETS } from '@/constants/cloudinaryAssets';
import { optimizeCloudinaryUrl, DEFAULT_BLURHASH } from '@/services/media/cloudinary';
import { playIntroAudio, preloadIntroAudio } from '@/services/audio/introSound';
import * as Haptics from 'expo-haptics';

// This is the first screen every new user lands on right after onboarding —
// same reasoning as login.tsx's hero image: width-cap the Cloudinary
// delivery so it's a fraction of the original's bytes, and let expo-image's
// blurhash placeholder + disk cache mean it's never a blank flash again
// after the first load.
const HERO_IMAGE_URI = optimizeCloudinaryUrl(CLOUDINARY_ASSETS.screen.uri, 1200);

export default function AscensionScreen() {
  const { completeOnboarding } = useAuth();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    preloadIntroAudio();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const handleStart = () => {
    // Trigger intro audio with synchronized haptic sequence on button press
    playIntroAudio(true);
    completeOnboarding();
    router.replace('/(tabs)?fromAscension=true');
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.container}>
        {/* Top Hero Image Banner */}
        <View style={styles.heroWrapper}>
          <View style={styles.heroImage}>
            <ExpoImage
              source={{ uri: HERO_IMAGE_URI }}
              style={StyleSheet.absoluteFillObject}
              contentFit="cover"
              cachePolicy="memory-disk"
              placeholder={{ blurhash: DEFAULT_BLURHASH }}
              transition={200}
            />

            <DustParticles count={20} />

            {/* Top subtle dark glow */}
            <LinearGradient
              colors={['rgba(0,0,0,0.6)', 'transparent']}
              style={styles.topGradient}
            />

            {/* Bottom fade into screen dark background */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.85)', '#000000']}
              locations={[0, 0.45, 0.8, 1.0]}
              style={styles.bottomGradient}
            />
          </View>
        </View>

        {/* Content Section */}
        <Animated.View
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.protocolLabel}>PROTOCOL ALPHA</Text>

          <Text style={styles.title}>
            ASCENSION{'\n'}BEGINS
          </Text>

          <Text style={styles.description}>
            The path is steep, but the view from the top belongs to the one who does not quit.
          </Text>

          {/* Dismiss / Back X Button Container */}
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [
              styles.closeIconButton,
              pressed && styles.closeIconButtonPressed,
            ]}
          >
            <Feather name="x" size={20} color="#71717A" />
          </Pressable>
        </Animated.View>

        {/* Bottom CTA Button */}
        <Animated.View style={[styles.bottomBar, { opacity: fadeAnim }]}>
          <Button
            label="START THE CLIMB"
            onPress={handleStart}
            variant="primary"
            style={styles.ctaButton}
            labelStyle={styles.ctaLabel}
          />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  heroWrapper: {
    width: '100%',
    height: '42%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  contentContainer: {
    paddingHorizontal: 28,
    alignItems: 'center',
    marginTop: -20,
    zIndex: 2,
  },
  protocolLabel: {
    fontFamily: fontFamilies.semiBold,
    fontSize: 11,
    letterSpacing: 3.5,
    color: '#71717A',
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: 1.5,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  description: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  closeIconButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  closeIconButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  bottomBar: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 28,
    paddingTop: 12,
  },
  ctaButton: {
    height: 54,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  ctaLabel: {
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    letterSpacing: 2,
    color: '#000000',
  },
});

