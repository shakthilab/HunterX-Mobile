import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  runOnJS,
  useAnimatedReaction,
  SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Path,
  Defs,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { fontFamilies } from '../../theme/typography';
import { colors } from '../../theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Export timing constants for easy tuning
export const EGG_DROP_DURATION = 600;
export const MOVE_TO_CENTER_DURATION = 500;
export const SLOW_SPIN_DURATION = 1300;
export const PAYOFF_BURST_DURATION = 600;
export const REWARD_PANEL_SLIDE_DURATION = 600;

// Try loading Shopify Skia dynamically to support fallback
let SkiaCanvas: any = null;
let SkiaRadialGradient: any = null;
let SkiaCircle: any = null;
let isSkiaAvailable = false;

try {
  if (Platform.OS !== 'web') {
    const SkiaModule = require('@shopify/react-native-skia');
    SkiaCanvas = SkiaModule.Canvas;
    SkiaRadialGradient = SkiaModule.RadialGradient;
    SkiaCircle = SkiaModule.Circle;
    isSkiaAvailable = !!SkiaCanvas;
  }
} catch (e) {
  // Silent fallback to SVG
}

interface DragonRewardRevealProps {
  onComplete: () => void;
  xpGained: number;
  dragonPowerGained: number;
  newLevel: number;
  evolutionProgress: number; // 0 to 100
  eggImageSource?: any;
  isMuted?: boolean;
}

// Generate static particles configuration for 60fps Reanimated rendering
const PARTICLE_COUNT = 45;
const PARTICLES = Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
  const angle = (i * 2 * Math.PI) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.15;
  const distance = 80 + Math.random() * 150;
  const size = 3 + Math.random() * 5;
  const colorsList = ['#FBBF24', '#F97316', '#FFE066', '#FFFFFF', '#A78BFA'];
  const color = colorsList[Math.floor(Math.random() * colorsList.length)];
  return { angle, distance, size, color };
});

export const DragonRewardReveal: React.FC<DragonRewardRevealProps> = ({
  onComplete,
  xpGained,
  dragonPowerGained,
  newLevel,
  evolutionProgress,
  eggImageSource = require('../../assets/images/dragon_egg.jpg'),
  isMuted = false,
}) => {
  const [soundLoaded, setSoundLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [countProgressState, setCountProgressState] = useState(0);

  // Sound References
  const soundsRef = useRef<{
    thud: Audio.Sound | null;
    whoosh: Audio.Sound | null;
    charge: Audio.Sound | null;
    chime: Audio.Sound | null;
    tick: Audio.Sound | null;
    settle: Audio.Sound | null;
  }>({
    thud: null,
    whoosh: null,
    charge: null,
    chime: null,
    tick: null,
    settle: null,
  });

  // Reanimated Shared Values
  const eggTranslateY = useSharedValue(-SCREEN_HEIGHT * 0.6);
  const eggTranslateX = useSharedValue(0);
  const eggScale = useSharedValue(0.7);
  const eggRotationY = useSharedValue(0);
  const scrimOpacity = useSharedValue(0);

  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const goldTintOpacity = useSharedValue(0);
  const veinBrightness = useSharedValue(0.5);

  const flashOpacity = useSharedValue(0);
  const particleProgress = useSharedValue(0);
  const cameraShakeX = useSharedValue(0);
  const cameraShakeY = useSharedValue(0);

  const cardTranslateY = useSharedValue(400);
  const cardOpacity = useSharedValue(0);
  const counterProgress = useSharedValue(0);

  // Sound Preloading & Unloading
  useEffect(() => {
    let active = true;

    const loadSounds = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          playThroughEarpieceAndroid: false,
        }).catch(() => { });

        // Safely load and initialize all assets (silent fallback for missing files)
        const loadSoundAsset = async (requirePath: any, isLoop = false) => {
          try {
            const { sound } = await Audio.Sound.createAsync(requirePath, { isLooping: isLoop });
            return sound;
          } catch (e) {
            console.warn('Could not load sound:', requirePath, e);
            return null;
          }
        };

        const [thud, whoosh, charge, chime, tick, settle] = await Promise.all([
          loadSoundAsset(require('../../assets/sounds/egg_land_thud.mp3')),
          loadSoundAsset(require('../../assets/sounds/whoosh_rise.mp3')),
          loadSoundAsset(require('../../assets/sounds/charge_loop.mp3'), true),
          loadSoundAsset(require('../../assets/sounds/reveal_flash_chime.mp3')),
          loadSoundAsset(require('../../assets/sounds/reward_counter_tick.mp3')),
          loadSoundAsset(require('../../assets/sounds/settle_tone.mp3')),
        ]);

        if (active) {
          soundsRef.current = { thud, whoosh, charge, chime, tick, settle };
          setSoundLoaded(true);
          // Auto start the orchestration sequence once preloaded
          sequenceStart();
        }
      } catch (err) {
        console.warn('Sound loading exception:', err);
      }
    };

    loadSounds();

    return () => {
      active = false;
      const unload = async () => {
        const { thud, whoosh, charge, chime, tick, settle } = soundsRef.current;
        if (thud) await thud.unloadAsync().catch(() => { });
        if (whoosh) await whoosh.unloadAsync().catch(() => { });
        if (charge) await charge.unloadAsync().catch(() => { });
        if (chime) await chime.unloadAsync().catch(() => { });
        if (tick) await tick.unloadAsync().catch(() => { });
        if (settle) await settle.unloadAsync().catch(() => { });
      };
      unload();
    };
  }, []);

  // Safe sound player helper
  const playSound = async (soundKey: keyof typeof soundsRef.current) => {
    if (isMuted) return;
    try {
      const sound = soundsRef.current[soundKey];
      if (sound) {
        await sound.stopAsync().catch(() => { });
        await sound.setPositionAsync(0).catch(() => { });
        await sound.playAsync().catch(() => { });
      }
    } catch (err) {
      // Catch silently
    }
  };

  const stopSound = async (soundKey: keyof typeof soundsRef.current) => {
    try {
      const sound = soundsRef.current[soundKey];
      if (sound) {
        await sound.stopAsync().catch(() => { });
      }
    } catch (err) {
      // Catch silently
    }
  };

  // Safe haptic feedback triggers
  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' | 'success' | 'selection') => {
    try {
      if (Platform.OS === 'web') return;
      switch (style) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { });
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { });
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { });
          break;
        case 'selection':
          Haptics.selectionAsync().catch(() => { });
          break;
      }
    } catch (e) {
      // Silent error for simulator
    }
  };

  // Listen to counter progress to trigger ticking sound and state updates
  useAnimatedReaction(
    () => counterProgress.value,
    (val) => {
      runOnJS(setCountProgressState)(val);
    }
  );

  useAnimatedReaction(
    () => Math.floor(counterProgress.value * 12),
    (currentTick, previousTick) => {
      if (currentTick !== previousTick && currentTick > 0 && currentTick <= 12) {
        runOnJS(playSound)('tick');
        runOnJS(triggerHaptic)('light');
      }
    }
  );

  // Main Choreographed Animation Sequence
  const sequenceStart = () => {
    if (isPlaying) return;
    setIsPlaying(true);

    // Reset all shared values to start state
    eggTranslateY.value = -SCREEN_HEIGHT * 0.6;
    eggTranslateX.value = 0;
    eggScale.value = 0.7;
    eggRotationY.value = 0;
    scrimOpacity.value = 0;
    glowScale.value = 0.5;
    glowOpacity.value = 0;
    goldTintOpacity.value = 0;
    veinBrightness.value = 0.5;
    flashOpacity.value = 0;
    particleProgress.value = 0;
    cameraShakeX.value = 0;
    cameraShakeY.value = 0;
    cardTranslateY.value = 400;
    cardOpacity.value = 0;
    counterProgress.value = 0;
    setCountProgressState(0);

    const restingY = -20; // resting position above center on initial drop
    const centerY = 0; // dead center of screen
    const upperY = -120; // final resting position shifted upward

    // 1. Egg Drop-in (0ms - 600ms)
    eggTranslateY.value = withTiming(
      restingY,
      {
        duration: EGG_DROP_DURATION,
        easing: Easing.in(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          runOnJS(playSound)('thud');
          runOnJS(triggerHaptic)('medium');
          // Start small impact dust burst at egg base
          particleProgress.value = withSequence(
            withTiming(0.2, { duration: 150 }),
            withTiming(0, { duration: 150 })
          );
        }
      }
    );

    eggScale.value = withSequence(
      withTiming(0.7, { duration: 500 }),
      withSpring(1.0, { damping: 9, stiffness: 130 })
    );

    // 2. Move to Center (600ms - 1100ms)
    eggTranslateY.value = withSequence(
      withDelay(EGG_DROP_DURATION, withTiming(restingY, { duration: 0 })),
      withTiming(centerY, {
        duration: MOVE_TO_CENTER_DURATION,
        easing: Easing.inOut(Easing.cubic),
      }, (finished) => {
        if (finished) {
          runOnJS(playSound)('whoosh');
          runOnJS(playSound)('charge');
        }
      })
    );

    scrimOpacity.value = withDelay(
      EGG_DROP_DURATION,
      withTiming(0.8, { duration: MOVE_TO_CENTER_DURATION, easing: Easing.inOut(Easing.cubic) })
    );

    // 3. Slow Spin & Glow Build (1100ms - 2400ms)
    // Continuous 3D y-axis rotation
    eggRotationY.value = withDelay(
      EGG_DROP_DURATION + MOVE_TO_CENTER_DURATION,
      withRepeat(
        withTiming(360, { duration: 3500, easing: Easing.linear }),
        -1,
        false
      )
    );

    // Glowing aura expands and pulses
    glowScale.value = withDelay(
      EGG_DROP_DURATION + MOVE_TO_CENTER_DURATION,
      withTiming(1.4, { duration: SLOW_SPIN_DURATION, easing: Easing.out(Easing.quad) })
    );
    glowOpacity.value = withDelay(
      EGG_DROP_DURATION + MOVE_TO_CENTER_DURATION,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 350, easing: Easing.inOut(Easing.quad) }),
          withTiming(0.5, { duration: 350, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );

    // Gold tint layer opacity shifts
    goldTintOpacity.value = withDelay(
      EGG_DROP_DURATION + MOVE_TO_CENTER_DURATION,
      withTiming(0.65, { duration: SLOW_SPIN_DURATION })
    );

    // Veins light intensity pulses with haptics synced
    veinBrightness.value = withDelay(
      EGG_DROP_DURATION + MOVE_TO_CENTER_DURATION,
      withRepeat(
        withSequence(
          withTiming(1.0, { duration: 450 }, (finished) => {
            if (finished) runOnJS(triggerHaptic)('selection');
          }),
          withTiming(0.4, { duration: 450 })
        ),
        -1,
        true
      )
    );

    // 4. Payoff Burst - Level Up Reveal (2400ms - 3000ms)
    const delayPayoff = EGG_DROP_DURATION + MOVE_TO_CENTER_DURATION + SLOW_SPIN_DURATION;

    // Full screen white flash
    flashOpacity.value = withDelay(
      delayPayoff,
      withSequence(
        withTiming(0.85, { duration: 100 }),
        withTiming(0, { duration: 250 })
      )
    );

    // Scale punch
    eggScale.value = withDelay(
      delayPayoff,
      withSequence(
        withTiming(1.22, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1.0, { damping: 10, stiffness: 100 })
      )
    );

    // Dynamic particle burst
    particleProgress.value = withDelay(
      delayPayoff,
      withTiming(1.0, { duration: PAYOFF_BURST_DURATION, easing: Easing.out(Easing.cubic) })
    );

    // Sound + Haptics side effects
    eggTranslateY.value = withDelay(
      delayPayoff,
      withTiming(centerY, { duration: 0 }, (finished) => {
        if (finished) {
          runOnJS(stopSound)('charge');
          runOnJS(playSound)('chime');
          runOnJS(triggerHaptic)('success');
        }
      })
    );

    // Camera shake
    cameraShakeX.value = withDelay(
      delayPayoff,
      withSequence(
        withTiming(6, { duration: 30 }),
        withTiming(-6, { duration: 30 }),
        withTiming(4, { duration: 30 }),
        withTiming(-4, { duration: 30 }),
        withTiming(2, { duration: 30 }),
        withTiming(0, { duration: 30 })
      )
    );
    cameraShakeY.value = withDelay(
      delayPayoff,
      withSequence(
        withTiming(-5, { duration: 30 }),
        withTiming(5, { duration: 30 }),
        withTiming(-3, { duration: 30 }),
        withTiming(3, { duration: 30 }),
        withTiming(-1, { duration: 30 }),
        withTiming(0, { duration: 30 })
      )
    );

    // 5. Level-Up Reward Panel Slide-In (3000ms - 3600ms)
    const delayPanel = delayPayoff + PAYOFF_BURST_DURATION;

    // Settle egg back upward to make room
    eggTranslateY.value = withDelay(
      delayPanel,
      withTiming(upperY, { duration: REWARD_PANEL_SLIDE_DURATION, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) {
          runOnJS(playSound)('settle');
        }
      })
    );
    eggScale.value = withDelay(
      delayPanel,
      withTiming(0.75, { duration: REWARD_PANEL_SLIDE_DURATION, easing: Easing.out(Easing.cubic) })
    );
    // Halt egg Y spin smoothly
    eggRotationY.value = withDelay(
      delayPanel,
      withTiming(0, { duration: REWARD_PANEL_SLIDE_DURATION, easing: Easing.out(Easing.cubic) })
    );

    // Slide up reward card summary
    cardTranslateY.value = withDelay(
      delayPanel,
      withTiming(0, { duration: REWARD_PANEL_SLIDE_DURATION, easing: Easing.out(Easing.cubic) })
    );
    cardOpacity.value = withDelay(
      delayPanel,
      withTiming(1, { duration: REWARD_PANEL_SLIDE_DURATION })
    );

    // Trigger stat counters
    counterProgress.value = withDelay(
      delayPanel + 200,
      withTiming(1.0, { duration: 800, easing: Easing.out(Easing.quad) })
    );
  };

  // Reanimated Animated Styles
  const animatedEggStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: eggTranslateY.value + cameraShakeY.value },
        { translateX: eggTranslateX.value + cameraShakeX.value },
        { scale: eggScale.value },
        { rotateY: `${eggRotationY.value}deg` },
      ],
    };
  });

  const animatedScrimStyle = useAnimatedStyle(() => {
    return { opacity: scrimOpacity.value };
  });

  const animatedFlashStyle = useAnimatedStyle(() => {
    return { opacity: flashOpacity.value };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: glowScale.value }],
      opacity: glowOpacity.value,
    };
  });

  const animatedGoldTintStyle = useAnimatedStyle(() => {
    return { opacity: goldTintOpacity.value };
  });

  const animatedVeinStyle = useAnimatedStyle(() => {
    return { opacity: veinBrightness.value };
  });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: cardTranslateY.value }],
      opacity: cardOpacity.value,
    };
  });

  // Render SVG or Skia Golden Glow
  const renderGoldenGlow = () => {
    const size = SCREEN_WIDTH * 1.5;

    if (isSkiaAvailable) {
      return (
        <Animated.View style={[styles.glowContainer, animatedGlowStyle]}>
          <SkiaCanvas style={{ width: size, height: size }}>
            <SkiaCircle cx={size / 2} cy={size / 2} r={size * 0.45}>
              <SkiaRadialGradient
                c={{ x: size / 2, y: size / 2 }}
                r={size * 0.45}
                colors={['#FBBF24', '#F59E0B', '#D97706', 'transparent']}
                positions={[0, 0.3, 0.75, 1]}
              />
            </SkiaCircle>
          </SkiaCanvas>
        </Animated.View>
      );
    }

    // SVG Fallback Glow
    return (
      <Animated.View style={[styles.glowContainer, animatedGlowStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <SvgRadialGradient id="goldGlow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FBBF24" stopOpacity="0.9" />
              <Stop offset="30%" stopColor="#F59E0B" stopOpacity="0.65" />
              <Stop offset="75%" stopColor="#D97706" stopOpacity="0.25" />
              <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </SvgRadialGradient>
          </Defs>
          <Circle cx={size / 2} cy={size / 2} r={size * 0.45} fill="url(#goldGlow)" />
        </Svg>
      </Animated.View>
    );
  };

  // Render SVG or Skia dynamic particle burst
  const renderParticles = () => {
    const size = SCREEN_WIDTH * 1.8;

    return (
      <View style={styles.particlesContainer} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {PARTICLES.map((p, index) => {
            // Reanimated inline styles for high perf particle motions
            const animatedParticleStyle = useAnimatedStyle(() => {
              const progress = particleProgress.value;
              const x = Math.cos(p.angle) * p.distance * progress;
              // Add slight gravity fall as particle expands
              const y = Math.sin(p.angle) * p.distance * progress + (progress * progress * 35);
              const opacity = 1 - progress;
              const scale = 1 - progress * 0.6;

              return {
                transform: [
                  { translateX: x + size / 2 },
                  { translateY: y + size / 2 },
                  { scale },
                ],
                opacity,
              };
            });

            return (
              <Animated.View
                key={index}
                style={[{ position: 'absolute' }, animatedParticleStyle]}
              >
                <Svg width={p.size * 2} height={p.size * 2}>
                  <Circle cx={p.size} cy={p.size} r={p.size} fill={p.color} />
                </Svg>
              </Animated.View>
            );
          })}
        </Svg>
      </View>
    );
  };

  // Compute stats counting values
  const displayXP = Math.floor(xpGained * countProgressState);
  const displayPower = Math.floor(dragonPowerGained * countProgressState);
  const displayProgress = Math.floor(evolutionProgress * countProgressState);

  return (
    <View style={styles.container}>
      {/* Background Dimming Scrim */}
      <Animated.View style={[styles.scrim, animatedScrimStyle]} />

      {/* Rotating ray beams during charging stage */}
      {isPlaying && (
        <View style={styles.raysContainer} pointerEvents="none">
          <FullScreenRays progress={glowScale} opacity={glowOpacity} />
        </View>
      )}

      {/* Glow Behind the Egg */}
      {renderGoldenGlow()}

      {/* Main Egg Element */}
      <Animated.View style={[styles.eggWrapper, animatedEggStyle]}>
        <Image source={eggImageSource} style={styles.eggImage} contentFit="contain" />

        {/* Glowing Purple/Vein Overlay */}
        <Animated.View style={[styles.eggOverlay, animatedVeinStyle]}>
          <Image
            source={eggImageSource}
            style={styles.eggImage}
            contentFit="contain"
            tintColor="#C084FC"
          />
        </Animated.View>

        {/* Gold Reveal Overlay */}
        <Animated.View style={[styles.eggOverlay, animatedGoldTintStyle]}>
          <Image
            source={eggImageSource}
            style={styles.eggImage}
            contentFit="contain"
            tintColor="#F59E0B"
          />
        </Animated.View>
      </Animated.View>

      {/* Particle Burst Layer */}
      {renderParticles()}

      {/* Full screen flash reveal */}
      <Animated.View style={[styles.flash, animatedFlashStyle]} pointerEvents="none" />

      {/* Reward summary card slides up from bottom */}
      <Animated.View style={[styles.rewardCard, animatedCardStyle]}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLevelLabel}>NEW LEVEL REACHED</Text>
          <Text style={styles.cardLevelNumber}>LEVEL {newLevel}</Text>
        </View>

        <View style={styles.statRowsContainer}>
          {/* XP Stat Row */}
          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>XP Gained</Text>
              <Text style={styles.statValue}>+{displayXP} XP</Text>
            </View>
            <View style={styles.statTrack}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statFill, { width: `${Math.min(100, (displayXP / (xpGained || 1)) * 100)}%` }]}
              />
            </View>
          </View>

          {/* Dragon Power Stat Row */}
          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Dragon Power</Text>
              <Text style={styles.statValue}>+{displayPower} DP</Text>
            </View>
            <View style={styles.statTrack}>
              <LinearGradient
                colors={['#FBBF24', '#F97316']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statFill, { width: `${Math.min(100, (displayPower / (dragonPowerGained || 1)) * 100)}%` }]}
              />
            </View>
          </View>

          {/* Evolution Stat Bar */}
          <View style={styles.statRow}>
            <View style={styles.statInfo}>
              <Text style={styles.statLabel}>Next Evolution</Text>
              <Text style={styles.statValue}>{displayProgress}%</Text>
            </View>
            <View style={styles.statTrack}>
              <LinearGradient
                colors={['#10B981', '#3B82F6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.statFill, { width: `${displayProgress}%` }]}
              />
            </View>
          </View>
        </View>

        {/* Claim Rewards CTA Button */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.claimButton}
          onPress={() => {
            triggerHaptic('heavy');
            onComplete();
          }}
        >
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.claimButtonGradient}
          >
            <Text style={styles.claimButtonText}>CLAIM REWARDS</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Replay Sequence trigger (testing helper) */}
        <TouchableOpacity
          activeOpacity={0.6}
          style={styles.replayButton}
          onPress={() => {
            triggerHaptic('medium');
            setIsPlaying(false);
            setTimeout(sequenceStart, 100);
          }}
        >
          <Text style={styles.replayButtonText}>REPLAY REVEAL</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// Full Screen Rays background effect (SVG/Reanimated driven)
const FullScreenRays: React.FC<{ progress: SharedValue<number>; opacity: SharedValue<number> }> = ({
  progress,
  opacity,
}) => {
  const rotateVal = useSharedValue(0);

  useEffect(() => {
    rotateVal.value = withRepeat(
      withTiming(360, { duration: 15000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const animatedRotateStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotateVal.value}deg` },
        { scale: progress.value * 1.2 },
      ],
      opacity: opacity.value * 0.25,
    };
  });

  const raySize = Math.max(SCREEN_WIDTH, SCREEN_HEIGHT) * 1.5;

  return (
    <Animated.View style={[styles.raysWrapper, animatedRotateStyle]}>
      <Svg width={raySize} height={raySize} viewBox="0 0 500 500">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = i * 30;
          return (
            <Path
              key={i}
              d="M 250 250 L 230 -200 L 270 -200 Z"
              fill="#FBBF24"
              transform={`rotate(${angle}, 250, 250)`}
            />
          );
        })}
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
  },
  flash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 110,
  },
  eggWrapper: {
    width: 250,
    height: 310,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    zIndex: 102,
  },
  eggImage: {
    width: 240,
    height: 300,
  },
  eggOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.5,
    height: SCREEN_WIDTH * 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  raysContainer: {
    position: 'absolute',
    zIndex: 99,
  },
  raysWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  particlesContainer: {
    position: 'absolute',
    width: SCREEN_WIDTH * 1.8,
    height: SCREEN_WIDTH * 1.8,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 105,
  },
  rewardCard: {
    position: 'absolute',
    bottom: 40,
    width: SCREEN_WIDTH * 0.9,
    backgroundColor: 'rgba(14, 14, 16, 0.95)',
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 108,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  cardLevelLabel: {
    color: '#FFE066',
    fontSize: 12,
    fontFamily: fontFamilies.bold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  cardLevelNumber: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: fontFamilies.bold,
    letterSpacing: 0.5,
  },
  statRowsContainer: {
    marginBottom: 24,
  },
  statRow: {
    marginBottom: 16,
  },
  statInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statLabel: {
    color: '#A1A1AA',
    fontSize: 14,
    fontFamily: fontFamilies.medium,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: fontFamilies.bold,
  },
  statTrack: {
    height: 8,
    backgroundColor: '#27272A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  statFill: {
    height: '100%',
    borderRadius: 4,
  },
  claimButton: {
    width: '100%',
    height: 54,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  claimButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  claimButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: fontFamilies.bold,
    letterSpacing: 1.2,
  },
  replayButton: {
    alignItems: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  replayButtonText: {
    color: '#71717A',
    fontSize: 12,
    fontFamily: fontFamilies.medium,
    letterSpacing: 0.5,
  },
});
